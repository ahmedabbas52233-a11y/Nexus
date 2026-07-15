# Nexus backend — container image for Docker-based hosts
# (Back4app Containers, Fly.io, Render, or any platform that deploys a Dockerfile)
FROM node:20-slim

# sqlite3 (native module) needs build tools to compile on install
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching on rebuilds)
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# On platforms that support a mounted persistent volume (e.g. Fly.io
# volumes), point it here so the SQLite DB and uploaded files survive
# restarts/redeploys. On platforms without volume support (e.g. Back4app
# Containers' free tier, as far as we've confirmed), this directory is
# just as ephemeral as the rest of the container - fine for a demo,
# not for data you need to keep long-term. See backend/README.md.
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DB_PATH=/data/nexus.db
ENV UPLOADS_DIR=/data/uploads

EXPOSE 8080
ENV PORT=8080

CMD ["node", "src/server.js"]
