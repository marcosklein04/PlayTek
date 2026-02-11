from django.contrib import admin
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from .models import Wallet, LedgerEntry, CreditPack, WalletTopup, Billetera, MovimientoBilletera


@admin.register(CreditPack)
class CreditPackAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "credits", "price_ars", "active", "created_at")
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


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "balance", "updated_at")
    search_fields = ("user__username", "user__email")


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "kind", "amount", "reference_type", "reference_id", "created_at")
    list_filter = ("kind",)
    search_fields = ("user__username", "reference_type", "reference_id")

# Proxies (en español en admin)
admin.site.register(Billetera)
admin.site.register(MovimientoBilletera)