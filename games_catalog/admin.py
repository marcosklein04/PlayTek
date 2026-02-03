from django.contrib import admin
from .models import Juego, SesionJuego, Etiqueta

@admin.register(Etiqueta)
class EtiquetaAdmin(admin.ModelAdmin):
    search_fields = ("name",)  # field real

@admin.register(Juego)
class JuegoAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "is_enabled", "is_featured", "cost_per_play")
    list_filter = ("is_enabled", "is_featured")
    search_fields = ("slug", "name")
    filter_horizontal = ("tags",)

@admin.register(SesionJuego)
class SesionJuegoAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "game", "status", "started_at", "ended_at", "cost_charged")
    list_filter = ("status", "game")
    search_fields = ("id", "user__username", "game__slug")