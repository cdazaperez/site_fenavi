FROM node:22-alpine AS base

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

RUN apk del python3 make g++

COPY src/ ./src/
COPY public/ ./public/
COPY views/ ./views/

RUN mkdir -p /app/data /app/public/docs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

RUN addgroup -g 1001 -S fenavi && \
    adduser -S fenavi -u 1001 -G fenavi && \
    chown -R fenavi:fenavi /app

USER fenavi

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/pasos || exit 1

CMD ["node", "src/server.js"]
