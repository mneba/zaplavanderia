// Cliente da Evolution API — única peça que conhece a Evolution.
// Se um dia migrarmos para a API oficial da Meta, trocamos só este arquivo.

const BASE = process.env.EVOLUTION_URL || "http://evolution:8080";
const KEY = process.env.EVOLUTION_API_KEY;

async function req(metodo, caminho, corpo) {
  const res = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      apikey: KEY,
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await res.text();
  let json;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = { raw: texto };
  }
  if (!res.ok) {
    const erro = new Error(
      `Evolution ${metodo} ${caminho} → ${res.status}: ${texto.slice(0, 300)}`
    );
    erro.status = res.status;
    throw erro;
  }
  return json;
}

/**
 * Envia texto para um número. `delay` (ms) faz a Evolution mostrar
 * "digitando..." antes de enviar — comportamento humano, menor risco de ban.
 */
export async function enviarTexto(instancia, numero, texto) {
  const delay = Math.min(Math.max(texto.length * 40, 1200), 5000);
  return req("POST", `/message/sendText/${instancia}`, {
    number: numero,
    text: texto,
    delay,
  });
}

/** Cria uma instância de WhatsApp para uma lavanderia (1 instância = 1 número). */
export async function criarInstancia(slug) {
  return req("POST", "/instance/create", {
    instanceName: slug,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
  });
}

/** Estado da conexão da instância (open = conectada). */
export async function estadoInstancia(slug) {
  return req("GET", `/instance/connectionState/${slug}`);
}

/** Extrai o número puro de um JID (5511999999999@s.whatsapp.net → 5511999999999). */
export function jidParaNumero(jid) {
  return String(jid).split("@")[0].split(":")[0];
}
