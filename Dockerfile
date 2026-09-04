# syntax=docker/dockerfile:1

# Runs the TypeScript server (src/ -> dist/src/server.js), not the legacy
# api/index.js monolith. The deploy workflow's .env keys match
# src/app/config/index.ts, so the two must stay on the same entrypoint.
ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
WORKDIR /app
# npm -g rather than corepack: the corepack bundled with the image rejects
# newer pnpm releases over signing keys it does not know about. The version is
# pinned because pnpm-workspace.yaml uses the allowBuilds key.
RUN npm install -g pnpm@11.24.0

# bcrypt 6 ships prebuilt linux-x64 and linux-arm64 binaries in its prebuilds/
# directory, so no compiler toolchain is needed in any stage.
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Both are written at runtime: uploads by queues/products.worker.ts, logs by
# shared/logger.ts (winston daily-rotate). Created before USER so the
# unprivileged user owns them even when compose mounts an empty volume over
# them.
RUN mkdir -p /app/uploads /app/logs && chown -R node:node /app

COPY --chown=node:node package.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

# Documentation only — the real port comes from PORT in .env, and compose
# publishes ${PORT}:${PORT}.
EXPOSE 5000

CMD ["node", "dist/src/server.js"]
