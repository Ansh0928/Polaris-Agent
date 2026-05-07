import io
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from ultralytics import YOLO

model = None

os.environ.setdefault("YOLO_CONFIG_DIR", "/app/.yolo")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    model = YOLO("yolov8n.pt")
    yield


app = FastAPI(title="Warehouse Vision API", lifespan=lifespan)

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
        raise HTTPException(status_code=503, detail="Model not loaded yet")
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
