ARG NODE22_RUNTIME_IMAGE=node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
ARG GWS_VERSION=0.22.5
ARG GWS_TARGET=x86_64-unknown-linux-musl
ARG GWS_SHA256=4db473dde4b1ab872e4ff35d769b0d4af1f1a6441a605e79d5cf8ada9c87e920
FROM ${NODE22_RUNTIME_IMAGE} AS runtime
ARG GWS_VERSION
ARG GWS_TARGET
ARG GWS_SHA256
# The pinned Node base still carries OpenSSL 3.5.7. Exact package constraints
# fail closed if these patched versions are unavailable; never use apk upgrade.
RUN apk add --no-cache libcrypto3=3.5.8-r0 libssl3=3.5.8-r0 libc6-compat ca-certificates curl \
  && curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
    "https://github.com/googleworkspace/cli/releases/download/v${GWS_VERSION}/google-workspace-cli-${GWS_TARGET}.tar.gz" \
    --output /tmp/gws.tar.gz \
  && echo "${GWS_SHA256}  /tmp/gws.tar.gz" | sha256sum -c - \
  && tar -xzf /tmp/gws.tar.gz -C /tmp \
  && install -m 0755 /tmp/gws /usr/local/bin/gws \
  && rm -f /tmp/gws.tar.gz /tmp/gws \
  && apk del curl \
  && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn-* \
  && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/pnpm /usr/local/bin/pnpx /usr/local/bin/yarn /usr/local/bin/yarnpkg
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN addgroup -g 1001 -S nodejs \
  && adduser -S -u 1001 -G nodejs nextjs

COPY apps/witnessops-web/.next/standalone ./
COPY apps/witnessops-web/.next/static ./apps/witnessops-web/.next/static
COPY apps/witnessops-web/public ./apps/witnessops-web/public
COPY content/witnessops/skills ./content/witnessops/skills

RUN mkdir -p apps/witnessops-web/.next/cache \
  && chown -R nextjs:nodejs \
    apps/witnessops-web/.next/cache \
    apps/witnessops-web/.next/server/app

USER nextjs
EXPOSE 3000

CMD ["node", "apps/witnessops-web/server.js"]
