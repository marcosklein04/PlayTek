from django.urls import path
from . import views

urlpatterns = [
    # Español (API)
    path("catalogo/juegos", views.catalogo_juegos),
    path("juegos", views.catalogo_juegos, name="catalogo_juegos"),
    path("juegos/<slug:slug>/iniciar", views.iniciar_juego),

    path("juegos/sesiones", views.mis_sesiones),
    path("juegos/sesiones/<uuid:session_id>", views.obtener_sesion),
    path("juegos/sesiones/<uuid:session_id>/finalizar", views.finalizar_sesion),

    # English alias
    path("catalog/games", views.catalogo_juegos),
    path("games/<slug:slug>/start", views.iniciar_juego),

    path("games/sessions", views.mis_sesiones),
    path("games/sessions/<uuid:session_id>", views.obtener_sesion),
    path("games/sessions/<uuid:session_id>/finish", views.finalizar_sesion),
]