from django.urls import path
from . import ui_views

urlpatterns = [
    path("juegos", ui_views.catalogo_page, name="catalogo_ui"),
]