# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN DATABASE_URL=file:/tmp/build.db npm run build

FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

FROM alpine:3.24 AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATABASE_URL=file:/data/seenornot.db
RUN apk add --no-cache libstdc++ ca-certificates \
    && addgroup -g 1000 node && adduser -D -u 1000 -G node node \
    && mkdir /data && chown node:node /data
COPY --from=build /usr/local/bin/node /usr/local/bin/node
COPY --from=build /app/build ./build
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts/create-user.mjs /app/scripts/password.mjs ./scripts/
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "build"]
