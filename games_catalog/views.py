import json
import secrets
from urllib.parse import urlencode, urlsplit, urlunsplit

from django.db import transaction
from django.db.models import F
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.shortcuts import render

from api_auth.auth import token_required
from wallet.models import Wallet, LedgerEntry
from .models import Game, GameSession




def _iso(dt):
    return dt.isoformat() if dt else None


def _leer_json(request):
    if not request.body or not request.body.strip():
        return {}, None
    try:
        return json.loads(request.body.decode("utf-8")), None
    except Exception:
        return None, JsonResponse({"error": "json_invalido"}, status=400)


def _build_runner_url(juego: Game, sesion: GameSession, user_id: int) -> str:
    if not juego.runner_url:
        return ""

    parts = urlsplit(juego.runner_url)
    base_query = parts.query

    extra = urlencode({
        "session_id": str(sesion.id),
        "user_id": str(user_id),
        "session_token": sesion.runner_token,
    })

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
        Game.objects
        .filter(is_enabled=True)
        .order_by("-is_featured", "name")
        .prefetch_related("tags")
    )
    return JsonResponse({"resultados": [_serializar_juego(j) for j in juegos]}, status=200)


@require_GET
@token_required
def mis_sesiones(request):
    sesiones = (
        GameSession.objects
        .filter(user=request.user)
        .select_related("game")
        .order_by("-started_at")
    )
    return JsonResponse({"resultados": [_serializar_sesion_resumen(s) for s in sesiones]}, status=200)


@require_GET
@token_required
def obtener_sesion(request, session_id):
    sesion = get_object_or_404(GameSession, id=session_id, user=request.user)
    data = _serializar_sesion(sesion)
    data["juego"]["runner_url"] = _build_runner_url(sesion.game, sesion, user.id)
    return JsonResponse(data, status=200)


@csrf_exempt
@require_POST
@token_required
def iniciar_juego(request, slug: str):
    juego = get_object_or_404(Game, slug=slug, is_enabled=True)
    costo = int(juego.cost_per_play or 0)

    if costo <= 0:
        return JsonResponse({"error": "costo_invalido", "costo": costo}, status=400)

    with transaction.atomic():
        billetera, _ = Wallet.objects.select_for_update().get_or_create(
            user=request.user,
            defaults={"balance": 0},
        )

        if billetera.balance < costo:
            return JsonResponse(
                {"error": "saldo_insuficiente", "saldo": billetera.balance, "costo": costo},
                status=402,
            )

        # 1) crear sesión
        sesion = GameSession.objects.create(
            user=request.user,
            game=juego,
            status=GameSession.Status.ACTIVE,
            cost_charged=costo,
            client_state={"juego": juego.slug, "iniciado": True},
        )

        # 2) runner_token (DB)
        sesion.runner_token = secrets.token_urlsafe(32)[:64]
        sesion.save(update_fields=["runner_token"])

        # 3) debitar
        Wallet.objects.filter(pk=billetera.pk).update(balance=F("balance") - costo)

        # 4) ledger spend
        LedgerEntry.objects.create(
            user=request.user,
            kind=LedgerEntry.Kind.SPEND,
            amount=-costo,
            reference_type="game_session",
            reference_id=str(sesion.id),
        )

        billetera.refresh_from_db(fields=["balance"])
        runner_final = _build_runner_url(juego, sesion, request.user.id)

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
    sesion = get_object_or_404(GameSession, id=session_id, user_id=user_id)

    if not sesion.runner_token or sesion.runner_token != token:
        return JsonResponse({"error": "session_token_invalido"}, status=401)

    data = _serializar_sesion(sesion)
    data["juego"]["runner_url"] = _build_runner_url(sesion.game, sesion, user_id)
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
        data["juego"]["runner_url"] = _build_runner_url(sesion.game, sesion, request.user.id)
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
    data["juego"]["runner_url"] = _build_runner_url(sesion.game, sesion, request.user.id)
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

    if not sesion.runner_token or sesion.runner_token != token:
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
        sesion.client_state = estado_cliente
        update_fields.append("client_state")

    if isinstance(result, dict):
        sesion.result = result
        update_fields.append("result")

    sesion.status = GameSession.Status.FINISHED
    sesion.ended_at = timezone.now()
    sesion.save(update_fields=update_fields)

    return JsonResponse(_serializar_sesion(sesion), status=200)



def runner_hangman_page(request):
    return render(request, "runner/hangman/index.html")