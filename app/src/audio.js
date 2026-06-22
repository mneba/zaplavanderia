// Transcricao de audio via OpenAI Whisper
// Recebe um Buffer (Baileys decifra o audio antes de entregar)
export async function transcreverAudio(buffer, mimetype = "audio/ogg") {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY nao configurada");
  }
  if (!buffer || buffer.length === 0) {
    throw new Error("Buffer de audio vazio");
  }

  const ext = (mimetype.split("/")[1] || "ogg").split(";")[0];
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimetype });
  formData.append("file", blob, `audio.${ext}`);
  formData.append("model", "whisper-1");
  formData.append("language", "pt");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`Whisper falhou (${res.status}): ${errTxt}`);
  }

  const data = await res.json();
  return data.text?.trim() || null;
}
