import csv
import io
import json
import os
import secrets
from copy import deepcopy
from datetime import date
from urllib.parse import urlencode, urlsplit, urlunsplit, urljoin
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import F
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from api_auth.auth import token_required
from trivia.models import Choice, Question, QuestionSet
from trivia.services import get_company_for_user, pick_question_set_for_session
from wallet.models import Wallet, LedgerEntry
from .models import ContratoJuego, Game, GameCustomization, GameSession


CONTRACT_ASSET_FIELDS = {
    "logo": ("branding", "logo_url"),
    "welcome_image": ("branding", "welcome_image_url"),
    "background": ("branding", "background_url"),
    "container_background": ("visual", "container_bg_image_url"),
}

ALLOWED_ASSET_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}
ALLOWED_ASSET_CONTENT_TYPES = {
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
    "image/gif",
}
MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024  # 5MB
MAX_TRIVIA_CHOICES = 6


def _parse_date(s: str):
    try:
        # Espera formato YYYY-MM-DD
        y, m, d = s.split("-")
        return date(int(y), int(m), int(d))
    except Exception:
        return None


def _default_customization_for_game(game_slug: str) -> dict:
    if game_slug == "trivia":
        return {
            "branding": {
                "primary_color": "#0EA5E9",
                "secondary_color": "#111827",
                "logo_url": "",
                "background_url": "",
                "welcome_image_url": "",
                "watermark_text": "MODO PRUEBA",
            },
            "texts": {
                "welcome_title": "Bienvenidos a la Trivia",
                "welcome_subtitle": "Demostra cuanto sabe tu equipo",
                "cta_button": "Comenzar",
            },
            "rules": {
                "show_timer": True,
                "timer_seconds": 20,
                "points_per_correct": 100,
                "max_questions": 10,
                "use_lives": True,
                "lives": 3,
            },
            "visual": {
                "question_bg_color": "#ffffff",
                "question_border_color": "#dbeafe",
                "question_text_color": "#0f172a",
                "question_font_family": "system-ui, Arial, sans-serif",
                "option_border_color": "#dbeafe",
                "option_bg_color": "#eff6ff",
                "screen_background_color": "#ffffff",
                "container_bg_image_url": "",
            },
            "watermark": {
                "enabled": True,
                "color": "#ff0000",
                "opacity": 0.28,
                "position": "center",
                "font_size": 96,
            },
            "content": {
                "question_set_id": None,
            },
        }

    return {
        "branding": {
            "primary_color": "#2563EB",
            "secondary_color": "#0F172A",
            "logo_url": "",
            "background_url": "",
            "welcome_image_url": "",
            "watermark_text": "MODO PRUEBA",
        },
        "texts": {},
        "rules": {
            "show_timer": True,
            "timer_seconds": 20,
            "points_per_correct": 100,
            "max_questions": 10,
            "use_lives": True,
            "lives": 3,
        },
        "visual": {
            "question_bg_color": "#ffffff",
            "question_border_color": "#dbeafe",
            "question_text_color": "#0f172a",
            "question_font_family": "system-ui, Arial, sans-serif",
            "option_border_color": "#dbeafe",
            "option_bg_color": "#eff6ff",
            "screen_background_color": "#ffffff",
            "container_bg_image_url": "",
        },
        "watermark": {
            "enabled": True,
            "color": "#ff0000",
            "opacity": 0.28,
            "position": "center",
            "font_size": 96,
        },
        "content": {
            "question_set_id": None,
        },
    }


