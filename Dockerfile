# syntax=docker/dockerfile:1

# ---- Fase 1: build del frontend (qui servono TypeScript, Vite e gli altri strumenti di sviluppo) ----
FROM node:24.20.0-slim AS build
WORKDIR /app

# Prima solo i package.json: se il codice cambia ma le dipendenze no, Docker riusa lo strato di "npm ci".
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
# Certificato facoltativo per chi ha un antivirus che intercetta l'HTTPS (es. Norton): arriva come secret,
# esiste solo durante questo comando e non finisce in nessuno strato dell'immagine. Su Render non c'è.
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci

COPY . .
RUN npm run build

# ---- Fase 2: immagine finale, solo quello che serve per far girare il server ----
FROM node:24.20.0-slim
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
# Solo le dipendenze di produzione delle API (niente React, Vite, TypeScript).
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca npm ci --omit=dev -w @discoverevent/api \
    && npm cache clean --force

COPY packages/shared packages/shared
COPY apps/api apps/api
# Dalla fase 1 prendiamo solo il risultato della build, non gli strumenti.
COPY --from=build /app/apps/web/dist apps/web/dist

# Il server non gira come root: se qualcuno trovasse una falla, non avrebbe il controllo del container.
# La cartella del database è l'unica in cui il server deve poter scrivere.
RUN mkdir -p apps/api/data && chown node:node apps/api/data
USER node

ENV STATIC_DIR=/app/apps/web/dist
EXPOSE 3001
CMD ["npm", "start"]
