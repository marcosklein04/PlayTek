import json

from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Question
from games_catalog.models import GameSession


def _require_runner_session(request, body=None):
    """
    Valida session_id, user_id, session_token para endpoints runner.
    """
    if body is None:
        session_id = request.GET.get("session_id") or request.POST.get("session_id")
        user_id = request.GET.get("user_id") or request.POST.get("user_id")
        token = (request.GET.get("session_token") or request.POST.get("session_token") or "").strip()
    else:
        session_id = body.get("session_id")
        user_id = body.get("user_id")
        token = (body.get("session_token") or "").strip()

    if not session_id or not user_id or not str(user_id).isdigit() or not token:
        return None, JsonResponse({"error": "parametros_invalidos"}, status=400)

    sesion = get_object_or_404(GameSession, id=session_id, user_id=int(user_id))

    if not sesion.runner_token or sesion.runner_token != token:
        return None, JsonResponse({"error": "session_token_invalido"}, status=401)

    if sesion.status != GameSession.Status.ACTIVE:
        return None, JsonResponse({"error": "sesion_no_activa", "estado": sesion.status}, status=409)

    return sesion, None


def _session_customization(sesion):
    state = sesion.client_state or {}
    customization = state.get("customization") or {}
    if not isinstance(customization, dict):
        customization = {}
    preview_mode = bool(state.get("preview_mode", False))
    return customization, preview_mode


@require_GET
def trivia_runner_page(request):
    return render(request, "runner/trivia/index.html")


@require_GET
def runner_trivia_state(request):
    sesion, err = _require_runner_session(request)
    if err:
        return err

    state = sesion.client_state or {}
    customization, preview_mode = _session_customization(sesion)
    trivia = state.get("trivia") or {}

    current = trivia.get("current")
    if isinstance(current, dict):
        trivia = dict(trivia)
        trivia["current"] = {k: v for k, v in current.items() if k != "correct"}

    return JsonResponse(
        {"trivia": trivia, "customization": customization, "preview_mode": preview_mode},
        status=200,
    )

@csrf_exempt
@require_GET
def runner_trivia_next(request):
    sesion, err = _require_runner_session(request)
    if err:
        return err

    if not sesion.question_set_id:
        return JsonResponse({"error": "sesion_sin_question_set"}, status=409)

    state = sesion.client_state or {}
    trivia = state.get("trivia") or {}

    # Si hay pregunta activa, devolverla
    current = trivia.get("current")
    if current:
        public = {k: v for k, v in current.items() if not k.startswith("_")}
        return JsonResponse({"question": public}, status=200)

    asked_ids = trivia.get("asked_ids", [])

    customization, _ = _session_customization(sesion)
    rules = customization.get("rules") if isinstance(customization, dict) else {}
    max_questions = 0
    if isinstance(rules, dict):
        try:
            max_questions = int(rules.get("max_questions") or 0)
        except Exception:
            max_questions = 0

    if max_questions > 0 and len(asked_ids) >= max_questions:
        result = {
            "score": trivia.get("score", 0),
            "answered": trivia.get("answered", 0),
            "correct": trivia.get("correct", 0),
        }

        sesion.status = GameSession.Status.FINISHED
        sesion.ended_at = timezone.now()
        sesion.result = result
        sesion.save(update_fields=["status", "ended_at", "result"])
        return JsonResponse({"finished": True, "result": result}, status=200)

    q = (
        Question.objects
        .filter(question_set_id=sesion.question_set_id)
        .exclude(id__in=asked_ids)
        .order_by("?")
        .first()
    )

    if not q:
        result = {
        "score": trivia.get("score", 0),
        "answered": trivia.get("answered", 0),
        "correct": trivia.get("correct", 0),
    }

        sesion.status = GameSession.Status.FINISHED
        sesion.ended_at = timezone.now()
        sesion.result = result
        sesion.save(update_fields=["status", "ended_at", "result"])

        return JsonResponse(
            {
                "finished": True,
                "result": result,
            },
            status=200
        )

    choices = list(q.choices.all())
    if not choices:
        return JsonResponse(
            {"error": "pregunta_sin_opciones", "question_id": q.id},
            status=409
        )

    correct_choice = next((c for c in choices if c.is_correct), None)
    if not correct_choice:
        return JsonResponse(
            {"error": "pregunta_sin_correcta", "question_id": q.id},
            status=409
        )

    trivia["current"] = {
        "id": q.id,
        "text": q.text,
        "choices": [{"id": c.id, "text": c.text} for c in choices],
        "_correct_choice_id": correct_choice.id,
    }

    trivia.setdefault("score", 0)
    trivia.setdefault("answered", 0)
    trivia.setdefault("correct", 0)
    trivia["asked_ids"] = asked_ids + [q.id]

    state["trivia"] = trivia
    sesion.client_state = state
    sesion.save(update_fields=["client_state"])

    return JsonResponse(
        {
            "question": {
                "id": q.id,
                "text": q.text,
                "choices": [{"id": c.id, "text": c.text} for c in choices],
            }
        },
        status=200
    )

