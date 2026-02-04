import json
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.db.models import F
from api_auth.auth import token_required
from wallet.models import Wallet, LedgerEntry


@require_GET
@token_required
def mi_billetera(request):
    # No necesita lock: solo lectura + create si no existe
    billetera, _ = Wallet.objects.get_or_create(
        user=request.user,
        defaults={"balance": 0},
    )

    return JsonResponse(
        {"usuario": request.user.username, "saldo": billetera.balance},
        status=200,
    )


@csrf_exempt
@require_POST
@token_required
def recargar_billetera(request):
    # 1) Parse JSON
    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return JsonResponse({"error": "json_invalido"}, status=400)

    monto = payload.get("monto") or payload.get("amount")
    if not isinstance(monto, int) or monto <= 0:
        return JsonResponse({"error": "monto_invalido"}, status=400)

    # 2) Tx
    try:
        with transaction.atomic():
            wallet, _ = Wallet.objects.select_for_update().get_or_create(
                user=request.user,
                defaults={"balance": 0},
            )

            Wallet.objects.filter(pk=wallet.pk).update(balance=F("balance") + monto)

            LedgerEntry.objects.create(
                user=request.user,
                kind=LedgerEntry.Kind.TOPUP,
                amount=monto,
                reference_type="manual_topup",
                reference_id="api",
            )

            wallet.refresh_from_db(fields=["balance"])

        return JsonResponse({"usuario": request.user.username, "saldo": wallet.balance}, status=200)

    except Exception as e:
        # Para ver el error real en consola si se repite
        return JsonResponse({"error": "error_interno", "detalle": str(e)}, status=500)