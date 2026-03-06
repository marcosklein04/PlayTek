from django import forms
from django.contrib import admin
from django.contrib import messages
from django.contrib.admin.helpers import ActionForm
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from .models import Wallet, LedgerEntry, CreditPack, WalletTopup, Billetera, MovimientoBilletera


class WalletCreditActionForm(ActionForm):
    credit_amount = forms.IntegerField(
        required=False,
        min_value=1,
        label="Créditos a asignar",
    )
    credit_reason = forms.CharField(
        required=False,
        max_length=120,
        label="Motivo",
    )


@admin.register(CreditPack)
class CreditPackAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "credits", "base_price_ars", "discount_percent", "price_ars", "active", "created_at")
    list_filter = ("active",)
    search_fields = ("name", "mp_title")
    list_editable = ("active",)
    ordering = ("credits",)


@admin.register(WalletTopup)
class WalletTopupAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "pack", "status", "credits", "amount_ars", "created_at", "approved_at")
    list_filter = ("status", "pack")
    search_fields = ("user__username", "mp_preference_id", "mp_payment_id")
    readonly_fields = ("created_at", "approved_at", "mp_preference_id", "mp_payment_id", "checkout_url")
    actions = ("approve_selected",)

    @admin.action(description="✅ Aprobar y acreditar créditos (DEV)")
    def approve_selected(self, request, queryset):
        # idempotente: solo PENDING
        qs = queryset.select_related("user").filter(status=WalletTopup.Status.PENDING)

        for topup in qs:
            with transaction.atomic():
                wallet, _ = Wallet.objects.select_for_update().get_or_create(
                    user=topup.user,
                    defaults={"balance": 0},
                )

                Wallet.objects.filter(pk=wallet.pk).update(balance=F("balance") + topup.credits)

                LedgerEntry.objects.create(
                    user=topup.user,
                    kind=LedgerEntry.Kind.TOPUP,
                    amount=int(topup.credits),
                    reference_type="admin_approve",
                    reference_id=str(topup.id),
                )

                topup.status = WalletTopup.Status.APPROVED
                topup.approved_at = timezone.now()
                topup.mp_payment_id = topup.mp_payment_id or "ADMIN_APPROVE"
                topup.save(update_fields=["status", "approved_at", "mp_payment_id"])


class WalletAdmin(admin.ModelAdmin):
    action_form = WalletCreditActionForm
    list_display = ("id", "user", "balance", "updated_at")
    search_fields = ("user__username", "user__email")
    actions = ("assign_credits",)

    @admin.action(description="Asignar créditos a las billeteras seleccionadas")
    def assign_credits(self, request, queryset):
        amount = request.POST.get("credit_amount")
        reason = (request.POST.get("credit_reason") or "").strip()

        try:
            parsed_amount = int(str(amount or "").strip())
        except (TypeError, ValueError):
            self.message_user(request, "Ingresá una cantidad válida de créditos.", level=messages.ERROR)
            return

        if parsed_amount <= 0:
            self.message_user(request, "La cantidad de créditos debe ser mayor a 0.", level=messages.ERROR)
            return

        reference_id = reason[:128] if reason else f"django_admin:{request.user.id}"
        updated_count = 0

        for wallet in queryset.select_related("user"):
            with transaction.atomic():
                locked_wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
                Wallet.objects.filter(pk=locked_wallet.pk).update(balance=F("balance") + parsed_amount)
                LedgerEntry.objects.create(
                    user=locked_wallet.user,
                    kind=LedgerEntry.Kind.ADJUST,
                    amount=parsed_amount,
                    reference_type="django_admin_credit",
                    reference_id=reference_id,
                )
            updated_count += 1

        self.message_user(
            request,
            f"Se acreditaron {parsed_amount} créditos a {updated_count} billetera(s).",
            level=messages.SUCCESS,
        )


class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "kind", "amount", "reference_type", "reference_id", "created_at")
    list_filter = ("kind",)
    search_fields = ("user__username", "reference_type", "reference_id")


@admin.register(Billetera)
class BilleteraAdmin(WalletAdmin):
    pass


@admin.register(MovimientoBilletera)
class MovimientoBilleteraAdmin(admin.ModelAdmin):
    list_display = ("id", "usuario", "tipo", "monto", "tipo_referencia", "id_referencia", "creado_en")
    list_filter = ("kind",)
    search_fields = ("user__username", "reference_type", "reference_id")
