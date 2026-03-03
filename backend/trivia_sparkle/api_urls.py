from django.urls import path

from . import views

urlpatterns = [
    path("", views.api_index, name="trivia-sparkle-api-index"),
    path("health", views.health, name="trivia-sparkle-health"),
    path("auth/login", views.auth_login, name="trivia-sparkle-auth-login"),
    path("auth/me", views.auth_me, name="trivia-sparkle-auth-me"),
    path("auth/logout", views.auth_logout, name="trivia-sparkle-auth-logout"),
    path("config", views.public_config, name="trivia-sparkle-public-config"),
    path("admin/image-keys", views.admin_image_keys, name="trivia-sparkle-admin-image-keys"),
    path("admin/images", views.admin_images_upload, name="trivia-sparkle-admin-images-upload"),
    path("admin/config", views.admin_config, name="trivia-sparkle-admin-config"),
    path("admin/questions", views.admin_questions, name="trivia-sparkle-admin-questions"),
    path("admin/questions/reset", views.admin_questions_reset, name="trivia-sparkle-admin-questions-reset"),
    path("game/start", views.game_start, name="trivia-sparkle-game-start"),
    path("game/<str:session_id>/question", views.game_question, name="trivia-sparkle-game-question"),
    path("game/<str:session_id>/answer", views.game_answer, name="trivia-sparkle-game-answer"),
]
