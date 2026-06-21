ARG NODE22_RUNTIME_IMAGE=node:22-alpine
FROM ${NODE22_RUNTIME_IMAGE} AS runtime
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN addgroup -g 1001 -S nodejs \
  && adduser -S -u 1001 -G nodejs nextjs

COPY apps/witnessops-web/.next/standalone ./
COPY apps/witnessops-web/.next/static ./apps/witnessops-web/.next/static
COPY apps/witnessops-web/public ./apps/witnessops-web/public

RUN mkdir -p apps/witnessops-web/.next/cache \
  && chown -R nextjs:nodejs \
    apps/witnessops-web/.next/cache \
    apps/witnessops-web/.next/server/app

USER nextjs
EXPOSE 3000

CMD ["node", "apps/witnessops-web/server.js"]