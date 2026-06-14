// Cérebro de IA do ZapLavanderia.
// O histórico agora vem do banco (sobrevive a restarts) e a config
// da lavanderia vem da coluna `config` (JSON) — multi-tenant de verdade.

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.AI_MODEL || "claude-haiku-4-5";
const MAX_HISTORICO = 20;

export function montarSystemPrompt(lavanderia) {
  const c = lavanderia.config || {};

  const maquinas = (c.maquinas || [])
    .map(
      (m) =>
        `- Máquina ${m.id}: ${m.tipo} ${m.capacidadeKg}kg — R$ ${Number(m.precoReais).toFixed(2)}`
    )
    .join("\n");

  const faq = (c.faq || [])
    .map((f) => `P: ${f.pergunta}\nR: ${f.resposta}`)
    .join("\n\n");

  const regras = (c.regrasAtendimento || [])
    .map((r) => `- ${r}`)
    .join("\n");

  const pagamentos = (c.formasPagamento || []).map((f) => `- ${f}`).join("\n");

  return `Você é o atendente virtual da "${lavanderia.nome}", uma lavanderia autônoma (self-service).

# Sobre a lavanderia
Endereço: ${c.endereco || "não informado"}
Horário: ${c.horario || "não informado"}
${c.wifi ? `Wi-Fi para clientes: ${c.wifi}` : ""}

# Máquinas e preços
${maquinas || "Nenhuma máquina cadastrada — diga que vai confirmar os valores."}

${
  c.duracaoCicloMinutos
    ? `Duração média: lavagem ${c.duracaoCicloMinutos.lavagem} min | secagem ${c.duracaoCicloMinutos.secagem} min.`
    : ""
}

# Formas de pagamento
${pagamentos || "Não informado."}

# Política de reembolso
${c.politicaReembolso || "Encaminhe casos de reembolso para o atendimento humano."}

# Perguntas frequentes
${faq || "Nenhuma cadastrada."}

# Regras de atendimento (OBRIGATÓRIAS)
${regras || "- Seja honesto e encaminhe para humano quando não souber."}

# Estilo
- Responda em português brasileiro, curto, simpático e direto (é WhatsApp, ninguém quer textão).
- Use no máximo 1-2 emojis por mensagem.
- NUNCA invente informação que não esteja acima. Se não souber, diga que vai verificar e acione um humano.
- Se o cliente pedir para falar com um atendente humano, ou se você não conseguir resolver, ou se ele estiver muito irritado, inclua exatamente a tag [HUMANO] no final da resposta (o sistema detecta e notifica o dono).`;
}

/**
 * Gera a resposta da IA a partir do histórico persistido.
 * @param historicoMensagens linhas da tabela Mensagem, da mais antiga p/ mais nova
 * @returns { texto, precisaHumano }
 */
export async function gerarResposta(lavanderia, historicoMensagens) {
  // Converte o histórico do banco para o formato da API,
  // mesclando mensagens consecutivas do mesmo lado.
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

  // A API exige começar com mensagem de usuário
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
