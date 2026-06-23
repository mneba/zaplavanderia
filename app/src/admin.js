export async function adminRoutes(app) {
  const auth = { preHandler: [app.requerSuperAdmin] };

  app.get("/admin/lavanderias", auth, async () => {
    const lavs = await app.prisma.lavanderia.findMany({
      orderBy: { id: "desc" },
      include: {
        _count: { select: { conversas: true, usuarios: true } },
        usuarios: { select: { email: true, nome: true }, take: 3 },
      },
    });
    return lavs;
  });

  app.patch("/admin/lavanderias/:id/plano", auth, async (req, reply) => {
    const { plano } = req.body || {};
    if (!["TRIAL", "STARTER", "PRO"].includes(plano)) {
      return reply.status(400).send({ erro: "Plano inválido" });
    }
    const lav = await app.prisma.lavanderia.update({
      where: { id: req.params.id },
      data: { plano },
    });
    return lav;
  });
}
