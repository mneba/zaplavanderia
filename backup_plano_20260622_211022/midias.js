import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import { join } from "node:path";

const MIDIAS_DIR = process.env.MIDIAS_DIR || "/data/midias";

export async function midiasRoutes(app) {
  // Listar midias da lavanderia
  app.get("/config/midias", { preHandler: [app.requerPro] }, async (req) => {
    const midias = await app.prisma.midiaResposta.findMany({
      where: { lavanderiaId: req.user.lavanderiaId },
      orderBy: { criadaEm: "desc" },
    });
    return { midias };
  });

  // Criar (multipart: arquivo + campos)
  app.post("/config/midias", { preHandler: [app.requerPro] }, async (req, reply) => {
    let nome, quandoEnviar, legenda, buffer, mimetype;
    try {
      const parts = req.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          if (part.fieldname !== "arquivo") continue;
          buffer = await part.toBuffer();
          mimetype = part.mimetype;
        } else {
          if (part.fieldname === "nome") nome = part.value;
          else if (part.fieldname === "quandoEnviar") quandoEnviar = part.value;
          else if (part.fieldname === "legenda") legenda = part.value;
        }
      }
    } catch (e) {
      if (e.code === "FST_REQ_FILE_TOO_LARGE") {
        return reply.status(413).send({ erro: "Arquivo muito grande (max 10MB)" });
      }
      throw e;
    }

    if (!nome?.trim() || !quandoEnviar?.trim() || !buffer || !mimetype) {
      return reply.status(400).send({ erro: "Campos obrigatorios: nome, quandoEnviar, arquivo" });
    }

    const tipo = mimetype.startsWith("image/") ? "imagem" : mimetype.startsWith("video/") ? "video" : null;
    if (!tipo) {
      return reply.status(400).send({ erro: "Apenas imagem ou video" });
    }

    const lav = await app.prisma.lavanderia.findUnique({
      where: { id: req.user.lavanderiaId },
      select: { slug: true },
    });
    if (!lav) return reply.status(404).send({ erro: "Lavanderia nao encontrada" });

    const ext = (mimetype.split("/")[1] || "bin").split(";")[0];
    const dir = join(MIDIAS_DIR, lav.slug);
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(dir, filename);
    await writeFile(filepath, buffer);

    const midia = await app.prisma.midiaResposta.create({
      data: {
        lavanderiaId: req.user.lavanderiaId,
        nome: nome.trim(),
        tipo,
        arquivo: filepath,
        quandoEnviar: quandoEnviar.trim(),
        legenda: legenda?.trim() || null,
        ativa: true,
      },
    });

    return midia;
  });

  // Atualizar (ativar/desativar/editar campos)
  app.patch("/config/midias/:id", { preHandler: [app.requerPro] }, async (req, reply) => {
    const { nome, quandoEnviar, legenda, ativa } = req.body || {};
    const m = await app.prisma.midiaResposta.findFirst({
      where: { id: req.params.id, lavanderiaId: req.user.lavanderiaId },
    });
    if (!m) return reply.status(404).send({ erro: "Midia nao encontrada" });

    const atualizada = await app.prisma.midiaResposta.update({
      where: { id: m.id },
      data: {
        ...(nome !== undefined && { nome: String(nome).trim() }),
        ...(quandoEnviar !== undefined && { quandoEnviar: String(quandoEnviar).trim() }),
        ...(legenda !== undefined && { legenda: legenda ? String(legenda).trim() : null }),
        ...(ativa !== undefined && { ativa: !!ativa }),
      },
    });
    return atualizada;
  });

  // Deletar
  app.delete("/config/midias/:id", { preHandler: [app.requerPro] }, async (req, reply) => {
    const m = await app.prisma.midiaResposta.findFirst({
      where: { id: req.params.id, lavanderiaId: req.user.lavanderiaId },
    });
    if (!m) return reply.status(404).send({ erro: "Midia nao encontrada" });
    try { await unlink(m.arquivo); } catch {}
    await app.prisma.midiaResposta.delete({ where: { id: m.id } });
    return { ok: true };
  });

  // Preview (download via token na query)
  app.get("/config/midias/:id/arquivo", async (req, reply) => {
    try {
      const payload = app.jwt.verify(req.query.token);
      const m = await app.prisma.midiaResposta.findFirst({
        where: { id: req.params.id, lavanderiaId: payload.lavanderiaId },
      });
      if (!m || !existsSync(m.arquivo)) return reply.status(404).send({ erro: "Nao encontrado" });
      const mt = m.tipo === "imagem" ? "image/jpeg" : "video/mp4";
      reply.type(mt);
      return createReadStream(m.arquivo);
    } catch {
      return reply.status(401).send({ erro: "Nao autorizado" });
    }
  });
}
