from django.urls import path
from . import views

urlpatterns = [
    path("runner/trivia/", views.trivia_runner_page, name="trivia_runner"),
    path("runner/trivia/question/", views.runner_trivia_question, name="runner_trivia_question"),
    path("runner/trivia/answer/", views.runner_trivia_answer, name="runner_trivia_answer"),
]