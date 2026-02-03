# wallet/views.py
import json

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from api_auth.auth import token_required
from .models import Billetera, MovimientoBilletera


def _leer_json(request):
    if not request.body or not request.body.strip():
        return {}, None
    try:
        return json.loads(request.body.decode("utf-8")), None
    except Exception:
        return None, JsonResponse({"error": "json_invalido"}, status=400)


@require_GET
@token_required
def mi_billetera(request):
    billetera, _ = Billetera.objects.get_or_create(
        usuario=request.user,
        defaults={"saldo": 0},
    )
    return JsonResponse({"usuario": request.user.username, "saldo": billetera.saldo}, status=200)


@csrf_exempt
@require_POST
@token_required
def recargar_billetera(request):
    payload, error = _leer_json(request)
    if error:
        return error

    monto = payload.get("monto")
    if monto is None:
        monto = payload.get("amount")  # compat

    if not isinstance(monto, int):
        return JsonResponse({"error": "monto_debe_ser_entero"}, status=400)
    if monto <= 0:
        return JsonResponse({"error": "monto_debe_ser_positivo"}, status=400)

    with transaction.atomic():
        billetera, _ = Billetera.objects.select_for_update().get_or_create(
            usuario=request.user,
            defaults={"saldo": 0},
        )
        billetera.saldo += monto
        billetera.save(update_fields=["saldo"])

    return JsonResponse({"usuario": request.user.username, "saldo": billetera.saldo}, status=200)