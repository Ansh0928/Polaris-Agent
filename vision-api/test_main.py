import io
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient


def make_jpeg_bytes() -> bytes:
    arr = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_detect_returns_valid_shape():
    from main import app
    client = TestClient(app)
    response = client.post(
        "/detect",
        files={"image": ("frame.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "count" in data
    assert "objects" in data
    assert isinstance(data["count"], int)
    assert isinstance(data["objects"], list)


def test_detect_count_matches_objects_length():
    from main import app
    client = TestClient(app)
    response = client.post(
        "/detect",
        files={"image": ("frame.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    data = response.json()
    assert data["count"] == len(data["objects"])


def test_detect_object_schema():
    from main import app
    client = TestClient(app)
    response = client.post(
        "/detect",
        files={"image": ("frame.jpg", make_jpeg_bytes(), "image/jpeg")},
    )
    data = response.json()
    for obj in data["objects"]:
        assert "class" in obj
        assert "confidence" in obj
        assert "bbox" in obj
        assert all(k in obj["bbox"] for k in ("x", "y", "w", "h"))


def test_health():
    from main import app
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
