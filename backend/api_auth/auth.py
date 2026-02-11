from functools import wraps
from django.http import JsonResponse
from .models import ApiToken 


def token_required(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        auth = request.headers.get("Authorization", "")
        parts = auth.split()

        # Esperado: "Token <key>" o "Bearer <key>"
        if len(parts) != 2 or parts[0] not in ("Token", "Bearer"):
            return JsonResponse({"error": "missing_token"}, status=401)

        key = parts[1]

        try:
            token = ApiToken.objects.select_related("user").get(key=key)
        except ApiToken.DoesNotExist:
            return JsonResponse({"error": "invalid_token"}, status=401)

        request.user = token.user
        return view_func(request, *args, **kwargs)

    return _wrapped

def admin_required(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return JsonResponse({"error": "unauthorized"}, status=401)
        if not (user.is_superuser or user.is_staff):
            return JsonResponse({"error": "forbidden_admin_only"}, status=403)
        return view_func(request, *args, **kwargs)
    return _wrapped


#Alias en español (para que tu games_catalog/views.py pueda importar token_requerido)
token_requerido = token_required