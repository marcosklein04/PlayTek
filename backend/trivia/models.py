from django.db import models
from django.db.models import Q
from accounts.models import Company


class TriviaConfig(models.Model):
    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name="trivia_config",
    )
    primary_color = models.CharField(max_length=20, default="#00D1FF")
    logo_url = models.URLField(blank=True, default="")
    points_per_correct = models.IntegerField(default=100)
    max_questions = models.IntegerField(default=10)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"TriviaConfig({self.company_id})"


class QuestionSet(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="question_sets",
    )
    name = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["company", "name"], name="uq_questionset_company_name"),
        ]
        indexes = [
            models.Index(fields=["company", "is_active"]),
        ]

    def __str__(self):
        return f"{self.company_id} - {self.name}"


class Question(models.Model):
    question_set = models.ForeignKey(
        QuestionSet,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    text = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["question_set", "is_active"]),
        ]

    def __str__(self):
        return f"Q{self.id} ({self.question_set_id})"


class Choice(models.Model):
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="choices",
    )
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    class Meta:
        constraints = [
            # máximo 1 correcta por pregunta
            models.UniqueConstraint(
                fields=["question"],
                condition=Q(is_correct=True),
                name="uq_choice_one_correct_per_question",
            ),
        ]

    def __str__(self):
        return f"Choice({self.question_id}) {'✓' if self.is_correct else '✗'}"


class TriviaReservation(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_CONFIRMED = "confirmed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="trivia_reservations",
    )

    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)

    question_set = models.ForeignKey(
        QuestionSet,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reservations",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_CONFIRMED,
    )

    created_at = models.DateTimeField(auto_now_add=True)