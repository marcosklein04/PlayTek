import json
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from .models import ApiToken
from django.contrib.auth import get_user_model
from accounts.services import ensure_company_for_user
from wallet.models import Wallet
from .auth import token_required

User = get_user_model()


def _user_role(user) -> str:
    return "admin" if (user.is_superuser or user.is_staff) else "client"


def _build_unique_username_from_email(email: str) -> str:
    """Genera un username único derivado del email para User de Django."""
    base = (email or "").strip().lower()
    if not base:
        return ""

    candidate = base
    index = 1
    while User.objects.filter(username=candidate).exists():
        candidate = f"{base}_{index}"
        index += 1
    return candidate


def _company_name_for_user(user):
    company = getattr(getattr(user, "profile", None), "company", None)
    if not company and getattr(user, "pk", None):
        fresh_user = User.objects.select_related("profile__company").filter(pk=user.pk).first()
        company = getattr(getattr(fresh_user, "profile", None), "company", None)
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

    email = (data.get("email") or data.get("username") or "").strip().lower()
    password = (data.get("password") or "").strip()
    name = (data.get("name") or "").strip()
    organization = (data.get("organization") or "").strip()

    if not email or not password:
        return JsonResponse({"error": "email_y_password_requeridos"}, status=400)

    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"error": "email_invalido"}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return JsonResponse({"error": "email_ya_existe"}, status=409)

    username = _build_unique_username_from_email(email)
    user = User.objects.create_user(username=username, email=email, password=password)
    if name:
        # opcional: guardar nombre en first_name
        user.first_name = name
        user.save(update_fields=["first_name"])

    ensure_company_for_user(user, preferred_name=organization)

    token = ApiToken.objects.create(user=user, key=ApiToken.generate_key())
    Wallet.objects.get_or_create(user=user, defaults={"balance": 0})

    return JsonResponse({
        "ok": True,
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
            "name": user.get_full_name() or user.email or user.username,
            "organization": _company_name_for_user(user),
            "role": _user_role(user),
        }
    }, status=201)



@csrf_exempt
@require_POST
def login(request):
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "invalid_json"}, status=400)

    email = (payload.get("email") or payload.get("username") or "").strip().lower()
    password = payload.get("password")

    if not email or not password:
        return JsonResponse({"error": "email_and_password_required"}, status=400)

    user_by_email = User.objects.filter(email__iexact=email).first()
    if user_by_email is None:
        return JsonResponse({"error": "invalid_credentials"}, status=401)

    user = authenticate(username=user_by_email.username, password=password)
    if user is None:
        return JsonResponse({"error": "invalid_credentials"}, status=401)

    token = ApiToken.objects.create(user=user, key=ApiToken.generate_key())

    return JsonResponse({
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email or "",
            "name": user.get_full_name() or user.email or user.username,
            "organization": _company_name_for_user(user),
            "role": _user_role(user),
        }
    })

@token_required
def me(request):
    user = request.user

    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "email": user.email or "",
        "name": user.get_full_name() or user.email or user.username,
        "organization": _company_name_for_user(user),
        "role": _user_role(user),
    })
