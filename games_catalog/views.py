import json

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from api_auth.auth import token_required
from wallet.models import Billetera

# IMPORTANTE:
# Usamos MODELOS REALES (no proxies) para escribir/filtrar en DB
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


def _serializar_juego(juego: Game):
    return {
        "slug": juego.slug,
        "nombre": juego.name,
        "descripcion": juego.description,
        "imagen_portada": juego.cover_image_url or "",
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


@csrf_exempt
@require_POST
@token_required
def iniciar_juego(request, slug: str):
    juego = get_object_or_404(Game, slug=slug, is_enabled=True)
    costo = int(juego.cost_per_play or 0)

    with transaction.atomic():
        billetera, _ = Billetera.objects.select_for_update().get_or_create(
            usuario=request.user,
            defaults={"saldo": 0},
        )

        if billetera.saldo < costo:
            return JsonResponse(
                {"error": "saldo_insuficiente", "saldo": billetera.saldo, "costo": costo},
                status=402,
            )

        billetera.saldo -= costo
        billetera.save(update_fields=["saldo"])

        # CLAVE: usar campos REALES del modelo GameSession
        sesion = GameSession.objects.create(
            user=request.user,
            game=juego,
            status=GameSession.Status.ACTIVE,
            cost_charged=costo,
            client_state={"juego": juego.slug, "iniciado": True},
        )

    return JsonResponse(
        {
            "juego": {"slug": juego.slug, "nombre": juego.name},
            "costo_cobrado": costo,
            "saldo_restante": billetera.saldo,  # antes estaba billetera.balance (mal)
            "id_sesion": str(sesion.id),
        },
        status=201,
    )


@require_GET
@token_required
def obtener_sesion(request, session_id):
    sesion = get_object_or_404(GameSession, id=session_id, user=request.user)
    return JsonResponse(_serializar_sesion(sesion), status=200)


@csrf_exempt
@require_POST
@token_required
def finalizar_sesion(request, session_id):
    sesion = get_object_or_404(GameSession, id=session_id, user=request.user)

    payload, error = _leer_json(request)
    if error:
        return error

    estado_cliente = payload.get("estado_cliente")
    if estado_cliente is None:
        estado_cliente = payload.get("client_state")

    if estado_cliente is not None and not isinstance(estado_cliente, dict):
        return JsonResponse({"error": "estado_cliente_invalido"}, status=400)

    if sesion.status == GameSession.Status.FINISHED:
        return JsonResponse(_serializar_sesion(sesion), status=200)

    if sesion.status != GameSession.Status.ACTIVE:
        return JsonResponse({"error": "sesion_no_activa", "estado": sesion.status}, status=409)

    update_fields = ["status", "ended_at"]

    if isinstance(estado_cliente, dict):
        sesion.client_state = estado_cliente
        update_fields.append("client_state")

    sesion.status = GameSession.Status.FINISHED
    sesion.ended_at = timezone.now()
    sesion.save(update_fields=update_fields)

    return JsonResponse(_serializar_sesion(sesion), status=200)