import bcrypt from "bcrypt";

export async function authRoutes(app) {
  // Login
  app.post("/auth/login", {
    schema: {
      body: {
        type: "object",
        required: ["email", "senha"],
        properties: {
          email: { type: "string" },
          senha: { type: "string" },
        },
      },
    },
  }, async (req, reply) => {
    const { email, senha } = req.body;
    const usuario = await app.prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { lavanderia: true },
    });

    if (!usuario) {
      return reply.status(401).send({ erro: "Email ou senha incorretos" });
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaOk) {
      return reply.status(401).send({ erro: "Email ou senha incorretos" });
    }

    const token = app.jwt.sign({
      usuarioId: usuario.id,
      lavanderiaId: usuario.lavanderiaId,
      plano: usuario.lavanderia.plano,
      nome: usuario.nome,
    }, { expiresIn: "7d" });

    return {
      token,
      usuario: {
        nome: usuario.nome,
        email: usuario.email,
        lavanderia: usuario.lavanderia.nome,
        plano: usuario.lavanderia.plano,
      },
    };
  });

  // Verificar token
  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req) => {
    const usuario = await app.prisma.usuario.findUnique({
      where: { id: req.user.usuarioId },
      include: { lavanderia: true },
    });
    return {
      nome: usuario.nome,
      email: usuario.email,
      lavanderia: usuario.lavanderia.nome,
      plano: usuario.lavanderia.plano,
    };
  });
}

// Script auxiliar para criar usuário (rode manualmente)
export async function criarUsuario(prisma, { email, senha, nome, lavanderiaId }) {
  const senhaHash = await bcrypt.hash(senha, 12);
  return prisma.usuario.create({
    data: { email: email.toLowerCase(), senhaHash, nome, lavanderiaId },
  });
}
