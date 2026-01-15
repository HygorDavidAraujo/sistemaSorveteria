FROM node:22-alpine AS build

RUN apk add --no-cache openssl bash

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

# Instala com devDependencies para compilar (tsc + tsc-alias)
RUN npm ci

COPY . .

RUN chmod +x ./entrypoint.sh
RUN npm run build


FROM node:22-alpine AS runtime

RUN apk add --no-cache openssl bash wget

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma

# Instala apenas dependências de runtime (inclui prisma CLI em dependencies)
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/entrypoint.sh ./entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
