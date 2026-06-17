# 🖥️ Deploy do Painel ZapLavanderia na Contabo

## Pré-requisito: DNS propagado
Confirme que `app.zaplavanderia.com.br` aponta pro IP da VPS:
```bash
nslookup app.zaplavanderia.com.br
```

---

## Passo 1 — Instalar nginx (se ainda não tiver)
```bash
apt install -y nginx
```

## Passo 2 — Instalar Node.js 20 na VPS (para buildar o painel)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version  # deve mostrar v20+
```

## Passo 3 — Atualizar o projeto do GitHub
```bash
cd /opt/zaplavanderia
git pull origin main
```

## Passo 4 — Buildar o painel React
```bash
cd /opt/zaplavanderia/painel
npm install
npm run build
# Vai gerar a pasta dist/ com os arquivos estáticos
```

## Passo 5 — Configurar o nginx
```bash
cp /opt/zaplavanderia/nginx-painel.conf /etc/nginx/sites-available/zaplavanderia-painel
ln -s /etc/nginx/sites-available/zaplavanderia-painel /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## Passo 6 — HTTPS grátis
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d app.zaplavanderia.com.br
# Escolhe opção 2 (redirect HTTP → HTTPS)
```

## Passo 7 — Atualizar dependências do backend e reiniciar
```bash
cd /opt/zaplavanderia
docker compose down
docker compose up -d --build
sleep 15
curl http://localhost:3000/health
# Deve retornar {"ok":true,"fase":2}
```

## Passo 8 — Criar usuário do painel
```bash
# Substitua pelos dados reais
docker compose exec app node scripts/criar-lavanderia.js \
  --slug novaconexao \
  --nome "Minha Lavanderia" \
  --dono 5511951457902 \
  --config exemplos/lavanderia.exemplo.json

docker compose exec app node scripts/criar-usuario.js \
  --email dono@email.com \
  --senha SuaSenha123 \
  --nome "Seu Nome" \
  --lavanderia novaconexao
```

## Passo 9 — Testar!
Acesse `https://app.zaplavanderia.com.br` e faça login com o e-mail e senha criados.

---

## Para atualizar o painel no futuro
```bash
cd /opt/zaplavanderia
git pull origin main
cd painel && npm run build
# Nginx serve automaticamente os novos arquivos
```

## Variável de ambiente nova (adicione no .env da VPS)
```
JWT_SECRET=gere_uma_chave_forte_aqui
```
Gere com: `openssl rand -hex 32`
