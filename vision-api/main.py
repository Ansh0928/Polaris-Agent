import io
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from ultralytics import YOLO

app = FastAPI(title="Warehouse Vision API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

model = YOLO("yolov8n.pt")  # downloads on first run (~6MB)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/detect")
async def detect(image: UploadFile = File(...)):
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
