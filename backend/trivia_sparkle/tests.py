import secrets

from django.contrib.auth import get_user_model
from django.test import TestCase

from games_catalog.models import Game, GameSession


class TriviaSparkleRunnerBindingTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="sparkle_user",
            email="sparkle@example.com",
            password="secret123",
        )
        self.game = Game.objects.create(
            slug="trivia-sparkle",
            name="Trivia Sparkle",
            description="",
            runner_url="/runner/trivia-sparkle",
            cost_per_play=1,
            is_enabled=True,
        )

    def _create_bound_session(self, *, preview_mode: bool):
        session = GameSession.objects.create(
            user=self.user,
            game=self.game,
            status=GameSession.Status.ACTIVE,
            cost_charged=0,
            client_state={
                "juego": "trivia-sparkle",
                "preview_mode": preview_mode,
                "customization": {
                    "branding": {"watermark_text": "MODO PRUEBA TEST"},
                    "watermark": {
                        "enabled": True,
                        "color": "#ff0000",
                        "opacity": 0.33,
                        "position": "center",
                        "font_size": 88,
                    },
                },
            },
        )
        session.runner_token = secrets.token_urlsafe(24)
        session.save(update_fields=["runner_token"])
        return session

    def _bind_runner_cookie(self, session: GameSession):
        self.client.get(
            f"/runner/trivia-sparkle?session_id={session.id}&user_id={self.user.id}&session_token={session.runner_token}"
        )

    def test_public_config_reflects_preview_mode_for_bound_session(self):
        session = self._create_bound_session(preview_mode=True)
        self._bind_runner_cookie(session)

        response = self.client.get("/api/trivia-sparkle/config")
        payload = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(payload.get("preview_mode"))
        self.assertEqual(payload.get("watermark", {}).get("text"), "MODO PRUEBA TEST")

    def test_game_start_uses_bound_gamesession_instead_of_ephemeral_session(self):
        session = self._create_bound_session(preview_mode=True)
        self._bind_runner_cookie(session)

        response = self.client.post(
            "/api/trivia-sparkle/game/start",
            data="{}",
            content_type="application/json",
        )
        payload = response.json()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(payload.get("sessionId"), str(session.id))

        session.refresh_from_db()
        self.assertIn("trivia_sparkle", session.client_state)

    def test_public_config_without_binding_returns_no_preview_mode(self):
        response = self.client.get("/runner/trivia-sparkle")
        self.assertEqual(response.status_code, 200)

        config_response = self.client.get("/api/trivia-sparkle/config")
        payload = config_response.json()
        self.assertEqual(config_response.status_code, 200)
        self.assertFalse(payload.get("preview_mode"))
