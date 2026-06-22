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
  baixarMidia,
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
await app.register(painelRoutes);
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
async function aoReceberMensagem(slug, payload) {
  const { jid, nome, tipo, texto, mimetype, numeroReal, msgRaw } = payload;
  const lavanderia = await prisma.lavanderia.findUnique({ where: { slug } });
  if (!lavanderia || !lavanderia.ativa) return;
  if (lavanderia.plano === "EXPIRADO") return;
  if (lavanderia.plano === "TRIAL" && lavanderia.trialExpiraEm && new Date() > lavanderia.trialExpiraEm) return;

  const config = lavanderia.config || {};
  // Se eh @lid, o jid nao tem numero real. Pega do senderPn quando disponivel.
  const ehLid = jid.endsWith("@lid");
  const numeroDeContato = numeroReal || (ehLid ? null : jid.replace("@s.whatsapp.net", ""));
  const numeroCliente = numeroDeContato || jid.replace("@s.whatsapp.net", "").replace("@lid", "");

  // Ignora contatos da agenda se numero pessoal
  if (config.numeroTipo === "pessoal") {
    const ehContato = await verificarContato(slug, numeroCliente);
    if (ehContato) return;
  }

  enfileirar(`${slug}:${jid}`, async () => {
    // ====== Resolver tipo de midia em texto utilizavel ======
    let textoFinal = texto;
    let prefixoExibicao = "";

    if (tipo === "audio") {
      if (!config.transcricaoAudio) {
        try { await enviarMensagem(slug, jid, "Recebi seu audio, mas no momento so consigo entender mensagens de texto. Poderia escrever, por favor? :)"); } catch {}
        return;
      }
      try {
        const buffer = await baixarMidia(slug, msgRaw);
        const transcrito = await transcreverAudio(buffer, mimetype || "audio/ogg");
        if (!transcrito) {
          try { await enviarMensagem(slug, jid, "Recebi seu audio mas nao consegui entender. Pode repetir por texto?"); } catch {}
          return;
        }
        textoFinal = transcrito;
        prefixoExibicao = "🎤 ";
      } catch (e) {
        app.log.error({ err: e.message, slug }, "falha na transcricao de audio");
        try { await enviarMensagem(slug, jid, "Tive um problema ao processar seu audio. Pode escrever a mensagem?"); } catch {}
        return;
      }
    } else if (tipo === "imagem") {
      textoFinal = texto ? `[Cliente enviou uma imagem com legenda: "${texto}"]` : "[Cliente enviou uma imagem]";
      prefixoExibicao = "📷 ";
    } else if (tipo === "video") {
      textoFinal = texto ? `[Cliente enviou um video com legenda: "${texto}"]` : "[Cliente enviou um video]";
      prefixoExibicao = "🎥 ";
    }

    if (!textoFinal) return;

    // Comando do dono
    if (numeroCliente === lavanderia.donoFone) {
      const tratado = await comandosDoDono(lavanderia, textoFinal, slug);
      if (tratado) return;
    }

    // Upsert da conversa
    const conversa = await prisma.conversa.upsert({
      where: { lavanderiaId_clienteJid: { lavanderiaId: lavanderia.id, clienteJid: jid } },
      create: { lavanderiaId: lavanderia.id, clienteJid: jid, clienteNome: nome, primeiraMsg: true },
      update: { clienteNome: nome },
    });
    const statusAtual = await prisma.conversa.findUnique({
      where: { id: conversa.id },
      select: { status: true, primeiraMsg: true, botResetadoEm: true },
    });
    conversa.status = statusAtual.status;
    conversa.primeiraMsg = statusAtual.primeiraMsg;
    conversa.botResetadoEm = statusAtual.botResetadoEm;

    // Boas-vindas
    if (conversa.primeiraMsg && config.mensagemBoasVindas) {
      try { await enviarMensagem(slug, jid, config.mensagemBoasVindas); } catch {}
      await prisma.mensagem.create({ data: { conversaId: conversa.id, autor: "BOT", texto: config.mensagemBoasVindas } });
      await prisma.conversa.update({ where: { id: conversa.id }, data: { primeiraMsg: false } });
    }

    // Salva mensagem do cliente (com prefixo de exibicao no painel)
    const msg = await prisma.mensagem.create({
      data: { conversaId: conversa.id, autor: "CLIENTE", texto: prefixoExibicao + textoFinal },
    });
    app.notificarWs(lavanderia.id, { tipo: "NOVA_MENSAGEM", conversaId: conversa.id, mensagem: msg, clienteNome: nome });
    if (conversa.status === "HUMANO") {
      return;
    }

    // ====== Imagem/video: escalada direta sem chamar IA ======
    if (tipo === "imagem" || tipo === "video") {
      const escalaConfigurada = config.escalacoes?.includes("imagem");
      if (escalaConfigurada) {
        const aviso = `Recebi sua ${tipo === "imagem" ? "imagem" : "video"}! Vou chamar um atendente pra te ajudar 👍`;
        try { await enviarMensagem(slug, jid, aviso); } catch {}
        await prisma.mensagem.create({ data: { conversaId: conversa.id, autor: "BOT", texto: aviso } });
        await prisma.conversa.update({ where: { id: conversa.id }, data: { status: "HUMANO" } });
        await notificarDono(lavanderia, conversa, nome, textoFinal, slug, numeroDeContato);
        app.notificarWs(lavanderia.id, { tipo: "CONVERSA_ATUALIZADA", conversaId: conversa.id, status: "HUMANO" });
      } else {
        const aviso = `Recebi sua ${tipo === "imagem" ? "imagem" : "video"}, mas no momento nao consigo analisa-la. Pode me contar em texto o que voce precisa?`;
        try { await enviarMensagem(slug, jid, aviso); } catch {}
        await prisma.mensagem.create({ data: { conversaId: conversa.id, autor: "BOT", texto: aviso } });
      }
      return;
    }

    // ====== Fluxo IA normal (texto ou audio transcrito) ======
    // Filtra historico: apenas mensagens depois do ultimo "devolver ao bot"
    const filtroHist = conversa.botResetadoEm
      ? { conversaId: conversa.id, criadaEm: { gt: conversa.botResetadoEm } }
      : { conversaId: conversa.id };
    const historico = await prisma.mensagem.findMany({
      where: filtroHist,
      orderBy: { criadaEm: "asc" },
      take: 40,
    });
    let resposta, precisaHumano;
    try {
      const r = await gerarResposta(lavanderia, historico);
      resposta = r.texto;
      precisaHumano = r.precisaHumano;
    } catch (e) {
      console.log(`[${slug}] ERRO gerarResposta: ${e.message}`);
      app.log.error({ err: e.message, slug }, "falha gerarResposta");
      return;
    }

    // Se a IA diz que precisa humano (com ou sem texto), garante a escalada
    if (precisaHumano) {
      const respostaFinal = resposta || "Um momento, vou chamar um atendente pra te ajudar 👍";
      try {
        await enviarMensagem(slug, jid, respostaFinal);
      } catch (e) {
        console.log(`[${slug}] ERRO enviarMensagem: ${e.message}`);
      }
      const msgBot = await prisma.mensagem.create({ data: { conversaId: conversa.id, autor: "BOT", texto: respostaFinal } });
      app.notificarWs(lavanderia.id, { tipo: "NOVA_MENSAGEM", conversaId: conversa.id, mensagem: msgBot });
      await prisma.conversa.update({ where: { id: conversa.id }, data: { status: "HUMANO" } });
      await notificarDono(lavanderia, conversa, nome, textoFinal, slug, numeroDeContato);
      app.notificarWs(lavanderia.id, { tipo: "CONVERSA_ATUALIZADA", conversaId: conversa.id, status: "HUMANO" });
      return;
    }

    // Sem precisaHumano e sem resposta: aborta silenciosamente
    if (!resposta) {
      return;
    }

    // Fluxo normal: bot responde
    try {
      await enviarMensagem(slug, jid, resposta);
    } catch (e) {
      console.log(`[${slug}] ERRO enviarMensagem: ${e.message}`);
    }
    const msgBot = await prisma.mensagem.create({ data: { conversaId: conversa.id, autor: "BOT", texto: resposta } });
    app.notificarWs(lavanderia.id, { tipo: "NOVA_MENSAGEM", conversaId: conversa.id, mensagem: msgBot });
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
  if (!lav) return;
  app.notificarWs(lav.id, { tipo: "QR_ATUALIZADO", qr: qrBase64 });
  app.log.info({ slug }, "QR Code gerado");
}

// Registra callbacks no Baileys
registrarCallbacks({
  onMensagem: aoReceberMensagem,
  onStatusChange: aoMudarStatus,
  onQrCode: aoReceberQr,
});

// ── Helpers ───────────────────────────────────────────────────
async function notificarDono(lavanderia, conversa, nomeCliente, ultimaMsg, slug, numeroDeContato) {
  if (!lavanderia.donoFone) return;
  // Monta linha de contato apenas se temos um numero real (nao @lid)
  let linhaContato = "";
  if (numeroDeContato && /^\d{10,15}$/.test(numeroDeContato)) {
    linhaContato = `Numero: wa.me/${numeroDeContato}\n`;
  } else {
    linhaContato = "Numero: oculto pelo WhatsApp (responda pelo painel)\n";
  }
  const aviso =
    `🚨 *Atendimento humano solicitado — ${lavanderia.nome}*\n\n` +
    `Cliente: ${nomeCliente}\n` +
    linhaContato +
    `Ultima mensagem: "${ultimaMsg.slice(0, 200)}"\n\n` +
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
