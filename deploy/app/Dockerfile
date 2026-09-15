# Build only from a reviewed source archive; never use a checkout containing local env files.
FROM node:22.23.2-alpine3.24@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY . .
ENV NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://app.witnessops.com/callback
RUN pnpm install --frozen-lockfile && pnpm --filter @witnessops/app build

FROM node:22.23.2-alpine3.24@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS producer
RUN apk add --no-cache python3=3.14.7-r1 py3-pip=26.1.2-r0
COPY tests/server-check/producer /build/producer
# This archive contains the exact accepted producer source, not a replacement implementation.
RUN mkdir -p /opt/witnessops && python3 /build/producer/prepare.py /opt/witnessops/finalizer \
    && rm -rf /opt/witnessops/finalizer/venv/lib/python*/site-packages/pip* \
      /opt/witnessops/finalizer/venv/lib/python*/site-packages/setuptools* \
      /opt/witnessops/finalizer/venv/bin/pip* \
    && chmod -R go-w /opt/witnessops/finalizer \
    && chmod 755 /opt/witnessops/finalizer

FROM node:22.23.2-alpine3.24@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
# The pinned upstream image still carries the previous OpenSSL patch.
RUN apk add --no-cache --upgrade libcrypto3=3.5.8-r0 libssl3=3.5.8-r0 python3=3.14.7-r1 \
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
COPY --from=producer /opt/witnessops/finalizer /opt/witnessops/finalizer
COPY deploy/app/finalizer-readiness.py /opt/witnessops/finalizer-readiness.py
COPY apps/witnessops-web/src/lib/proofpack/trust/local-audit-registry-v1.json /opt/witnessops/registry.json
USER nextjs
ENTRYPOINT ["node"]
CMD ["apps/witnessops-app/server.js"]
