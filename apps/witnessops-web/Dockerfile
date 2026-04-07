FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY apps/witnessops-web/.next/standalone ./
COPY apps/witnessops-web/.next/static ./apps/witnessops-web/.next/static
COPY apps/witnessops-web/public ./apps/witnessops-web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/witnessops-web/server.js"]
