import json
import uuid
import requests

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.http import JsonResponse, HttpResponse
from django.shortcuts import redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from api_auth.auth import token_required
from .mp import create_preference
from .models import Wallet, LedgerEntry, CreditPack, WalletTopup

def _require_admin(user):
    return bool(user and user.is_superuser)

@require_GET
@token_required
def admin_credit_packs(request):
    if not _require_admin(request.user):
        return JsonResponse({"error": "forbidden"}, status=403)

    packs = CreditPack.objects.all().order_by("credits")
    return JsonResponse({
        "resultados": [
            {
                "id": p.id,
                "name": p.name,
                "credits": p.credits,
                "price_ars": str(p.price_ars),
                "mp_title": p.mp_title,
                "mp_description": p.mp_description,
                "active": bool(p.active),
            }
            for p in packs
        ]
    })

@csrf_exempt
@require_POST
@token_required
def admin_credit_packs_create(request):
    if not _require_admin(request.user):
        return JsonResponse({"error": "forbidden"}, status=403)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"error": "json_invalido"}, status=400)

    name = (data.get("name") or "").strip()
    credits = data.get("credits")
    price_ars = data.get("price_ars")
    mp_title = (data.get("mp_title") or "").strip()
    mp_description = (data.get("mp_description") or "").strip()
    active = bool(data.get("active", True))

    if not name:
        return JsonResponse({"error": "name_requerido"}, status=400)
    if not isinstance(credits, int) or credits <= 0:
        return JsonResponse({"error": "credits_invalido"}, status=400)

    # price_ars puede venir como number o string
    try:
        price_ars = str(price_ars)
    except Exception:
        return JsonResponse({"error": "price_ars_invalido"}, status=400)

    p = CreditPack.objects.create(
        name=name,
        credits=credits,
        price_ars=price_ars,
        mp_title=mp_title,
        mp_description=mp_description,
        active=active,
    )

    return JsonResponse({"ok": True, "id": p.id})

@csrf_exempt
@require_http_methods(["PATCH"])
@token_required
def admin_credit_packs_update(request, pack_id: int):
    if not _require_admin(request.user):
        return JsonResponse({"error": "forbidden"}, status=403)

    try:
        p = CreditPack.objects.get(id=pack_id)
    except CreditPack.DoesNotExist:
        return JsonResponse({"error": "pack_not_found"}, status=404)

    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"error": "json_invalido"}, status=400)

    # actualizaciones parciales
    if "name" in data:
        p.name = (data.get("name") or "").strip()
    if "credits" in data:
        if not isinstance(data["credits"], int) or data["credits"] <= 0:
            return JsonResponse({"error": "credits_invalido"}, status=400)
        p.credits = data["credits"]
    if "price_ars" in data:
        p.price_ars = str(data["price_ars"])
    if "mp_title" in data:
        p.mp_title = (data.get("mp_title") or "").strip()
    if "mp_description" in data:
        p.mp_description = (data.get("mp_description") or "").strip()
    if "active" in data:
        p.active = bool(data["active"])

    p.save()
    return JsonResponse({"ok": True})


@require_GET
@token_required
def credit_packs(request):
    packs = CreditPack.objects.filter(active=True).order_by("credits")
    return JsonResponse({
        "resultados": [
            {
                "id": p.id,
                "name": p.name,
                "credits": p.credits,
                "price_ars": str(p.price_ars),
                "mp_title": p.mp_title,
                "mp_description": p.mp_description,
            }
            for p in packs
        ]
    })


