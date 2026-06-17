// Gerenciador de sessões Baileys — multi-tenant
// Cada lavanderia tem sua própria sessão persistida em /data/sessoes/<slug>/

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { toDataURL } from "qrcode";
import pino from "pino";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SESSOES_DIR = process.env.SESSOES_DIR || "/data/sessoes";
const logger = pino({ level: "warn" });

// Mapa de sessões ativas: slug → { sock, status, qr }
const sessoes = new Map();

// Último QR gerado por slug (para entregar quando painel conectar)
const ultimosQrs = new Map();

// Callbacks registrados pelo server.js
let onMensagem = null;
let onStatusChange = null;
let onQrCode = null;

export function registrarCallbacks(callbacks) {
  onMensagem = callbacks.onMensagem;
  onStatusChange = callbacks.onStatusChange;
  onQrCode = callbacks.onQrCode;
}

export function statusSessao(slug) {
  const s = sessoes.get(slug);
  if (!s) return { conectado: false, estado: "inexistente" };
  return {
    conectado: s.estado === "open",
    estado: s.estado || "close",
    numero: s.numero || null,
    perfil: s.perfil || null,
  };
}

export async function iniciarSessao(slug) {
  if (sessoes.has(slug)) {
    const s = sessoes.get(slug);
    if (s.estado === "open") return; // já conectada
    if (s.iniciando) return; // já tentando
  }

  const dir = join(SESSOES_DIR, slug);
  mkdirSync(dir, { recursive: true });

  sessoes.set(slug, { estado: "connecting", iniciando: true });
  onStatusChange?.(slug, "connecting");

  try {
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Converte QR pra imagem base64 e notifica o painel
        const qrBase64 = await toDataURL(qr);
        sessoes.set(slug, { ...sessoes.get(slug), qr: qrBase64, estado: "qr" });
        onQrCode?.(slug, qrBase64);
        onStatusChange?.(slug, "qr");
      }

      if (connection === "open") {
        const numero = sock.user?.id?.split(":")[0] || null;
        const perfil = sock.user?.name || null;
        sessoes.set(slug, { sock, estado: "open", numero, perfil, iniciando: false });
        onStatusChange?.(slug, "open", { numero, perfil });
        console.log(`✅ [${slug}] WhatsApp conectado — +${numero}`);
      }

      if (connection === "close") {
        const codigo = lastDisconnect?.error?.output?.statusCode;
        const deslogado = codigo === DisconnectReason.loggedOut;
        sessoes.set(slug, { estado: "close", iniciando: false });
        onStatusChange?.(slug, "close");
        console.log(`⚠️ [${slug}] Conexão fechada (${codigo}). Deslogado: ${deslogado}`);

        if (!deslogado) {
          // Reconecta após 5 segundos
          setTimeout(() => iniciarSessao(slug), 5000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      console.log(`[${slug}] messages.upsert type=${type} count=${messages.length}`);
      if (type !== "notify") return;
      for (const msg of messages) {
        console.log(`[${slug}] msg fromMe=${msg.key.fromMe} jid=${msg.key.remoteJid}`);
        if (msg.key.fromMe) continue;
        const jid = msg.key.remoteJid;
        if (!jid?.endsWith("@s.whatsapp.net") && !jid?.endsWith("@lid")) continue;
        const texto = extrairTexto(msg.message);
        const nome = msg.pushName || "Cliente";
        console.log(`[${slug}] texto=${texto} nome=${nome}`);
        if (texto) onMensagem?.(slug, { jid, texto, nome });
      }
    });

    sessoes.set(slug, { sock, estado: "connecting", iniciando: true });
  } catch (e) {
    console.error(`❌ [${slug}] Erro ao iniciar sessão:`, e.message);
    sessoes.set(slug, { estado: "error", iniciando: false });
    onStatusChange?.(slug, "error");
  }
}

export async function desconectarSessao(slug) {
  const s = sessoes.get(slug);
  if (!s?.sock) return;
  try {
    await s.sock.logout();
  } catch {}
  sessoes.delete(slug);
  onStatusChange?.(slug, "close");
}

export async function enviarMensagem(slug, numero, texto) {
  const s = sessoes.get(slug);
  if (!s?.sock || s.estado !== "open") {
    throw new Error(`Sessão ${slug} não está conectada`);
  }

  // Usa o JID correto — suporte a @lid e @s.whatsapp.net
  const jid = numero.includes('@') ? numero : `${numero}@s.whatsapp.net`;
  await s.sock.sendMessage(jid, { text: texto });
}

export async function verificarContato(slug, numero) {
  const s = sessoes.get(slug);
  if (!s?.sock || s.estado !== "open") return false;
  try {
    const [result] = await s.sock.onWhatsApp(numero);
    return result?.exists && result?.jid ? true : false;
  } catch {
    return false;
  }
}

export function ultimoQr(slug) {
  return ultimosQrs.get(slug) || null;
}

export async function iniciarTodasSessoes(prisma) {
  const lavanderias = await prisma.lavanderia.findMany({
    where: { ativa: true, plano: { not: "EXPIRADO" } },
    select: { slug: true },
  });
  console.log(`🔌 Iniciando ${lavanderias.length} sessões...`);
  for (const lav of lavanderias) {
    await iniciarSessao(lav.slug);
    await new Promise((r) => setTimeout(r, 1000)); // evita sobrecarga
  }
}

function extrairTexto(message) {
  if (!message) return null;
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  );
}