def _deep_merge_dict(base: dict, patch: dict) -> dict:
    merged = deepcopy(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge_dict(merged[key], value)
        else:
            merged[key] = value
    return merged


def _nested_get(data: dict, path: tuple[str, ...]):
    cursor = data
    for key in path:
        if not isinstance(cursor, dict):
            return None
        cursor = cursor.get(key)
    return cursor


def _nested_set(data: dict, path: tuple[str, ...], value):
    cursor = data
    for key in path[:-1]:
        child = cursor.get(key)
        if not isinstance(child, dict):
            child = {}
            cursor[key] = child
        cursor = child
    cursor[path[-1]] = value


def _to_absolute_url(request, url: str) -> str:
    if not isinstance(url, str) or not url:
        return ""

    parts = urlsplit(url)
    if parts.scheme and parts.netloc:
        return url

    if url.startswith("/"):
        return request.build_absolute_uri(url)

    return request.build_absolute_uri(f"/{url}")


def _media_path_from_url(url: str) -> str | None:
    if not isinstance(url, str) or not url:
        return None

    path = urlsplit(url).path or url
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    if not media_url:
        return None

    if not media_url.endswith("/"):
        media_url = f"{media_url}/"

    if path.startswith(media_url):
        storage_path = path[len(media_url):].lstrip("/")
        return storage_path or None

    return None


def _normalize_asset_urls_for_storage(config: dict) -> dict:
    normalized = deepcopy(config)
    for path in CONTRACT_ASSET_FIELDS.values():
        value = _nested_get(normalized, path)
        if not isinstance(value, str):
            continue
        value = value.strip()
        if not value:
            _nested_set(normalized, path, "")
            continue

        storage_path = _media_path_from_url(value)
        if storage_path:
            media_url = getattr(settings, "MEDIA_URL", "/media/")
            if not media_url.endswith("/"):
                media_url = f"{media_url}/"
            _nested_set(normalized, path, f"{media_url}{storage_path}")
    return normalized


def _absolutize_asset_urls_for_response(request, config: dict) -> dict:
    output = deepcopy(config)
    for path in CONTRACT_ASSET_FIELDS.values():
        value = _nested_get(output, path)
        if isinstance(value, str) and value.strip():
            _nested_set(output, path, _to_absolute_url(request, value.strip()))
    return output


def _delete_managed_asset(url: str):
    storage_path = _media_path_from_url(url)
    if not storage_path:
        return
    default_storage.delete(storage_path)


def _save_contract_asset_file(*, contract_id: int, asset_key: str, uploaded_file) -> str:
    ext = os.path.splitext(uploaded_file.name or "")[1].lower()
    if ext not in ALLOWED_ASSET_EXTENSIONS:
        ext = ".png"

    filename = f"{secrets.token_hex(12)}{ext}"
    storage_path = f"contracts/{contract_id}/{asset_key}/{filename}"
    return default_storage.save(storage_path, uploaded_file)


def _validate_uploaded_asset(uploaded_file):
    if uploaded_file.size > MAX_ASSET_SIZE_BYTES:
        return JsonResponse({"error": "archivo_demasiado_grande", "max_bytes": MAX_ASSET_SIZE_BYTES}, status=400)

    ext = os.path.splitext(uploaded_file.name or "")[1].lower()
    if ext not in ALLOWED_ASSET_EXTENSIONS:
        return JsonResponse(
            {"error": "extension_no_permitida", "extensiones": sorted(ALLOWED_ASSET_EXTENSIONS)},
            status=400,
        )

    content_type = (uploaded_file.content_type or "").lower().strip()
    if content_type and content_type not in ALLOWED_ASSET_CONTENT_TYPES:
        return JsonResponse(
            {"error": "tipo_archivo_no_permitido", "content_type": content_type},
            status=400,
        )

    return None


def _is_contract_editable(contrato: ContratoJuego) -> bool:
    return contrato.estado not in [ContratoJuego.Estado.CANCELADO, ContratoJuego.Estado.FINALIZADO]


def _set_contract_customization_question_set_id(contrato: ContratoJuego, question_set_id: int | None):
    default_config = _default_customization_for_game(contrato.juego.slug)
    customization, _ = GameCustomization.objects.get_or_create(
        contrato=contrato,
        defaults={"config": default_config},
    )

    current_config = _deep_merge_dict(
        default_config,
        _normalize_asset_urls_for_storage(customization.config or {}),
    )
    current_value = _nested_get(current_config, ("content", "question_set_id"))
    if current_value == question_set_id:
        return

    _nested_set(current_config, ("content", "question_set_id"), question_set_id)
    customization.config = current_config
    customization.save(update_fields=["config", "actualizado_en"])


def _get_or_create_contract_trivia_question_set(contrato: ContratoJuego, *, create: bool):
    company = get_company_for_user(contrato.usuario)
    if not company:
        return None, JsonResponse({"error": "usuario_sin_company"}, status=409)

    if contrato.trivia_question_set_id:
        question_set = QuestionSet.objects.filter(
            id=contrato.trivia_question_set_id,
            company=company,
        ).first()
        if question_set:
            if not question_set.is_active:
                question_set.is_active = True
                question_set.save(update_fields=["is_active"])
            _set_contract_customization_question_set_id(contrato, question_set.id)
            return question_set, None

        contrato.trivia_question_set = None
        contrato.save(update_fields=["trivia_question_set", "actualizado_en"])
        _set_contract_customization_question_set_id(contrato, None)

    if not create:
        return None, None

    question_set_name = f"Contrato #{contrato.id} - Trivia"
    question_set, _ = QuestionSet.objects.get_or_create(
        company=company,
        name=question_set_name,
        defaults={"is_active": True},
    )
    if not question_set.is_active:
        question_set.is_active = True
        question_set.save(update_fields=["is_active"])

    if contrato.trivia_question_set_id != question_set.id:
        contrato.trivia_question_set = question_set
        contrato.save(update_fields=["trivia_question_set", "actualizado_en"])

    _set_contract_customization_question_set_id(contrato, question_set.id)
    return question_set, None


def _get_contract_trivia_question_set_for_play(contrato: ContratoJuego):
    if not contrato.trivia_question_set_id:
        return None

    question_set = QuestionSet.objects.filter(
        id=contrato.trivia_question_set_id,
        is_active=True,
    ).first()
    if not question_set:
        return None

    company = get_company_for_user(contrato.usuario)
    if company and question_set.company_id != company.id:
        return None

    has_questions = Question.objects.filter(question_set=question_set, is_active=True).exists()
    if not has_questions:
        return None

    return question_set


def _serialize_trivia_question(question: Question):
    choices = list(question.choices.all().order_by("id"))
    return {
        "id": question.id,
        "text": question.text,
        "is_active": question.is_active,
        "choices": [
            {
                "id": choice.id,
                "text": choice.text,
                "is_correct": choice.is_correct,
            }
            for choice in choices
        ],
    }


def _validate_trivia_question_payload(payload):
    if not isinstance(payload, dict):
        return None, JsonResponse({"error": "payload_invalido"}, status=400)

    text = str(payload.get("text") or "").strip()
    if not text:
        return None, JsonResponse({"error": "texto_pregunta_requerido"}, status=400)

    raw_choices = payload.get("choices")
    if not isinstance(raw_choices, list):
        return None, JsonResponse({"error": "choices_requerido"}, status=400)

    normalized_choices = []
    for raw_choice in raw_choices[:MAX_TRIVIA_CHOICES]:
        if isinstance(raw_choice, dict):
            choice_text = str(raw_choice.get("text") or "").strip()
            is_correct = bool(raw_choice.get("is_correct", False))
        else:
            choice_text = str(raw_choice or "").strip()
            is_correct = False

        if not choice_text:
            continue
        normalized_choices.append({"text": choice_text, "is_correct": is_correct})

    if len(normalized_choices) < 2:
        return None, JsonResponse({"error": "minimo_dos_opciones"}, status=400)

    correct_count = sum(1 for c in normalized_choices if c["is_correct"])
    if correct_count != 1:
        return None, JsonResponse({"error": "debe_haber_una_opcion_correcta"}, status=400)

    return {"text": text, "choices": normalized_choices}, None


def _to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"1", "true", "yes", "si", "on"}


