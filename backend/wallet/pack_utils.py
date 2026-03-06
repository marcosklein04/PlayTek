from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from wallet.models import CreditPack


MONEY_QUANTIZE = Decimal("0.01")


def to_decimal(value):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(MONEY_QUANTIZE, rounding=ROUND_HALF_UP)


def resolve_pack_pricing(payload, *, current_pack: CreditPack | None = None):
    has_base_price = "base_price_ars" in payload
    has_discount = "discount_percent" in payload
    has_final_price = "price_ars" in payload

    if current_pack is None and not has_base_price and not has_final_price:
        return None, None, "base_price_ars_requerido"

    if current_pack is None:
        current_base = None
        current_discount = 0
    else:
        current_base = current_pack.base_price_ars or current_pack.price_ars
        current_discount = int(current_pack.discount_percent or 0)

    if has_final_price and not has_base_price and not has_discount:
        final_price = to_decimal(payload.get("price_ars"))
        if final_price is None or final_price <= 0:
            return None, None, "price_ars_invalido"
        final_price = quantize_money(final_price)
        return final_price, 0, final_price

    base_price = to_decimal(payload.get("base_price_ars")) if has_base_price else current_base
    if base_price is None or base_price <= 0:
        return None, None, "base_price_ars_invalido"
    base_price = quantize_money(base_price)

    raw_discount = payload.get("discount_percent") if has_discount else current_discount
    try:
        discount_percent = int(raw_discount)
    except (TypeError, ValueError):
        return None, None, "discount_percent_invalido"

    if discount_percent < 0 or discount_percent > 100:
        return None, None, "discount_percent_invalido"

    final_price = quantize_money(base_price * Decimal(100 - discount_percent) / Decimal(100))
    return final_price, discount_percent, base_price


def serialize_pack(pack: CreditPack):
    base_price = pack.base_price_ars or pack.price_ars
    return {
        "id": pack.id,
        "name": pack.name,
        "credits": pack.credits,
        "price_ars": str(pack.price_ars),
        "base_price_ars": str(base_price),
        "discount_percent": int(pack.discount_percent or 0),
        "mp_title": pack.mp_title or "",
        "mp_description": pack.mp_description or "",
        "active": bool(pack.active),
    }
