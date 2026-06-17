// Rotas de configuração da lavanderia
// GET  /config          → retorna config atual
// PUT  /config          → salva config completa
// POST /config/preview  → gera preview do prompt sem salvar

import { montarSystemPrompt } from "./ia.js";

// Templates por franquia
const TEMPLATES = {
  lavateria: {
    franquia: "Lavateria",
    horario: "Consulte a unidade",
    formasPagamento: ["Pix", "Cartão de crédito", "Cartão de débito"],
    maquinas: [
      { id: 1, tipo: "lavadora", capacidadeKg: 10, precoReais: 0 },
      { id: 2, tipo: "lavadora", capacidadeKg: 14, precoReais: 0 },
      { id: 3, tipo: "secadora", capacidadeKg: 10, precoReais: 0 },
    ],
    duracaoCicloMinutos: { lavagem: 35, secagem: 45 },
    faq: [
      { pergunta: "Preciso levar sabão?", resposta: "Não! Usamos produtos LAV Action e LAV Soft, inclusos no preço." },
      { pergunta: "Como funciona o pagamento?", resposta: "Pagamento direto na máquina via Pix ou cartão." },
      { pergunta: "Quanto tempo demora?", resposta: "A lavagem leva cerca de 35 minutos e a secagem 45 minutos." },
    ],
    diferenciais: "Rede Lavateria — maior rede de lavanderias self-service do Brasil. Produtos LAV exclusivos inclusos.",
  },
  "60minutos": {
    franquia: "60 Minutos",
    horario: "Consulte a unidade",
    formasPagamento: ["Pix", "Cartão de crédito", "Cartão de débito"],
    maquinas: [
      { id: 1, tipo: "lavadora", capacidadeKg: 10, precoReais: 0 },
      { id: 2, tipo: "secadora", capacidadeKg: 10, precoReais: 0 },
    ],
    duracaoCicloMinutos: { lavagem: 35, secagem: 25 },
    faq: [
      { pergunta: "Qual fragrância posso escolher?", resposta: "Temos três opções: Floral, Sport e Sem Cheiro. Você escolhe na máquina!" },
      { pergunta: "Preciso levar sabão?", resposta: "Não! Sabão e amaciante já estão inclusos." },
      { pergunta: "Quanto tempo demora?", resposta: "O ciclo completo (lavar + secar) leva cerca de 60 minutos." },
    ],
    diferenciais: "Rede 60 Minutos — ciclo completo em 60 minutos. Escolha de fragrância: Floral, Sport ou Sem Cheiro.",
  },
  lavo: {
    franquia: "Lavô",
    horario: "Consulte a unidade",
    formasPagamento: ["Pix", "Cartão de crédito", "Cartão de débito", "App Lavô"],
    maquinas: [
      { id: 1, tipo: "lavadora", capacidadeKg: 10, precoReais: 0 },
      { id: 2, tipo: "secadora", capacidadeKg: 10, precoReais: 0 },
    ],
    duracaoCicloMinutos: { lavagem: 35, secagem: 45 },
    faq: [
      { pergunta: "Preciso levar sabão?", resposta: "Não! Usamos OMO e Comfort, já inclusos no preço." },
      { pergunta: "Tem cashback?", resposta: "Sim! Use o app Lavô para acumular cashback nas lavagens." },
      { pergunta: "Quanto tempo demora?", resposta: "A lavagem leva 35 minutos e a secagem 45 minutos." },
    ],
    diferenciais: "Rede Lavô — OMO + Comfort inclusos, cashback pelo app.",
  },
  independente: {
    franquia: "Independente",
    horario: "",
    formasPagamento: ["Pix"],
    maquinas: [
      { id: 1, tipo: "lavadora", capacidadeKg: 10, precoReais: 0 },
      { id: 2, tipo: "secadora", capacidadeKg: 10, precoReais: 0 },
    ],
    duracaoCicloMinutos: { lavagem: 35, secagem: 45 },
    faq: [
      { pergunta: "Preciso levar sabão?", resposta: "" },
      { pergunta: "Como funciona o pagamento?", resposta: "" },
    ],
    diferenciais: "",
  },
};

export async function configRoutes(app) {
  const auth = { preHandler: [app.authenticate] };

  // Retorna config atual da lavanderia
  app.get("/config", auth, async (req) => {
    const { lavanderiaId } = req.user;
    const lav = await app.prisma.lavanderia.findUnique({
      where: { id: lavanderiaId },
      select: { nome: true, config: true, slug: true },
    });
    return { nome: lav.nome, slug: lav.slug, config: lav.config || {} };
  });

  // Retorna template de uma franquia
  app.get("/config/template/:franquia", auth, async (req) => {
    const template = TEMPLATES[req.params.franquia];
    if (!template) return req.server.httpErrors?.notFound?.() || { erro: "Template não encontrado" };
    return template;
  });

  // Salva configuração completa
  app.put("/config", auth, async (req, reply) => {
    const { lavanderiaId } = req.user;
    const config = req.body;

    // Validação básica
    if (!config.nome?.trim()) return reply.status(400).send({ erro: "Nome da lavanderia é obrigatório" });
    if (!config.maquinas?.length) return reply.status(400).send({ erro: "Adicione pelo menos uma máquina" });

    // Salva nome na tabela e config no JSON
    const { nome, ...resto } = config;
    await app.prisma.lavanderia.update({
      where: { id: lavanderiaId },
      data: { nome: nome.trim(), config: resto },
    });

    // Notifica painel via WebSocket que config mudou
    app.notificarWs(lavanderiaId, { tipo: "CONFIG_ATUALIZADA" });

    return { ok: true };
  });

  // Preview do prompt sem salvar
  app.post("/config/preview", auth, async (req) => {
    const { nome, ...config } = req.body;
    const preview = montarSystemPrompt({ nome: nome || "Minha Lavanderia", config });
    return { preview };
  });
}