@csrf_exempt
@require_POST
@token_required
def create_topup(request):
    body = json.loads(request.body.decode("utf-8") or "{}")
    pack_id = body.get("pack_id")
    if not pack_id:
        return JsonResponse({"error": "pack_id requerido"}, status=400)

    try:
        pack = CreditPack.objects.get(id=pack_id, active=True)
    except CreditPack.DoesNotExist:
        return JsonResponse({"error": "Pack inexistente o inactivo"}, status=404)

    # 1) Creamos la orden de topup en DB (PENDING)
    topup = WalletTopup.objects.create(
        user=request.user,
        pack=pack,
        status=WalletTopup.Status.PENDING,
        amount_ars=pack.price_ars,
        credits=pack.credits,
    )

    # 2) Armamos URLs
    # Webhook (en prod tiene que ser un dominio público)
    notification_url = request.build_absolute_uri("/api/mp/webhook")

    frontend = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:8080")
    success_url = f"{frontend}/buy-credits?status=success&topup_id={topup.id}"
    failure_url = f"{frontend}/buy-credits?status=failure&topup_id={topup.id}"
    pending_url = f"{frontend}/buy-credits?status=pending&topup_id={topup.id}"

    # 3) Crear preferencia en MP
    try:
        pref = create_preference(
            title=pack.mp_title or f"{pack.credits} créditos",
            description=pack.mp_description or pack.name,
            amount_ars=float(pack.price_ars),
            external_reference=str(topup.id),
            notification_url=notification_url,
            success_url=success_url,
            failure_url=failure_url,
            pending_url=pending_url,
        )
    except Exception as e:
        # marcar como REJECTED (opcional)
        topup.status = WalletTopup.Status.REJECTED
        topup.save(update_fields=["status"])
        return JsonResponse(
            {"error": "mp_preference_error", "detalle": str(e)},
            status=500
        )

    # 4) Guardar ids/urls que devuelve MP
    pref_id = pref.get("id", "")
    init_point = pref.get("init_point", "")
    sandbox_init_point = pref.get("sandbox_init_point", "")

    checkout_url = sandbox_init_point if settings.MP_SANDBOX else init_point

    topup.mp_preference_id = pref_id
    topup.checkout_url = checkout_url
    topup.save(update_fields=["mp_preference_id", "checkout_url"])

    return JsonResponse({
        "ok": True,
        "topup_id": topup.id,
        "checkout_url": checkout_url,
        "amount_ars": str(topup.amount_ars),
        "credits": topup.credits,
        "mp_preference_id": topup.mp_preference_id,
    })


@require_GET
@token_required
def mi_billetera(request):
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
    # Recarga manual (útil para testing / admin interno)
    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return JsonResponse({"error": "json_invalido"}, status=400)

    monto = payload.get("monto") or payload.get("amount")
    if not isinstance(monto, int) or monto <= 0:
        return JsonResponse({"error": "monto_invalido"}, status=400)

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

        return JsonResponse(
            {"usuario": request.user.username, "saldo": wallet.balance},
            status=200,
        )
    except Exception as e:
        return JsonResponse({"error": "error_interno", "detalle": str(e)}, status=500)
    



# =========================
# MOCK CHECKOUT (HTML)
# =========================

