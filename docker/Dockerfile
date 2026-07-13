# ─────────────────────────────────────────────────────────────────────────────
# Development Dockerfile
#
# Runs the API via ts-node (hot reload with nodemon).
# Do NOT use this image in production — it contains devDependencies,
# TypeScript source, and lacks the hardening of Dockerfile.prod.
#
# Usage:
#   docker compose up --build
#
# Hot reload:  src/ is volume-mounted from the host so nodemon picks up
#              file changes without rebuilding the image.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-alpine

WORKDIR /app

# ── Install dependencies ──────────────────────────────────────────────────────
# Copy lock files first. Docker only re-runs this layer when package*.json
# changes — all other source edits hit the cache.
#
# `npm ci` (not `npm install`): deterministic, clean installs only, fails
# if package-lock.json is out of sync.
#
# BuildKit cache mount: the ~/.npm cache directory is persisted on the Docker
# host between builds. Packages are not re-downloaded from the registry unless
# the lockfile actually changes.
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ── Copy TypeScript configuration ─────────────────────────────────────────────
# tsconfig.json is required by ts-node at runtime for path alias resolution
# (@/* → src/*). The src/ directory itself is NOT copied here — it is
# volume-mounted in docker-compose.yml so edits are reflected immediately.
COPY tsconfig.json ./

# ── Runtime environment ───────────────────────────────────────────────────────
ENV NODE_ENV=local

EXPOSE 3000

# ── Health check ──────────────────────────────────────────────────────────────
# start-period is generous because ts-node compilation takes 15-30s on cold
# start before the HTTP server is ready to accept connections.
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

CMD ["npm", "run", "dev"]
