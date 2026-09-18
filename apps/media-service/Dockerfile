FROM node:20-alpine AS builder
WORKDIR /app

COPY tsconfig.base.json ./tsconfig.base.json
COPY package.json ./package.json
COPY package-lock.json ./package-lock.json
COPY apps/media-service/package.json ./apps/media-service/package.json
COPY apps/media-service/tsconfig.json ./apps/media-service/tsconfig.json
COPY apps/media-service/src ./apps/media-service/src

RUN npm ci --workspace=apps/media-service --include-workspace-root

WORKDIR /app/apps/media-service
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/apps/media-service
ENV NODE_ENV=production

COPY --from=builder /app/apps/media-service/package.json ./
COPY --from=builder /app/apps/media-service/node_modules ./node_modules
COPY --from=builder /app/apps/media-service/dist ./dist

EXPOSE 3002
CMD ["node", "dist/main.js"]
