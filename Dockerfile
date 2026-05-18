# ── Stage 1: build the React frontend ────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Supabase anon key + URL are public-facing by design — safe to bake in
ARG VITE_SUPABASE_URL=https://zigtbxnhlmdgwfmfdluk.supabase.co
ARG VITE_SUPABASE_ANON_KEY=sb_publishable_WuMmkOJWVnEaXuiZlmiIzw__FxmjvHG
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

# ── Stage 2: Django backend ───────────────────────────────────────────────
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Copy the React build so Django/whitenoise can serve it
COPY --from=frontend /app/dist ./dist

RUN python manage.py collectstatic --noinput
RUN chmod +x start.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["./start.sh"]
