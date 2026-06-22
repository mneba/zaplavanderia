// Gerenciador de sessoes Baileys - multi-tenant
// Cada lavanderia tem sua propria sessao persistida em /data/sessoes/<slug>/

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { toDataURL } from "qrcode";
import pino from "pino";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SESSOES_DIR = process.env.SESSOES_DIR || "/data/sessoes";
const logger = pino({ level: "warn" });

const sessoes = new Map();

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
    if (s.estado === "open") return;
    if (s.iniciando) return;
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
        console.log(`[${slug}] WhatsApp conectado - +${numero}`);
      }

      if (connection === "close") {
        const codigo = lastDisconnect?.error?.output?.statusCode;
        const deslogado = codigo === DisconnectReason.loggedOut;
        sessoes.set(slug, { estado: "close", iniciando: false });
        onStatusChange?.(slug, "close");
        console.log(`[${slug}] Conexao fechada (${codigo}). Deslogado: ${deslogado}`);

        if (deslogado) {
          try {
            const { rmSync } = await import("node:fs");
            rmSync(dir, { recursive: true, force: true });
            console.log(`[${slug}] Sessao corrompida removida automaticamente`);
          } catch {}
        } else {
          setTimeout(() => iniciarSessao(slug), 5000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const jid = msg.key.remoteJid;
        if (!jid?.endsWith("@s.whatsapp.net") && !jid?.endsWith("@lid")) {
          continue;
        }
        const nome = msg.pushName || "Cliente";
        const analise = analisarMensagem(msg);
        if (!analise) {
          continue;
        }
        const numeroReal = msg.key.senderPn || msg.key.participantPn || null;
        onMensagem?.(slug, { jid, nome, numeroReal, ...analise, msgRaw: msg });
      }
    });

    sessoes.set(slug, { sock, estado: "connecting", iniciando: true });
  } catch (e) {
    console.error(`[${slug}] Erro ao iniciar sessao:`, e.message);
    sessoes.set(slug, { estado: "error", iniciando: false });
    onStatusChange?.(slug, "error");
  }
}

export async function desconectarSessao(slug) {
  const s = sessoes.get(slug);
  if (s?.sock) {
    try { await s.sock.logout(); } catch {}
    try { s.sock.end(); } catch {}
  }
  try {
    const { rmSync } = await import("node:fs");
    const dir = join(process.env.SESSOES_DIR || "/data/sessoes", slug);
    rmSync(dir, { recursive: true, force: true });
    console.log(`[${slug}] Sessao removida`);
  } catch {}
  sessoes.delete(slug);
  onStatusChange?.(slug, "close");
}

export async function enviarMensagem(slug, numero, texto) {
  const s = sessoes.get(slug);
  if (!s?.sock || s.estado !== "open") {
    throw new Error(`Sessao ${slug} nao esta conectada`);
  }
  const jid = numero.includes('@') ? numero : `${numero}@s.whatsapp.net`;
  await s.sock.sendMessage(jid, { text: texto });
}

export async function baixarMidia(slug, msgRaw) {
  const s = sessoes.get(slug);
  if (!s?.sock) throw new Error(`Sessao ${slug} nao esta conectada`);
  return await downloadMediaMessage(
    msgRaw,
    "buffer",
    {},
    { logger, reuploadRequest: s.sock.updateMediaMessage }
  );
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

export async function iniciarTodasSessoes(prisma) {
  const lavanderias = await prisma.lavanderia.findMany({
    where: { ativa: true, plano: { not: "EXPIRADO" } },
    select: { slug: true },
  });
  console.log(`Iniciando ${lavanderias.length} sessoes...`);
  for (const lav of lavanderias) {
    await iniciarSessao(lav.slug);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

function analisarMensagem(msg) {
  const m = msg.message;
  if (!m) return null;

  const textoConv = m.conversation || m.extendedTextMessage?.text;
  if (textoConv) return { tipo: "texto", texto: textoConv };

  if (m.audioMessage) return { tipo: "audio", texto: null, mimetype: m.audioMessage.mimetype };
  if (m.imageMessage) return { tipo: "imagem", texto: m.imageMessage.caption || null };
  if (m.videoMessage) return { tipo: "video", texto: m.videoMessage.caption || null };

  return null;
}
