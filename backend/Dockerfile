# ── THERMA backend ─────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Install Python deps first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# ML outputs are mounted at runtime via docker-compose volume,
# so ML_OUTPUTS_DIR env var points to /ml-outputs in the container.
ENV ML_OUTPUTS_DIR=/ml-outputs

EXPOSE 8000

# --workers 1 keeps things simple for a hackathon; bump for prod
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