def _get_user_contract_or_404(request, contract_id: int):
    return get_object_or_404(
        ContratoJuego.objects.select_related("juego", "customization", "trivia_question_set"),
        id=contract_id,
        usuario=request.user,
    )


def _get_contract_customization_config(contrato: ContratoJuego) -> dict:
    default_config = _default_customization_for_game(contrato.juego.slug)
    customization = getattr(contrato, "customization", None)
    if not customization:
        return default_config
    if not isinstance(customization.config, dict):
        return default_config
    return _deep_merge_dict(default_config, _normalize_asset_urls_for_storage(customization.config))


def _build_session_payload_for_contract(
    request,
    contrato: ContratoJuego,
    *,
    preview_mode: bool,
):
    juego = contrato.juego
    custom_config = _absolutize_asset_urls_for_response(
        request,
        _get_contract_customization_config(contrato),
    )

    question_set = None
    if juego.slug == "trivia":
        question_set = _get_contract_trivia_question_set_for_play(contrato)
        if not question_set:
            question_set = pick_question_set_for_session(user=request.user, juego=juego)
        if not question_set:
            return JsonResponse({"error": "sesion_sin_question_set"}, status=409)

    client_state = {
        "juego": juego.slug,
        "iniciado": True,
        "contract_id": contrato.id,
        "preview_mode": bool(preview_mode),
        "customization": custom_config,
    }

    sesion = GameSession.objects.create(
        user=request.user,
        game=juego,
        status=GameSession.Status.ACTIVE,
        cost_charged=0,
        client_state=client_state,
        question_set=question_set,
    )
    sesion.runner_token = secrets.token_urlsafe(32)[:64]
    sesion.save(update_fields=["runner_token"])

    runner_final = _build_runner_url(request, juego, sesion, request.user.id)

    return JsonResponse(
        {
            "ok": True,
            "preview_mode": bool(preview_mode),
            "launch_mode": "preview" if preview_mode else "event",
            "contract_id": contrato.id,
            "juego": {"slug": juego.slug, "nombre": juego.name, "runner_url": runner_final},
            "id_sesion": str(sesion.id),
        },
        status=201,
    )


def _pick_question_set_for_preview(user, juego):
    company = get_company_for_user(user)
    if not company:
        return None

    question_set = pick_question_set_for_session(user=user, juego=juego)
    if (
        question_set
        and question_set.company_id == company.id
        and Question.objects.filter(question_set=question_set, is_active=True).exists()
    ):
        return question_set

    # Fallback seguro: solo set de la misma empresa con al menos una pregunta activa.
    return (
        QuestionSet.objects
        .filter(company=company, is_active=True, questions__is_active=True)
        .distinct()
        .order_by("-created_at")
        .first()
    )


@csrf_exempt
@require_POST
@token_required
def crear_contrato_juego(request):
    """
    Crea un ContratoJuego para un juego y un rango de fechas.
    Debita créditos de la billetera (wallet) en el mismo transaction.
    """
    body, err = _leer_json(request)
    if err:
        return err

    slug = (body.get("game_slug") or body.get("slug") or "").strip()
    fecha_evento = _parse_date((body.get("fecha_evento") or "").strip())
    fecha_inicio = _parse_date((body.get("fecha_inicio") or "").strip())
    fecha_fin = _parse_date((body.get("fecha_fin") or "").strip())

    # Nuevo formato recomendado: fecha exacta.
    if fecha_evento:
        fecha_inicio = fecha_evento
        fecha_fin = fecha_evento

    if not slug:
        return JsonResponse({"error": "game_slug_requerido"}, status=400)
    if not fecha_inicio or not fecha_fin:
        return JsonResponse({"error": "fechas_invalidas"}, status=400)
    if fecha_inicio > fecha_fin:
        return JsonResponse({"error": "rango_fechas_invalido"}, status=400)

    juego = Game.objects.filter(slug=slug, is_enabled=True).first()
    if not juego:
        return JsonResponse({"error": "juego_no_encontrado_o_inhabilitado"}, status=404)

    # Por ahora usamos cost_per_play como "costo por día"
    # (si después agregamos cost_per_day, cambiamos acá y listo)
    costo_por_dia = int(juego.cost_per_play or 0)
    if costo_por_dia <= 0:
        return JsonResponse({"error": "costo_invalido"}, status=400)

    dias = (fecha_fin - fecha_inicio).days + 1
    costo_total = costo_por_dia * dias

    # Opcional: evitar solapamientos para mismo user+game
    # (si querés permitir varios contratos paralelos, sacalo)
    solapa = ContratoJuego.objects.filter(
        usuario=request.user,
        juego=juego,
        estado__in=[ContratoJuego.Estado.ACTIVO, ContratoJuego.Estado.BORRADOR],
        fecha_inicio__lte=fecha_fin,
        fecha_fin__gte=fecha_inicio,
    ).exists()
    if solapa:
        return JsonResponse({"error": "ya_existe_contrato_en_esas_fechas"}, status=409)

    with transaction.atomic():
        wallet, _ = Wallet.objects.select_for_update().get_or_create(
            user=request.user,
            defaults={"balance": 0},
        )

        if wallet.balance < costo_total:
            return JsonResponse(
                {"error": "saldo_insuficiente", "saldo": wallet.balance, "costo": costo_total},
                status=402,
            )

        contrato = ContratoJuego.objects.create(
            usuario=request.user,
            juego=juego,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            estado=ContratoJuego.Estado.ACTIVO,
        )

        # Debitar saldo
        Wallet.objects.filter(pk=wallet.pk).update(balance=F("balance") - costo_total)

        # Ledger
        LedgerEntry.objects.create(
            user=request.user,
            kind=LedgerEntry.Kind.SPEND,
            amount=-costo_total,
            reference_type="game_contract",
            reference_id=str(contrato.id),
        )

        wallet.refresh_from_db(fields=["balance"])

    return JsonResponse(
        {
            "ok": True,
            "contrato": {
                "id": contrato.id,
                "game_slug": juego.slug,
                "fecha_inicio": str(contrato.fecha_inicio),
                "fecha_fin": str(contrato.fecha_fin),
                "estado": contrato.estado,
                "costo_total": costo_total,
            },
            "saldo_restante": wallet.balance,
            },
        status=201,
    )

