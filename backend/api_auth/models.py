import secrets
from django.conf import settings
from django.db import models


class ApiToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="api_tokens",
    )
    key = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def generate_key() -> str:
        return secrets.token_hex(32)  # 64 chars

    def __str__(self) -> str:
        return f"ApiToken(user_id={self.user_id}, key={self.key[:8]}...)"

# ✅ Alias opcional para tu “españolización” sin romper imports viejos
TokenApi = ApiToken