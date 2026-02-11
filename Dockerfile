# --- Stage 1: Build the Vite frontend ---
FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

# Build with empty VITE_API_URL so the frontend uses relative URLs (same origin)
ENV VITE_API_URL=
RUN npm run build

# --- Stage 2: Production image ---
FROM node:20-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

# Copy server source
COPY server ./server
COPY tsconfig.json ./

# Copy the built frontend from the build stage
COPY --from=build /app/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["tsx", "server/index.ts"]
