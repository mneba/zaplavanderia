import "dotenv/config";
import Fastify from "fastify";
import FastifyJwt from "@fastify/jwt";
import FastifyCors from "@fastify/cors";
import FastifyWebSocket from "@fastify/websocket";
import { PrismaClient } from "@prisma/client";
import { gerarResposta } from "./ia.js";
import { authRoutes } from "./auth.js";
import { cadastroRoutes } from "./cadastro.js";
import { painelRoutes } from "./painel.js";
import { configRoutes } from "./config-routes.js";
import { conexaoRoutes } from "./conexao.js";
import { transcreverAudio } from "./audio.js";
import {
  registrarCallbacks,
  iniciarTodasSessoes,
  enviarMensagem,
  verificarContato,
} from "./baileys.js";

const prisma = new PrismaClient();
const app = Fastify({ logger: { level: "info" }, bodyLimit: 10485760 });

// ── Plugins ──────────────────────────────────────────────────
await app.register(FastifyCors, { origin: true });
await app.register(FastifyJwt, {
  secret: process.env.JWT_SECRET || "zaplavanderia-secret-mude-em-producao",
});
await app.register(FastifyWebSocket);

app.decorate("prisma", prisma);
app.decorate("authenticate", async (req, reply) => {
  try { await req.jwtVerify(); }
  catch { reply.status(401).send({ erro: "Não autorizado" }); }
});

// ── Middleware: trial/ativo ───────────────────────────────────
app.addHook("onRequest", async (req, reply) => {
  const protegidas = ["/painel/", "/config", "/conexao/"];
  if (!protegidas.some((r) => req.url.startsWith(r))) return;
  try {
    await req.jwtVerify();
    const lav = await prisma.lavanderia.findUnique({
      where: { id: req.user.lavanderiaId },
      select: { ativa: true, plano: true, trialExpiraEm: true },
    });
    if (!lav) return;
    if (lav.plano === "TRIAL" && lav.trialExpiraEm && new Date() > lav.trialExpiraEm) {
      await prisma.lavanderia.update({ where: { id: req.user.lavanderiaId }, data: { plano: "EXPIRADO" } });
      return reply.status(402).send({ erro: "trial_expirado" });
    }
    if (!lav.ativa) return reply.status(403).send({ erro: "conta_inativa" });
  } catch {}
});

// ── WebSocket ─────────────────────────────────────────────────
const wsClients = new Map();
app.decorate("notificarWs", (lavanderiaId, payload) => {
  const clientes = wsClients.get(lavanderiaId);
  if (!clientes) return;
  const msg = JSON.stringify(payload);
  clientes.forEach((ws) => { if (ws.readyState === 1) ws.send(msg); });
});

app.register(async (fastify) => {
  fastify.get("/painel/ws", { websocket: true }, async (socket, req) => {
    try {
      const payload = app.jwt.verify(req.query.token);
      const { lavanderiaId } = payload;
      if (!wsClients.has(lavanderiaId)) wsClients.set(lavanderiaId, new Set());
      wsClients.get(lavanderiaId).add(socket);
      socket.on("close", () => wsClients.get(lavanderiaId)?.delete(socket));

    } catch { socket.close(1008, "Token inválido"); }
  });
});

// ── Rotas ─────────────────────────────────────────────────────
await app.register(authRoutes);
await app.register(cadastroRoutes);
await app.register(painelRoutes, { enviarMensagem });
await app.register(configRoutes);
await app.register(conexaoRoutes);

// ── Fila de mensagens ─────────────────────────────────────────
const filas = new Map();
function enfileirar(chave, tarefa) {
  const anterior = filas.get(chave) ?? Promise.resolve();
  const proxima = anterior.then(tarefa).catch((e) => app.log.error(e));
  filas.set(chave, proxima);
  return proxima;
}

