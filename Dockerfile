FROM node:20-slim AS builder
WORKDIR /app

COPY package.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json

RUN npm install --prefix server
RUN npm install --prefix client

COPY . .

RUN npm run build --prefix client
RUN npm run build --prefix server

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/node_modules ./server/node_modules
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
