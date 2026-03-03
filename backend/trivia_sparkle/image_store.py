import json
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import FileSystemStorage

from .default_questions import IMAGE_KEYS

DATA_DIR = Path(__file__).resolve().parent / "data"
CUSTOM_IMAGES_FILE = DATA_DIR / "custom_images.json"

DEFAULT_IMAGES = [
    {"key": "question-horse", "label": "Caballo pregunta (demo)", "url": None, "source": "builtin"},
    {"key": "horse-white", "label": "Caballo blanco (demo)", "url": None, "source": "builtin"},
    {"key": "horse-brown", "label": "Caballo marron (demo)", "url": None, "source": "builtin"},
    {"key": "horse-black", "label": "Caballo negro (demo)", "url": None, "source": "builtin"},
    {"key": "horse-gray", "label": "Caballo gris (demo)", "url": None, "source": "builtin"},
]


def _ensure_custom_images_file() -> None:
    """Crea archivo JSON de imágenes custom si no existe."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CUSTOM_IMAGES_FILE.exists():
        CUSTOM_IMAGES_FILE.write_text("[]", encoding="utf-8")


def _load_custom_images() -> list[dict]:
    """Lee catálogo de imágenes personalizadas."""
    _ensure_custom_images_file()
    raw = CUSTOM_IMAGES_FILE.read_text(encoding="utf-8")
    payload = json.loads(raw)
    if not isinstance(payload, list):
        return []
    return payload


def _save_custom_images(custom_images: list[dict]) -> None:
    """Persiste catálogo de imágenes personalizadas."""
    _ensure_custom_images_file()
    CUSTOM_IMAGES_FILE.write_text(json.dumps(custom_images, ensure_ascii=False, indent=2), encoding="utf-8")


def list_image_catalog() -> list[dict]:
    """Devuelve catálogo combinado: imágenes demo + imágenes custom."""
    custom_images = _load_custom_images()
    return [*DEFAULT_IMAGES, *custom_images]


def list_custom_images() -> list[dict]:
    """Devuelve solamente imágenes custom."""
    return _load_custom_images()


def replace_custom_images(custom_images: list[dict]) -> None:
    """Reemplaza catálogo custom validando formato mínimo."""
    if not isinstance(custom_images, list):
        raise ValueError("Formato inválido para imágenes personalizadas.")
    for item in custom_images:
        if not isinstance(item, dict):
            raise ValueError("Formato inválido para imágenes personalizadas.")
        if not item.get("key") or not str(item.get("key")).startswith("custom-"):
            raise ValueError("Clave inválida en imágenes personalizadas.")
        if not isinstance(item.get("label"), str):
            raise ValueError("Label inválido en imágenes personalizadas.")
        if not isinstance(item.get("url"), str):
            raise ValueError("URL inválida en imágenes personalizadas.")
        item["source"] = "custom"
    _save_custom_images(custom_images)


def list_image_keys() -> list[str]:
    """Devuelve todas las keys disponibles para selects del frontend."""
    return [item["key"] for item in list_image_catalog()]


def upload_custom_image(uploaded_file) -> dict:
    """Guarda archivo subido en MEDIA_ROOT y registra metadata."""
    if uploaded_file is None:
        raise ValueError("No se recibió archivo.")

    media_dir = Path(settings.MEDIA_ROOT) / "trivia_sparkle_images"
    media_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(uploaded_file.name).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        raise ValueError("Formato no soportado. Usa JPG, PNG, WEBP o GIF.")

    key = f"custom-{uuid4().hex[:10]}"
    filename = f"{key}{extension}"
    storage = FileSystemStorage(location=str(media_dir), base_url=f"{settings.MEDIA_URL}trivia_sparkle_images/")
    saved_name = storage.save(filename, uploaded_file)

    entry = {
        "key": key,
        "label": uploaded_file.name,
        "url": storage.url(saved_name),
        "source": "custom",
    }

    custom_images = _load_custom_images()
    custom_images.append(entry)
    _save_custom_images(custom_images)
    return entry


def resolve_image_url(image_key: str | None) -> str | None:
    """Resuelve URL pública desde una key de imagen."""
    if image_key is None:
        return None
    for image in list_image_catalog():
        if image["key"] == image_key:
            return image.get("url")
    return None
