import io
import os
import threading

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

MODEL_PATH = "yolov8n.onnx"
CONF_THRESHOLD = 0.25
IOU_THRESHOLD = 0.45
INPUT_SIZE = 640

COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck",
    "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
    "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
    "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
    "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
    "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
    "toothbrush",
]

session = None


def _load_model():
    global session
    session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])


threading.Thread(target=_load_model, daemon=True).start()

app = FastAPI(title="Warehouse Vision API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def _preprocess(img: Image.Image):
    orig_w, orig_h = img.size
    scale = INPUT_SIZE / max(orig_w, orig_h)
    nw, nh = int(orig_w * scale), int(orig_h * scale)
    resized = img.resize((nw, nh), Image.BILINEAR)
    canvas = Image.new("RGB", (INPUT_SIZE, INPUT_SIZE), (114, 114, 114))
    px, py = (INPUT_SIZE - nw) // 2, (INPUT_SIZE - nh) // 2
    canvas.paste(resized, (px, py))
    arr = np.array(canvas, dtype=np.float32) / 255.0
    return np.expand_dims(arr.transpose(2, 0, 1), 0), scale, px, py


def _nms(boxes_xyxy: np.ndarray, scores: np.ndarray) -> list:
    x1, y1, x2, y2 = boxes_xyxy.T
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = np.maximum(0, xx2 - xx1) * np.maximum(0, yy2 - yy1)
        iou = inter / (areas[i] + areas[order[1:]] - inter)
        order = order[1:][iou <= IOU_THRESHOLD]
    return keep


def _postprocess(output, scale, px, py):
    pred = output[0][0]          # (84, 8400)
    boxes_cxcywh = pred[:4].T    # (8400, 4) — cx,cy,w,h in padded-image space
    class_scores = pred[4:].T    # (8400, 80)

    cls_ids = class_scores.argmax(axis=1)
    confs = class_scores[np.arange(len(cls_ids)), cls_ids]

    mask = confs >= CONF_THRESHOLD
    if not mask.any():
        return []

    boxes_cxcywh = boxes_cxcywh[mask]
    confs = confs[mask]
    cls_ids = cls_ids[mask]

    cx, cy, w, h = boxes_cxcywh.T
    boxes_xyxy = np.stack([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2], axis=1)
    keep = _nms(boxes_xyxy, confs)

    results = []
    for i in keep:
        cx_o = (boxes_cxcywh[i, 0] - px) / scale
        cy_o = (boxes_cxcywh[i, 1] - py) / scale
        w_o = boxes_cxcywh[i, 2] / scale
        h_o = boxes_cxcywh[i, 3] / scale
        cls = int(cls_ids[i])
        results.append({
            "class": COCO_CLASSES[cls] if cls < len(COCO_CLASSES) else str(cls),
            "confidence": round(float(confs[i]), 3),
            "bbox": {"x": round(cx_o, 1), "y": round(cy_o, 1), "w": round(w_o, 1), "h": round(h_o, 1)},
        })
    return results


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": session is not None}


@app.post("/detect")
async def detect(image: UploadFile = File(...)):
    if session is None:
        raise HTTPException(status_code=503, detail="Model still loading, try again in 30s")
    contents = await image.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")
    arr, scale, px, py = _preprocess(img)
    output = session.run(None, {session.get_inputs()[0].name: arr})
    objects = _postprocess(output, scale, px, py)
    return {"count": len(objects), "objects": objects}
