# wallet/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Packs
    path("credit-packs", views.credit_packs, name="credit_packs"),

    # Wallet
    path("me/wallet", views.mi_billetera, name="me_wallet"),
    path("me/wallet/topups/<int:topup_id>/status", views.topup_status, name="topup_status"),

    # Checkout
    path("me/wallet/checkout", views.create_topup, name="wallet_checkout"),

    # Mock checkout
    path("mock-checkout/<uuid:uuid>/approve", views.mock_checkout_approve, name="mock_checkout_approve"),
    path("mock-checkout/<uuid:uuid>", views.mock_checkout, name="mock_checkout"),

     # webhook MP (IMPORTANTE)
    path("mp/webhook", views.mp_webhook, name="mp_webhook"),

    # Manual/dev topup 
    path("me/wallet/topup", views.recargar_billetera, name="wallet_topup_manual"),

    # Contratos (API)
]