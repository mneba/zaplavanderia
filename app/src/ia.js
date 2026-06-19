import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || "claude-haiku-4-5";
const MAX_HISTORICO = 10;

const TONS = {
  simpatico: "Seja simpatico, caloroso e proximo. Use emojis com moderacao (1-2 por mensagem).",
  formal: "Seja educado e profissional. Nao use girias nem emojis.",
  descontraido: "Seja leve e bem-humorado. Pode usar emojis. Trate o cliente como um amigo.",
};

const ESCALACOES_LABELS = {
  irritacao: "cliente demonstrar irritacao, raiva ou reclamacao intensa",
  pagamento: "houver problema com pagamento",
  imagem: "cliente mandar imagem ou video",
  esqueceu: "cliente mencionar que esqueceu algo na lavanderia",
  escopo: "assunto for completamente fora do escopo de uma lavanderia",
  humano: "cliente pedir explicitamente para falar com um humano",
  multiplas: "cliente mandar mais de 5 mensagens sem o problema ser resolvido",
};

export function montarSystemPrompt(lavanderia) {
  const agora = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const c = lavanderia.config || {};

  const maquinas = (c.maquinas || [])
    .map((m) => `- ${m.tipo === "lavadora" ? "Lavadora" : "Secadora"} ${m.capacidadeKg}kg - R$ ${Number(m.precoReais).toFixed(2)}`)
    .join("\n");

  const faq = (c.faq || [])
    .filter((f) => f.pergunta && f.resposta)
    .map((f) => `P: ${f.pergunta}\nR: ${f.resposta}`)
    .join("\n\n");

  const pagamentos = (c.formasPagamento || []).map((f) => `- ${f}`).join("\n");
  const tom = TONS[c.tom] || TONS.simpatico;

  const escalacoes = [
    ...(c.escalacoes || []).map((id) => ESCALACOES_LABELS[id]).filter(Boolean),
    ...(c.escalacaoCustom ? [c.escalacaoCustom] : []),
  ];

  const regrasEscalacao = escalacoes.length > 0
    ? escalacoes.map((r) => `- Se ${r}: inclua exatamente a tag [HUMANO] no final da resposta`).join("\n")
    : "- Se o cliente pedir um humano: inclua a tag [HUMANO] no final";

  return `Voce e o atendente virtual da "${lavanderia.nome}", uma lavanderia autonoma (self-service).

# Horario atual em Sao Paulo
${agora}
Use essa informacao para responder perguntas sobre se estao abertos, horario de funcionamento, etc.

# REGRA MAIS IMPORTANTE: responda SOMENTE a ultima mensagem
- Leia APENAS a ultima mensagem do cliente e responda ela
- IGNORE completamente assuntos de mensagens anteriores que nao foram perguntados agora
- Se nao souber responder, diga que nao tem essa informacao e oferea o telefone de suporte

# Sobre a lavanderia
${c.endereco ? `Endereco: ${c.endereco}` : ""}
${c.horario ? `Horario: ${c.horario}` : ""}
${c.wifi ? `Wi-Fi: ${c.wifi}` : ""}
${c.telefoneSuporte ? `Telefone: ${c.telefoneSuporte}` : ""}
${c.diferenciais ? `Diferenciais: ${c.diferenciais}` : ""}

# Maquinas e precos
${maquinas || "Consulte a lavanderia para precos atualizados."}
${c.duracaoCicloMinutos ? `Duracao: lavagem ${c.duracaoCicloMinutos.lavagem} min | secagem ${c.duracaoCicloMinutos.secagem} min.` : ""}

# Pagamento
${pagamentos || "Pix e cartao."}
${c.observacoesPagamento ? `Obs: ${c.observacoesPagamento}` : ""}

# Politica de reembolso
${c.politicaReembolso || "Reembolsos pelo suporte."}

# Perguntas frequentes
${faq || "Responda com base nas informacoes acima."}

# Tom
${tom}

# Escalacao para humano (OBRIGATORIO)
${regrasEscalacao}

# Instrucoes
- Responda em portugues brasileiro, curto e direto (e WhatsApp).
- NUNCA invente informacao. Se nao souber, indique o telefone.
- Tag [HUMANO] somente no final da mensagem.`;
}

export async function gerarResposta(lavanderia, historicoMensagens) {
  const mensagensRecentes = historicoMensagens.slice(-MAX_HISTORICO);

  const messages = [];
  for (const m of mensagensRecentes) {
    const role = m.autor === "CLIENTE" ? "user" : "assistant";
    const anterior = messages[messages.length - 1];
    if (anterior && anterior.role === role) {
      anterior.content += "\n" + m.texto;
    } else {
      messages.push({ role, content: m.texto });
    }
  }

  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) return { texto: null, precisaHumano: false };

  const resposta = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: montarSystemPrompt(lavanderia),
    messages,
    stream: false,
  });

  let texto = resposta.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const precisaHumano = texto.includes("[HUMANO]");
  texto = texto.replace("[HUMANO]", "").trim();

  return { texto, precisaHumano };
}
