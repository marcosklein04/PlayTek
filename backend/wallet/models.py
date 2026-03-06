from django.conf import settings
from django.db import models
from django.utils import timezone


# ============================================================
# MODELOS REALES (EN) → mandan en DB y migraciones
# ============================================================
class Wallet(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet",
        db_column="user_id",
    )
    balance = models.PositiveIntegerField(default=0, db_column="balance")
    updated_at = models.DateTimeField(auto_now=True, db_column="updated_at")

    class Meta:
        db_table = "wallet_wallet"
        verbose_name = "Billetera"
        verbose_name_plural = "Billeteras"

    def __str__(self) -> str:
        return f"Wallet(user_id={self.user_id}, balance={self.balance})"


class LedgerEntry(models.Model):
    class Kind(models.TextChoices):
        TOPUP = "TOPUP", "Recarga"
        SPEND = "SPEND", "Gasto"
        REFUND = "REFUND", "Reembolso"
        ADJUST = "ADJUST", "Ajuste"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ledger_entries",
        db_column="user_id",
    )
    kind = models.CharField(max_length=16, choices=Kind.choices, db_column="kind")
    amount = models.IntegerField(db_column="amount")

    reference_type = models.CharField(max_length=64, db_column="reference_type")
    reference_id = models.CharField(max_length=128, db_column="reference_id")

    created_at = models.DateTimeField(auto_now_add=True, db_column="created_at")

    class Meta:
        db_table = "wallet_ledgerentry"
        verbose_name = "Movimiento de créditos"
        verbose_name_plural = "Movimientos de créditos"
        indexes = [models.Index(fields=["user", "created_at"])]

    def __str__(self) -> str:
        return f"{self.kind} {self.amount} (user_id={self.user_id})"


class CreditPack(models.Model):
    """
    Packs que el admin configura (ej: 300 créditos = $15.000 ARS).
    """
    name = models.CharField(max_length=80)
    credits = models.PositiveIntegerField()
    price_ars = models.DecimalField(max_digits=12, decimal_places=2)
    base_price_ars = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    discount_percent = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    # Para MercadoPago
    mp_title = models.CharField(max_length=120, blank=True, default="")
    mp_description = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "wallet_creditpack"
        verbose_name = "Pack de créditos"
        verbose_name_plural = "Packs de créditos"
        ordering = ["credits"]

    def __str__(self):
        return f"{self.name} ({self.credits} créditos por ${self.price_ars} ARS)"


class WalletTopup(models.Model):
    """
    Intento/orden de recarga. Se crea al pedir checkout.
    Cuando MP confirma => se acredita wallet + ledger.
    """
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pendiente"
        APPROVED = "APPROVED", "Aprobada"
        REJECTED = "REJECTED", "Rechazada"
        CANCELLED = "CANCELLED", "Cancelada"
        EXPIRED = "EXPIRED", "Expirada"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet_topups",
        db_column="user_id",
    )
    pack = models.ForeignKey(
        CreditPack,
        on_delete=models.PROTECT,
        related_name="topups",
        db_column="pack_id",
    )

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    amount_ars = models.DecimalField(max_digits=12, decimal_places=2)
    credits = models.PositiveIntegerField()

    # MercadoPago tracking
    mp_preference_id = models.CharField(max_length=120, blank=True, default="")
    mp_payment_id = models.CharField(max_length=120, blank=True, default="")
    checkout_url = models.URLField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "wallet_topup"
        verbose_name = "Recarga de billetera"
        verbose_name_plural = "Recargas de billetera"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["mp_preference_id"]),
            models.Index(fields=["mp_payment_id"]),
        ]

    def __str__(self):
        return f"Recarga #{self.id} user={self.user_id} {self.credits}cr ${self.amount_ars} ({self.status})"

    def mark_approved(self, mp_payment_id: str = ""):
        if self.status == self.Status.APPROVED:
            return
        self.status = self.Status.APPROVED
        self.approved_at = timezone.now()
        if mp_payment_id:
            self.mp_payment_id = mp_payment_id
        self.save(update_fields=["status", "approved_at", "mp_payment_id"])


# ============================================================
# PROXIES (ES) → NO crean tablas, NO generan migraciones
# ============================================================
class Billetera(Wallet):
    class Meta:
        proxy = True
        verbose_name = "Billetera"
        verbose_name_plural = "Billeteras"

    @property
    def usuario(self):
        return self.user

    @property
    def saldo(self):
        return self.balance

    @saldo.setter
    def saldo(self, value):
        self.balance = value

    @property
    def actualizado_en(self):
        return self.updated_at


class MovimientoBilletera(LedgerEntry):
    class Meta:
        proxy = True
        verbose_name = "Movimiento de billetera"
        verbose_name_plural = "Movimientos de billetera"

    class Tipo(models.TextChoices):
        RECARGA = "TOPUP", "Recarga"
        GASTO = "SPEND", "Gasto"
        REEMBOLSO = "REFUND", "Reembolso"
        AJUSTE = "ADJUST", "Ajuste"

    @property
    def usuario(self):
        return self.user

    @property
    def tipo(self):
        return self.kind

    @tipo.setter
    def tipo(self, value):
        self.kind = value

    @property
    def monto(self):
        return self.amount

    @monto.setter
    def monto(self, value):
        self.amount = value

    @property
    def tipo_referencia(self):
        return self.reference_type

    @tipo_referencia.setter
    def tipo_referencia(self, value):
        self.reference_type = value

    @property
    def id_referencia(self):
        return self.reference_id

    @id_referencia.setter
    def id_referencia(self, value):
        self.reference_id = value

    @property
    def creado_en(self):
        return self.created_at
