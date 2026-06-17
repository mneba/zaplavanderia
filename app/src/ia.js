import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || "claude-haiku-4-5";
const MAX_HISTORICO = 20;

const TONS = {
  simpatico: "Seja simpático, caloroso e próximo. Use emojis com moderação (1-2 por mensagem). Trate o cliente com carinho mas sem exageros.",
  formal: "Seja educado e profissional. Não use gírias nem emojis. Mantenha um tom respeitoso e direto.",
  descontraido: "Seja leve, bem-humorado e descontraído. Pode usar gírias suaves e emojis. Trate o cliente como um amigo.",
};

const ESCALACOES_LABELS = {
  irritacao: "cliente demonstrar irritação, raiva ou reclamação intensa",
  pagamento: "houver problema com pagamento (cobrança não reconhecida, pagamento não aprovado, valor errado)",
  imagem: "cliente mandar imagem ou vídeo",
  esqueceu: "cliente mencionar que esqueceu algo na lavanderia",
  escopo: "assunto for completamente fora do escopo de uma lavanderia",
  humano: "cliente pedir explicitamente para falar com um humano ou atendente",
  multiplas: "cliente mandar mais de 5 mensagens sem o problema ser resolvido",
};

export function montarSystemPrompt(lavanderia) {
  const c = lavanderia.config || {};

  const maquinas = (c.maquinas || [])
    .map((m) => `- Máquina ${m.id}: ${m.tipo} ${m.capacidadeKg}kg — R$ ${Number(m.precoReais).toFixed(2)}`)
    .join("\n");

  const faq = (c.faq || [])
    .filter((f) => f.pergunta && f.resposta)
    .map((f) => `P: ${f.pergunta}\nR: ${f.resposta}`)
    .join("\n\n");

  const pagamentos = (c.formasPagamento || []).map((f) => `- ${f}`).join("\n");

  const tom = TONS[c.tom] || TONS.simpatico;

  // Regras de escalação
  const escalacoes = [
    ...(c.escalacoes || []).map((id) => ESCALACOES_LABELS[id]).filter(Boolean),
    ...(c.escalacaoCustom ? [c.escalacaoCustom] : []),
  ];

  const regrasEscalacao = escalacoes.length > 0
    ? escalacoes.map((r) => `- Se ${r}: inclua exatamente a tag [HUMANO] no final da resposta`).join("\n")
    : "- Se o cliente pedir um humano ou você não conseguir resolver: inclua a tag [HUMANO] no final";

  return `Você é o atendente virtual da "${lavanderia.nome}", uma lavanderia autônoma (self-service).

# Sobre a lavanderia
${c.endereco ? `Endereço: ${c.endereco}` : ""}
${c.horario ? `Horário: ${c.horario}` : ""}
${c.wifi ? `Wi-Fi para clientes: ${c.wifi}` : ""}
${c.telefoneSuporte ? `Telefone de suporte: ${c.telefoneSuporte}` : ""}
${c.diferenciais ? `Diferenciais: ${c.diferenciais}` : ""}
${c.franquia && c.franquia !== "independente" ? `Rede: ${c.franquia}` : ""}

# Máquinas e preços
${maquinas || "Consulte a lavanderia para preços atualizados."}

${c.duracaoCicloMinutos ? `Duração média: lavagem ${c.duracaoCicloMinutos.lavagem} min | secagem ${c.duracaoCicloMinutos.secagem} min.` : ""}

# Formas de pagamento
${pagamentos || "Pix e cartão."}
${c.observacoesPagamento ? `\nObs: ${c.observacoesPagamento}` : ""}

# Política de reembolso
${c.politicaReembolso || "Reembolsos devem ser solicitados ao atendente humano."}

# Perguntas frequentes
${faq || "Responda com base nas informações acima."}

# Tom de voz
${tom}

# Regras de escalação para atendente humano (OBRIGATÓRIAS)
${regrasEscalacao}

# Instruções gerais
- Responda em português brasileiro, de forma curta e direta (é WhatsApp, ninguém quer textão).
- NUNCA invente informação que não esteja acima. Se não souber, diga que vai verificar.
- Quando incluir a tag [HUMANO], continue sendo educado e diga que vai chamar um atendente.
- A tag [HUMANO] deve aparecer SOMENTE no final da mensagem, nunca no meio.`;
}

const historicos = new Map();

export function limparHistorico(jid) {
  historicos.delete(jid);
}

export async function gerarResposta(lavanderia, historicoMensagens) {
  const messages = [];
  for (const m of historicoMensagens.slice(-MAX_HISTORICO)) {
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
