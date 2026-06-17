import {
  iniciarSessao,
  statusSessao,
  desconectarSessao,
} from "./baileys.js";

export async function conexaoRoutes(app) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/conexao/status", auth, async (req) => {
    const { lavanderiaId } = req.user;
    const lav = await app.prisma.lavanderia.findUnique({
      where: { id: lavanderiaId },
      select: { slug: true },
    });
    return statusSessao(lav.slug);
  });

  app.get("/conexao/qr", auth, async (req) => {
    const { lavanderiaId } = req.user;
    const lav = await app.prisma.lavanderia.findUnique({
      where: { id: lavanderiaId },
      select: { slug: true },
    });
    await iniciarSessao(lav.slug);
    return { ok: true, msg: "Sessao iniciando — aguarde o QR Code no painel" };
  });

  app.post("/conexao/desconectar", auth, async (req) => {
    const { lavanderiaId } = req.user;
    const lav = await app.prisma.lavanderia.findUnique({
      where: { id: lavanderiaId },
      select: { slug: true },
    });
    await desconectarSessao(lav.slug);
    return { ok: true };
  });

  app.post("/conexao/webhook", auth, async () => {
    return { ok: true, msg: "Webhook nao necessario com Baileys direto" };
  });
}
