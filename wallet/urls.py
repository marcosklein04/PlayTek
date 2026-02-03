# wallet/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Español (oficial)
    path("yo/billetera", views.mi_billetera, name="mi_billetera"),
    path("yo/billetera/recargar", views.recargar_billetera, name="recargar_billetera"),

    # Alias inglés (compat)
    path("me/wallet", views.mi_billetera, name="me_wallet"),
    path("me/wallet/topup", views.recargar_billetera, name="wallet_topup"),
]