import json
from decimal import Decimal, InvalidOperation

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from api_auth.auth import token_required, admin_required
from wallet.models import CreditPack


def _to_decimal(v):
    try:
        return Decimal(str(v))
    except (InvalidOperation, TypeError):
        return None


@require_GET
@token_required
@admin_required
def admin_credit_packs_list(request):
    qs = CreditPack.objects.all().order_by("credits")
    return JsonResponse({
        "resultados": [
            {
                "id": p.id,
                "name": p.name,
                "credits": p.credits,
                "price_ars": str(p.price_ars),
                "mp_title": p.mp_title or "",
                "mp_description": p.mp_description or "",
                "active": bool(p.active),
            }
            for p in qs
        ]
    })


@csrf_exempt
@require_POST
@token_required
@admin_required
def admin_credit_packs_create(request):
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return JsonResponse({"error": "json_invalido"}, status=400)

    name = (data.get("name") or "").strip()
    credits = data.get("credits")
    price_ars = _to_decimal(data.get("price_ars"))
    mp_title = (data.get("mp_title") or "").strip()
    mp_description = (data.get("mp_description") or "").strip()
    active = bool(data.get("active", True))

    if not name:
        return JsonResponse({"error": "name_requerido"}, status=400)
    if not isinstance(credits, int) or credits <= 0:
        return JsonResponse({"error": "credits_invalido"}, status=400)
    if price_ars is None or price_ars < 0:
        return JsonResponse({"error": "price_ars_invalido"}, status=400)

    p = CreditPack.objects.create(
        name=name,
        credits=credits,
        price_ars=price_ars,
        mp_title=mp_title,
        mp_description=mp_description,
        active=active,
    )

    return JsonResponse({
        "ok": True,
        "pack": {
            "id": p.id,
            "name": p.name,
            "credits": p.credits,
            "price_ars": str(p.price_ars),
            "mp_title": p.mp_title or "",
            "mp_description": p.mp_description or "",
            "active": bool(p.active),
        }
    }, status=201)


@csrf_exempt
@require_http_methods(["PUT", "PATCH", "DELETE"])
@token_required
@admin_required
def admin_credit_packs_detail(request, pack_id: int):
    try:
        p = CreditPack.objects.get(id=pack_id)
    except CreditPack.DoesNotExist:
        return JsonResponse({"error": "pack_not_found"}, status=404)

    if request.method == "DELETE":
        p.delete()
        return JsonResponse({"ok": True})

    # PUT/PATCH
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return JsonResponse({"error": "json_invalido"}, status=400)

    if "name" in data:
        p.name = (data.get("name") or "").strip()

    if "credits" in data:
        if not isinstance(data["credits"], int) or data["credits"] <= 0:
            return JsonResponse({"error": "credits_invalido"}, status=400)
        p.credits = data["credits"]

    if "price_ars" in data:
        d = _to_decimal(data.get("price_ars"))
        if d is None or d < 0:
            return JsonResponse({"error": "price_ars_invalido"}, status=400)
        p.price_ars = d

    if "mp_title" in data:
        p.mp_title = (data.get("mp_title") or "").strip()

    if "mp_description" in data:
        p.mp_description = (data.get("mp_description") or "").strip()

    if "active" in data:
        p.active = bool(data.get("active"))

    if not p.name:
        return JsonResponse({"error": "name_requerido"}, status=400)

    p.save()

    return JsonResponse({
        "ok": True,
        "pack": {
            "id": p.id,
            "name": p.name,
            "credits": p.credits,
            "price_ars": str(p.price_ars),
            "mp_title": p.mp_title or "",
            "mp_description": p.mp_description or "",
            "active": bool(p.active),
        }
    })