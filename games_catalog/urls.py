from django.urls import path
from . import views

urlpatterns = [
    path("catalogo/juegos", views.catalogo_juegos),
    path("juegos", views.catalogo_juegos, name="catalogo_juegos"),
    path("juegos/<slug:slug>/iniciar", views.iniciar_juego),

    path("juegos/sesiones", views.mis_sesiones),
    path("juegos/sesiones/<uuid:session_id>", views.obtener_sesion),
    path("juegos/sesiones/<uuid:session_id>/finalizar", views.finalizar_sesion),

    path("runner/sesiones/<uuid:session_id>", views.runner_obtener_sesion),
    path("runner/sesiones/<uuid:session_id>/finalizar", views.runner_finalizar_sesion),

    # Alias inglés
    path("catalog/games", views.catalogo_juegos),
    path("games/<slug:slug>/start", views.iniciar_juego),

    path("games/sessions", views.mis_sesiones),
    path("games/sessions/<uuid:session_id>", views.obtener_sesion),
    path("games/sessions/<uuid:session_id>/finish", views.finalizar_sesion),

    path("runner/sessions/<uuid:session_id>", views.runner_obtener_sesion),
    path("runner/sessions/<uuid:session_id>/finish", views.runner_finalizar_sesion),
    path("runner/hangman/", views.runner_hangman_page, name="runner_hangman_page"),
    path("runner/hangman/", views.runner_hangman_page),
]