from django.core.management.base import BaseCommand
from games_catalog.models import Game, Tag

CATALOGO = [
    {
        "slug": "connect4",
        "nombre": "4 en Línea",
        "descripcion": "Estrategia pura: conectá 4 antes que tu rival.",
        "imagen_portada_url": "",
        "runner_url": "https://4linea.adeserver.com.ar/login",
        "etiqueta_precio": "$149/partida",
        "costo_por_partida": 2,
        "destacado": True,
        "habilitado": True,
        "tags": ["web based", "multiplayer"],
    },
    {
        "slug": "bingo",
        "nombre": "Bingo",
        "descripcion": "Ideal para eventos: rounds rápidos y rankings.",
        "imagen_portada_url": "",
        "runner_url": "https://bingo.adeserver.com.ar/admin",
        "etiqueta_precio": "$299/evento",
        "costo_por_partida": 3,
        "destacado": True,
        "habilitado": True,
        "tags": ["social", "corporate events"],
    },
    {
        "slug": "tictactoe",
        "nombre": "Ta-Te-Ti",
        "descripcion": "Clásico 3 en línea. Rápido y competitivo.",
        "imagen_portada_url": "",
        "runner_url": "https://tateti.adeserver.com.ar/login",
        "etiqueta_precio": "$99/partida",
        "costo_por_partida": 1,
        "destacado": True,
        "habilitado": True,
        "tags": ["web based", "social"],
    },
    {
        "slug": "hangman",
        "nombre": "Ahorcado",
        "descripcion": "Adiviná la palabra antes de quedarte sin intentos.",
        "imagen_portada_url": "",
        "runner_url": "/runner/hangman", 
        "etiqueta_precio": "$99/partida",
        "costo_por_partida": 1,
        "destacado": False,
        "habilitado": True,
        "tags": ["web based", "trivia"],
    },
    {
        "slug": "casino",
        "nombre": "Casino",
        "descripcion": "Mini-juegos tipo casino para jugar solo.",
        "imagen_portada_url": "",
        "runner_url": "https://casino.adeserver.com.ar/",
        "etiqueta_precio": "$199/partida",
        "costo_por_partida": 2,
        "destacado": False,
        "habilitado": True,
        "tags": ["singleplayer", "casino"],
    },
    {
        "slug": "puzzle",
        "nombre": "Puzzle",
        "descripcion": "Armá la imagen con movimientos inteligentes.",
        "imagen_portada_url": "",
        "runner_url": "https://puzzle.adeserver.com.ar/",
        "etiqueta_precio": "$149/partida",
        "costo_por_partida": 2,
        "destacado": False,
        "habilitado": True,
        "tags": ["web based", "interactive"],
    },
    {
        "slug": "memory",
        "nombre": "Memory",
        "descripcion": "Encontrá los pares en el menor tiempo posible.",
        "imagen_portada_url": "",
        "runner_url": "https://memory.adeserver.com.ar/",
        "etiqueta_precio": "$149/partida",
        "costo_por_partida": 2,
        "destacado": False,
        "habilitado": True,
        "tags": ["web based", "interactive"],
    },
]

class Command(BaseCommand):
    help = "Carga / actualiza el catálogo de juegos."

    def handle(self, *args, **options):
        for item in CATALOGO:
            tags = item.pop("tags", [])

            juego, _ = Game.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name": item["nombre"],
                    "description": item["descripcion"],
                    "cover_image_url": item["imagen_portada_url"],
                    "runner_url": item.get("runner_url", ""),
                    "price_label": item["etiqueta_precio"],
                    "cost_per_play": item["costo_por_partida"],
                    "is_featured": item["destacado"],
                    "is_enabled": item.get("habilitado", True),
                },
            )

            tag_objs = []
            for t in tags:
                tag, _ = Tag.objects.get_or_create(name=t)
                tag_objs.append(tag)

            juego.tags.set(tag_objs)

        self.stdout.write(self.style.SUCCESS("Catálogo cargado/actualizado OK."))