import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from api_auth.auth import token_required, admin_required
from wallet.models import CreditPack
from wallet.pack_utils import resolve_pack_pricing, serialize_pack


@require_GET
@token_required
@admin_required
def admin_credit_packs_list(request):
    qs = CreditPack.objects.all().order_by("credits")
    return JsonResponse({
        "resultados": [serialize_pack(p) for p in qs]
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
    mp_title = (data.get("mp_title") or "").strip()
    mp_description = (data.get("mp_description") or "").strip()
    active = bool(data.get("active", True))

    if not name:
        return JsonResponse({"error": "name_requerido"}, status=400)
    if not isinstance(credits, int) or credits <= 0:
        return JsonResponse({"error": "credits_invalido"}, status=400)

    price_ars, discount_percent, base_price_ars = resolve_pack_pricing(data)
    if price_ars is None:
        return JsonResponse({"error": base_price_ars}, status=400)

    p = CreditPack.objects.create(
        name=name,
        credits=credits,
        price_ars=price_ars,
        base_price_ars=base_price_ars,
        discount_percent=discount_percent,
        mp_title=mp_title,
        mp_description=mp_description,
        active=active,
    )

    return JsonResponse({
        "ok": True,
        "pack": serialize_pack(p)
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

    if any(field in data for field in ("price_ars", "base_price_ars", "discount_percent")):
        price_ars, discount_percent, base_price_ars = resolve_pack_pricing(data, current_pack=p)
        if price_ars is None:
            return JsonResponse({"error": base_price_ars}, status=400)
        p.price_ars = price_ars
        p.base_price_ars = base_price_ars
        p.discount_percent = discount_percent

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
        "pack": serialize_pack(p)
    })
