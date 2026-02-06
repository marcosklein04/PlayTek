from django.urls import path
from . import views

urlpatterns = [
    # UI (runner page)
    path("trivia", views.trivia_runner_page, name="trivia_runner"),

    # API interna del runner (sin Bearer; usa session_token)
    path("trivia/state", views.runner_trivia_state, name="runner_trivia_state"),
    path("trivia/next", views.runner_trivia_next, name="runner_trivia_next"),
    path("trivia/answer", views.runner_trivia_answer, name="runner_trivia_answer"),
    path("trivia/finish", views.runner_trivia_finish, name="runner_trivia_finish"),
    path("trivia/ranking", views.runner_trivia_ranking, name="runner_trivia_ranking"),
]