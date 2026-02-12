import json
from datetime import timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from django.utils import timezone

from accounts.models import Company
from api_auth.models import ApiToken
from games_catalog.models import ContratoJuego, Game, GameSession
from games_catalog.views import _build_runner_url, _pick_question_set_for_preview
from trivia.models import Choice, Question, QuestionSet
from wallet.models import Wallet


class GamesCatalogTriviaTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        user_model = get_user_model()

        self.company_a = Company.objects.create(name="Company A")
        self.company_b = Company.objects.create(name="Company B")

        self.user_a = user_model.objects.create_user(username="user_a", password="secret123")
        self.user_b = user_model.objects.create_user(username="user_b", password="secret123")
        self.user_a.profile.company = self.company_a
        self.user_a.profile.save(update_fields=["company"])
        self.user_b.profile.company = self.company_b
        self.user_b.profile.save(update_fields=["company"])

        self.trivia_game = Game.objects.create(
            slug="trivia",
            name="Trivia",
            runner_url="/runner/trivia",
            cost_per_play=1,
            is_enabled=True,
        )

    def test_preview_question_set_does_not_cross_companies(self):
        question_set_b = QuestionSet.objects.create(company=self.company_b, name="Set B", is_active=True)
        question_b = Question.objects.create(question_set=question_set_b, text="B", is_active=True)
        Choice.objects.create(question=question_b, text="ok", is_correct=True)
        Choice.objects.create(question=question_b, text="no", is_correct=False)

        picked_for_a = _pick_question_set_for_preview(self.user_a, self.trivia_game)
        self.assertIsNone(picked_for_a)

        question_set_a = QuestionSet.objects.create(company=self.company_a, name="Set A", is_active=True)
        question_a = Question.objects.create(question_set=question_set_a, text="A", is_active=True)
        Choice.objects.create(question=question_a, text="ok", is_correct=True)
        Choice.objects.create(question=question_a, text="no", is_correct=False)

        picked_for_a_after = _pick_question_set_for_preview(self.user_a, self.trivia_game)
        self.assertIsNotNone(picked_for_a_after)
        self.assertEqual(picked_for_a_after.company_id, self.company_a.id)

    def test_trivia_runner_url_puts_token_in_fragment_not_query(self):
        session = GameSession.objects.create(
            user=self.user_a,
            game=self.trivia_game,
            status=GameSession.Status.ACTIVE,
            cost_charged=0,
            client_state={},
            runner_token="token-xyz",
        )
        request = self.factory.get("/")

        runner_url = _build_runner_url(request, self.trivia_game, session, self.user_a.id)
        parts = urlsplit(runner_url)
        query = parse_qs(parts.query)
        fragment = parse_qs(parts.fragment)

        self.assertIn("session_id", query)
        self.assertIn("user_id", query)
        self.assertNotIn("session_token", query)
        self.assertEqual(fragment.get("session_token"), ["token-xyz"])


class GamesCatalogContractDatesTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="contract_user", password="secret123")
        self.token = ApiToken.objects.create(user=self.user, key=ApiToken.generate_key())

        self.game = Game.objects.create(
            slug="bingo",
            name="Bingo",
            runner_url="/runner/bingo",
            cost_per_play=2,
            is_enabled=True,
        )
        Wallet.objects.create(user=self.user, balance=20)
        self.auth = {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def _post_json(self, path: str, payload: dict):
        return self.client.post(path, data=json.dumps(payload), content_type="application/json", **self.auth)

    def test_contract_rejects_past_date(self):
        yesterday = timezone.localdate() - timedelta(days=1)
        response = self._post_json(
            "/api/contracts",
            {"slug": self.game.slug, "fechas_evento": [yesterday.isoformat()]},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("error"), "fecha_pasada_no_permitida")

    def test_contract_accepts_multiple_dates_and_launch_respects_exact_days(self):
        today = timezone.localdate()
        in_two_days = today + timedelta(days=2)
        tomorrow = today + timedelta(days=1)

        create_response = self._post_json(
            "/api/contracts",
            {
                "slug": self.game.slug,
                "fechas_evento": [today.isoformat(), in_two_days.isoformat()],
            },
        )
        self.assertEqual(create_response.status_code, 201)
        contrato_id = create_response.json()["contrato"]["id"]

        contrato = ContratoJuego.objects.get(id=contrato_id)
        self.assertEqual(
            list(contrato.fechas_evento.values_list("fecha", flat=True)),
            [today, in_two_days],
        )

        wallet = Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.balance, 16)

        launch_today = self._post_json(f"/api/contracts/{contrato_id}/launch", {})
        self.assertEqual(launch_today.status_code, 201)
        self.assertFalse(launch_today.json()["preview_mode"])

        with patch("games_catalog.views.timezone.localdate", return_value=tomorrow):
            launch_tomorrow = self._post_json(f"/api/contracts/{contrato_id}/launch", {})
        self.assertEqual(launch_tomorrow.status_code, 201)
        self.assertTrue(launch_tomorrow.json()["preview_mode"])

    def test_my_contracts_hides_expired_contracts_and_marks_them_finished(self):
        today = timezone.localdate()
        yesterday = today - timedelta(days=1)

        expired_contract = ContratoJuego.objects.create(
            usuario=self.user,
            juego=self.game,
            fecha_inicio=yesterday,
            fecha_fin=yesterday,
            estado=ContratoJuego.Estado.ACTIVO,
        )
        active_contract = ContratoJuego.objects.create(
            usuario=self.user,
            juego=self.game,
            fecha_inicio=today,
            fecha_fin=today + timedelta(days=1),
            estado=ContratoJuego.Estado.ACTIVO,
        )

        response = self.client.get("/api/contracts/mine", **self.auth)
        self.assertEqual(response.status_code, 200)
        payload = response.json()["resultados"]
        ids = {item["id"] for item in payload}

        self.assertIn(active_contract.id, ids)
        self.assertNotIn(expired_contract.id, ids)

        expired_contract.refresh_from_db()
        self.assertEqual(expired_contract.estado, ContratoJuego.Estado.FINALIZADO)
