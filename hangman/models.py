from django.db import models
from accounts.models import Company

class HangmanWord(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="hangman_words",
    )
    word = models.CharField(max_length=64)
    hint = models.CharField(max_length=160, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "hangman_word"
        indexes = [models.Index(fields=["company", "is_active"])]
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["company", "word"], name="uq_hangman_company_word")
        ]

    def __str__(self):
        return f"{self.company_id} - {self.word}"