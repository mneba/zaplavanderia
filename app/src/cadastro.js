import bcrypt from "bcrypt";

// Gera um slug único a partir do nome
function gerarSlug(nome) {
  const base = nome
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const sufixo = Math.random().toString(36).slice(2, 6);
  return `${base}-${sufixo}`;
}

export async function cadastroRoutes(app) {

  // POST /cadastro — público, sem auth
  app.post("/cadastro", {
    schema: {
      body: {
        type: "object",
        required: ["nome", "email", "senha", "nomeLavanderia"],
        properties: {
          nome: { type: "string", minLength: 2 },
          email: { type: "string", format: "email" },
          senha: { type: "string", minLength: 6 },
          nomeLavanderia: { type: "string", minLength: 2 },
        },
      },
    },
  }, async (req, reply) => {
    const { nome, email, senha, nomeLavanderia } = req.body;

    // Verifica email duplicado
    const existe = await app.prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existe) {
      return reply.status(409).send({ erro: "Este e-mail já está cadastrado." });
    }

    const slug = gerarSlug(nomeLavanderia);
    const senhaHash = await bcrypt.hash(senha, 12);
    const trialExpiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Cria lavanderia + usuário em transação
    const { usuario, lavanderia } = await app.prisma.$transaction(async (tx) => {
      const lav = await tx.lavanderia.create({
        data: {
          slug,
          nome: nomeLavanderia.trim(),
          plano: "TRIAL",
          trialExpiraEm,
          ativa: true,
          config: {
            mensagemBoasVindas: `Olá! 👋 Sou o atendente virtual da ${nomeLavanderia.trim()}. Em que posso te ajudar hoje?`,
            transcricaoAudio: false,
            numeroTipo: "chip",
            escalacoes: ["irritacao", "pagamento", "imagem", "escopo", "humano"],
            tom: "simpatico",
            maquinas: [],
            faq: [],
            formasPagamento: ["Pix (QR Code na máquina)"],
            politicaReembolso: "Reembolsos são processados via Pix em até 24h úteis após confirmação da falha.",
          },
        },
      });

      const usr = await tx.usuario.create({
        data: {
          email: email.toLowerCase().trim(),
          senhaHash,
          nome: nome.trim(),
          lavanderiaId: lav.id,
        },
      });

      return { usuario: usr, lavanderia: lav };
    });

    // Gera token JWT para já logar
    const token = app.jwt.sign({
      usuarioId: usuario.id,
      lavanderiaId: lavanderia.id,
      plano: "TRIAL",
      nome: usuario.nome,
    }, { expiresIn: "7d" });

    return {
      token,
      usuario: {
        nome: usuario.nome,
        email: usuario.email,
        lavanderia: lavanderia.nome,
        plano: "TRIAL",
        trialExpiraEm,
      },
    };
  });
}
