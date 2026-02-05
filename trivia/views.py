import json
import os
import random
from datetime import datetime, timezone as dt_timezone

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from games_catalog.models import GameSession


# ---------- Helpers de runner auth ----------
def _require_runner_params(request):
    session_id = request.GET.get("session_id") or request.POST.get("session_id")
    user_id = request.GET.get("user_id") or request.POST.get("user_id")
    token = (request.GET.get("session_token") or request.POST.get("session_token") or "").strip()

    if not session_id or not user_id or not str(user_id).isdigit():
        return None, None, None, JsonResponse({"error": "parametros_invalidos"}, status=400)

    return session_id, int(user_id), token, None


def _require_active_and_token(session: GameSession, token: str):
    if not session.runner_token or session.runner_token != token:
        return JsonResponse({"error": "session_token_invalido"}, status=401)
    if session.status != GameSession.Status.ACTIVE:
        return JsonResponse({"error": "sesion_no_activa", "estado": session.status}, status=409)
    return None


def _get_company_slug(session: GameSession) -> str:
    # Ajustá según tu modelo real (vos tenés profile.company en Hangman)
    profile = getattr(session.user, "profile", None)
    company = getattr(profile, "company", None) if profile else None
    # slug ideal; si no existe, usá name normalizado
    slug = getattr(company, "slug", None) or getattr(company, "name", None) or "default"
    return str(slug).strip().lower().replace(" ", "_")


# ---------- Banco de preguntas (JSON files) ----------
def _load_question_bank(company_slug: str):
    """
    Espera JSON con formato:
    {
      "questions": [
        {"id": 101, "text": "...", "options": ["A","B","C","D"], "answer_index": 2},
        ...
      ]
    }
    """
    base_dir = os.path.join(os.path.dirname(__file__), "data")
    path_company = os.path.join(base_dir, f"{company_slug}.json")
    path_default = os.path.join(base_dir, "default.json")

    path = path_company if os.path.exists(path_company) else path_default
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    questions = payload.get("questions") or []
    # Sanitización mínima
    out = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        if "id" not in q or "text" not in q or "options" not in q or "answer_index" not in q:
            continue
        if not isinstance(q["options"], list) or len(q["options"]) < 2:
            continue
        out.append(q)
    return out


def _index_by_id(questions):
    return {int(q["id"]): q for q in questions}


# ---------- Views ----------
@require_GET
def trivia_runner_page(request):
    return render(request, "runner/trivia/index.html")


@require_GET
def runner_trivia_question(request):
    session_id, user_id, token, error = _require_runner_params(request)
    if error:
        return error

    sesion = get_object_or_404(GameSession, id=session_id, user_id=user_id)

    auth_error = _require_active_and_token(sesion, token)
    if auth_error:
        return auth_error

    company_slug = _get_company_slug(sesion)
    bank = _load_question_bank(company_slug)
    if not bank:
        return JsonResponse({"error": "sin_preguntas"}, status=409)

    # fast path: ya asignada
    state = sesion.client_state or {}
    trivia = state.get("trivia") or {}
    current_id = trivia.get("current_question_id")
    if current_id:
        qmap = _index_by_id(bank)
        q = qmap.get(int(current_id))
        if not q:
            # si la pregunta desapareció del bank, re-asignamos
            current_id = None
        else:
            return JsonResponse(
                {
                    "question": {
                        "id": q["id"],
                        "text": q["text"],
                        "options": q["options"],
                    },
                    "progress": {
                        "score": int(trivia.get("score") or 0),
                        "answered": len(trivia.get("answered_ids") or []),
                        "max_questions": int(trivia.get("max_questions") or 5),
                    }
                },
                status=200,
            )

    # asignación sticky con lock
    with transaction.atomic():
        sesion_locked = GameSession.objects.select_for_update().get(id=session_id, user_id=user_id)

        # por si cambió estado
        if sesion_locked.status != GameSession.Status.ACTIVE:
            return JsonResponse({"error": "sesion_no_activa", "estado": sesion_locked.status}, status=409)

        state = sesion_locked.client_state or {}
        trivia = state.get("trivia") or {}

        # re-check
        current_id = trivia.get("current_question_id")
        if current_id:
            qmap = _index_by_id(bank)
            q = qmap.get(int(current_id))
            if q:
                return JsonResponse(
                    {
                        "question": {"id": q["id"], "text": q["text"], "options": q["options"]},
                        "progress": {
                            "score": int(trivia.get("score") or 0),
                            "answered": len(trivia.get("answered_ids") or []),
                            "max_questions": int(trivia.get("max_questions") or 5),
                        },
                    },
                    status=200,
                )

        answered_ids = set(int(x) for x in (trivia.get("answered_ids") or []) if str(x).isdigit())
        max_q = int(trivia.get("max_questions") or 5)

        # si ya completó el cupo
        if len(answered_ids) >= max_q:
            return JsonResponse({"error": "trivia_completada"}, status=409)

        # elegir una no respondida
        available = [q for q in bank if int(q["id"]) not in answered_ids]
        if not available:
            return JsonResponse({"error": "sin_preguntas_disponibles"}, status=409)

        q = random.choice(available)

        trivia.setdefault("answered_ids", list(answered_ids))
        trivia.setdefault("score", int(trivia.get("score") or 0))
        trivia["max_questions"] = max_q
        trivia["current_question_id"] = int(q["id"])
        trivia["current_assigned_at"] = datetime.now(dt_timezone.utc).isoformat()

        state["trivia"] = trivia
        sesion_locked.client_state = state
        sesion_locked.save(update_fields=["client_state"])

    return JsonResponse(
        {
            "question": {"id": q["id"], "text": q["text"], "options": q["options"]},
            "progress": {
                "score": int(trivia.get("score") or 0),
                "answered": len(trivia.get("answered_ids") or []),
                "max_questions": int(trivia.get("max_questions") or 5),
            },
        },
        status=200,
    )


