import json
from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from .models import ApiToken



def _company_name_for_user(user):
    company = getattr(getattr(user, "profile", None), "company", None)
    if not company:
        return ""
    # soporta distintos nombres de campo
    return (
        getattr(company, "nombre", None)
        or getattr(company, "name", None)
        or getattr(company, "nombre_empresa", None)
        or str(company)
    )



@csrf_exempt
@require_POST
def login(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "invalid_json"}, status=400)

    username = payload.get("username")
    password = payload.get("password")

    if not username or not password:
        return JsonResponse({"error": "username_and_password_required"}, status=400)

    user = authenticate(username=username, password=password)
    if user is None:
        return JsonResponse({"error": "invalid_credentials"}, status=401)

    token = ApiToken.objects.create(user=user, key=ApiToken.generate_key())

    return JsonResponse({
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
            "name": user.get_full_name() or user.username,
            "organization": _company_name_for_user(user),
            "role": "admin" if user.is_superuser else "client",
        }
    })