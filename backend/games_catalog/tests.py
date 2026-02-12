from urllib.parse import parse_qs, urlsplit

from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from accounts.models import Company
from games_catalog.models import Game, GameSession
from games_catalog.views import _build_runner_url, _pick_question_set_for_preview
from trivia.models import Choice, Question, QuestionSet


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
