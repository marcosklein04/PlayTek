from django.contrib import admin
from .models import Tag, Game, GameSession, ContratoJuego, ContratoJuegoFecha, GameCustomization

@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    search_fields = ("name",)

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "is_enabled", "is_featured", "cost_per_play")
    list_filter = ("is_enabled", "is_featured")
    search_fields = ("slug", "name")
    filter_horizontal = ("tags",)

@admin.register(GameSession)
class GameSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "game", "status", "started_at", "ended_at", "cost_charged")
    list_filter = ("status", "game")
    search_fields = ("id", "user__username", "game__slug")

@admin.register(ContratoJuego)
class ContratoJuegoAdmin(admin.ModelAdmin):
    list_display = ("id", "usuario", "juego", "fecha_inicio", "fecha_fin", "estado", "creado_en")
    list_filter = ("estado", "juego")
    search_fields = ("usuario__username", "juego__slug", "juego__name")
    ordering = ("-creado_en",)


@admin.register(GameCustomization)
class GameCustomizationAdmin(admin.ModelAdmin):
    list_display = ("id", "contrato", "actualizado_en")
    search_fields = ("contrato__usuario__username", "contrato__juego__slug")
    readonly_fields = ("creado_en", "actualizado_en")


@admin.register(ContratoJuegoFecha)
class ContratoJuegoFechaAdmin(admin.ModelAdmin):
    list_display = ("id", "contrato", "fecha")
    search_fields = ("contrato__usuario__username", "contrato__juego__slug")
    list_filter = ("fecha",)
