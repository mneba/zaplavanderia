# 🚀 ZapLavanderia — Fase 1 na VPS Contabo (Ubuntu 24.04)

Objetivo desta fase: bot de IA atendendo num número de teste, com todas as
conversas salvas no banco. Tempo estimado: 30–40 min.

Tudo abaixo é executado **na VPS via SSH como root**, exceto onde indicado.

---

## Passo 1 — Atualizar o sistema e instalar o Docker (jeito oficial)

```bash
apt update && apt upgrade -y

# Repositório oficial do Docker
apt install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

docker --version   # deve mostrar a versão ✅
```

## Passo 2 — Firewall

```bash
apt install -y ufw
ufw allow OpenSSH
ufw --force enable
```

(Só SSH liberado. Postgres, Evolution e app escutam apenas em 127.0.0.1 —
nada exposto pra internet nesta fase.)

## Passo 3 — Subir o projeto para a VPS

No **seu computador**, na pasta onde descompactou o zip:

```bash
scp -r zaplavanderia root@IP_DA_VPS:/opt/
```

(Windows sem terminal: WinSCP, arraste a pasta `zaplavanderia` para `/opt/`.)

## Passo 4 — Configurar as senhas

Na VPS:

```bash
cd /opt/zaplavanderia
cp .env.example .env

# Gere as duas chaves e anote (vamos usar a da Evolution depois):
openssl rand -hex 24   # use como POSTGRES_PASSWORD
openssl rand -hex 24   # use como EVOLUTION_API_KEY

nano .env              # cole as chaves + sua ANTHROPIC_API_KEY. Ctrl+O salva, Ctrl+X sai
```

## Passo 5 — Subir tudo

```bash
cd /opt/zaplavanderia
docker compose up -d --build
```

A primeira vez demora alguns minutos (baixa imagens e compila o app).
Verifique:

```bash
docker compose ps                      # os 3 serviços devem estar "running/healthy"
curl http://localhost:3000/health      # deve responder {"ok":true,...}
docker compose logs -f app             # logs do app (Ctrl+C para sair)
```

## Passo 6 — Cadastrar a primeira lavanderia (de teste)

Edite os dados de exemplo se quiser (`app/exemplos/lavanderia.exemplo.json`)
e rode (troque o número pelo SEU WhatsApp — você é o "dono" desse teste):

```bash
docker compose exec app node scripts/criar-lavanderia.js \
  --slug lav-teste \
  --nome "Lavanderia Teste" \
  --dono 5511951457902 \
  --config exemplos/lavanderia.exemplo.json
```

## Passo 7 — Conectar o número de WhatsApp (QR Code)

No **seu computador**, abra um túnel SSH (deixa o manager da Evolution
acessível só pra você, sem expor na internet):

```bash
ssh -L 8080:localhost:8080 root@IP_DA_VPS
```

Com o túnel aberto, no navegador do seu computador:

1. Acesse `http://localhost:8080/manager`
2. Login: cole a sua `EVOLUTION_API_KEY`
3. Clique na instância **lav-teste** → **Get QR Code**
4. No celular com o número de TESTE (⚠️ não use seu número pessoal):
   WhatsApp → Configurações → Dispositivos conectados → Conectar dispositivo → escaneie

Quando aparecer "open/connected", está no ar.

## Passo 8 — Testar! 🎉

De um terceiro celular (ou peça pra alguém), mande mensagem pro número
de teste:

- "oi, quanto custa pra lavar?" → deve responder os preços do JSON
- "a máquina 3 travou, paguei e não ligou" → deve coletar dados do chamado
- "quero falar com um atendente" → deve escalar: VOCÊ recebe o alerta
  no seu WhatsApp (o número do --dono) com instruções
- Responda no número da lavanderia: `liberar 55XXXXXXXXXXX` → bot reativa

Ver as conversas gravadas no banco:

```bash
docker compose exec postgres psql -U zapadmin -d zaplavanderia \
  -c 'SELECT autor, texto, "criadaEm" FROM "Mensagem" ORDER BY "criadaEm" DESC LIMIT 10;'
```

---

## Comandos úteis do dia a dia

```bash
docker compose logs -f app        # acompanhar o bot em tempo real
docker compose restart app        # reiniciar só o app
docker compose down               # parar tudo (dados ficam preservados)
docker compose up -d              # subir de novo
```

## Se algo der errado

Me mande a saída de:
```bash
docker compose ps
docker compose logs --tail 50 app
docker compose logs --tail 50 evolution
```
