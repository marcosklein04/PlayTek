import json
import re
from pathlib import Path

# Archivo JSON que persiste la configuración general del juego.
DATA_DIR = Path(__file__).resolve().parent / "data"
CONFIG_FILE = DATA_DIR / "game_config.json"

DEFAULT_START_STYLE = {
    "backgroundTop": "#1f1e66",
    "backgroundMiddle": "#1c4f9c",
    "backgroundBottom": "#2b2f72",
    "overlayColor": "#0f1254",
    "overlayOpacity": 0.75,
    "stripeColor": "#1b55ae",
    "stripeOpacity": 0.55,
    "titleBackground": "#f97316",
    "titleBorder": "#fef08a",
    "titleText": "#1e2184",
    "frameOuterBackground": "#612fa5",
    "frameOuterBorder": "#22d3ee",
    "frameInnerBorder": "#22d3ee",
    "pillsBackground": "#22319f",
    "pillsBorder": "#22d3ee",
    "pillsText": "#ffffff",
    "buttonFrom": "#facc15",
    "buttonTo": "#fb923c",
    "buttonText": "#171a5f",
}

DEFAULT_CONFIG = {
    "startScreen": {
        "title": "TRIVIA SPARKLE",
        "heroImageKey": None,
        "backgroundImageKey": None,
        "startButtonText": "Empezar a jugar",
        "showLivesPill": True,
        "showTimerPill": True,
        "showQuestionsPill": True,
        "style": DEFAULT_START_STYLE,
    },
    "gameplay": {
        "lives": 3,
        "secondsPerQuestion": 30,
        "questionsPerGame": 10,
    },
}


def _normalize_hex_color(value, fallback):
    """Valida color hex #RRGGBB; si no, devuelve fallback."""
    if not isinstance(value, str):
        return fallback
    color = value.strip()
    if re.match(r"^#[0-9a-fA-F]{6}$", color):
        return color.lower()
    return fallback


def _normalize_opacity(value, fallback):
    """Normaliza opacidad a rango 0..1."""
    try:
        num = float(value)
    except (TypeError, ValueError):
        return fallback
    return max(0.0, min(1.0, num))


