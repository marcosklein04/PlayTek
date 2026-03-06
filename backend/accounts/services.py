import re

from .models import Company, UserProfile


def _normalize_company_name(value: str) -> str:
    return " ".join((value or "").strip().split())


def _fallback_company_base_name(user) -> str:
    full_name = _normalize_company_name(user.get_full_name() or "")
    if full_name:
        return f"Empresa de {full_name}"

    email_local = _normalize_company_name(re.sub(r"[._-]+", " ", (user.email or "").split("@")[0]))
    if email_local:
        return f"Empresa de {email_local.title()}"

    username = _normalize_company_name(re.sub(r"[._-]+", " ", user.username or ""))
    if username:
        return f"Empresa de {username.title()}"

    return f"Empresa de usuario {user.pk}"


def _build_unique_company_name(base_name: str) -> str:
    candidate = base_name
    index = 2
    while Company.objects.filter(name=candidate).exists():
        candidate = f"{base_name} #{index}"
        index += 1
    return candidate


def ensure_company_for_user(user, preferred_name: str = ""):
    if not user or not getattr(user, "pk", None):
        return None

    profile, _ = UserProfile.objects.get_or_create(user=user)
    if profile.company_id:
        return profile.company

    normalized_preferred = _normalize_company_name(preferred_name)
    if normalized_preferred:
        company, _ = Company.objects.get_or_create(name=normalized_preferred)
    else:
        base_name = _fallback_company_base_name(user)
        company = Company.objects.create(name=_build_unique_company_name(base_name))

    profile.company = company
    profile.save(update_fields=["company"])
    return company

