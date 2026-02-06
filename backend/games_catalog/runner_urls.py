from django.urls import path
from . import views

urlpatterns = [
    path("sesiones/<uuid:session_id>", views.runner_obtener_sesion),
    path("sesiones/<uuid:session_id>/finalizar", views.runner_finalizar_sesion),

    # English alias (opcional)
    path("sessions/<uuid:session_id>", views.runner_obtener_sesion),
    path("sessions/<uuid:session_id>/finish", views.runner_finalizar_sesion),
]