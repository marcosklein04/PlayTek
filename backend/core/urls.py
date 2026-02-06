from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("django.contrib.auth.urls")),
    path("api/", include("api_auth.urls")),
    path("api/", include("wallet.urls")),
    path("api/", include("games_catalog.api_urls")),
    path("runner/", include("games_catalog.runner_urls")),
    path("runner/", include("hangman.urls")),
    path("runner/", include("trivia.urls")),
    path("", include("games_catalog.ui_urls")),




]