def _ensure_config_file() -> None:
    """Crea archivo de configuración con defaults si no existe."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CONFIG_FILE.exists():
        CONFIG_FILE.write_text(json.dumps(DEFAULT_CONFIG, ensure_ascii=False, indent=2), encoding="utf-8")


def load_config() -> dict:
    """Carga y normaliza la configuración persistida."""
    _ensure_config_file()
    raw = CONFIG_FILE.read_text(encoding="utf-8")
    payload = json.loads(raw)
    start_payload = payload.get("startScreen", {})
    gameplay_payload = payload.get("gameplay", {})
    style_payload = start_payload.get("style", {})

    return {
        "startScreen": {
            "title": str(start_payload.get("title", DEFAULT_CONFIG["startScreen"]["title"])),
            "heroImageKey": start_payload.get("heroImageKey"),
            "backgroundImageKey": start_payload.get("backgroundImageKey"),
            "startButtonText": str(
                start_payload.get("startButtonText", DEFAULT_CONFIG["startScreen"]["startButtonText"])
            ),
            "showLivesPill": bool(start_payload.get("showLivesPill", True)),
            "showTimerPill": bool(start_payload.get("showTimerPill", True)),
            "showQuestionsPill": bool(start_payload.get("showQuestionsPill", True)),
            "style": {
                "backgroundTop": _normalize_hex_color(style_payload.get("backgroundTop"), DEFAULT_START_STYLE["backgroundTop"]),
                "backgroundMiddle": _normalize_hex_color(
                    style_payload.get("backgroundMiddle"), DEFAULT_START_STYLE["backgroundMiddle"]
                ),
                "backgroundBottom": _normalize_hex_color(
                    style_payload.get("backgroundBottom"), DEFAULT_START_STYLE["backgroundBottom"]
                ),
                "overlayColor": _normalize_hex_color(style_payload.get("overlayColor"), DEFAULT_START_STYLE["overlayColor"]),
                "overlayOpacity": _normalize_opacity(style_payload.get("overlayOpacity"), DEFAULT_START_STYLE["overlayOpacity"]),
                "stripeColor": _normalize_hex_color(style_payload.get("stripeColor"), DEFAULT_START_STYLE["stripeColor"]),
                "stripeOpacity": _normalize_opacity(style_payload.get("stripeOpacity"), DEFAULT_START_STYLE["stripeOpacity"]),
                "titleBackground": _normalize_hex_color(
                    style_payload.get("titleBackground"), DEFAULT_START_STYLE["titleBackground"]
                ),
                "titleBorder": _normalize_hex_color(style_payload.get("titleBorder"), DEFAULT_START_STYLE["titleBorder"]),
                "titleText": _normalize_hex_color(style_payload.get("titleText"), DEFAULT_START_STYLE["titleText"]),
                "frameOuterBackground": _normalize_hex_color(
                    style_payload.get("frameOuterBackground"), DEFAULT_START_STYLE["frameOuterBackground"]
                ),
                "frameOuterBorder": _normalize_hex_color(
                    style_payload.get("frameOuterBorder"), DEFAULT_START_STYLE["frameOuterBorder"]
                ),
                "frameInnerBorder": _normalize_hex_color(
                    style_payload.get("frameInnerBorder"), DEFAULT_START_STYLE["frameInnerBorder"]
                ),
                "pillsBackground": _normalize_hex_color(
                    style_payload.get("pillsBackground"), DEFAULT_START_STYLE["pillsBackground"]
                ),
                "pillsBorder": _normalize_hex_color(style_payload.get("pillsBorder"), DEFAULT_START_STYLE["pillsBorder"]),
                "pillsText": _normalize_hex_color(style_payload.get("pillsText"), DEFAULT_START_STYLE["pillsText"]),
                "buttonFrom": _normalize_hex_color(style_payload.get("buttonFrom"), DEFAULT_START_STYLE["buttonFrom"]),
                "buttonTo": _normalize_hex_color(style_payload.get("buttonTo"), DEFAULT_START_STYLE["buttonTo"]),
                "buttonText": _normalize_hex_color(style_payload.get("buttonText"), DEFAULT_START_STYLE["buttonText"]),
            },
        },
        "gameplay": {
            "lives": int(gameplay_payload.get("lives", DEFAULT_CONFIG["gameplay"]["lives"])),
            "secondsPerQuestion": int(
                gameplay_payload.get("secondsPerQuestion", DEFAULT_CONFIG["gameplay"]["secondsPerQuestion"])
            ),
            "questionsPerGame": int(
                gameplay_payload.get("questionsPerGame", DEFAULT_CONFIG["gameplay"]["questionsPerGame"])
            ),
        },
    }


def validate_config(config: dict) -> tuple[bool, str | None]:
    """Valida reglas de negocio básicas de configuración."""
    try:
        start = config["startScreen"]
        gameplay = config["gameplay"]
    except Exception:
        return False, "Configuración inválida."

    if not str(start.get("title", "")).strip():
        return False, "El título del inicio no puede estar vacío."
    if not str(start.get("startButtonText", "")).strip():
        return False, "El texto del botón de inicio no puede estar vacío."

    lives = int(gameplay.get("lives", 0))
    seconds = int(gameplay.get("secondsPerQuestion", 0))
    questions_per_game = int(gameplay.get("questionsPerGame", 0))

    if lives < 1 or lives > 10:
        return False, "Las vidas deben estar entre 1 y 10."
    if seconds < 5 or seconds > 120:
        return False, "Los segundos por pregunta deben estar entre 5 y 120."
    if questions_per_game < 1 or questions_per_game > 100:
        return False, "La cantidad de preguntas por partida debe estar entre 1 y 100."

    return True, None


def save_config(config: dict) -> dict:
    """Fusiona configuración entrante, valida y persiste en disco."""
    normalized = load_config()
    incoming_start = config.get("startScreen", {})
    if isinstance(incoming_start, dict):
        incoming_style = incoming_start.get("style", {})
        if isinstance(incoming_style, dict):
            normalized["startScreen"]["style"].update(incoming_style)

        allowed_start_fields = {
            "title",
            "heroImageKey",
            "backgroundImageKey",
            "startButtonText",
            "showLivesPill",
            "showTimerPill",
            "showQuestionsPill",
        }
        incoming_flat_start = {key: value for key, value in incoming_start.items() if key in allowed_start_fields}
        normalized["startScreen"].update(incoming_flat_start)

    incoming_gameplay = config.get("gameplay", {})
    if isinstance(incoming_gameplay, dict):
        allowed_gameplay_fields = {"lives", "secondsPerQuestion", "questionsPerGame"}
        normalized["gameplay"].update({k: v for k, v in incoming_gameplay.items() if k in allowed_gameplay_fields})

    is_valid, error = validate_config(normalized)
    if not is_valid:
        raise ValueError(error)

    CONFIG_FILE.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
    return normalized
