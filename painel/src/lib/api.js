const BASE = import.meta.env.VITE_API_URL || "/api";

function token() {
  return localStorage.getItem("zap_token");
}

async function req(metodo, caminho, corpo) {
  const res = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const data = await res.json();

  // Trial expirado — redireciona
  if (res.status === 402) {
    window.location.href = "/trial-expirado";
    throw new Error("trial_expirado");
  }

  if (!res.ok) throw new Error(data.erro || "Erro desconhecido");
  return data;
}

export const api = {
  // Auth
  login: (email, senha) => req("POST", "/auth/login", { email, senha }),
  me: () => req("GET", "/auth/me"),
  cadastrar: (dados) => req("POST", "/cadastro", dados),

  // Painel
  conversas: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req("GET", `/painel/conversas${q ? `?${q}` : ""}`);
  },
  conversa: (id) => req("GET", `/painel/conversas/${id}`),
  assumir: (id) => req("POST", `/painel/conversas/${id}/assumir`),
  liberar: (id) => req("POST", `/painel/conversas/${id}/liberar`),
  responder: (id, texto) => req("POST", `/painel/conversas/${id}/responder`, { texto }),

  // Clientes e disparo
  clientes: () => req("GET", "/painel/clientes"),
  disparo: (mensagem, clienteIds) => req("POST", "/painel/disparo", { mensagem, clienteIds }),

  // Config
  obterConfig: () => req("GET", "/config"),
  obterTemplate: (franquia) => req("GET", `/config/template/${franquia}`),
  salvarConfig: (config) => req("PUT", "/config", config),
  previewConfig: (config) => req("POST", "/config/preview", config),

  // Conexão WhatsApp
  statusConexao: () => req("GET", "/conexao/status"),
  gerarQr: () => req("GET", "/conexao/qr"),
  desconectar: () => req("POST", "/conexao/desconectar"),
  configurarWebhook: () => req("POST", "/conexao/webhook"),
};

export function criarWs(onMensagem) {
  const t = token();
  if (!t) return null;
  const wsBase = BASE.replace(/^http/, "ws").replace(/^\/api/, "");
  const wsUrl = wsBase
    ? `${wsBase}/api/painel/ws?token=${t}`
    : `/api/painel/ws?token=${t}`;
  const ws = new WebSocket(`${window.location.origin.replace("http", "ws")}/api/painel/ws?token=${t}`);
  ws.onmessage = (e) => {
    try { onMensagem(JSON.parse(e.data)); } catch {}
  };
  ws.onerror = () => {};
  return ws;
}
