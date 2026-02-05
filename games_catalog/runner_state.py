import random

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_GET

from games_catalog.models import GameSession
from .models import HangmanWord


@require_GET
def hangman_runner_page(request):
    return render(request, "hangman/index.html")


def _get_company_from_user(user):
    profile = getattr(user, "profile", None)
    if not profile:
        return None
    return getattr(profile, "company", None)


def _pick_company_word(company):
    qs = HangmanWord.objects.filter(is_active=True)
    if company:
        qs = qs.filter(company=company)
    else:
        qs = qs.filter(company__isnull=True)

    words = list(qs.values("word", "hint"))
    if not words:
        return None

    pick = random.choice(words)
    return {
        "word": (pick["word"] or "").upper(),
        "hint": pick.get("hint") or "",
    }


@require_GET
def runner_hangman_word(request):
    session_id = request.GET.get("session_id")
    user_id = request.GET.get("user_id")
    token = (request.GET.get("session_token") or "").strip()

    # 1) Validación básica
    if not session_id or not user_id or not str(user_id).isdigit():
        return JsonResponse({"error": "parametros_invalidos"}, status=400)

    user_id_int = int(user_id)

    # 2) Buscar sesión (primero sin lock, barato)
    sesion = get_object_or_404(GameSession, id=session_id, user_id=user_id_int)

    # 3) Token runner (seguridad)
    if not sesion.runner_token or sesion.runner_token != token:
        return JsonResponse({"error": "session_token_invalido"}, status=401)

    # 4) Solo si la sesión está activa
    if sesion.status != GameSession.Status.ACTIVE:
        return JsonResponse({"error": "sesion_no_activa", "estado": sesion.status}, status=409)

    # 5) Si ya existe en client_state, devolver tal cual (sin volver a elegir)
    state = sesion.client_state or {}
    hangman_state = (state.get("hangman") or {})
    if hangman_state.get("word"):
        return JsonResponse(
            {"word": hangman_state["word"], "hint": hangman_state.get("hint", "")},
            status=200
        )

    # 6) Si no existe, elegir UNA VEZ y persistir (con lock para evitar carreras)
    company = _get_company_from_user(sesion.user)

    with transaction.atomic():
        sesion_locked = (
            GameSession.objects
            .select_for_update()
            .get(id=session_id, user_id=user_id_int)
        )

        # re-check bajo lock
        state = sesion_locked.client_state or {}
        hangman_state = (state.get("hangman") or {})
        if hangman_state.get("word"):
            return JsonResponse(
                {"word": hangman_state["word"], "hint": hangman_state.get("hint", "")},
                status=200
            )

        pick = _pick_company_word(company)
        if not pick:
            return JsonResponse({"error": "sin_palabras_cargadas"}, status=409)

        # guardar en client_state
        state["hangman"] = {"word": pick["word"], "hint": pick["hint"]}
        sesion_locked.client_state = state
        sesion_locked.save(update_fields=["client_state"])

    return JsonResponse(pick, status=200)