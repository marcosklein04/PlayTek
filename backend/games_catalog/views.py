import json
import secrets
from copy import deepcopy
from datetime import date
from urllib.parse import urlencode, urlsplit, urlunsplit, urljoin
from django.db import transaction
from django.db.models import F
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from api_auth.auth import token_required
from wallet.models import Wallet, LedgerEntry
from .models import ContratoJuego, Game, GameCustomization, GameSession
from trivia.services import pick_question_set_for_session

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
    }


def _deep_merge_dict(base: dict, patch: dict) -> dict:
    merged = deepcopy(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge_dict(merged[key], value)
        else:
            merged[key] = value
    return merged


def _get_user_contract_or_404(request, contract_id: int):
    return get_object_or_404(
        ContratoJuego.objects.select_related("juego", "customization"),
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
    return _deep_merge_dict(default_config, customization.config)


def _build_session_payload_for_contract(
    request,
    contrato: ContratoJuego,
    *,
    preview_mode: bool,
):
    juego = contrato.juego
    custom_config = _get_contract_customization_config(contrato)

    question_set = None
    if juego.slug == "trivia":
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
            "contract_id": contrato.id,
            "juego": {"slug": juego.slug, "nombre": juego.name, "runner_url": runner_final},
            "id_sesion": str(sesion.id),
        },
        status=201,
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
    fecha_inicio = _parse_date((body.get("fecha_inicio") or "").strip())
    fecha_fin = _parse_date((body.get("fecha_fin") or "").strip())

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
        .select_related("juego", "customization")
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
    effective = _deep_merge_dict(default_config, customization.config or {})

    return JsonResponse(
        {
            "ok": True,
            "contract_id": contrato.id,
            "game_slug": contrato.juego.slug,
            "config": effective,
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

    replace = bool(body.get("replace", False))
    default_config = _default_customization_for_game(contrato.juego.slug)

    customization, _ = GameCustomization.objects.get_or_create(
        contrato=contrato,
        defaults={"config": default_config},
    )

    base = default_config if replace else _deep_merge_dict(default_config, customization.config or {})
    new_config = _deep_merge_dict(base, raw_config)
    customization.config = new_config
    customization.save(update_fields=["config", "actualizado_en"])

    return JsonResponse(
        {
            "ok": True,
            "contract_id": contrato.id,
            "game_slug": contrato.juego.slug,
            "config": new_config,
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

    extra = urlencode(
        {"session_id": str(sesion.id), "user_id": str(user_id), "session_token": sesion.runner_token}
    )
    query = f"{base_query}&{extra}" if base_query else extra

    return urlunsplit((parts.scheme, parts.netloc, parts.path, query, parts.fragment))


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
        .select_related("customization")
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
            custom_config = _get_contract_customization_config(contrato_activo)

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