@require_GET
def mock_checkout(request, uuid):
    # Buscar por mp_preference_id (uuid string)
    topup = WalletTopup.objects.filter(mp_preference_id=str(uuid)).first()
    if not topup:
        return HttpResponse("Topup inexistente", status=404)

    # Si vienen con ?approve=1 => simular pago aprobado
    if request.GET.get("approve") == "1":
        if topup.status != WalletTopup.Status.APPROVED:
            with transaction.atomic():
                # lock wallet
                wallet, _ = Wallet.objects.select_for_update().get_or_create(
                    user=topup.user,
                    defaults={"balance": 0},
                )

                # acreditar créditos
                Wallet.objects.filter(pk=wallet.pk).update(balance=F("balance") + topup.credits)

                LedgerEntry.objects.create(
                    user=topup.user,
                    kind=LedgerEntry.Kind.TOPUP,
                    amount=topup.credits,
                    reference_type="wallet_topup",
                    reference_id=str(topup.id),
                )

                topup.status = WalletTopup.Status.APPROVED
                topup.approved_at = timezone.now()
                topup.save(update_fields=["status", "approved_at"])

        return HttpResponse(
            f"""
            <html><body style="font-family:Arial;padding:24px;">
              <h2>✅ Pago aprobado (mock)</h2>
              <p>Topup #{topup.id} acreditado: <b>+{topup.credits} créditos</b></p>
              <p>Ya podés volver al frontend y refrescar el saldo.</p>
            </body></html>
            """,
            content_type="text/html",
        )

    # Pantalla dummy con link para aprobar
    return HttpResponse(
        f"""
        <html>
          <head><title>Mock Checkout</title></head>
          <body style="font-family: Arial; padding: 24px;">
            <h2>🧾 Mock Checkout</h2>
            <p>Topup: <b>#{topup.id}</b> (estado: <b>{topup.status}</b>)</p>
            <p>Pack: <b>{topup.pack.name}</b> → <b>{topup.credits}</b> créditos por <b>${topup.amount_ars}</b></p>

            <a href="/mock-checkout/{uuid}?approve=1"
               style="display:inline-block;padding:10px 14px;background:#16a34a;color:white;border-radius:8px;text-decoration:none;">
               ✅ Aprobar pago (mock)
            </a>
          </body>
        </html>
        """,
        content_type="text/html",
    )


# =========================
# MOCK APPROVE (acreditar)
# =========================
@csrf_exempt
@require_POST
def mock_checkout_approve(request, uuid):
    """
    Simula webhook/aprobación de MP:
    - busca topup por mp_preference_id
    - si está PENDING -> marca APPROVED
    - acredita wallet + ledger
    - redirige al frontend
    """
    ref = str(uuid)

    with transaction.atomic():
        try:
            topup = WalletTopup.objects.select_for_update().select_related("user").get(mp_preference_id=ref)
        except WalletTopup.DoesNotExist:
            return HttpResponse("Topup inexistente", status=404)

        # idempotente
        if topup.status != WalletTopup.Status.APPROVED:
            wallet, _ = Wallet.objects.select_for_update().get_or_create(
                user=topup.user,
                defaults={"balance": 0},
            )

            # Acreditar
            Wallet.objects.filter(pk=wallet.pk).update(balance=F("balance") + topup.credits)

            LedgerEntry.objects.create(
                user=topup.user,
                kind=LedgerEntry.Kind.TOPUP,
                amount=int(topup.credits),
                reference_type="wallet_topup",
                reference_id=str(topup.id),
            )

            topup.status = WalletTopup.Status.APPROVED
            topup.approved_at = timezone.now()
            topup.mp_payment_id = topup.mp_payment_id or "MOCK_PAYMENT"
            topup.save(update_fields=["status", "approved_at", "mp_payment_id"])

    # Redirigir al frontend (default localhost)
    frontend = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:8080")
    return redirect(f"{frontend}/buy-credits?status=success&ref={ref}")


##################################

# MercadoPago Webhook (real)


##################################


