FROM python:3.11-slim

WORKDIR /app

# system deps that help native wheels / runtime stability
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# app code
COPY app ./app
COPY python /app/python


# ephemeris data files
COPY ephe ./ephe

ENV PORT=8080
ENV SE_EPHE_PATH=/app/ephe

CMD ["uvicorn", "app.main:app", "--host=0.0.0.0", "--port=8080"]
