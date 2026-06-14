import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import { gerarResposta } from "./ia.js";
import { enviarTexto, jidParaNumero } from "./evolution.js";

const prisma = new PrismaClient();
const app = Fastify({ 
  logger: { level: "info" },
  bodyLimit: 10485760 // 10MB
});

const filas = new Map();
function enfileirar(chave, tarefa) {
  const anterior = filas.get(chave) ?? Promise.resolve();
  const proxima = anterior.then(tarefa).catch((e) => app.log.error(e));
  filas.set(chave, proxima);
  return proxima;
}

app.post("/webhook/evolution", async (req, reply) => {
  reply.send({ ok: true });
  const { event, instance, data } = req.body || {};
  if (event !== "messages.upsert" || !data) return;
  try {
    await processarMensagem(instance, data);
  } catch (e) {
    app.log.error({ err: e.message, instance }, "erro ao processar mensagem");
  }
});

async function processarMensagem(instancia, data) {
  const key = data.key || {};
  const jid = key.remoteJid || "";
  if (key.fromMe) return;
  if (!jid.endsWith("@s.whatsapp.net")) return;
  const texto = extrairTexto(data.message);
  if (!texto) return;

  const lavanderia = await prisma.lavanderia.findUnique({
    where: { slug: instancia },
  });
  if (!lavanderia || !lavanderia.ativa) return;

  const nome = data.pushName || "Cliente";

  enfileirar(`${instancia}:${jid}`, async () => {
    if (jidParaNumero(jid) === lavanderia.donoFone) {
      const tratado = await comandosDoDono(lavanderia, texto);
      if (tratado) return;
    }

    const conversa = await prisma.conversa.upsert({
      where: { lavanderiaId_clienteJid: { lavanderiaId: lavanderia.id, clienteJid: jid } },
      create: { lavanderiaId: lavanderia.id, clienteJid: jid, clienteNome: nome },
      update: { clienteNome: nome },
    });

    await prisma.mensagem.create({
      data: { conversaId: conversa.id, autor: "CLIENTE", texto },
    });

    if (conversa.status === "HUMANO") return;

    const historico = await prisma.mensagem.findMany({
      where: { conversaId: conversa.id },
      orderBy: { criadaEm: "asc" },
      take: 40,
    });

    const { texto: resposta, precisaHumano } = await gerarResposta(lavanderia, historico);
    if (!resposta) return;

    await enviarTexto(instancia, jidParaNumero(jid), resposta);
    await prisma.mensagem.create({
      data: { conversaId: conversa.id, autor: "BOT", texto: resposta },
    });

    if (precisaHumano) {
      await prisma.conversa.update({
        where: { id: conversa.id },
        data: { status: "HUMANO" },
      });
      await notificarDono(lavanderia, conversa, nome, texto);
    }
  });
}

function extrairTexto(message) {
  if (!message) return null;
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  );
}

async function notificarDono(lavanderia, conversa, nomeCliente, ultimaMsg) {
  const numeroCliente = jidParaNumero(conversa.clienteJid);
  const aviso =
    `🚨 *Atendimento humano solicitado — ${lavanderia.nome}*\n\n` +
    `Cliente: ${nomeCliente}\n` +
    `Conversar: wa.me/${numeroCliente}\n` +
    `Última mensagem: "${ultimaMsg.slice(0, 200)}"\n\n` +
    `O bot ficou em silêncio com esse cliente.\n` +
    `Para reativar, me responda: *liberar ${numeroCliente}*`;
  try {
    await enviarTexto(lavanderia.slug, lavanderia.donoFone, aviso);
  } catch (e) {
    app.log.error({ err: e.message }, "falha ao notificar dono");
  }
}

async function comandosDoDono(lavanderia, texto) {
  const m = texto.trim().match(/^liberar\s+(\d{10,15})$/i);
  if (!m) return false;
  const jid = `${m[1]}@s.whatsapp.net`;
  const conversa = await prisma.conversa.findUnique({
    where: { lavanderiaId_clienteJid: { lavanderiaId: lavanderia.id, clienteJid: jid } },
  });
  if (conversa) {
    await prisma.conversa.update({ where: { id: conversa.id }, data: { status: "BOT" } });
    await enviarTexto(lavanderia.slug, lavanderia.donoFone, `✅ Bot reativado para ${m[1]}.`);
  }
  return true;
}

app.get("/health", async () => {
  await prisma.$queryRaw`SELECT 1`;
  return { ok: true, servico: "zaplavanderia", fase: 1 };
});

const PORT = Number(process.env.PORT || 3000);
app.listen({ port: PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`🧺 ZapLavanderia rodando na porta ${PORT}`));
