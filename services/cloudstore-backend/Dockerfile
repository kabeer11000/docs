FROM oven/bun:1-debian

WORKDIR /app
COPY . .
RUN bun install --production

ENV NODE_ENV=production
CMD ["bun", "run", "src/index.ts"]
