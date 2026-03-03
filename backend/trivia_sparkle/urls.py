from django.urls import path

from . import views

urlpatterns = [
    path("trivia-sparkle", views.trivia_sparkle_runner_page, name="trivia_sparkle_runner"),
    path("trivia-sparkle/", views.trivia_sparkle_runner_page, name="trivia_sparkle_runner_slash"),
    path("trivia-sparkle/admin", views.trivia_sparkle_runner_page, name="trivia_sparkle_runner_admin"),
    path("trivia-sparkle/admin/", views.trivia_sparkle_runner_page, name="trivia_sparkle_runner_admin_slash"),
]
