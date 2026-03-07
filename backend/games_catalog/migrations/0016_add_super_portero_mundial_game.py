from django.db import migrations


def create_super_portero_mundial(apps, schema_editor):
    Game = apps.get_model("games_catalog", "Game")
    Tag = apps.get_model("games_catalog", "Tag")

    game, _ = Game.objects.update_or_create(
        slug="super-portero-mundial",
        defaults={
            "name": "Súper Portero",
            "description": "Mové al arquero y atajá la mayor cantidad de remates antes de que termine el reloj.",
            "cover_image_url": "",
            "runner_url": "/runner/super-portero-mundial",
            "price_label": "$149/partida",
            "cost_per_play": 2,
            "is_featured": False,
            "is_enabled": True,
        },
    )

    tag_ids = []
    for name in ["web based", "interactive", "sports"]:
        tag, _ = Tag.objects.get_or_create(name=name)
        tag_ids.append(tag.id)

    game.tags.set(tag_ids)


def remove_super_portero_mundial(apps, schema_editor):
    Game = apps.get_model("games_catalog", "Game")
    Game.objects.filter(slug="super-portero-mundial").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("games_catalog", "0015_add_puzzle_mundial_game"),
    ]

    operations = [
        migrations.RunPython(create_super_portero_mundial, remove_super_portero_mundial),
    ]
