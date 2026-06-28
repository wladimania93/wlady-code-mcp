# ---- Build stage ----
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:22-alpine
# needed to compile better-sqlite3 native bindings at install time
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++
COPY --from=builder /app/dist ./dist

# Persistent storage for the symbol DB and downloaded models
VOLUME ["/root/.wlady-code-mcp"]
# Mount your codebase here and pass it to index_repository
VOLUME ["/workspace"]

# Visualization UI
EXPOSE 9750

CMD ["node", "dist/index.js"]