@csrf_exempt
@require_POST
def runner_trivia_answer(request):
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"error": "json_invalido"}, status=400)

    sesion, err = _require_runner_session(request, body=body)
    if err:
        return err

    choice_id = body.get("choice_id")
    if not choice_id:
        return JsonResponse({"error": "choice_id_requerido"}, status=400)

    state = sesion.client_state or {}
    trivia = state.get("trivia") or {}
    current = trivia.get("current")

    if not current:
        return JsonResponse({"error": "no_hay_pregunta_actual"}, status=409)

    correct_choice_id = current.get("_correct_choice_id")
    if not correct_choice_id:
        return JsonResponse({"error": "estado_invalido"}, status=500)

    is_correct = int(choice_id) == int(correct_choice_id)

    trivia["answered"] = int(trivia.get("answered", 0)) + 1
    trivia.setdefault("score", 0)
    trivia.setdefault("correct", 0)

    points_per_correct = 100
    customization, _ = _session_customization(sesion)
    rules = customization.get("rules") if isinstance(customization, dict) else {}
    if isinstance(rules, dict):
        try:
            cfg_points = int(rules.get("points_per_correct") or 100)
            if cfg_points > 0:
                points_per_correct = cfg_points
        except Exception:
            points_per_correct = 100

    if is_correct:
        trivia["score"] += points_per_correct
        trivia["correct"] += 1

    trivia["last_answer"] = {
        "question_id": current.get("id"),
        "choice_id": int(choice_id),
        "correct": is_correct,
    }

    # IMPORTANTE: limpiamos current
    trivia["current"] = None

    state["trivia"] = trivia
    sesion.client_state = state
    sesion.save(update_fields=["client_state"])

    return JsonResponse(
        {
            "ok": True,
            "correct": is_correct,
            "score": trivia["score"],
            "answered": trivia["answered"],
            "correct_count": trivia["correct"],
        },
        status=200,
    )

@csrf_exempt
@require_POST
def runner_trivia_finish(request):
    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"error": "json_invalido"}, status=400)
    
    sesion, err = _require_runner_session(request, body=body)
    if err:
        return err
    
    if sesion.status != GameSession.Status.ACTIVE:
        return JsonResponse({"error": "sesion_no_activa", "estado": sesion.status}, status=409)
    
    state = sesion.client_state or {}
    trivia = state.get("trivia") or {}

    result = {
        "score": trivia.get("score", 0),
        "answered": trivia.get("answered", 0),
        "correct": trivia.get("correct", 0),
    }

    sesion.status = GameSession.Status.FINISHED
    sesion.ended_at = timezone.now()
    sesion.result = result
    sesion.save(update_fields=["status", "ended_at", "result"])


    return JsonResponse({"ok": True, "result": result}, status=200)


@require_GET
def runner_trivia_ranking(request):
    sesion, err = _require_runner_session_allow_finished(request)
    if err:
        return err

    user = sesion.user
    company = getattr(getattr(user, "profile", None), "company", None)
    if not company:
        return JsonResponse({"error": "usuario_sin_company"}, status=409)

    sessions = list(
        GameSession.objects
        .filter(
            game__slug="trivia",
            status=GameSession.Status.FINISHED,
            user__profile__company=company,
        )
        .select_related("user")
    )

    # ordenar por score (seguro, sin SQL raro)
    sessions.sort(
        key=lambda s: (s.result or {}).get("score", 0),
        reverse=True
    )

    data = []
    for s in sessions[:10]:
        result = s.result or {}
        data.append({
            "username": s.user.username,
            "score": result.get("score", 0),
            "answered": result.get("answered", 0),
            "correct": result.get("correct", 0),
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        })

    return JsonResponse({"ranking": data}, status=200)

def _require_runner_session_allow_finished(request):
    """
    Igual que _require_runner_session pero permite sesiones FINISHED.
    Usar SOLO para ranking / resultados.
    """
    session_id = request.GET.get("session_id")
    user_id = request.GET.get("user_id")
    token = (request.GET.get("session_token") or "").strip()

    if not session_id or not user_id or not str(user_id).isdigit() or not token:
        return None, JsonResponse({"error": "parametros_invalidos"}, status=400)

    sesion = get_object_or_404(GameSession, id=session_id, user_id=int(user_id))

    if not sesion.runner_token or sesion.runner_token != token:
        return None, JsonResponse({"error": "session_token_invalido"}, status=401)

    #ACÁ está la diferencia: NO validamos status
    return sesion, None
