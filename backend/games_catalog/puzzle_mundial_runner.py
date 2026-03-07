from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET

from games_catalog.models import GameSession
from games_catalog.views import _token_ok


@require_GET
def puzzle_mundial_runner_page(request):
    session_id = request.GET.get("session_id")
    token = (request.GET.get("session_token") or "").strip()
    user_id = request.GET.get("user_id")

    if not session_id or not user_id or not str(user_id).isdigit():
        return JsonResponse({"error": "parametros_invalidos"}, status=400)

    try:
        session = GameSession.objects.get(id=session_id, user_id=int(user_id), game__slug="puzzle-mundial")
    except GameSession.DoesNotExist:
        return JsonResponse({"error": "session_token_invalido"}, status=401)

    if not _token_ok(session.runner_token, token):
        return JsonResponse({"error": "session_token_invalido"}, status=401)

    if session.status != GameSession.Status.ACTIVE:
        return JsonResponse({"error": "sesion_no_activa", "estado": session.status}, status=409)

    return render(request, "runner/puzzle_mundial/index.html")
