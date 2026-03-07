from django.db import migrations


def create_puzzle_mundial(apps, schema_editor):
    Game = apps.get_model("games_catalog", "Game")
    Tag = apps.get_model("games_catalog", "Tag")

    game, _ = Game.objects.update_or_create(
        slug="puzzle-mundial",
        defaults={
            "name": "Puzzle Mundial",
            "description": "Armá la imagen del mundial intercambiando piezas hasta completar la jugada.",
            "cover_image_url": "",
            "runner_url": "/runner/puzzle-mundial",
            "price_label": "$149/partida",
            "cost_per_play": 2,
            "is_featured": False,
            "is_enabled": True,
        },
    )

    tag_names = ["web based", "interactive", "sports"]
    tag_ids = []
    for name in tag_names:
        tag, _ = Tag.objects.get_or_create(name=name)
        tag_ids.append(tag.id)

    game.tags.set(tag_ids)


def remove_puzzle_mundial(apps, schema_editor):
    Game = apps.get_model("games_catalog", "Game")
    Game.objects.filter(slug="puzzle-mundial").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("games_catalog", "0014_contratojuegofecha_and_more"),
    ]

    operations = [
        migrations.RunPython(create_puzzle_mundial, remove_puzzle_mundial),
    ]
