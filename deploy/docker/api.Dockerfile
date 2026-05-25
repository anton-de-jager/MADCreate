# syntax=docker/dockerfile:1.7

# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install build deps
RUN apk add --no-cache python3 make g++ openssl

# Copy workspace manifests first for better layer caching
COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY database/prisma ./database/prisma

RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Generate prisma client and build
RUN npx prisma generate --schema=database/prisma/schema.prisma
RUN npm run build --workspace @madcreate/shared
RUN npm run build --workspace @madcreate/api

# ---------- Stage 2: Runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
RUN apk add --no-cache openssl tini

# Copy production node_modules + built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/database/prisma ./database/prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/main.js"]
