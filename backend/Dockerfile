FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci

COPY backend/ ./backend/
WORKDIR /app/backend

RUN npx prisma generate --schema=prisma/schema.prisma
RUN npx tsc && npx tsc-alias

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "dist/server.js"]
