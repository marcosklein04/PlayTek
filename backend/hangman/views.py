# hangman/views.py

import random

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_GET

from games_catalog.models import GameSession
from .models import HangmanWord


@require_GET
def hangman_runner_page(request):
    return render(request, "runner/hangman/index.html")


def _get_company_from_user(user):
    profile = getattr(user, "profile", None)
    return getattr(profile, "company", None) if profile else None


def _pick_company_word(company):
    qs = HangmanWord.objects.filter(is_active=True)
    qs = qs.filter(company=company) if company else qs.filter(company__isnull=True)

    rows = list(qs.values("word", "hint"))
    if not rows:
        return None

    pick = random.choice(rows)
    return {
        "word": (pick["word"] or "").upper(),
        "hint": pick.get("hint") or "",
    }


@require_GET
def runner_hangman_word(request):
    session_id = request.GET.get("session_id")
    user_id = request.GET.get("user_id")
    token = (request.GET.get("session_token") or "").strip()

    if not session_id or not user_id or not str(user_id).isdigit():
        return JsonResponse({"error": "parametros_invalidos"}, status=400)

    user_id_int = int(user_id)

    # 1) Buscar sesión
    sesion = get_object_or_404(GameSession, id=session_id, user_id=user_id_int)

    # 2) Validar token runner
    if not sesion.runner_token or sesion.runner_token != token:
        return JsonResponse({"error": "session_token_invalido"}, status=401)

    # 3) Sesión activa
    if sesion.status != GameSession.Status.ACTIVE:
        return JsonResponse({"error": "sesion_no_activa", "estado": sesion.status}, status=409)

    # 4) Si ya existe en client_state, devolverlo (sticky)
    state = sesion.client_state or {}
    hangman_state = state.get("hangman") or {}
    if hangman_state.get("word"):
        return JsonResponse(
            {"word": hangman_state["word"], "hint": hangman_state.get("hint", "")},
            status=200,
        )

    # 5) Si no existe, elegir UNA VEZ por sesión (con lock para evitar carreras)
    company = _get_company_from_user(sesion.user)

    with transaction.atomic():
        sesion_locked = (
            GameSession.objects
            .select_for_update()
            .get(id=session_id, user_id=user_id_int)
        )

        # por si cambió el estado mientras esperábamos el lock
        if sesion_locked.status != GameSession.Status.ACTIVE:
            return JsonResponse({"error": "sesion_no_activa", "estado": sesion_locked.status}, status=409)

        # re-check bajo lock
        state = sesion_locked.client_state or {}
        hangman_state = state.get("hangman") or {}
        if hangman_state.get("word"):
            return JsonResponse(
                {"word": hangman_state["word"], "hint": hangman_state.get("hint", "")},
                status=200,
            )

        pick = _pick_company_word(company)
        if not pick:
            return JsonResponse({"error": "sin_palabras_cargadas"}, status=409)

        state["hangman"] = {"word": pick["word"], "hint": pick["hint"]}
        sesion_locked.client_state = state
        sesion_locked.save(update_fields=["client_state"])

    return JsonResponse(pick, status=200)