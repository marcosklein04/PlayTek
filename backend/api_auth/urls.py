from django.urls import path
from . import views

urlpatterns = [
    path("auth/login", views.login, name="api_login"),
    path("register", views.register, name="register"),
    path("auth/me", views.me),
]