# trivia/services.py
from django.utils import timezone

from accounts.models import Company
from accounts.models import UserProfile
from .models import Question, QuestionSet, TriviaReservation
from django.db import models


def get_company_for_user(user):
    """
    Empresa desde el perfil del usuario.
    """
    try:
        profile = user.profile  # related_name="profile"
        return profile.company
    except Exception:
        return None


def pick_question_set_for_session(user, juego=None, when=None):
    """
    1) Si hay reserva activa para la empresa -> usa ese QuestionSet
    2) Sino -> usa el QuestionSet activo más reciente de la empresa
    3) Sino -> None (y el caller decide qué hacer)
    """
    when = when or timezone.now()
    company = get_company_for_user(user)
    if not company:
        return None

    # Reserva activa (starts_at <= now < ends_at) o ends_at null (abierta)
    reserva = (
        TriviaReservation.objects
        .filter(company=company, status=TriviaReservation.STATUS_CONFIRMED, starts_at__lte=when)
        .filter(models.Q(ends_at__gt=when) | models.Q(ends_at__isnull=True))
        .select_related("question_set")
        .order_by("-starts_at")
        .first()
    )
    if (
        reserva
        and reserva.question_set
        and Question.objects.filter(question_set=reserva.question_set, is_active=True).exists()
    ):
        return reserva.question_set

    # Fallback: set activo más reciente con preguntas activas.
    qs = (
        QuestionSet.objects
        .filter(company=company, is_active=True, questions__is_active=True)
        .distinct()
        .order_by("-created_at")
        .first()
    )
    return qs
