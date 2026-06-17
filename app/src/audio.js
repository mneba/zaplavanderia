// Transcrição de áudio via OpenAI Whisper
// Recebe a URL do áudio da Evolution, baixa e transcreve.

import { createWriteStream, unlinkSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export async function transcreverAudio(urlAudio) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  // Baixa o áudio para arquivo temporário
  const tmpPath = join(tmpdir(), `audio-${randomUUID()}.ogg`);

  try {
    const res = await fetch(urlAudio);
    if (!res.ok) throw new Error(`Erro ao baixar áudio: ${res.status}`);
    await pipeline(res.body, createWriteStream(tmpPath));

    // Envia para Whisper
    const formData = new FormData();
    const blob = new Blob([await readFile(tmpPath)], { type: "audio/ogg" });
    formData.append("file", blob, "audio.ogg");
    formData.append("model", "whisper-1");
    formData.append("language", "pt");

    const transcricao = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    });

    const data = await transcricao.json();
    return data.text?.trim() || null;
  } finally {
    try { unlinkSync(tmpPath); } catch {}
  }
}

async function readFile(path) {
  const { readFile } = await import("node:fs/promises");
  return readFile(path);
}
