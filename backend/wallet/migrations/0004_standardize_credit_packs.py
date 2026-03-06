from decimal import Decimal

from django.db import migrations


STANDARD_PACKS = [
    {
        "name": "Pack 15 créditos",
        "credits": 15,
        "price_ars": Decimal("45000.00"),
        "mp_title": "15 créditos",
        "mp_description": "Pack de 15 créditos",
    },
    {
        "name": "Pack 20 créditos",
        "credits": 20,
        "price_ars": Decimal("58200.00"),
        "mp_title": "20 créditos",
        "mp_description": "Pack de 20 créditos",
    },
    {
        "name": "Pack 24 créditos",
        "credits": 24,
        "price_ars": Decimal("68400.00"),
        "mp_title": "24 créditos",
        "mp_description": "Pack de 24 créditos",
    },
    {
        "name": "Pack 47 créditos",
        "credits": 47,
        "price_ars": Decimal("126900.00"),
        "mp_title": "47 créditos",
        "mp_description": "Pack de 47 créditos",
    },
]


def apply_standard_packs(apps, schema_editor):
    CreditPack = apps.get_model("wallet", "CreditPack")
    allowed_credits = {pack["credits"] for pack in STANDARD_PACKS}

    for pack in STANDARD_PACKS:
        CreditPack.objects.update_or_create(
            credits=pack["credits"],
            defaults={
                "name": pack["name"],
                "price_ars": pack["price_ars"],
                "active": True,
                "mp_title": pack["mp_title"],
                "mp_description": pack["mp_description"],
            },
        )

    CreditPack.objects.exclude(credits__in=allowed_credits).update(active=False)


class Migration(migrations.Migration):
    dependencies = [
        ("wallet", "0003_creditpack_wallettopup"),
    ]

    operations = [
        migrations.RunPython(apply_standard_packs, migrations.RunPython.noop),
    ]
