// Rotas do painel
import { enviarMensagem } from "./baileys.js";


// Intervalo entre mensagens no disparo Pro (ms) — anti-ban
const DELAY_DISPARO_MIN = 8000;
const DELAY_DISPARO_MAX = 18000;

function delayAleatorio() {
  return Math.floor(Math.random() * (DELAY_DISPARO_MAX - DELAY_DISPARO_MIN) + DELAY_DISPARO_MIN);
}

export async function painelRoutes(app) {
  const auth = { preHandler: [app.authenticate] };

  // ── Conversas ─────────────────────────────────────────────
  app.get("/painel/conversas", auth, async (req) => {
    const { lavanderiaId } = req.user;
    const { status, pagina = 1 } = req.query;
    const take = 30;
    const skip = (Number(pagina) - 1) * take;

    const where = { lavanderiaId, ...(status ? { status } : {}) };
    const [conversas, total] = await Promise.all([
      app.prisma.conversa.findMany({
        where,
        orderBy: { atualizadaEm: "desc" },
        take,
        skip,
        include: {
          mensagens: { orderBy: { criadaEm: "desc" }, take: 1 },
        },
      }),
      app.prisma.conversa.count({ where }),
    ]);

    return {
      conversas: conversas.map((c) => ({
        id: c.id,
        clienteNome: c.clienteNome,
        clienteJid: c.clienteJid,
        status: c.status,
        atualizadaEm: c.atualizadaEm,
        ultimaMensagem: c.mensagens[0] ?? null,
      })),
      total,
      paginas: Math.ceil(total / take),
    };
  });

  app.get("/painel/conversas/:id", auth, async (req, reply) => {
    const { lavanderiaId } = req.user;
    const conversa = await app.prisma.conversa.findFirst({
      where: { id: req.params.id, lavanderiaId },
      include: {
        mensagens: { orderBy: { criadaEm: "asc" } },
      },
    });
    if (!conversa) return reply.status(404).send({ erro: "Conversa não encontrada" });
    return conversa;
  });

  // ── Ações ────────────────────────────────────────────────
  app.post("/painel/conversas/:id/assumir", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { lavanderiaId } = req.user;
    const conversa = await app.prisma.conversa.findFirst({
      where: { id: req.params.id, lavanderiaId },
    });
    if (!conversa) return reply.status(404).send({ erro: "Conversa não encontrada" });

    await app.prisma.conversa.update({
      where: { id: conversa.id },
      data: { status: "HUMANO" },
    });

    app.notificarWs(lavanderiaId, { tipo: "CONVERSA_ATUALIZADA", conversaId: conversa.id, status: "HUMANO" });
    return { ok: true };
  });

  app.post("/painel/conversas/:id/liberar", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { lavanderiaId } = req.user;
    const conversa = await app.prisma.conversa.findFirst({
      where: { id: req.params.id, lavanderiaId },
    });
    if (!conversa) return reply.status(404).send({ erro: "Conversa não encontrada" });

    await app.prisma.conversa.update({
      where: { id: conversa.id },
      data: { status: "BOT" },
    });

    app.notificarWs(lavanderiaId, { tipo: "CONVERSA_ATUALIZADA", conversaId: conversa.id, status: "BOT" });
    return { ok: true };
  });

  app.post("/painel/conversas/:id/responder", { preHandler: [app.authenticate] }, async (req, reply) => {
    const { lavanderiaId } = req.user;
    const { texto } = req.body;

    if (!texto?.trim()) return reply.status(400).send({ erro: "Mensagem vazia" });

    const conversa = await app.prisma.conversa.findFirst({
      where: { id: req.params.id, lavanderiaId },
      include: { lavanderia: true },
    });
    if (!conversa) return reply.status(404).send({ erro: "Conversa não encontrada" });

    const numero = conversa.clienteJid;
    console.log(`RESPONDER: slug=${conversa.lavanderia.slug} jid=${numero} texto=${texto.trim()}`);
    try {
      await enviarMensagem(conversa.lavanderia.slug, numero, texto.trim());
      console.log("RESPONDER: enviado com sucesso");
    } catch(e) {
      console.error("RESPONDER ERRO:", e.message, e.stack);
      throw e;
    }

    const msg = await app.prisma.mensagem.create({
      data: { conversaId: conversa.id, autor: "DONO", texto: texto.trim() },
    });

    // Garante que a conversa fica em modo HUMANO quando dono responde
    await app.prisma.conversa.update({
      where: { id: conversa.id },
      data: { status: "HUMANO" },
    });

    app.notificarWs(lavanderiaId, { tipo: "NOVA_MENSAGEM", conversaId: conversa.id, mensagem: msg });
    return msg;
  });

  // ── Clientes (Pro) ───────────────────────────────────────
  app.get("/painel/clientes", auth, async (req, reply) => {
    const { lavanderiaId, plano } = req.user;
    if (plano !== "PRO") return reply.status(403).send({ erro: "Recurso exclusivo do Plano Pro" });

    const conversas = await app.prisma.conversa.findMany({
      where: { lavanderiaId },
      orderBy: { atualizadaEm: "desc" },
      select: {
        id: true,
        clienteJid: true,
        clienteNome: true,
        atualizadaEm: true,
        _count: { select: { mensagens: true } },
      },
    });

    return conversas.map((c) => ({
      id: c.id,
      nome: c.clienteNome,
      numero: jidParaNumero(c.clienteJid),
      jid: c.clienteJid,
      totalMensagens: c._count.mensagens,
      ultimaInteracao: c.atualizadaEm,
    }));
  });

  // ── Disparo Pro ──────────────────────────────────────────
  app.post("/painel/disparo", auth, async (req, reply) => {
    const { lavanderiaId, plano } = req.user;
    if (plano !== "PRO") return reply.status(403).send({ erro: "Recurso exclusivo do Plano Pro" });

    const { mensagem, clienteIds } = req.body;
    if (!mensagem?.trim()) return reply.status(400).send({ erro: "Mensagem vazia" });
    if (!clienteIds?.length) return reply.status(400).send({ erro: "Selecione pelo menos um cliente" });
    if (clienteIds.length > 300) return reply.status(400).send({ erro: "Máximo 300 clientes por disparo" });

    const lavanderia = await app.prisma.lavanderia.findUnique({ where: { id: lavanderiaId } });
    const conversas = await app.prisma.conversa.findMany({
      where: { id: { in: clienteIds }, lavanderiaId },
      select: { clienteJid: true },
    });

    // Hora atual: bloqueia envio fora de 8h–20h
    const hora = new Date().getHours();
    if (hora < 8 || hora >= 20) {
      return reply.status(400).send({ erro: "Disparos permitidos apenas entre 8h e 20h" });
    }

    reply.send({ ok: true, total: conversas.length, status: "enviando" });

    // Envia em background com delay aleatório anti-ban
    (async () => {
      for (const c of conversas) {
        try {
          await enviarTexto(lavanderia.slug, jidParaNumero(c.clienteJid), mensagem.trim());
        } catch (e) {
          app.log.error({ err: e.message }, "erro no disparo");
        }
        await new Promise((r) => setTimeout(r, delayAleatorio()));
      }
      app.log.info(`Disparo concluído: ${conversas.length} msgs enviadas`);
    })();
  });
}
