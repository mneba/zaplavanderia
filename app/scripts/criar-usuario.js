// Cria um usuário do painel para uma lavanderia existente.
// Uso: node scripts/criar-usuario.js --email dono@email.com --senha SuaSenha123 --nome "João Silva" --lavanderia lav-centro

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

function arg(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const email = arg("email");
const senha = arg("senha");
const nome = arg("nome");
const slug = arg("lavanderia");

if (!email || !senha || !nome || !slug) {
  console.error("Uso: node scripts/criar-usuario.js --email <email> --senha <senha> --nome <nome> --lavanderia <slug>");
  process.exit(1);
}

const lavanderia = await prisma.lavanderia.findUnique({ where: { slug } });
if (!lavanderia) {
  console.error(`Lavanderia com slug "${slug}" não encontrada.`);
  process.exit(1);
}

const senhaHash = await bcrypt.hash(senha, 12);
const usuario = await prisma.usuario.create({
  data: { email: email.toLowerCase(), senhaHash, nome, lavanderiaId: lavanderia.id },
});

console.log(`✅ Usuário criado: ${usuario.nome} (${usuario.email})`);
console.log(`   Lavanderia: ${lavanderia.nome}`);
console.log(`   Acesse: https://app.zaplavanderia.com.br`);

await prisma.$disconnect();