// ── Callbacks do Baileys ──────────────────────────────────────
async function aoReceberMensagem(slug, { jid, texto, nome }) {
  const lavanderia = await prisma.lavanderia.findUnique({ where: { slug } });
  if (!lavanderia || !lavanderia.ativa) return;
  if (lavanderia.plano === "EXPIRADO") return;
  if (lavanderia.plano === "TRIAL" && lavanderia.trialExpiraEm && new Date() > lavanderia.trialExpiraEm) return;

  const config = lavanderia.config || {};

  // Ignora contatos da agenda se número pessoal
  if (config.numeroTipo === "pessoal") {
    const ehContato = await verificarContato(slug, jid.replace("@s.whatsapp.net", ""));
    if (ehContato) return;
  }

  enfileirar(`${slug}:${jid}`, async () => {
    // Comando do dono
    if (jid.replace("@s.whatsapp.net", "") === lavanderia.donoFone) {
      const tratado = await comandosDoDono(lavanderia, texto, slug);
      if (tratado) return;
    }

    const conversa = await prisma.conversa.upsert({
      where: { lavanderiaId_clienteJid: { lavanderiaId: lavanderia.id, clienteJid: jid } },
      create: { lavanderiaId: lavanderia.id, clienteJid: jid, clienteNome: nome, primeiraMsg: true },
      update: { clienteNome: nome },
    });

    // Boas-vindas na primeira mensagem
    if (conversa.primeiraMsg && config.mensagemBoasVindas) {
      await enviarMensagem(slug, jid, config.mensagemBoasVindas);
      await prisma.mensagem.create({ data: { conversaId: conversa.id, autor: "BOT", texto: config.mensagemBoasVindas } });
      await prisma.conversa.update({ where: { id: conversa.id }, data: { primeiraMsg: false } });
    }

    const msg = await prisma.mensagem.create({
      data: { conversaId: conversa.id, autor: "CLIENTE", texto },
    });

    app.notificarWs(lavanderia.id, { tipo: "NOVA_MENSAGEM", conversaId: conversa.id, mensagem: msg, clienteNome: nome });

    if (conversa.status === "HUMANO") return;

    const historico = await prisma.mensagem.findMany({
      where: { conversaId: conversa.id },
      orderBy: { criadaEm: "asc" },
      take: 40,
    });

    const { texto: resposta, precisaHumano } = await gerarResposta(lavanderia, historico);
    if (!resposta) return;

    await enviarMensagem(slug, jid, resposta);
    const msgBot = await prisma.mensagem.create({ data: { conversaId: conversa.id, autor: "BOT", texto: resposta } });

    app.notificarWs(lavanderia.id, { tipo: "NOVA_MENSAGEM", conversaId: conversa.id, mensagem: msgBot });

    if (precisaHumano) {
      await prisma.conversa.update({ where: { id: conversa.id }, data: { status: "HUMANO" } });
      await notificarDono(lavanderia, conversa, nome, texto, slug);
      app.notificarWs(lavanderia.id, { tipo: "CONVERSA_ATUALIZADA", conversaId: conversa.id, status: "HUMANO" });
    }
  });
}

async function aoMudarStatus(slug, estado, info) {
  const lav = await prisma.lavanderia.findUnique({ where: { slug }, select: { id: true } });
  if (!lav) return;
  app.notificarWs(lav.id, { tipo: "CONEXAO_ATUALIZADA", estado, ...info });
  app.log.info({ slug, estado }, "status conexao");
}

async function aoReceberQr(slug, qrBase64) {
  const lav = await prisma.lavanderia.findUnique({ where: { slug }, select: { id: true } });
  if (!lav) { app.log.warn({ slug }, "lavanderia nao encontrada para QR"); return; }
  const clientes = wsClients.get(lav.id);
  app.log.info({ slug, lavId: lav.id, wsClientes: clientes?.size || 0 }, "QR Code gerado — notificando WS");
  app.notificarWs(lav.id, { tipo: "QR_ATUALIZADO", qr: qrBase64 });
}

// Registra callbacks no Baileys
registrarCallbacks({
  onMensagem: aoReceberMensagem,
  onStatusChange: aoMudarStatus,
  onQrCode: aoReceberQr,
});

// ── Helpers ───────────────────────────────────────────────────
async function notificarDono(lavanderia, conversa, nomeCliente, ultimaMsg, slug) {
  if (!lavanderia.donoFone) return;
  const numeroCliente = conversa.clienteJid.replace("@s.whatsapp.net", "");
  const aviso =
    `🚨 *Atendimento humano solicitado — ${lavanderia.nome}*\n\n` +
    `Cliente: ${nomeCliente}\n` +
    `Número: wa.me/${numeroCliente}\n` +
    `Última mensagem: "${ultimaMsg.slice(0, 200)}"\n\n` +
    `Acesse o painel: https://app.zaplavanderia.com.br`;
  try { await enviarMensagem(slug, lavanderia.donoFone, aviso); }
  catch (e) { app.log.error({ err: e.message }, "falha ao notificar dono"); }
}

async function comandosDoDono(lavanderia, texto, slug) {
  const m = texto.trim().match(/^liberar\s+(\d{10,15})$/i);
  if (!m) return false;
  const jid = `${m[1]}@s.whatsapp.net`;
  const conversa = await prisma.conversa.findUnique({
    where: { lavanderiaId_clienteJid: { lavanderiaId: lavanderia.id, clienteJid: jid } },
  });
  if (conversa) {
    await prisma.conversa.update({ where: { id: conversa.id }, data: { status: "BOT" } });
    await enviarMensagem(slug, lavanderia.donoFone, `✅ Bot reativado para ${m[1]}.`);
    app.notificarWs(lavanderia.id, { tipo: "CONVERSA_ATUALIZADA", conversaId: conversa.id, status: "BOT" });
  }
  return true;
}

// ── Saúde ─────────────────────────────────────────────────────
app.get("/health", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, servico: "zaplavanderia", fase: 3, whatsapp: "baileys-direto" };
});

// ── Inicialização ─────────────────────────────────────────────
const PORT = Number(process.env.PORT || 3000);
await app.listen({ port: PORT, host: "0.0.0.0" });
app.log.info("🧺 ZapLavanderia Fase 3 (Baileys direto) rodando na porta " + PORT);

// Inicia sessões de todas as lavanderias ativas
await iniciarTodasSessoes(prisma);
