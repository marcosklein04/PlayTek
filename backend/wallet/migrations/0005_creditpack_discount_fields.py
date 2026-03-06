from decimal import Decimal

from django.db import migrations, models


STANDARD_PACK_DETAILS = {
    15: (Decimal("45000.00"), 0),
    20: (Decimal("60000.00"), 3),
    24: (Decimal("72000.00"), 5),
    47: (Decimal("141000.00"), 10),
}


def backfill_credit_pack_pricing(apps, schema_editor):
    CreditPack = apps.get_model("wallet", "CreditPack")

    for pack in CreditPack.objects.all():
        base_price, discount_percent = STANDARD_PACK_DETAILS.get(
            pack.credits,
            (pack.price_ars, 0),
        )
        pack.base_price_ars = base_price
        pack.discount_percent = discount_percent
        pack.save(update_fields=["base_price_ars", "discount_percent"])


class Migration(migrations.Migration):
    dependencies = [
        ("wallet", "0004_standardize_credit_packs"),
    ]

    operations = [
        migrations.AddField(
            model_name="creditpack",
            name="base_price_ars",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name="creditpack",
            name="discount_percent",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(backfill_credit_pack_pricing, migrations.RunPython.noop),
    ]
