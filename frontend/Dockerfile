# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Production build — VITE_API_URL is intentionally empty so the browser
# uses relative /api paths that nginx reverse-proxies to the backend.
RUN npm run build

# ── Stage 2: serve ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove the default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy the built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config: serve the SPA and reverse-proxy /api to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
