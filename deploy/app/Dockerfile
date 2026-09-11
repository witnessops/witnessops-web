# Build only from a reviewed source archive; never use a checkout containing local env files.
FROM node:22.23.2-alpine3.24@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY . .
ENV NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://app.witnessops.com/callback
RUN pnpm install --frozen-lockfile && pnpm --filter @witnessops/app build

FROM node:22.23.2-alpine3.24@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
# The pinned upstream image still carries the previous OpenSSL patch.
RUN apk add --no-cache --upgrade libcrypto3=3.5.8-r0 libssl3=3.5.8-r0 \
    && rm -rf /usr/local/lib/node_modules /opt/yarn-v1.22.22 \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/docker-entrypoint.sh \
    && addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs
ARG SOURCE_COMMIT
ARG SOURCE_DIRTY
ARG BUILD_INPUT_SHA256
LABEL org.opencontainers.image.revision=$SOURCE_COMMIT \
      com.witnessops.source-dirty=$SOURCE_DIRTY \
      com.witnessops.build-input-sha256=$BUILD_INPUT_SHA256
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3020 NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://app.witnessops.com/callback
WORKDIR /app
COPY --from=builder /app/apps/witnessops-app/.next/standalone ./
COPY --from=builder /app/apps/witnessops-app/.next/static ./apps/witnessops-app/.next/static
USER nextjs
ENTRYPOINT ["node"]
CMD ["apps/witnessops-app/server.js"]