@require_GET
@token_required
def mis_contratos(request):
    qs = (
        ContratoJuego.objects
        .filter(usuario=request.user)
        .select_related("juego", "customization", "trivia_question_set")
        .order_by("-creado_en")
    )
    return JsonResponse({"resultados": [_serializar_contrato(c) for c in qs]}, status=200)


@require_GET
@token_required
def obtener_customizacion_contrato(request, contract_id: int):
    contrato = _get_user_contract_or_404(request, contract_id)
    default_config = _default_customization_for_game(contrato.juego.slug)

    customization, _ = GameCustomization.objects.get_or_create(
        contrato=contrato,
        defaults={"config": default_config},
    )
    effective = _deep_merge_dict(
        default_config,
        _normalize_asset_urls_for_storage(customization.config or {}),
    )
    effective_response = _absolutize_asset_urls_for_response(request, effective)

    return JsonResponse(
        {
            "ok": True,
            "contract_id": contrato.id,
            "game_slug": contrato.juego.slug,
            "config": effective_response,
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(["PUT", "PATCH"])
@token_required
def guardar_customizacion_contrato(request, contract_id: int):
    contrato = _get_user_contract_or_404(request, contract_id)
    if contrato.estado in [ContratoJuego.Estado.CANCELADO, ContratoJuego.Estado.FINALIZADO]:
        return JsonResponse({"error": "contrato_no_editable"}, status=409)

    body, err = _leer_json(request)
    if err:
        return err

    raw_config = body.get("config", body)
    if not isinstance(raw_config, dict):
        return JsonResponse({"error": "config_invalida"}, status=400)
    raw_config = _normalize_asset_urls_for_storage(raw_config)

    replace = bool(body.get("replace", False))
    default_config = _default_customization_for_game(contrato.juego.slug)

    customization, _ = GameCustomization.objects.get_or_create(
        contrato=contrato,
        defaults={"config": default_config},
    )

    previous_config = _deep_merge_dict(
        default_config,
        _normalize_asset_urls_for_storage(customization.config or {}),
    )
    base = default_config if replace else previous_config
    new_config = _deep_merge_dict(base, raw_config)

    for path in CONTRACT_ASSET_FIELDS.values():
        previous_url = _nested_get(previous_config, path)
        new_url = _nested_get(new_config, path)
        if isinstance(previous_url, str) and previous_url and previous_url != new_url:
            _delete_managed_asset(previous_url)

    customization.config = new_config
    customization.save(update_fields=["config", "actualizado_en"])
    response_config = _absolutize_asset_urls_for_response(request, new_config)

    return JsonResponse(
        {
            "ok": True,
            "contract_id": contrato.id,
            "game_slug": contrato.juego.slug,
            "config": response_config,
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
@token_required
def contrato_trivia_questions(request, contract_id: int):
    contrato = _get_user_contract_or_404(request, contract_id)
    if contrato.juego.slug != "trivia":
        return JsonResponse({"error": "juego_no_soporta_preguntas_trivia"}, status=409)

    if request.method == "GET":
        question_set, error = _get_or_create_contract_trivia_question_set(contrato, create=False)
        if error:
            return error

        if not question_set:
            return JsonResponse(
                {
                    "ok": True,
                    "contract_id": contrato.id,
                    "question_set_id": None,
                    "questions": [],
                },
                status=200,
            )

        questions = (
            Question.objects
            .filter(question_set=question_set, is_active=True)
            .prefetch_related("choices")
            .order_by("id")
        )
        return JsonResponse(
            {
                "ok": True,
                "contract_id": contrato.id,
                "question_set_id": question_set.id,
                "questions": [_serialize_trivia_question(q) for q in questions],
            },
            status=200,
        )

    if not _is_contract_editable(contrato):
        return JsonResponse({"error": "contrato_no_editable"}, status=409)

    payload, error = _leer_json(request)
    if error:
        return error

    validated, validation_error = _validate_trivia_question_payload(payload)
    if validation_error:
        return validation_error

    question_set, error = _get_or_create_contract_trivia_question_set(contrato, create=True)
    if error:
        return error

    with transaction.atomic():
        question = Question.objects.create(
            question_set=question_set,
            text=validated["text"],
            is_active=True,
        )
        Choice.objects.bulk_create(
            [
                Choice(
                    question=question,
                    text=choice["text"],
                    is_correct=choice["is_correct"],
                )
                for choice in validated["choices"]
            ]
        )

    question = Question.objects.prefetch_related("choices").get(id=question.id)
    return JsonResponse(
        {
            "ok": True,
            "contract_id": contrato.id,
            "question_set_id": question_set.id,
            "question": _serialize_trivia_question(question),
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["PATCH", "DELETE"])
@token_required
def contrato_trivia_question_detalle(request, contract_id: int, question_id: int):
    contrato = _get_user_contract_or_404(request, contract_id)
    if contrato.juego.slug != "trivia":
        return JsonResponse({"error": "juego_no_soporta_preguntas_trivia"}, status=409)
    if not _is_contract_editable(contrato):
        return JsonResponse({"error": "contrato_no_editable"}, status=409)

    question_set, error = _get_or_create_contract_trivia_question_set(contrato, create=False)
    if error:
        return error
    if not question_set:
        return JsonResponse({"error": "question_set_no_encontrado"}, status=404)

    question = get_object_or_404(
        Question.objects.prefetch_related("choices"),
        id=question_id,
        question_set=question_set,
    )

    if request.method == "DELETE":
        question.delete()
        return JsonResponse({"ok": True, "question_id": question_id}, status=200)

    payload, error = _leer_json(request)
    if error:
        return error

    validated, validation_error = _validate_trivia_question_payload(payload)
    if validation_error:
        return validation_error

    with transaction.atomic():
        question.text = validated["text"]
        question.save(update_fields=["text"])
        question.choices.all().delete()
        Choice.objects.bulk_create(
            [
                Choice(
                    question=question,
                    text=choice["text"],
                    is_correct=choice["is_correct"],
                )
                for choice in validated["choices"]
            ]
        )

    question = Question.objects.prefetch_related("choices").get(id=question.id)
    return JsonResponse(
        {
            "ok": True,
            "contract_id": contrato.id,
            "question_set_id": question_set.id,
            "question": _serialize_trivia_question(question),
        },
        status=200,
    )


@csrf_exempt
@require_POST
@token_required
def contrato_trivia_import_csv(request, contract_id: int):
    contrato = _get_user_contract_or_404(request, contract_id)
    if contrato.juego.slug != "trivia":
        return JsonResponse({"error": "juego_no_soporta_preguntas_trivia"}, status=409)
    if not _is_contract_editable(contrato):
        return JsonResponse({"error": "contrato_no_editable"}, status=409)

    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return JsonResponse({"error": "archivo_requerido", "field": "file"}, status=400)

    question_set, error = _get_or_create_contract_trivia_question_set(contrato, create=True)
    if error:
        return error

    replace_existing = _to_bool(request.POST.get("replace"))

    try:
        content = uploaded_file.read().decode("utf-8-sig")
    except Exception:
        return JsonResponse({"error": "csv_invalido"}, status=400)

    reader = csv.DictReader(io.StringIO(content))
    expected_columns = {"question", "option_1", "option_2", "correct_option"}
    columns = set(reader.fieldnames or [])
    missing_columns = sorted(expected_columns - columns)
    if missing_columns:
        return JsonResponse(
            {
                "error": "csv_columnas_faltantes",
                "columnas_requeridas": sorted(expected_columns),
                "faltantes": missing_columns,
            },
            status=400,
        )

    imported = 0
    errors = []

    with transaction.atomic():
        if replace_existing:
            Question.objects.filter(question_set=question_set).delete()

        for line_number, row in enumerate(reader, start=2):
            question_text = str(row.get("question") or "").strip()
            options = []
            for option_idx in range(1, MAX_TRIVIA_CHOICES + 1):
                option_value = str(row.get(f"option_{option_idx}") or "").strip()
                if option_value:
                    options.append(option_value)

            if not question_text or len(options) < 2:
                errors.append({"line": line_number, "error": "pregunta_u_opciones_invalidas"})
                continue

            correct_raw = str(row.get("correct_option") or "").strip()
            correct_index = -1
            if correct_raw.isdigit():
                correct_index = int(correct_raw) - 1
            else:
                for idx, option_text in enumerate(options):
                    if option_text.lower() == correct_raw.lower():
                        correct_index = idx
                        break

            if correct_index < 0 or correct_index >= len(options):
                errors.append({"line": line_number, "error": "correct_option_invalido"})
                continue

            question = Question.objects.create(
                question_set=question_set,
                text=question_text,
                is_active=True,
            )
            Choice.objects.bulk_create(
                [
                    Choice(
                        question=question,
                        text=option_text,
                        is_correct=(idx == correct_index),
                    )
                    for idx, option_text in enumerate(options)
                ]
            )
            imported += 1

    questions = (
        Question.objects
        .filter(question_set=question_set, is_active=True)
        .prefetch_related("choices")
        .order_by("id")
    )

    return JsonResponse(
        {
            "ok": True,
            "contract_id": contrato.id,
            "question_set_id": question_set.id,
            "imported": imported,
            "errors": errors[:20],
            "questions": [_serialize_trivia_question(q) for q in questions],
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(["POST", "DELETE"])
@token_required
def gestionar_asset_contrato(request, contract_id: int, asset_key: str):
    contrato = _get_user_contract_or_404(request, contract_id)
    if contrato.estado in [ContratoJuego.Estado.CANCELADO, ContratoJuego.Estado.FINALIZADO]:
        return JsonResponse({"error": "contrato_no_editable"}, status=409)

    field_path = CONTRACT_ASSET_FIELDS.get(asset_key)
    if not field_path:
        return JsonResponse({"error": "asset_no_soportado"}, status=404)

    default_config = _default_customization_for_game(contrato.juego.slug)
    customization, _ = GameCustomization.objects.get_or_create(
        contrato=contrato,
        defaults={"config": default_config},
    )
    config = _deep_merge_dict(
        default_config,
        _normalize_asset_urls_for_storage(customization.config or {}),
    )

    previous_url = _nested_get(config, field_path)
    if request.method == "DELETE":
        if isinstance(previous_url, str) and previous_url:
            _delete_managed_asset(previous_url)
        _nested_set(config, field_path, "")
        customization.config = config
        customization.save(update_fields=["config", "actualizado_en"])

        return JsonResponse(
            {
                "ok": True,
                "contract_id": contrato.id,
                "game_slug": contrato.juego.slug,
                "asset_key": asset_key,
                "asset_url": "",
                "config": _absolutize_asset_urls_for_response(request, config),
            },
            status=200,
        )

    uploaded = request.FILES.get("file")
    if not uploaded:
        return JsonResponse({"error": "archivo_requerido", "field": "file"}, status=400)

    validation_error = _validate_uploaded_asset(uploaded)
    if validation_error:
        return validation_error

    if isinstance(previous_url, str) and previous_url:
        _delete_managed_asset(previous_url)

    saved_path = _save_contract_asset_file(
        contract_id=contrato.id,
        asset_key=asset_key,
        uploaded_file=uploaded,
    )
    uploaded_url = default_storage.url(saved_path)
    _nested_set(config, field_path, uploaded_url)

    customization.config = config
    customization.save(update_fields=["config", "actualizado_en"])

    return JsonResponse(
        {
            "ok": True,
            "contract_id": contrato.id,
            "game_slug": contrato.juego.slug,
            "asset_key": asset_key,
            "asset_url": _to_absolute_url(request, uploaded_url),
            "config": _absolutize_asset_urls_for_response(request, config),
        },
        status=200,
    )


@csrf_exempt
@require_POST
@token_required
def iniciar_juego_contrato(request, contract_id: int):
    contrato = _get_user_contract_or_404(request, contract_id)
    if contrato.estado != ContratoJuego.Estado.ACTIVO:
        return JsonResponse({"error": "contrato_no_activo"}, status=409)

    hoy = timezone.localdate()
    if contrato.fecha_inicio > hoy or contrato.fecha_fin < hoy:
        return JsonResponse(
            {
                "error": "fuera_de_fecha_evento",
                "hoy": str(hoy),
                "fecha_inicio": str(contrato.fecha_inicio),
                "fecha_fin": str(contrato.fecha_fin),
            },
            status=409,
        )

    return _build_session_payload_for_contract(request, contrato, preview_mode=False)


@csrf_exempt
@require_POST
@token_required
def preview_juego_contrato(request, contract_id: int):
    contrato = _get_user_contract_or_404(request, contract_id)
    if contrato.estado in [ContratoJuego.Estado.CANCELADO, ContratoJuego.Estado.FINALIZADO]:
        return JsonResponse({"error": "contrato_no_disponible"}, status=409)

    return _build_session_payload_for_contract(request, contrato, preview_mode=True)


@csrf_exempt
@require_POST
@token_required
def lanzar_juego_contrato(request, contract_id: int):
    """
    Lanza automaticamente:
    - Modo evento si hoy esta dentro del rango contratado.
    - Modo preview (con watermark) fuera del rango.
    """
    contrato = _get_user_contract_or_404(request, contract_id)
    if contrato.estado in [ContratoJuego.Estado.CANCELADO, ContratoJuego.Estado.FINALIZADO]:
        return JsonResponse({"error": "contrato_no_disponible"}, status=409)

    hoy = timezone.localdate()
    en_rango_evento = (
        contrato.estado == ContratoJuego.Estado.ACTIVO
        and contrato.fecha_inicio <= hoy <= contrato.fecha_fin
    )

    return _build_session_payload_for_contract(
        request,
        contrato,
        preview_mode=not en_rango_evento,
    )


def _token_ok(a: str, b: str) -> bool:
    return bool(a) and bool(b) and secrets.compare_digest(a, b)


def _iso(dt):
    return dt.isoformat() if dt else None


def _leer_json(request):
    if not request.body or not request.body.strip():
        return {}, None
    try:
        return json.loads(request.body.decode("utf-8")), None
    except Exception:
        return None, JsonResponse({"error": "json_invalido"}, status=400)


def _serializar_contrato(c: ContratoJuego):
    customization = getattr(c, "customization", None)
    return {
        "id": c.id,
        "juego": {"slug": c.juego.slug, "nombre": c.juego.name},
        "fecha_inicio": c.fecha_inicio.isoformat(),
        "fecha_fin": c.fecha_fin.isoformat(),
        "estado": c.estado,
        "creado_en": c.creado_en.isoformat() if c.creado_en else None,
        "customization_updated_at": customization.actualizado_en.isoformat() if customization else None,
        "trivia_question_set_id": c.trivia_question_set_id,
        "has_trivia_questions": bool(c.trivia_question_set_id),
    }


def _build_runner_url(request, juego: Game, sesion: GameSession, user_id: int) -> str:
    if not juego.runner_url:
        return ""

    # 1) normalizar base (absoluta si venía relativa)
    base = juego.runner_url
    if base.startswith("/"):
        base = urljoin(request.build_absolute_uri("/"), base.lstrip("/"))

    parts = urlsplit(base)
    base_query = parts.query

    base_params = {"session_id": str(sesion.id), "user_id": str(user_id)}
    fragment = parts.fragment

    # Trivia: no expone el token en query string para evitar fugas por Referer.
    if juego.slug == "trivia":
        extra = urlencode(base_params)
        token_fragment = urlencode({"session_token": sesion.runner_token})
        fragment = f"{fragment}&{token_fragment}" if fragment else token_fragment
    else:
        extra = urlencode({**base_params, "session_token": sesion.runner_token})

    query = f"{base_query}&{extra}" if base_query else extra

    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, fragment))


def _serializar_juego(juego: Game):
    return {
        "slug": juego.slug,
        "nombre": juego.name,
        "descripcion": juego.description,
        "imagen_portada": juego.cover_image_url or "",
        "runner_url": juego.runner_url or "",
        "precio": juego.price_label or "",
        "costo_por_partida": juego.cost_per_play,
        "destacado": juego.is_featured,
        "habilitado": juego.is_enabled,
        "tags": list(juego.tags.values_list("name", flat=True)),
    }


def _serializar_sesion(sesion: GameSession):
    return {
        "sesion": {
            "id": str(sesion.id),
            "estado": sesion.status,
            "iniciado_en": _iso(sesion.started_at),
            "finalizado_en": _iso(sesion.ended_at),
            "costo_cobrado": sesion.cost_charged,
            "estado_cliente": sesion.client_state or {},
            "result": sesion.result or {},
        },
        "juego": {
            "slug": sesion.game.slug,
            "nombre": sesion.game.name,
        },
    }


def _serializar_sesion_resumen(sesion: GameSession):
    return {
        "id": str(sesion.id),
        "estado": sesion.status,
        "iniciado_en": _iso(sesion.started_at),
        "finalizado_en": _iso(sesion.ended_at),
        "costo_cobrado": sesion.cost_charged,
        "juego": {
            "slug": sesion.game.slug,
            "nombre": sesion.game.name,
        },
    }


@require_GET
def catalogo_juegos(request):
    juegos = (
        Game.objects.filter(is_enabled=True)
        .order_by("-is_featured", "name")
        .prefetch_related("tags")
    )
    return JsonResponse({"resultados": [_serializar_juego(j) for j in juegos]}, status=200)


@require_GET
@token_required
def mis_sesiones(request):
    sesiones = (
        GameSession.objects.filter(user=request.user)
        .select_related("game")
        .order_by("-started_at")
    )
    return JsonResponse(
        {"resultados": [_serializar_sesion_resumen(s) for s in sesiones]}, status=200
    )


@require_GET
@token_required
def obtener_sesion(request, session_id):
    sesion = get_object_or_404(GameSession, id=session_id, user=request.user)
    data = _serializar_sesion(sesion)
    data["juego"]["runner_url"] = _build_runner_url(request, sesion.game, sesion, request.user.id)
    return JsonResponse(data, status=200)


@csrf_exempt
@require_POST
@token_required
def iniciar_juego(request, slug: str):
    juego = get_object_or_404(Game, slug=slug, is_enabled=True)
    costo_base = int(juego.cost_per_play or 0)
    if costo_base <= 0:
        return JsonResponse({"error": "costo_invalido", "costo": costo_base}, status=400)

    hoy = timezone.localdate()
    contrato_activo = (
        ContratoJuego.objects
        .select_related("customization", "trivia_question_set")
        .filter(
            usuario=request.user,
            juego=juego,
            estado=ContratoJuego.Estado.ACTIVO,
            fecha_inicio__lte=hoy,
            fecha_fin__gte=hoy,
        )
        .order_by("-fecha_inicio", "-id")
        .first()
    )
    cobra_partida = contrato_activo is None
    costo = costo_base if cobra_partida else 0

    with transaction.atomic():
        billetera, _ = Wallet.objects.select_for_update().get_or_create(
            user=request.user,
            defaults={"balance": 0},
        )

        if cobra_partida and billetera.balance < costo:
            return JsonResponse(
                {"error": "saldo_insuficiente", "saldo": billetera.balance, "costo": costo},
                status=402,
            )

        custom_config = _default_customization_for_game(juego.slug)
        preview_mode = False
        if contrato_activo:
            custom_config = _absolutize_asset_urls_for_response(
                request,
                _get_contract_customization_config(contrato_activo),
            )

        client_state = {
            "juego": juego.slug,
            "iniciado": True,
        }
        if juego.slug == "trivia":
            client_state["customization"] = custom_config
            client_state["preview_mode"] = preview_mode
            if contrato_activo:
                client_state["contract_id"] = contrato_activo.id

        question_set = None
        # EL 1: si es trivia, seteamos question_set en la sesión
        if juego.slug == "trivia":
            if contrato_activo:
                question_set = _get_contract_trivia_question_set_for_play(contrato_activo)
            if not question_set:
                question_set = pick_question_set_for_session(user=request.user, juego=juego)
            if not question_set:
                return JsonResponse(
                    {"error": "sesion_sin_question_set"},
                    status=409
                )

        # 1) crear sesión
        sesion = GameSession.objects.create(
            user=request.user,
            game=juego,
            status=GameSession.Status.ACTIVE,
            cost_charged=costo,
            client_state=client_state,
            question_set=question_set,
        )

        # 2) runner_token (SIEMPRE)
        sesion.runner_token = secrets.token_urlsafe(32)[:64]
        sesion.save(update_fields=["runner_token"])

        # 3) debitar (solo si no está cubierto por contrato activo)
        if cobra_partida:
            Wallet.objects.filter(pk=billetera.pk).update(balance=F("balance") - costo)

            # 4) ledger
            LedgerEntry.objects.create(
                user=request.user,
                kind=LedgerEntry.Kind.SPEND,
                amount=-costo,
                reference_type="game_session",
                reference_id=str(sesion.id),
            )

        billetera.refresh_from_db(fields=["balance"])
        runner_final = _build_runner_url(request, juego, sesion, request.user.id)

    return JsonResponse(
        {
            "juego": {"slug": juego.slug, "nombre": juego.name, "runner_url": runner_final},
            "costo_cobrado": costo,
            "saldo_restante": billetera.balance,
            "id_sesion": str(sesion.id),
        },
        status=201,
    )


@csrf_exempt
@require_POST
@token_required
def preview_juego(request, slug: str):
    """
    Preview sin cobro para que el cliente pruebe antes de pagar.
    En Trivia, se activa preview_mode para que el runner muestre watermark.
    """
    juego = get_object_or_404(Game, slug=slug, is_enabled=True)

    question_set = None
    client_state = {
        "juego": juego.slug,
        "iniciado": True,
        "preview_mode": True,
    }

    if juego.slug == "trivia":
        question_set = _pick_question_set_for_preview(request.user, juego)
        if not question_set:
            return JsonResponse({"error": "sesion_sin_question_set"}, status=409)

        client_state["customization"] = _default_customization_for_game(juego.slug)

    sesion = GameSession.objects.create(
        user=request.user,
        game=juego,
        status=GameSession.Status.ACTIVE,
        cost_charged=0,
        client_state=client_state,
        question_set=question_set,
    )
    sesion.runner_token = secrets.token_urlsafe(32)[:64]
    sesion.save(update_fields=["runner_token"])

    runner_final = _build_runner_url(request, juego, sesion, request.user.id)
    return JsonResponse(
        {
            "ok": True,
            "preview_mode": True,
            "launch_mode": "preview",
            "juego": {"slug": juego.slug, "nombre": juego.name, "runner_url": runner_final},
            "id_sesion": str(sesion.id),
        },
        status=201,
    )


@require_GET
def runner_obtener_sesion(request, session_id):
    token = request.GET.get("session_token") or ""
    user_id = request.GET.get("user_id")

    if not user_id or not str(user_id).isdigit():
        return JsonResponse({"error": "user_id_requerido"}, status=400)

    user_id = int(user_id)

    # Evita enumeración: si no existe, devolvemos 401 igual.
    try:
        sesion = GameSession.objects.get(id=session_id, user_id=user_id)
    except GameSession.DoesNotExist:
        return JsonResponse({"error": "session_token_invalido"}, status=401)

    if not _token_ok(sesion.runner_token, token):
        return JsonResponse({"error": "session_token_invalido"}, status=401)

    data = _serializar_sesion(sesion)
    data["juego"]["runner_url"] = _build_runner_url(request, sesion.game, sesion, user_id)
    return JsonResponse(data, status=200)


@csrf_exempt
@require_POST
@token_required
def finalizar_sesion(request, session_id):
    sesion = get_object_or_404(GameSession, id=session_id, user=request.user)

    payload, error = _leer_json(request)
    if error:
        return error

    estado_cliente = payload.get("estado_cliente") or payload.get("client_state")
    if estado_cliente is not None and not isinstance(estado_cliente, dict):
        return JsonResponse({"error": "estado_cliente_invalido"}, status=400)

    result = payload.get("result")
    if result is not None and not isinstance(result, dict):
        return JsonResponse({"error": "result_invalido"}, status=400)

    if sesion.status == GameSession.Status.FINISHED:
        data = _serializar_sesion(sesion)
        data["juego"]["runner_url"] = _build_runner_url(request, sesion.game, sesion, request.user.id)
        return JsonResponse(data, status=200)

    if sesion.status != GameSession.Status.ACTIVE:
        return JsonResponse({"error": "sesion_no_activa", "estado": sesion.status}, status=409)

    update_fields = ["status", "ended_at"]

    if isinstance(estado_cliente, dict):
        sesion.client_state = estado_cliente
        update_fields.append("client_state")

    if isinstance(result, dict):
        sesion.result = result
        update_fields.append("result")

    sesion.status = GameSession.Status.FINISHED
    sesion.ended_at = timezone.now()
    sesion.save(update_fields=update_fields)

    data = _serializar_sesion(sesion)
    data["juego"]["runner_url"] = _build_runner_url(request, sesion.game, sesion, request.user.id)
    return JsonResponse(data, status=200)


@csrf_exempt
@require_POST
def runner_finalizar_sesion(request, session_id):
    payload, error = _leer_json(request)
    if error:
        return error

    token = payload.get("session_token") or request.GET.get("session_token") or ""
    user_id = payload.get("user_id") or request.GET.get("user_id")

    if not user_id or not str(user_id).isdigit():
        return JsonResponse({"error": "user_id_requerido"}, status=400)

    user_id = int(user_id)
    sesion = get_object_or_404(GameSession, id=session_id, user_id=user_id)

    if not _token_ok(sesion.runner_token, token):
        return JsonResponse({"error": "session_token_invalido"}, status=401)

    estado_cliente = payload.get("estado_cliente") or payload.get("client_state")
    if estado_cliente is not None and not isinstance(estado_cliente, dict):
        return JsonResponse({"error": "estado_cliente_invalido"}, status=400)

    result = payload.get("result")
    if result is not None and not isinstance(result, dict):
        return JsonResponse({"error": "result_invalido"}, status=400)

    if sesion.status == GameSession.Status.FINISHED:
        return JsonResponse(_serializar_sesion(sesion), status=200)

    if sesion.status != GameSession.Status.ACTIVE:
        return JsonResponse({"error": "sesion_no_activa", "estado": sesion.status}, status=409)

    update_fields = ["status", "ended_at"]

    if isinstance(estado_cliente, dict):
        current = sesion.client_state or {}
        # merge shallow por juego (hangman, trivia, etc.)
        current.update(estado_cliente)
        sesion.client_state = current
        update_fields.append("client_state")

    if isinstance(result, dict):
        sesion.result = result
        update_fields.append("result")

    sesion.status = GameSession.Status.FINISHED
    sesion.ended_at = timezone.now()
    sesion.save(update_fields=update_fields)

    return JsonResponse(_serializar_sesion(sesion), status=200)


@require_GET
def runner_hangman_page(request):
    session_id = request.GET.get("session_id")
    token = request.GET.get("session_token") or ""
    user_id = request.GET.get("user_id")

    if not session_id or not user_id or not str(user_id).isdigit():
        return JsonResponse({"error": "parametros_invalidos"}, status=400)

    try:
        sesion = GameSession.objects.get(id=session_id, user_id=int(user_id), game__slug="hangman")
    except GameSession.DoesNotExist:
        return JsonResponse({"error": "session_token_invalido"}, status=401)

    if not _token_ok(sesion.runner_token, token):
        return JsonResponse({"error": "session_token_invalido"}, status=401)

    # opcional: impedir entrar a sesiones finalizadas
    if sesion.status != GameSession.Status.ACTIVE:
        return JsonResponse({"error": "sesion_no_activa", "estado": sesion.status}, status=409)

    return render(request, "runner/hangman/index.html")
