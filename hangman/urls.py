from django.urls import path
from . import views

urlpatterns = [
    path("runner/hangman", views.hangman_runner_page, name="hangman_runner"),
]