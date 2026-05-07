import io
import os
import threading
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from ultralytics import YOLO

os.environ.setdefault("YOLO_CONFIG_DIR", "/app/.yolo")

model = None
model_ready = threading.Event()


def _load_model():
    global model
    model = YOLO("yolov8n.pt")
    model_ready.set()


# Load model in background so uvicorn starts immediately
threading.Thread(target=_load_model, daemon=True).start()

app = FastAPI(title="Warehouse Vision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.post("/detect")
async def detect(image: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model still loading, try again in 30s")
    contents = await image.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    results = model(img, verbose=False)
    objects = []
    for result in results:
        for box in result.boxes:
            xywh = box.xywh[0].tolist()
            objects.append({
                "class": result.names[int(box.cls)],
                "confidence": round(float(box.conf), 3),
                "bbox": {"x": xywh[0], "y": xywh[1], "w": xywh[2], "h": xywh[3]},
            })
    return {"count": len(objects), "objects": objects}