@csrf_exempt
@require_POST
def mp_webhook(request):
    """
    MP manda notificaciones (no siempre viene con JSON completo).
    En Checkout Pro suele venir:
      - ?type=payment&data.id=XXXX
      o en body: {"type":"payment","data":{"id":"..."}}

    Estrategia:
    1) Tomar payment_id
    2) Consultar MP: GET /v1/payments/{id}
    3) Si status=approved -> buscar topup por external_reference y acreditar
    """
    import requests

    # 1) sacar payment id
    payment_id = None

    # querystring
    payment_id = request.GET.get("data.id") or request.GET.get("id") or payment_id

    # body json
    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
        payment_id = payment_id or (payload.get("data", {}) or {}).get("id")
        # a veces viene "id" directo
        payment_id = payment_id or payload.get("id")
    except Exception:
        payload = {}

    if not payment_id:
        return JsonResponse({"ok": True, "ignored": "no_payment_id"}, status=200)

    # 2) consultar payment
    headers = {"Authorization": f"Bearer {settings.MP_ACCESS_TOKEN}"}
    r = requests.get(f"https://api.mercadopago.com/v1/payments/{payment_id}", headers=headers, timeout=30)
    data = r.json() if r.content else {}

    if r.status_code >= 400:
        return JsonResponse({"ok": True, "ignored": "payment_lookup_failed", "detail": data}, status=200)

    status = data.get("status")
    external_reference = data.get("external_reference")  # topup_id
    if not external_reference:
        return JsonResponse({"ok": True, "ignored": "no_external_reference"}, status=200)

    # 3) acreditar si approved
    if status == "approved":
        with transaction.atomic():
            try:
                topup = WalletTopup.objects.select_for_update().get(id=int(external_reference))
            except WalletTopup.DoesNotExist:
                return JsonResponse({"ok": True, "ignored": "topup_not_found"}, status=200)

            # idempotencia
            if topup.status != WalletTopup.Status.APPROVED:
                wallet, _ = Wallet.objects.select_for_update().get_or_create(
                    user=topup.user, defaults={"balance": 0}
                )

                Wallet.objects.filter(pk=wallet.pk).update(balance=F("balance") + topup.credits)

                LedgerEntry.objects.create(
                    user=topup.user,
                    kind=LedgerEntry.Kind.TOPUP,
                    amount=int(topup.credits),
                    reference_type="mp_payment",
                    reference_id=str(payment_id),
                )

                topup.status = WalletTopup.Status.APPROVED
                topup.approved_at = timezone.now()
                topup.mp_payment_id = str(payment_id)
                topup.save(update_fields=["status", "approved_at", "mp_payment_id"])

    return JsonResponse({"ok": True}, status=200)



@require_GET
@token_required
def topup_status(request, topup_id: int):
    # 1) buscar topup del usuario
    try:
        topup = WalletTopup.objects.get(id=topup_id, user=request.user)
    except WalletTopup.DoesNotExist:
        return JsonResponse({"error": "topup_not_found"}, status=404)

    # 2) si ya está aprobado -> listo
    if topup.status == WalletTopup.Status.APPROVED:
        return JsonResponse({"ok": True, "status": topup.status, "credited": True})

    # 3) consultar MP por external_reference=topup.id
    headers = {"Authorization": f"Bearer {settings.MP_ACCESS_TOKEN}"}
    r = requests.get(
        "https://api.mercadopago.com/v1/payments/search",
        headers=headers,
        params={"external_reference": str(topup.id)},
        timeout=30,
    )
    data = r.json() if r.content else {}

    results = data.get("results", []) or []
    approved = next((p for p in results if p.get("status") == "approved"), None)

    if not approved:
        # todavía no aprobado (pending / no hay pago)
        return JsonResponse({
            "ok": True,
            "status": topup.status,
            "credited": False,
            "mp_found": len(results),
        }, status=200)

    payment_id = str(approved.get("id"))

    # 4) acreditar idempotente
    with transaction.atomic():
        topup = WalletTopup.objects.select_for_update().get(id=topup.id)

        if topup.status != WalletTopup.Status.APPROVED:
            wallet, _ = Wallet.objects.select_for_update().get_or_create(
                user=topup.user, defaults={"balance": 0}
            )
            Wallet.objects.filter(pk=wallet.pk).update(balance=F("balance") + topup.credits)

            LedgerEntry.objects.create(
                user=topup.user,
                kind=LedgerEntry.Kind.TOPUP,
                amount=int(topup.credits),
                reference_type="mp_payment",
                reference_id=payment_id,
            )

            topup.status = WalletTopup.Status.APPROVED
            topup.approved_at = timezone.now()
            topup.mp_payment_id = payment_id
            topup.save(update_fields=["status", "approved_at", "mp_payment_id"])

    return JsonResponse({
        "ok": True,
        "status": "APPROVED",
        "credited": True,
        "payment_id": payment_id,
    }, status=200)