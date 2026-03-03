import requests
import ipaddress
from urllib.parse import urlparse
from requests import RequestException
from django.conf import settings

MP_API = "https://api.mercadopago.com/checkout/preferences"


class MercadoPagoError(Exception):
    pass


def _is_public_notification_url(url: str) -> bool:
    parsed = urlparse((url or "").strip())
    if parsed.scheme not in {"http", "https"}:
        return False

    hostname = (parsed.hostname or "").strip().lower()
    if not hostname:
        return False

    if hostname in {"localhost", "0.0.0.0", "testserver"}:
        return False

    try:
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            return False
    except ValueError:
        pass

    # MP suele exigir callback pública; en práctica HTTPS evita rechazos comunes.
    if parsed.scheme != "https":
        return False

    return True


def create_preference(
    *,
    title: str,
    description: str,
    amount_ars: float,
    external_reference: str,
    notification_url: str,
    success_url: str,
    failure_url: str,
    pending_url: str,
):
    access_token = settings.MP_ACCESS_TOKEN
    if not access_token:
        raise MercadoPagoError("MP_ACCESS_TOKEN no configurado")

    if not success_url:
        raise MercadoPagoError("success_url vacío: back_urls.success es obligatorio")

    payload = {
        "items": [
            {
                "title": title,
                "description": description,
                "quantity": 1,
                "currency_id": "ARS",
                "unit_price": float(amount_ars),
            }
        ],
        "external_reference": str(external_reference),
        "back_urls": {
            "success": success_url,
            "failure": failure_url,
            "pending": pending_url,
        },
    }

    # En local (localhost/127.*) MP rechaza notification_url.
    # Si tenés un endpoint público, configurá MP_NOTIFICATION_URL y se enviará.
    if _is_public_notification_url(notification_url):
        payload["notification_url"] = notification_url

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        r = requests.post(MP_API, json=payload, headers=headers, timeout=20)
    except RequestException as exc:
        raise MercadoPagoError(f"mp_preference_network_error: {exc}") from exc

    try:
        data = r.json() if r.content else {}
    except Exception:
        data = {"raw": r.text[:500]}

    if r.status_code not in (200, 201):
        raise MercadoPagoError(
            f"mp_preference_error: status={r.status_code} response={data}"
        )

    if not isinstance(data, dict):
        raise MercadoPagoError("mp_preference_invalid_response")

    return data
