import copy
import json
import os
import random
import secrets
import time

from threading import Lock
from uuid import uuid4
from django.core import signing
from django.core.signing import BadSignature, SignatureExpired
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods
from games_catalog.models import GameSession
from trivia.models import Question
from .config_store import load_config, save_config
from .image_store import (
    list_image_catalog,
    list_image_keys,
    resolve_image_url,
    upload_custom_image,
)
from .question_store import load_questions, reset_questions, save_questions

# Almacenes en memoria para sesiones de juego y de administrador.
SESSIONS: dict[str, dict] = {}
SESSIONS_LOCK = Lock()
ADMIN_SESSIONS: dict[str, dict] = {}
ADMIN_SESSIONS_LOCK = Lock()

RUNNER_CONTEXT_COOKIE = "trivia_sparkle_runner_ctx"
RUNNER_CONTEXT_MAX_AGE_SECONDS = 8 * 60 * 60
RUNNER_CONTEXT_SALT = "trivia_sparkle_runner_context"

DEFAULT_WATERMARK = {
    "enabled": True,
    "text": "MODO PRUEBA",
    "color": "#ff0000",
    "opacity": 0.28,
    "position": "center",
    "font_size": 96,
}


def _json_body(request):
    """Parsea el body JSON y devuelve dict/None según validez."""
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return None


def _admin_login_credentials() -> tuple[str, str]:
    """Lee credenciales admin desde variables de entorno."""
    username = os.getenv(
        "TRIVIA_SPARKLE_ADMIN_LOGIN_USERNAME",
        os.getenv("ADMIN_LOGIN_USERNAME", "admin"),
    )
    password = os.getenv(
        "TRIVIA_SPARKLE_ADMIN_LOGIN_PASSWORD",
        os.getenv("ADMIN_LOGIN_PASSWORD", "admin"),
    )
    return username, password


def _admin_session_ttl_seconds() -> int:
    """TTL de sesión admin en segundos."""
    return int(
        os.getenv(
            "TRIVIA_SPARKLE_ADMIN_SESSION_TTL_SECONDS",
            os.getenv("TRIVIA_ADMIN_SESSION_TTL_SECONDS", "28800"),
        )
    )


def _extract_bearer_token(request) -> str:
    """Extrae token Bearer del header Authorization."""
    authorization = request.headers.get("Authorization", "").strip()
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return ""


def _create_admin_session(username: str) -> tuple[str, int]:
    """Crea sesión admin in-memory y devuelve token + expiración."""
    token = secrets.token_urlsafe(32)
    created_at = int(time.time())
    expires_in = _admin_session_ttl_seconds()
    with ADMIN_SESSIONS_LOCK:
        ADMIN_SESSIONS[token] = {"username": username, "createdAt": created_at}
    return token, expires_in


def _get_admin_session(token: str):
    """Obtiene sesión admin validando expiración."""
    if not token:
        return None
    ttl = _admin_session_ttl_seconds()
    now = int(time.time())
    with ADMIN_SESSIONS_LOCK:
        session = ADMIN_SESSIONS.get(token)
        if not session:
            return None
        if now - int(session["createdAt"]) > ttl:
            ADMIN_SESSIONS.pop(token, None)
            return None
        return session


def _delete_admin_session(token: str) -> None:
    """Elimina sesión admin por token."""
    if not token:
        return
    with ADMIN_SESSIONS_LOCK:
        ADMIN_SESSIONS.pop(token, None)


def _question_public_payload(question: dict) -> dict:
    """Transforma pregunta interna al payload público para frontend."""
    question_image_url = question.get("questionImageUrl") or resolve_image_url(question.get("questionImageKey"))
    return {
        "id": question["id"],
        "type": question["type"],
        "prompt": question["prompt"],
        "questionImageKey": question.get("questionImageKey"),
        "questionImageUrl": question_image_url,
        "answers": [
            {
                "id": answer["id"],
                "label": answer["label"],
                "imageKey": answer.get("imageKey"),
                "imageUrl": answer.get("imageUrl") or resolve_image_url(answer.get("imageKey")),
            }
            for answer in question["answers"]
        ],
    }


