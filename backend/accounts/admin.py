from django import forms
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.admin.sites import NotRegistered
from django.contrib.admin.helpers import ActionForm
from django.contrib import messages
from django.db import transaction
from django.db.models import F

from accounts.models import Company, UserProfile
from wallet.models import Wallet, LedgerEntry


User = get_user_model()

admin.site.site_header = "Administración de Playteck"
admin.site.site_title = "Admin de Playteck"
admin.site.index_title = "Administración del sitio"


class CreditAssignmentActionForm(ActionForm):
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


try:
    admin.site.unregister(User)
except NotRegistered:
    pass


@admin.register(User)
class PlaytekUserAdmin(BaseUserAdmin):
    action_form = CreditAssignmentActionForm
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "is_superuser",
        "is_active",
        "date_joined",
    )
    list_editable = ("is_staff", "is_superuser", "is_active")
    list_filter = ("is_staff", "is_superuser", "is_active", "date_joined")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("-date_joined",)
    readonly_fields = ("date_joined", "last_login")

    @admin.action(description="Dar acceso al admin de Django")
    def make_staff(self, request, queryset):
        queryset.update(is_staff=True)

    @admin.action(description="Dar acceso total (superadmin)")
    def make_superuser(self, request, queryset):
        queryset.update(is_staff=True, is_superuser=True)

    @admin.action(description="Quitar permisos de admin")
    def revoke_admin(self, request, queryset):
        queryset.update(is_staff=False, is_superuser=False)

    @admin.action(description="Asignar créditos a los usuarios seleccionados")
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

        credited_count = 0
        reference_id = reason[:128] if reason else f"django_admin:{request.user.id}"

        for user in queryset:
            with transaction.atomic():
                wallet, _ = Wallet.objects.select_for_update().get_or_create(
                    user=user,
                    defaults={"balance": 0},
                )
                Wallet.objects.filter(pk=wallet.pk).update(balance=F("balance") + parsed_amount)
                LedgerEntry.objects.create(
                    user=user,
                    kind=LedgerEntry.Kind.ADJUST,
                    amount=parsed_amount,
                    reference_type="django_admin_credit",
                    reference_id=reference_id,
                )
            credited_count += 1

        self.message_user(
            request,
            f"Se acreditaron {parsed_amount} créditos a {credited_count} usuario(s).",
            level=messages.SUCCESS,
        )

    actions = ("make_staff", "make_superuser", "revoke_admin", "assign_credits")

    def save_model(self, request, obj, form, change):
        if obj.is_superuser and not obj.is_staff:
            obj.is_staff = True
        super().save_model(request, obj, form, change)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "company")
    search_fields = ("user__username", "user__email", "company__name")
    autocomplete_fields = ("user", "company")
