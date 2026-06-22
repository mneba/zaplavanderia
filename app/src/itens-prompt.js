// Helper para a secao "O que aceita lavar" no system prompt da IA
const ITENS_LABELS = {
  roupas_comuns: "roupas comuns",
  roupas_intimas: "roupas intimas",
  edredons: "edredons",
  toalhas_lencois: "toalhas e lencois",
  tenis: "tenis",
  calcados: "outros calcados (sapato, sandalia)",
  roupas_pet: "roupas de pet (cachorro, gato)",
  bichos_pelucia: "bichos de pelucia",
  mochilas_bolsas: "mochilas e bolsas",
  casacos_pelo: "casacos com pelo",
  couro: "pecas de couro",
  tapetes_pequenos: "tapetes pequenos",
  cortinas: "cortinas",
  capas_almofada: "capas de almofada",
  roupas_sangue: "roupas com sangue",
  itens_oleo: "itens com oleo ou graxa",
};

export function montarSecaoItens(itensLavagem) {
  if (!itensLavagem || !itensLavagem.length) return "";
  const labelize = (id) => ITENS_LABELS[id] || id;
  const aceita = itensLavagem.filter((i) => i.status === "aceita");
  const restricao = itensLavagem.filter((i) => i.status === "restricao");
  const naoAceita = itensLavagem.filter((i) => i.status === "nao_aceita");
  if (!aceita.length && !restricao.length && !naoAceita.length) return "";

  const linhas = [];
  linhas.push("");
  linhas.push("# O QUE A LAVANDERIA ACEITA LAVAR (regras estritas)");
  linhas.push("");

  if (aceita.length) {
    linhas.push("ACEITA: " + aceita.map((i) => labelize(i.id)).join(", ") + ".");
  }
  if (restricao.length) {
    linhas.push("");
    linhas.push("ACEITA COM RESTRICAO:");
    for (const i of restricao) {
      linhas.push("- " + labelize(i.id) + ": " + (i.obs || "verifique com a equipe"));
    }
  }
  if (naoAceita.length) {
    linhas.push("");
    linhas.push("NAO ACEITA: " + naoAceita.map((i) => labelize(i.id) + (i.obs ? " (" + i.obs + ")" : "")).join(", ") + ".");
  }

  linhas.push("");
  linhas.push("REGRAS DE USO DESTA LISTA:");
  linhas.push("- Item em ACEITA: responda SIM com naturalidade, sem rodeios.");
  linhas.push("- Item em ACEITA COM RESTRICAO: confirme E mencione a observacao.");
  linhas.push("- Item em NAO ACEITA: recuse educadamente, explicando o motivo se houver.");
  linhas.push("- Item NAO listado acima: use bom senso de lavanderia. Se eh feito de tecido lavavel (panos, capas, almofadas, caminhas, toalhinhas, fronhas, sacos de tecido, fronhas, panos de prato, etc) = SIM, voce aceita.");
  linhas.push("- Item REALMENTE incomum (produto quimico, peca industrial, equipamento eletronico, papel, metal) = diga \"vou verificar com a equipe\" e use [HUMANO].");
  linhas.push("- NUNCA responda \"nao temos esse item na lista\" ou \"nao tenho essa informacao\". Se eh tecido lavavel, ACEITA.");
  linhas.push("- IMPORTANTE: a lista acima cobre itens GERAIS. Itens RELACIONADOS contam: ex. se cliente pergunta sobre caminha de cachorro, fronha de almofada, capa de sofa de tecido, pano de copa, esses sao tecidos comuns => ACEITA. Nao limite sua resposta apenas aos itens listados.");
  linhas.push("- Exemplo correto: cliente pergunta \"lava caminha de cachorro?\" -> resposta: \"Sim, lavamos! Eh so trazer.\".");
  linhas.push("- Exemplo correto: cliente pergunta \"lava capa de sofa?\" -> resposta: \"Aceitamos! Se for tecido comum, sem problemas.\".");

  return linhas.join("\n");
}
