// Cadastra uma lavanderia (tenant) e cria sua instância de WhatsApp.
//
// Uso (dentro do container ou com DATABASE_URL apontando p/ o banco):
//   node scripts/criar-lavanderia.js --slug lav-teste --nome "Lavanderia Teste" \
//        --dono 5511951457902 --config exemplos/lavanderia.exemplo.json
//
// Depois rode o túnel SSH e escaneie o QR no manager da Evolution.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { criarInstancia } from "../src/evolution.js";

const prisma = new PrismaClient();

function arg(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const slug = arg("slug");
const nome = arg("nome");
const dono = arg("dono");
const configPath = arg("config");

if (!slug || !nome || !dono || !configPath) {
  console.error(
    "Uso: node scripts/criar-lavanderia.js --slug <slug> --nome <nome> --dono <5511...> --config <arquivo.json>"
  );
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error("O slug deve ter só letras minúsculas, números e hífens. Ex.: lav-centro");
  process.exit(1);
}
if (!/^\d{12,13}$/.test(dono)) {
  console.error("O número do dono deve estar no formato 5511999999999 (só dígitos).");
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));

const lavanderia = await prisma.lavanderia.upsert({
  where: { slug },
  create: { slug, nome, donoFone: dono, config },
  update: { nome, donoFone: dono, config },
});
console.log(`✅ Lavanderia salva no banco: ${lavanderia.nome} (slug: ${slug})`);

try {
  await criarInstancia(slug);
  console.log(`✅ Instância de WhatsApp criada na Evolution: ${slug}`);
} catch (e) {
  if (e.status === 403 || /already in use|already exists/i.test(e.message)) {
    console.log(`ℹ️ Instância ${slug} já existia na Evolution — ok.`);
  } else {
    throw e;
  }
}

console.log(`
Próximo passo — conectar o número de WhatsApp:
1. No SEU computador: ssh -L 8080:localhost:8080 root@IP_DA_VPS
2. Abra http://localhost:8080/manager (login = sua EVOLUTION_API_KEY)
3. Clique na instância "${slug}" → Get QR Code → escaneie com o celular da lavanderia
`);

await prisma.$disconnect();