@csrf_exempt
@require_POST
def runner_trivia_answer(request):
    # payload JSON (recomendado) o querystring
    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        payload = {}

    session_id = payload.get("session_id") or request.GET.get("session_id")
    user_id = payload.get("user_id") or request.GET.get("user_id")
    token = (payload.get("session_token") or request.GET.get("session_token") or "").strip()

    question_id = payload.get("question_id")
    choice_index = payload.get("choice_index")

    if not session_id or not user_id or not str(user_id).isdigit():
        return JsonResponse({"error": "parametros_invalidos"}, status=400)
    if question_id is None or choice_index is None:
        return JsonResponse({"error": "respuesta_incompleta"}, status=400)

    user_id = int(user_id)
    question_id = int(question_id)
    choice_index = int(choice_index)

    sesion = get_object_or_404(GameSession, id=session_id, user_id=user_id)

    auth_error = _require_active_and_token(sesion, token)
    if auth_error:
        return auth_error

    company_slug = _get_company_slug(sesion)
    bank = _load_question_bank(company_slug)
    qmap = _index_by_id(bank)
    q = qmap.get(question_id)
    if not q:
        return JsonResponse({"error": "pregunta_invalida"}, status=400)

    correct_index = int(q["answer_index"])
    is_correct = (choice_index == correct_index)

    with transaction.atomic():
        sesion_locked = GameSession.objects.select_for_update().get(id=session_id, user_id=user_id)

        if sesion_locked.status != GameSession.Status.ACTIVE:
            return JsonResponse({"error": "sesion_no_activa", "estado": sesion_locked.status}, status=409)

        state = sesion_locked.client_state or {}
        trivia = state.get("trivia") or {}

        current_id = trivia.get("current_question_id")
        if not current_id or int(current_id) != question_id:
            return JsonResponse({"error": "pregunta_no_asignada_o_cambio"}, status=409)

        answered_ids = [int(x) for x in (trivia.get("answered_ids") or []) if str(x).isdigit()]
        answered_set = set(answered_ids)

        # marcar como respondida
        if question_id not in answered_set:
            answered_ids.append(question_id)

        score = int(trivia.get("score") or 0)
        if is_correct:
            score += 1

        trivia["answered_ids"] = answered_ids
        trivia["score"] = score
        trivia["current_question_id"] = None  # libera para pedir la siguiente
        trivia["last_answer"] = {
            "question_id": question_id,
            "choice_index": choice_index,
            "correct": is_correct,
        }

        max_q = int(trivia.get("max_questions") or 5)
        trivia["max_questions"] = max_q

        state["trivia"] = trivia
        sesion_locked.client_state = state
        sesion_locked.save(update_fields=["client_state"])

        done = (len(answered_ids) >= max_q)

    return JsonResponse(
        {
            "correct": is_correct,
            "progress": {
                "score": score,
                "answered": len(answered_ids),
                "max_questions": int(trivia.get("max_questions") or 5),
                "done": done,
            },
        },
        status=200,
    )