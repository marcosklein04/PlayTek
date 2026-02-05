from django.urls import path
from . import views

urlpatterns = [
    path("hangman/", views.hangman_runner_page, name="hangman_runner"),
    path("hangman/word/", views.runner_hangman_word, name="runner_hangman_word"),
]