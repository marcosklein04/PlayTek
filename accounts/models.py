from django.conf import settings
from django.db import models

class UserIdentity(models.Model):
    """
    Maps a Django user to an external identity provider (Keycloak).
    """
    provider = models.CharField(max_length=32, default="keycloak")
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="identity"
    )
    subject = models.CharField(max_length=255, unique=True)  # Keycloak `sub`
    email = models.EmailField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.provider}:{self.subject}"