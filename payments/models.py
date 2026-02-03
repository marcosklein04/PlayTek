import uuid
from django.conf import settings
from django.db import models

class CreditPack(models.Model):
    code = models.CharField(max_length=32, unique=True)
    credits = models.PositiveIntegerField()
    price_ars = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.code} ({self.credits} credits)"


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"
        REFUNDED = "REFUNDED", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments"
    )

    provider = models.CharField(max_length=32, default="mercadopago")
    external_id = models.CharField(max_length=128, unique=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default="ARS")
    raw_payload = models.JSONField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class TopUp(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.PROTECT, related_name="topup")
    pack = models.ForeignKey(CreditPack, on_delete=models.PROTECT)
    credits_granted = models.PositiveIntegerField()
    applied_at = models.DateTimeField(blank=True, null=True)