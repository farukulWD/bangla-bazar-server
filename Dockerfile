# syntax=docker/dockerfile:1


ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
WORKDIR /app

RUN npm install -g pnpm@11.24.0


FROM base AS build
COPY package.json pnpm-workspace.yaml ./

RUN pnpm install
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM base AS prod-deps
COPY package.json pnpm-workspace.yaml ./
COPY --from=build /app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app


RUN mkdir -p /app/uploads /app/logs && chown -R node:node /app

COPY --chown=node:node package.json ./
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node


EXPOSE 5000

CMD ["node", "dist/server.js"]
