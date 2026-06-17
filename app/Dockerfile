FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache git python3 make g++ && npm install --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Na inicialização: sincroniza o schema com o banco e sobe o servidor
CMD npx prisma db push --skip-generate && node src/server.js
