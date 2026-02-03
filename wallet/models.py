from django.conf import settings
from django.db import models


class Billetera(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="billetera",
        db_column="user_id",
    )
    saldo = models.PositiveIntegerField(default=0, db_column="balance")
    actualizado_en = models.DateTimeField(auto_now=True, db_column="updated_at")

    class Meta:
        db_table = "wallet_wallet"
        verbose_name = "Billetera"
        verbose_name_plural = "Billeteras"

    def __str__(self) -> str:
        return f"Billetera(usuario_id={self.usuario_id}, saldo={self.saldo})"


class Wallet(Billetera):
    """Alias EN (compatibilidad). No crea tabla."""
    class Meta:
        proxy = True
        verbose_name = "Wallet"
        verbose_name_plural = "Wallets"


class MovimientoBilletera(models.Model):
    class Tipo(models.TextChoices):
        RECARGA = "TOPUP", "Recarga"
        GASTO = "SPEND", "Gasto"
        REEMBOLSO = "REFUND", "Reembolso"
        AJUSTE = "ADJUST", "Ajuste"

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="movimientos_billetera",
        db_column="user_id",
    )
    tipo = models.CharField(max_length=16, choices=Tipo.choices, db_column="kind")
    monto = models.IntegerField(help_text="Positivo suma, negativo resta.", db_column="amount")

    tipo_referencia = models.CharField(max_length=64, db_column="reference_type")
    id_referencia = models.CharField(max_length=128, db_column="reference_id")

    creado_en = models.DateTimeField(auto_now_add=True, db_column="created_at")

    class Meta:
        db_table = "wallet_ledgerentry"
        verbose_name = "Movimiento de billetera"
        verbose_name_plural = "Movimientos de billetera"
        indexes = [
            models.Index(fields=["usuario", "creado_en"]),
        ]

    def __str__(self) -> str:
        return f"{self.tipo} {self.monto} (usuario_id={self.usuario_id})"


class LedgerEntry(MovimientoBilletera):
    """Alias EN (compatibilidad). No crea tabla."""
    class Meta:
        proxy = True
        verbose_name = "Ledger Entry"
        verbose_name_plural = "Ledger Entries"