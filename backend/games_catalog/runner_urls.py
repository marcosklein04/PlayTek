from django.urls import path
from . import views
from .goalkeeper_mundial_runner import super_portero_mundial_runner_page
from .puzzle_mundial_runner import puzzle_mundial_runner_page

urlpatterns = [
    path("sesiones/<uuid:session_id>", views.runner_obtener_sesion),
    path("sesiones/<uuid:session_id>/finalizar", views.runner_finalizar_sesion),
    path("puzzle-mundial", puzzle_mundial_runner_page, name="puzzle_mundial_runner"),
    path("puzzle-mundial/", puzzle_mundial_runner_page, name="puzzle_mundial_runner_slash"),
    path("super-portero-mundial", super_portero_mundial_runner_page, name="super_portero_mundial_runner"),
    path("super-portero-mundial/", super_portero_mundial_runner_page, name="super_portero_mundial_runner_slash"),

    # English alias (opcional)
    path("sessions/<uuid:session_id>", views.runner_obtener_sesion),
    path("sessions/<uuid:session_id>/finish", views.runner_finalizar_sesion),
]
