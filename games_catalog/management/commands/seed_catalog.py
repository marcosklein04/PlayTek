from django.core.management.base import BaseCommand
from games_catalog.models import Game, Tag

CATALOGO = [
    {
        "slug": "connect4",
        "nombre": "4 en Línea",
        "descripcion": "Estrategia pura: conectá 4 antes que tu rival.",
        "imagen_portada_url": "",
        "etiqueta_precio": "$149/partida",
        "costo_por_partida": 2,
        "destacado": True,
        "tags": ["web based", "multiplayer"],
    },
    {
        "slug": "bingo",
        "nombre": "Bingo",
        "descripcion": "Ideal para eventos: rounds rápidos y rankings.",
        "imagen_portada_url": "",
        "etiqueta_precio": "$299/evento",
        "costo_por_partida": 3,
        "destacado": True,
        "tags": ["social", "corporate events"],
    },
    {
        "slug": "tictactoe",
        "nombre": "Ta-Te-Ti",
        "descripcion": "Clásico 3 en línea. Rápido y competitivo.",
        "imagen_portada_url": "",
        "etiqueta_precio": "$99/partida",
        "costo_por_partida": 1,
        "destacado": True,
        "tags": ["web based", "social"],
    },
    {
        "slug": "hangman",
        "nombre": "Ahorcado",
        "descripcion": "Adiviná la palabra antes de quedarte sin intentos.",
        "imagen_portada_url": "",
        "etiqueta_precio": "$99/partida",
        "costo_por_partida": 1,
        "destacado": False,
        "tags": ["web based", "trivia"],
    },
    {
        "slug": "memory",
        "nombre": "Memory",
        "descripcion": "Encontrá los pares en el menor tiempo posible.",
        "imagen_portada_url": "",
        "etiqueta_precio": "$149/partida",
        "costo_por_partida": 2,
        "destacado": False,
        "tags": ["web based", "interactive"],
    },
    {
        "slug": "puzzle",
        "nombre": "Puzzle",
        "descripcion": "Armá la imagen con movimientos inteligentes.",
        "imagen_portada_url": "",
        "etiqueta_precio": "$149/partida",
        "costo_por_partida": 2,
        "destacado": False,
        "tags": ["web based", "interactive"],
    },
]

class Command(BaseCommand):
    help = "Carga / actualiza el catálogo de juegos."

    def handle(self, *args, **options):
        for item in CATALOGO:
            tag_names = item.pop("tags", [])

            juego, _ = Game.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name": item["nombre"],
                    "description": item["descripcion"],
                    "cover_image_url": item["imagen_portada_url"],
                    "price_label": item["etiqueta_precio"],
                    "cost_per_play": item["costo_por_partida"],
                    "is_featured": item["destacado"],
                    "is_enabled": True,
                },
            )

            tags_objs = []
            for t in tag_names:
                tag, _ = Tag.objects.get_or_create(name=t)
                tags_objs.append(tag)

            # escribe en games_catalog_game_tags
            juego.tags.set(tags_objs)

        self.stdout.write(self.style.SUCCESS("Catálogo cargado/actualizado OK."))