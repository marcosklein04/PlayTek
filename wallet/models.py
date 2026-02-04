from django.conf import settings
from django.db import models


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
        verbose_name = "Wallet"
        verbose_name_plural = "Wallets"

    def __str__(self) -> str:
        return f"Wallet(user_id={self.user_id}, balance={self.balance})"


class LedgerEntry(models.Model):
    class Kind(models.TextChoices):
        TOPUP = "TOPUP", "Topup"
        SPEND = "SPEND", "Spend"
        REFUND = "REFUND", "Refund"
        ADJUST = "ADJUST", "Adjust"

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
        verbose_name = "Ledger Entry"
        verbose_name_plural = "Ledger Entries"
        indexes = [models.Index(fields=["user", "created_at"])]

    def __str__(self) -> str:
        return f"{self.kind} {self.amount} (user_id={self.user_id})"


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