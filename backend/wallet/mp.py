import os
import requests

MP_API = "https://api.mercadopago.com/checkout/preferences"


class MercadoPagoError(Exception):
    pass


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
    access_token = os.getenv("MP_ACCESS_TOKEN")
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

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    # Debug útil en consola
    print("MP PAYLOAD =>", payload)

    r = requests.post(MP_API, json=payload, headers=headers, timeout=20)

    if r.status_code not in (200, 201):
        try:
            data = r.json()
        except Exception:
            data = r.text

        # 👇 clave: devolvemos payload para ver si back_urls.success está llegando o no
        raise MercadoPagoError(
            f"mp_preference_error: status={r.status_code} response={data} payload_sent={payload}"
        )

    return r.json()