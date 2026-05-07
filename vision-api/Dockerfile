FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Download pre-exported YOLOv8n ONNX model (12.8 MB) — no PyTorch needed at runtime
RUN wget -q "https://huggingface.co/Kalray/yolov8/resolve/main/yolov8n.onnx" -O yolov8n.onnx
COPY main.py .
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
