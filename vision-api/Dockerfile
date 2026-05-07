FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Pre-download YOLOv8n model into /app during build so startup is instant
ENV YOLO_CONFIG_DIR=/app/.yolo
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
COPY main.py .
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
