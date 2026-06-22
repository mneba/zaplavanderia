// Lista canônica de itens + defaults razoáveis pra lavanderia autônoma média.
// Dono ajusta o que for específico da unidade dele.
export const ITENS_CANONICOS = [
  { id: "roupas_comuns",    label: "Roupas comuns",       defaultStatus: "aceita",      defaultObs: null },
  { id: "roupas_intimas",   label: "Roupas íntimas",      defaultStatus: "aceita",      defaultObs: null },
  { id: "edredons",         label: "Edredons",            defaultStatus: "restricao",   defaultObs: "Verifique tamanho/peso com a equipe — alguns precisam da máquina grande" },
  { id: "toalhas_lencois",  label: "Toalhas e lençóis",   defaultStatus: "aceita",      defaultObs: null },
  { id: "tenis",            label: "Tênis",               defaultStatus: "restricao",   defaultObs: "Use saco próprio de lavagem" },
  { id: "calcados",         label: "Outros calçados",     defaultStatus: "nao_aceita",  defaultObs: "Pode danificar as máquinas" },
  { id: "roupas_pet",       label: "Roupas de pet",       defaultStatus: "aceita",      defaultObs: null },
  { id: "bichos_pelucia",   label: "Bichos de pelúcia",   defaultStatus: "restricao",   defaultObs: "Coloque em saco fechado" },
  { id: "mochilas_bolsas",  label: "Mochilas e bolsas",   defaultStatus: "restricao",   defaultObs: "Esvazie tudo antes e use saco apropriado" },
  { id: "casacos_pelo",     label: "Casacos com pelo",    defaultStatus: "restricao",   defaultObs: "Pode soltar pelos — lavagem sob responsabilidade do cliente" },
  { id: "couro",            label: "Couro",               defaultStatus: "nao_aceita",  defaultObs: "Requer lavagem a seco em loja especializada" },
  { id: "tapetes_pequenos", label: "Tapetes pequenos",    defaultStatus: "restricao",   defaultObs: "Até 1m, sem base de borracha" },
  { id: "cortinas",         label: "Cortinas",            defaultStatus: "aceita",      defaultObs: null },
  { id: "capas_almofada",   label: "Capas de almofada",   defaultStatus: "aceita",      defaultObs: null },
  { id: "roupas_sangue",    label: "Roupas com sangue",   defaultStatus: "nao_aceita",  defaultObs: "Risco sanitário e de contaminação" },
  { id: "itens_oleo",       label: "Itens com óleo/graxa",defaultStatus: "nao_aceita",  defaultObs: "Mancha outras roupas e danifica as máquinas" },
];
