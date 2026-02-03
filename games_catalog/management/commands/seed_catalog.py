from django.core.management.base import BaseCommand
from games_catalog.models import Juego, Etiqueta, JuegoEtiqueta


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
            tags = item.pop("tags", [])

            juego, _ = Juego.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "nombre": item["nombre"],
                    "descripcion": item["descripcion"],
                    "imagen_portada_url": item["imagen_portada_url"],
                    "etiqueta_precio": item["etiqueta_precio"],
                    "costo_por_partida": item["costo_por_partida"],
                    "destacado": item["destacado"],
                    "habilitado": True,
                },
            )

            # Crear etiquetas y asegurar relación en tabla intermedia
            for t in tags:
                etiqueta, _ = Etiqueta.objects.get_or_create(nombre=t)

                # asegura fila en games_catalog_game_tags
                JuegoEtiqueta.objects.get_or_create(
                    juego=juego,
                    etiqueta=etiqueta,
                )

        self.stdout.write(self.style.SUCCESS("Catálogo cargado/actualizado OK."))