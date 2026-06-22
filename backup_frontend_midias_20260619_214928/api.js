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
  assumir: (id) => req("POST", `/painel/conversas/${id}/assumir`, {}),
  liberar: (id) => req("POST", `/painel/conversas/${id}/liberar`, {}),
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

  let ws = null;
  let reconectTimer = null;
  let tentativa = 0;
  let fechado = false;

  function conectar() {
    if (fechado) return;
    const url = `${window.location.origin.replace("http", "ws")}/api/painel/ws?token=${t}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      tentativa = 0;
      onMensagem({ tipo: "__WS_CONECTADO__" });
    };
    ws.onmessage = (e) => {
      try { onMensagem(JSON.parse(e.data)); } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (fechado) return;
      // Backoff exponencial: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(1000 * Math.pow(2, tentativa), 30000);
      tentativa += 1;
      reconectTimer = setTimeout(conectar, delay);
    };
  }

  conectar();

  return {
    close: () => {
      fechado = true;
      if (reconectTimer) clearTimeout(reconectTimer);
      if (ws) ws.close();
    },
  };
}
