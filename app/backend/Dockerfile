FROM python:3.12-slim
 
WORKDIR /app/backend
 
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-pip \
 && rm -rf /var/lib/apt/lists/*
 
COPY requirements.txt .
 
RUN pip install --no-cache-dir -r requirements.txt
 
COPY . .
 
EXPOSE 3000
 
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
