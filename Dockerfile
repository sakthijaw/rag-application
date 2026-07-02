FROM python:3.11-slim

# HF Spaces requires port 7860
ENV PORT=7860
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Model cache inside the image (baked in during build)
ENV SENTENCE_TRANSFORMERS_HOME=/app/.cache/sentence_transformers

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install deps first so this layer is cached on re-builds
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the embedding model into the image.
# This runs during docker build so the Space starts instantly with no download delay.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code and pre-built data (FAISS index, metadata)
COPY . .

EXPOSE 7860

CMD ["python", "api_server.py"]
