from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Company
from games_catalog.models import Game, GameSession
from trivia.models import Choice, Question, QuestionSet


class TriviaRunnerSecurityTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.company = Company.objects.create(name="Acme Trivia")
        self.user = user_model.objects.create_user(username="trivia_user", password="secret123")
        self.user.profile.company = self.company
        self.user.profile.save(update_fields=["company"])

        self.game = Game.objects.create(
            slug="trivia",
            name="Trivia",
            runner_url="/runner/trivia",
            cost_per_play=1,
            is_enabled=True,
        )
        self.question_set = QuestionSet.objects.create(company=self.company, name="Set Base", is_active=True)

    def _build_session(self, *, client_state=None):
        return GameSession.objects.create(
            user=self.user,
            game=self.game,
            status=GameSession.Status.ACTIVE,
            client_state=client_state or {},
            question_set=self.question_set,
            runner_token="runner-token-123",
            cost_charged=0,
        )

    def _runner_get(self, path, session):
        return self.client.get(
            path,
            {
                "session_id": str(session.id),
                "user_id": str(self.user.id),
                "session_token": session.runner_token,
            },
        )

    def test_state_does_not_expose_internal_correct_choice(self):
        question = Question.objects.create(question_set=self.question_set, text="Capital de Argentina?", is_active=True)
        correct_choice = Choice.objects.create(question=question, text="Buenos Aires", is_correct=True)
        wrong_choice = Choice.objects.create(question=question, text="Cordoba", is_correct=False)

        session = self._build_session(
            client_state={
                "trivia": {
                    "current": {
                        "id": question.id,
                        "text": question.text,
                        "choices": [
                            {"id": correct_choice.id, "text": correct_choice.text},
                            {"id": wrong_choice.id, "text": wrong_choice.text},
                        ],
                        "_correct_choice_id": correct_choice.id,
                    }
                }
            }
        )

        resp = self._runner_get("/runner/trivia/state", session)
        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        current = payload["trivia"]["current"]
        self.assertNotIn("_correct_choice_id", current)

    def test_answer_rejects_invalid_choice_id(self):
        question = Question.objects.create(question_set=self.question_set, text="2 + 2", is_active=True)
        correct_choice = Choice.objects.create(question=question, text="4", is_correct=True)
        wrong_choice = Choice.objects.create(question=question, text="5", is_correct=False)

        session = self._build_session(
            client_state={
                "trivia": {
                    "current": {
                        "id": question.id,
                        "text": question.text,
                        "choices": [
                            {"id": correct_choice.id, "text": correct_choice.text},
                            {"id": wrong_choice.id, "text": wrong_choice.text},
                        ],
                        "_correct_choice_id": correct_choice.id,
                    }
                }
            }
        )

        resp = self.client.post(
            "/runner/trivia/answer",
            data={
                "session_id": str(session.id),
                "user_id": self.user.id,
                "session_token": session.runner_token,
                "choice_id": "not-a-number",
            },
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json().get("error"), "choice_id_invalido")

    def test_next_uses_only_valid_active_questions(self):
        # Inactiva: debe ignorarse.
        inactive_question = Question.objects.create(
            question_set=self.question_set,
            text="Pregunta inactiva",
            is_active=False,
        )
        Choice.objects.create(question=inactive_question, text="A", is_correct=True)
        Choice.objects.create(question=inactive_question, text="B", is_correct=False)

        # Activa inválida: sin correcta, también debe ignorarse.
        invalid_question = Question.objects.create(
            question_set=self.question_set,
            text="Pregunta inválida",
            is_active=True,
        )
        Choice.objects.create(question=invalid_question, text="A", is_correct=False)
        Choice.objects.create(question=invalid_question, text="B", is_correct=False)

        # Activa válida: debe ser la que salga.
        valid_question = Question.objects.create(
            question_set=self.question_set,
            text="Pregunta válida",
            is_active=True,
        )
        Choice.objects.create(question=valid_question, text="Correcta", is_correct=True)
        Choice.objects.create(question=valid_question, text="Incorrecta", is_correct=False)

        session = self._build_session(client_state={"trivia": {"asked_ids": []}})
        resp = self._runner_get("/runner/trivia/next", session)

        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertIn("question", payload)
        self.assertEqual(payload["question"]["id"], valid_question.id)
