# Stage 1 — export ONNX model (cached after first build; PyTorch not in final image)
FROM python:3.11-slim AS exporter
RUN pip install --no-cache-dir "ultralytics==8.2.0"
RUN python -c "\
from ultralytics import YOLO; \
import shutil; \
shutil.copy(str(YOLO('yolov8n.pt').export(format='onnx', imgsz=640)), '/yolov8n.onnx')"

# Stage 2 — lean runtime (~150 MB RAM, fits Render free tier 512 MB)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=exporter /yolov8n.onnx ./yolov8n.onnx
COPY main.py .
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