def _attach_start_screen_image_urls(config: dict) -> dict:
    """Agrega URLs resueltas de imágenes de inicio al payload de configuración."""
    start_screen = config.get("startScreen", {})
    start_screen["heroImageUrl"] = resolve_image_url(start_screen.get("heroImageKey"))
    start_screen["backgroundImageUrl"] = resolve_image_url(start_screen.get("backgroundImageKey"))
    return config


def _get_session_or_404(session_id: str):
    """Busca sesión de juego y devuelve 404 JSON si no existe."""
    with SESSIONS_LOCK:
        session = SESSIONS.get(session_id)
    if session is None:
        return None, JsonResponse({"error": "Sesión no encontrada."}, status=404)
    return session, None


def _safe_int(value, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _signed_runner_context(context: dict) -> str:
    return signing.dumps(context, salt=RUNNER_CONTEXT_SALT)


def _unsign_runner_context(value: str) -> dict | None:
    try:
        payload = signing.loads(
            value,
            salt=RUNNER_CONTEXT_SALT,
            max_age=RUNNER_CONTEXT_MAX_AGE_SECONDS,
        )
    except (BadSignature, SignatureExpired):
        return None

    if not isinstance(payload, dict):
        return None
    session_id = str(payload.get("session_id") or "").strip()
    user_id = payload.get("user_id")
    session_token = str(payload.get("session_token") or "").strip()
    if not session_id or not session_token:
        return None
    if not str(user_id).isdigit():
        return None
    return {
        "session_id": session_id,
        "user_id": int(user_id),
        "session_token": session_token,
    }


def _runner_context_from_query(request) -> dict | None:
    session_id = str(request.GET.get("session_id") or "").strip()
    user_id = request.GET.get("user_id")
    session_token = str(request.GET.get("session_token") or "").strip()
    if not session_id and not user_id and not session_token:
        return None
    if not session_id or not str(user_id).isdigit() or not session_token:
        return None
    return {
        "session_id": session_id,
        "user_id": int(user_id),
        "session_token": session_token,
    }


def _resolve_bound_game_session(request) -> GameSession | None:
    raw_context = request.COOKIES.get(RUNNER_CONTEXT_COOKIE)
    if not raw_context:
        return None

    context = _unsign_runner_context(raw_context)
    if not context:
        return None

    session = (
        GameSession.objects
        .select_related("game")
        .filter(
            id=context["session_id"],
            user_id=context["user_id"],
            game__slug="trivia-sparkle",
        )
        .first()
    )
    if not session:
        return None

    if not session.runner_token or not secrets.compare_digest(session.runner_token, context["session_token"]):
        return None

    if session.status != GameSession.Status.ACTIVE:
        return None

    return session


def _runner_watermark_from_session(session: GameSession) -> tuple[bool, dict]:
    state = session.client_state if isinstance(session.client_state, dict) else {}
    preview_mode = bool(state.get("preview_mode", False))

    customization = state.get("customization")
    if not isinstance(customization, dict):
        customization = {}

    branding = customization.get("branding")
    if not isinstance(branding, dict):
        branding = {}

    watermark = customization.get("watermark")
    if not isinstance(watermark, dict):
        watermark = {}

    payload = {
        "enabled": bool(watermark.get("enabled", DEFAULT_WATERMARK["enabled"])),
        "text": str(branding.get("watermark_text") or DEFAULT_WATERMARK["text"]),
        "color": str(watermark.get("color") or DEFAULT_WATERMARK["color"]),
        "opacity": _safe_float(watermark.get("opacity"), DEFAULT_WATERMARK["opacity"]),
        "position": str(watermark.get("position") or DEFAULT_WATERMARK["position"]),
        "font_size": _safe_int(watermark.get("font_size"), DEFAULT_WATERMARK["font_size"]),
    }
    return preview_mode, payload


def _gameplay_for_session(base_gameplay: dict, session: GameSession) -> dict:
    gameplay = {
        "lives": max(1, _safe_int(base_gameplay.get("lives"), 3)),
        "secondsPerQuestion": max(5, _safe_int(base_gameplay.get("secondsPerQuestion"), 30)),
        "questionsPerGame": max(1, _safe_int(base_gameplay.get("questionsPerGame"), 10)),
    }

    state = session.client_state if isinstance(session.client_state, dict) else {}
    customization = state.get("customization")
    if not isinstance(customization, dict):
        return gameplay

    rules = customization.get("rules")
    if not isinstance(rules, dict):
        return gameplay

    gameplay["lives"] = max(1, _safe_int(rules.get("lives"), gameplay["lives"]))
    gameplay["secondsPerQuestion"] = max(
        5,
        _safe_int(rules.get("timer_seconds"), gameplay["secondsPerQuestion"]),
    )
    gameplay["questionsPerGame"] = max(
        1,
        _safe_int(rules.get("max_questions"), gameplay["questionsPerGame"]),
    )
    return gameplay


def _apply_contract_customization_to_sparkle_config(config: dict, session: GameSession) -> dict:
    state = session.client_state if isinstance(session.client_state, dict) else {}
    customization = state.get("customization")
    if not isinstance(customization, dict):
        return config

    branding = customization.get("branding") if isinstance(customization.get("branding"), dict) else {}
    visual = customization.get("visual") if isinstance(customization.get("visual"), dict) else {}
    texts = customization.get("texts") if isinstance(customization.get("texts"), dict) else {}

    start_screen = config.get("startScreen") if isinstance(config.get("startScreen"), dict) else {}
    style = start_screen.get("style") if isinstance(start_screen.get("style"), dict) else {}

    primary = str(branding.get("primary_color") or style.get("buttonFrom") or "#00f5e9")
    secondary = str(branding.get("secondary_color") or style.get("backgroundTop") or "#081a2b")
    question_bg = str(visual.get("question_bg_color") or style.get("frameOuterBackground") or "#0f2034")
    question_border = str(visual.get("question_border_color") or style.get("frameOuterBorder") or primary)
    question_text = str(visual.get("question_text_color") or style.get("titleText") or "#e7f6ff")
    option_bg = str(visual.get("option_bg_color") or style.get("pillsBackground") or "#12324a")
    option_border = str(visual.get("option_border_color") or style.get("pillsBorder") or question_border)
    screen_bg = str(visual.get("screen_background_color") or style.get("backgroundMiddle") or secondary)

    style.update(
        {
            "backgroundTop": secondary,
            "backgroundMiddle": screen_bg,
            "backgroundBottom": screen_bg,
            "overlayColor": secondary,
            "stripeColor": primary,
            "titleBackground": question_bg,
            "titleBorder": primary,
            "titleText": question_text,
            "frameOuterBackground": question_bg,
            "frameOuterBorder": question_border,
            "frameInnerBorder": primary,
            "pillsBackground": option_bg,
            "pillsBorder": option_border,
            "pillsText": question_text,
            "buttonFrom": primary,
            "buttonTo": option_border,
            "buttonText": secondary,
        }
    )

    if str(texts.get("welcome_title") or "").strip():
        start_screen["title"] = str(texts.get("welcome_title")).strip()
    if str(texts.get("cta_button") or "").strip():
        start_screen["startButtonText"] = str(texts.get("cta_button")).strip()

    welcome_image_url = str(branding.get("welcome_image_url") or "").strip()
    if welcome_image_url:
        start_screen["heroImageUrl"] = welcome_image_url
    background_url = str(branding.get("background_url") or "").strip()
    if background_url:
        start_screen["backgroundImageUrl"] = background_url

    start_screen["style"] = style
    config["startScreen"] = start_screen
    return config


def _questions_from_question_set(session: GameSession) -> list[dict]:
    state = session.client_state if isinstance(session.client_state, dict) else {}
    customization = state.get("customization") if isinstance(state.get("customization"), dict) else {}
    content = customization.get("content") if isinstance(customization.get("content"), dict) else {}
    sparkle_questions = content.get("sparkle_questions") if isinstance(content.get("sparkle_questions"), list) else []
    if sparkle_questions:
        payload: list[dict] = []
        for question in sparkle_questions:
            if not isinstance(question, dict):
                continue

            answers = question.get("answers")
            if not isinstance(answers, list) or len(answers) < 2:
                continue

            correct_answer_id = str(question.get("correctAnswerId") or "").strip()
            if not correct_answer_id:
                continue

            payload.append(
                {
                    "id": str(question.get("id") or ""),
                    "type": str(question.get("type") or "text_answers"),
                    "prompt": str(question.get("prompt") or ""),
                    "questionImageKey": question.get("questionImageKey"),
                    "questionImageUrl": str(question.get("questionImageUrl") or "").strip() or None,
                    "correctAnswerId": correct_answer_id,
                    "answers": [
                        {
                            "id": str(answer.get("id") or ""),
                            "label": str(answer.get("label") or ""),
                            "imageKey": answer.get("imageKey"),
                            "imageUrl": str(answer.get("imageUrl") or "").strip() or None,
                        }
                        for answer in answers
                        if isinstance(answer, dict)
                    ],
                }
            )
        if payload:
            return payload

    if not session.question_set_id:
        return []

    questions = (
        Question.objects
        .filter(question_set_id=session.question_set_id, is_active=True)
        .prefetch_related("choices")
        .order_by("id")
    )

    payload: list[dict] = []
    for question in questions:
        choices = list(question.choices.all().order_by("id"))
        if len(choices) < 2:
            continue

        correct_choice = next((choice for choice in choices if bool(choice.is_correct)), None)
        if not correct_choice:
            continue

        payload.append(
            {
                "id": str(question.id),
                "type": "text_answers",
                "prompt": str(question.text),
                "questionImageKey": None,
                "correctAnswerId": str(correct_choice.id),
                "answers": [
                    {
                        "id": str(choice.id),
                        "label": str(choice.text),
                        "imageKey": None,
                    }
                    for choice in choices
                ],
            }
        )

    return payload


def _build_round_state(*, gameplay: dict, questions: list[dict]) -> dict:
    pool = copy.deepcopy(questions)
    random.shuffle(pool)
    selected_questions = pool[: min(gameplay["questionsPerGame"], len(pool))]
    return {
        "index": 0,
        "score": 0,
        "lives": gameplay["lives"],
        "finished": False,
        "gameOver": False,
        "secondsPerQuestion": gameplay["secondsPerQuestion"],
        "questions": selected_questions,
    }


def _round_from_bound_session(session: GameSession) -> dict | None:
    state = session.client_state if isinstance(session.client_state, dict) else {}
    round_state = state.get("trivia_sparkle")
    if not isinstance(round_state, dict):
        return None
    return round_state


def _save_bound_round_state(session: GameSession, round_state: dict) -> None:
    state = session.client_state if isinstance(session.client_state, dict) else {}
    state["trivia_sparkle"] = round_state
    session.client_state = state
    session.save(update_fields=["client_state"])


def _is_admin_authorized(request) -> bool:
    """Autoriza por token estático legacy o por sesión Bearer."""
    # Backward-compatible static token mode.
    configured_token = os.getenv(
        "TRIVIA_SPARKLE_ADMIN_TOKEN",
        os.getenv("TRIVIA_ADMIN_TOKEN", ""),
    ).strip()
    provided_static_token = request.headers.get("X-Admin-Token", "").strip()
    if configured_token and provided_static_token and secrets.compare_digest(provided_static_token, configured_token):
        return True

    # Session mode.
    session_token = _extract_bearer_token(request)
    return _get_admin_session(session_token) is not None


def _admin_auth_or_401(request):
    """Retorna None si autorizado; sino respuesta 401."""
    if _is_admin_authorized(request):
        return None
    return JsonResponse({"error": "No autorizado."}, status=401)


@require_GET
def health(_request):
    """Healthcheck simple del servicio."""
    return JsonResponse({"ok": True})


@require_GET
def api_index(_request):
    """Índice de API con endpoints disponibles."""
    return JsonResponse(
        {
            "service": "trivia-sparkle-api",
            "status": "ok",
            "endpoints": {
                "health": "/api/trivia-sparkle/health",
                "auth_login": "/api/trivia-sparkle/auth/login",
                "auth_me": "/api/trivia-sparkle/auth/me",
                "auth_logout": "/api/trivia-sparkle/auth/logout",
                "admin_questions": "/api/trivia-sparkle/admin/questions",
                "admin_config": "/api/trivia-sparkle/admin/config",
                "admin_reset": "/api/trivia-sparkle/admin/questions/reset",
                "admin_images_upload": "/api/trivia-sparkle/admin/images",
                "game_start": "/api/trivia-sparkle/game/start",
            },
            "frontend": "/runner/trivia-sparkle",
            "frontend_admin": "/runner/trivia-sparkle/admin",
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def auth_login(request):
    """Login admin por usuario/contraseña y emisión de token de sesión."""
    payload = _json_body(request)
    if payload is None:
        return JsonResponse({"error": "JSON inválido."}, status=400)

    expected_username, expected_password = _admin_login_credentials()
    username = str(payload.get("username", ""))
    password = str(payload.get("password", ""))

    if not secrets.compare_digest(username, expected_username) or not secrets.compare_digest(password, expected_password):
        return JsonResponse({"error": "Credenciales inválidas."}, status=401)

    token, expires_in = _create_admin_session(username)
    return JsonResponse({"ok": True, "token": token, "expiresIn": expires_in, "username": username})


@require_GET
def auth_me(request):
    """Valida token Bearer admin y devuelve usuario actual."""
    token = _extract_bearer_token(request)
    session = _get_admin_session(token)
    if not session:
        return JsonResponse({"error": "No autorizado."}, status=401)
    return JsonResponse({"ok": True, "username": session["username"]})


@csrf_exempt
@require_http_methods(["POST"])
def auth_logout(request):
    """Cierra sesión admin actual."""
    token = _extract_bearer_token(request)
    _delete_admin_session(token)
    return JsonResponse({"ok": True})


@require_GET
def admin_image_keys(_request):
    """Devuelve llaves e inventario de imágenes para el panel."""
    unauthorized = _admin_auth_or_401(_request)
    if unauthorized:
        return unauthorized
    return JsonResponse({"imageKeys": list_image_keys(), "images": list_image_catalog()})


@require_GET
def public_config(_request):
    """Expone configuración pública usada por la pantalla de juego."""
    config = load_config()
    config = _attach_start_screen_image_urls(config)
    bound_session = _resolve_bound_game_session(_request)

    preview_mode = False
    watermark = dict(DEFAULT_WATERMARK)
    if bound_session:
        config["gameplay"] = _gameplay_for_session(config.get("gameplay", {}), bound_session)
        config = _apply_contract_customization_to_sparkle_config(config, bound_session)
        preview_mode, watermark = _runner_watermark_from_session(bound_session)

    return JsonResponse(
        {
            "config": config,
            "imageKeys": list_image_keys(),
            "images": list_image_catalog(),
            "preview_mode": preview_mode,
            "watermark": watermark,
        }
    )


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def admin_config(request):
    """Lee/actualiza configuración de inicio y gameplay."""
    unauthorized = _admin_auth_or_401(request)
    if unauthorized:
        return unauthorized
    if request.method == "GET":
        config = load_config()
        config = _attach_start_screen_image_urls(config)
        return JsonResponse({"config": config, "imageKeys": list_image_keys(), "images": list_image_catalog()})

    payload = _json_body(request)
    if payload is None:
        return JsonResponse({"error": "JSON inválido."}, status=400)

    next_config = payload.get("config", {})
    if not isinstance(next_config, dict):
        return JsonResponse({"error": "Configuración inválida."}, status=400)

    start_payload = next_config.get("startScreen", {})
    if not isinstance(start_payload, dict):
        return JsonResponse({"error": "La configuración de inicio es inválida."}, status=400)

    available_image_keys = set(list_image_keys())
    hero_key = start_payload.get("heroImageKey")
    if hero_key is not None and hero_key not in available_image_keys:
        return JsonResponse({"error": "La imagen de portada no existe."}, status=400)
    background_key = start_payload.get("backgroundImageKey")
    if background_key is not None and background_key not in available_image_keys:
        return JsonResponse({"error": "La imagen de fondo no existe."}, status=400)

    try:
        config = save_config(next_config)
    except ValueError as error:
        return JsonResponse({"error": str(error)}, status=400)

    config = _attach_start_screen_image_urls(config)
    return JsonResponse({"ok": True, "config": config})


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def admin_questions(request):
    """Lee/actualiza banco de preguntas."""
    unauthorized = _admin_auth_or_401(request)
    if unauthorized:
        return unauthorized
    if request.method == "GET":
        questions = load_questions()
        return JsonResponse({"questions": questions, "imageKeys": list_image_keys(), "images": list_image_catalog()})

    payload = _json_body(request)
    if payload is None:
        return JsonResponse({"error": "JSON inválido."}, status=400)

    incoming_questions = payload.get("questions")
    try:
        questions = save_questions(incoming_questions if isinstance(incoming_questions, list) else [])
    except ValueError as error:
        return JsonResponse({"error": str(error)}, status=400)

    with SESSIONS_LOCK:
        SESSIONS.clear()

    return JsonResponse({"ok": True, "questions": questions})


@csrf_exempt
@require_http_methods(["POST"])
def admin_questions_reset(_request):
    """Resetea banco de preguntas a su estado por defecto."""
    unauthorized = _admin_auth_or_401(_request)
    if unauthorized:
        return unauthorized
    questions = reset_questions()
    with SESSIONS_LOCK:
        SESSIONS.clear()
    return JsonResponse({"ok": True, "questions": questions})


@csrf_exempt
@require_http_methods(["POST"])
def admin_images_upload(request):
    """Sube una imagen custom al media storage."""
    unauthorized = _admin_auth_or_401(request)
    if unauthorized:
        return unauthorized
    uploaded_file = request.FILES.get("image")
    try:
        image = upload_custom_image(uploaded_file)
    except ValueError as error:
        return JsonResponse({"error": str(error)}, status=400)
    return JsonResponse({"ok": True, "image": image, "imageKeys": list_image_keys(), "images": list_image_catalog()}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
def game_start(_request):
    """Inicia una partida nueva con subset aleatorio de preguntas."""
    config = load_config()
    bound_session = _resolve_bound_game_session(_request)
    if bound_session:
        questions = _questions_from_question_set(bound_session) or load_questions()
        if len(questions) == 0:
            return JsonResponse({"error": "No hay preguntas cargadas para este contrato."}, status=400)

        gameplay = _gameplay_for_session(config.get("gameplay", {}), bound_session)
        round_state = _build_round_state(gameplay=gameplay, questions=questions)
        _save_bound_round_state(bound_session, round_state)

        preview_mode, watermark = _runner_watermark_from_session(bound_session)
        return JsonResponse(
            {
                "sessionId": str(bound_session.id),
                "lives": round_state["lives"],
                "score": 0,
                "totalQuestions": len(round_state["questions"]),
                "secondsPerQuestion": round_state["secondsPerQuestion"],
                "preview_mode": preview_mode,
                "watermark": watermark,
            },
            status=201,
        )

    questions = load_questions()
    if len(questions) == 0:
        return JsonResponse({"error": "No hay preguntas cargadas. Crealas desde /admin."}, status=400)

    gameplay = {
        "lives": max(1, _safe_int(config.get("gameplay", {}).get("lives"), 3)),
        "secondsPerQuestion": max(5, _safe_int(config.get("gameplay", {}).get("secondsPerQuestion"), 30)),
        "questionsPerGame": max(1, _safe_int(config.get("gameplay", {}).get("questionsPerGame"), 10)),
    }
    round_state = _build_round_state(gameplay=gameplay, questions=questions)

    session_id = str(uuid4())
    with SESSIONS_LOCK:
        SESSIONS[session_id] = round_state

    return JsonResponse(
        {
            "sessionId": session_id,
            "lives": round_state["lives"],
            "score": 0,
            "totalQuestions": len(round_state["questions"]),
            "secondsPerQuestion": round_state["secondsPerQuestion"],
            "preview_mode": False,
            "watermark": dict(DEFAULT_WATERMARK),
        },
        status=201,
    )


@require_GET
def game_question(_request, session_id: str):
    """Devuelve la pregunta actual de una sesión activa."""
    bound_session = _resolve_bound_game_session(_request)
    if bound_session:
        if str(bound_session.id) != session_id:
            return JsonResponse({"error": "session_id_invalido"}, status=401)
        session = _round_from_bound_session(bound_session)
        if not session:
            return JsonResponse({"error": "Partida no iniciada."}, status=409)
    else:
        session, response = _get_session_or_404(session_id)
        if response:
            return response

    if session["finished"] or session["gameOver"]:
        return JsonResponse({"error": "La partida terminó.", "finished": True, "gameOver": session["gameOver"]}, status=409)

    question = session["questions"][session["index"]] if session["index"] < len(session["questions"]) else None
    if question is None:
        session["finished"] = True
        if bound_session:
            _save_bound_round_state(bound_session, session)
        return JsonResponse({"error": "No hay más preguntas.", "finished": True, "gameOver": session["gameOver"]}, status=409)

    return JsonResponse(
        {
            "questionNumber": session["index"] + 1,
            "totalQuestions": len(session["questions"]),
            "lives": session["lives"],
            "score": session["score"],
            "question": _question_public_payload(question),
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def game_answer(request, session_id: str):
    """Procesa respuesta, actualiza score/vidas y estado de partida."""
    bound_session = _resolve_bound_game_session(request)
    if bound_session:
        if str(bound_session.id) != session_id:
            return JsonResponse({"error": "session_id_invalido"}, status=401)
        session = _round_from_bound_session(bound_session)
        if not session:
            return JsonResponse({"error": "Partida no iniciada."}, status=409)
    else:
        session, response = _get_session_or_404(session_id)
        if response:
            return response

    if session["finished"] or session["gameOver"]:
        return JsonResponse({"error": "La partida terminó.", "finished": True, "gameOver": session["gameOver"]}, status=409)

    payload = _json_body(request)
    if payload is None:
        return JsonResponse({"error": "JSON inválido."}, status=400)

    question = session["questions"][session["index"]] if session["index"] < len(session["questions"]) else None
    if question is None:
        session["finished"] = True
        return JsonResponse({"error": "No hay más preguntas.", "finished": True, "gameOver": session["gameOver"]}, status=409)

    if payload.get("questionId") != question["id"]:
        return JsonResponse({"error": "La pregunta no coincide con el estado actual de la partida."}, status=400)

    answer_id = payload.get("answerId")
    is_correct = isinstance(answer_id, str) and answer_id == question["correctAnswerId"]

    if is_correct:
        session["score"] += 1
    else:
        session["lives"] -= 1

    session["index"] += 1
    if session["lives"] <= 0:
        session["gameOver"] = True
    if session["index"] >= len(session["questions"]):
        session["finished"] = True

    if bound_session:
        _save_bound_round_state(bound_session, session)

    return JsonResponse(
        {
            "correct": is_correct,
            "correctAnswerId": question["correctAnswerId"],
            "lives": session["lives"],
            "score": session["score"],
            "questionNumber": session["index"],
            "totalQuestions": len(session["questions"]),
            "finished": session["finished"],
            "gameOver": session["gameOver"],
            "hasNextQuestion": not session["finished"] and not session["gameOver"],
        }
    )


@require_GET
def trivia_sparkle_runner_page(request):
    """Entrega el frontend SPA de Trivia Sparkle."""
    response = render(request, "runner/trivia_sparkle/index.html")

    context = _runner_context_from_query(request)
    if context is None:
        # Acceso directo o query inválida: limpiar binding previo.
        response.delete_cookie(RUNNER_CONTEXT_COOKIE, path="/")
        return response

    session = (
        GameSession.objects
        .select_related("game")
        .filter(
            id=context["session_id"],
            user_id=context["user_id"],
            game__slug="trivia-sparkle",
        )
        .first()
    )
    if not session:
        response.delete_cookie(RUNNER_CONTEXT_COOKIE, path="/")
        return response

    if session.status != GameSession.Status.ACTIVE:
        response.delete_cookie(RUNNER_CONTEXT_COOKIE, path="/")
        return response

    if not session.runner_token or not secrets.compare_digest(session.runner_token, context["session_token"]):
        response.delete_cookie(RUNNER_CONTEXT_COOKIE, path="/")
        return response

    response.set_cookie(
        RUNNER_CONTEXT_COOKIE,
        _signed_runner_context(context),
        max_age=RUNNER_CONTEXT_MAX_AGE_SECONDS,
        httponly=True,
        samesite="Lax",
        path="/",
    )
    return response