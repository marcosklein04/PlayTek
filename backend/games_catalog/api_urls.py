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

    # Contracts
    path("contracts", views.crear_contrato_juego),
    path("contracts/mine", views.mis_contratos),
    path("contracts/<int:contract_id>/start", views.iniciar_juego_contrato),
    path("contracts/<int:contract_id>/preview", views.preview_juego_contrato),
    path("contracts/<int:contract_id>/launch", views.lanzar_juego_contrato),
    path("contracts/<int:contract_id>/customization", views.obtener_customizacion_contrato),
    path("contracts/<int:contract_id>/customization/save", views.guardar_customizacion_contrato),
    path("contracts/<int:contract_id>/trivia/questions", views.contrato_trivia_questions),
    path("contracts/<int:contract_id>/trivia/questions/import-csv", views.contrato_trivia_import_csv),
    path("contracts/<int:contract_id>/trivia/questions/<int:question_id>", views.contrato_trivia_question_detalle),
    path("contracts/<int:contract_id>/assets/<str:asset_key>", views.gestionar_asset_contrato),
]
