FROM node:20-alpine AS fe-builder
WORKDIR /fe
COPY bestbank_fe/package*.json ./
RUN npm ci
COPY bestbank_fe/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY bestbank_be/package*.json ./
RUN npm ci
COPY bestbank_be/ ./
COPY --from=fe-builder /fe/dist ./public
EXPOSE 3000
CMD ["npx", "tsx", "src/server.ts"]
