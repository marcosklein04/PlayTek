import json
from django.contrib.auth import authenticate
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from .models import ApiToken
from django.contrib.auth import get_user_model
from wallet.models import Wallet
from .auth import token_required

User = get_user_model()


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
def register(request):
    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return JsonResponse({"error": "json_invalido"}, status=400)

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()
    name = (data.get("name") or "").strip()

    if not username or not password:
        return JsonResponse({"error": "username_y_password_requeridos"}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({"error": "username_ya_existe"}, status=409)

    if email and User.objects.filter(email=email).exists():
        return JsonResponse({"error": "email_ya_existe"}, status=409)

    user = User.objects.create_user(username=username, email=email, password=password)
    if name:
        # opcional: guardar nombre en first_name
        user.first_name = name
        user.save(update_fields=["first_name"])

        token = ApiToken.objects.create(user=user, key=ApiToken.generate_key())

        Wallet.objects.get_or_create(user=user, defaults={"balance": 0})

        return JsonResponse({
            "ok": True,
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email or "",
                "name": user.get_full_name() or user.username,
                "organization": _company_name_for_user(user),
                "role": "admin" if user.is_superuser else "client",
            }
        }, status=201)



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

@token_required
def me(request):
    user = request.user

    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "email": user.email or "",
        "name": user.get_full_name() or user.username,
        "organization": _company_name_for_user(user),
        "role": "admin" if user.is_superuser else "client",
    })