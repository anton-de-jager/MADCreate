# syntax=docker/dockerfile:1.7

# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm install --workspaces --include-workspace-root --no-audit --no-fund

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN npm run build --workspace @madcreate/shared
RUN npm run build --workspace @madcreate/web

# ---------- Stage 2: Runtime (nginx) ----------
FROM nginx:1.27-alpine AS runtime
COPY deploy/docker/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist/madcreate-web/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
