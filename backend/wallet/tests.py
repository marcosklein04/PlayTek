import json
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import Company
from api_auth.models import ApiToken
from games_catalog.models import ContratoJuego, ContratoJuegoFecha, Game
from wallet.mp import create_preference
from wallet.models import CreditPack, LedgerEntry, Wallet, WalletTopup


User = get_user_model()


class AdminSuperOverviewTests(TestCase):
    def setUp(self):
        self.superadmin = User.objects.create_superuser(
            username="superadmin",
            email="superadmin@example.com",
            password="123456",
        )
        self.superadmin_token = ApiToken.objects.create(
            user=self.superadmin,
            key=ApiToken.generate_key(),
        )

        self.client_user = User.objects.create_user(
            username="cliente1",
            email="cliente1@example.com",
            password="123456",
        )
        self.client_token = ApiToken.objects.create(
            user=self.client_user,
            key=ApiToken.generate_key(),
        )

        company = Company.objects.create(name="Empresa Demo")
        self.client_user.profile.company = company
        self.client_user.profile.save(update_fields=["company"])

        Wallet.objects.create(user=self.client_user, balance=70)

        self.game = Game.objects.create(
            slug="trivia",
            name="Trivia",
            cost_per_play=5,
        )

        today = timezone.localdate()
        contract = ContratoJuego.objects.create(
            usuario=self.client_user,
            juego=self.game,
            fecha_inicio=today,
            fecha_fin=today + timedelta(days=1),
            estado=ContratoJuego.Estado.ACTIVO,
        )
        ContratoJuegoFecha.objects.create(contrato=contract, fecha=today)

        LedgerEntry.objects.create(
            user=self.client_user,
            kind=LedgerEntry.Kind.TOPUP,
            amount=100,
            reference_type="wallet_topup",
            reference_id="123",
        )
        LedgerEntry.objects.create(
            user=self.client_user,
            kind=LedgerEntry.Kind.SPEND,
            amount=-30,
            reference_type="game_contract",
            reference_id=str(contract.id),
        )

        pack = CreditPack.objects.create(
            name="Pack 100",
            credits=100,
            price_ars=Decimal("1500.00"),
            active=True,
        )
        WalletTopup.objects.create(
            user=self.client_user,
            pack=pack,
            status=WalletTopup.Status.APPROVED,
            amount_ars=Decimal("1500.00"),
            credits=100,
        )

    def test_admin_overview_requiere_superadmin(self):
        response_client = self.client.get(
            "/api/admin/overview",
            HTTP_AUTHORIZATION=f"Bearer {self.client_token.key}",
        )
        self.assertEqual(response_client.status_code, 403)
        self.assertEqual(response_client.json().get("error"), "forbidden")

    def test_admin_overview_devuelve_totales_y_etiquetas_en_espanol(self):
        response = self.client.get(
            "/api/admin/overview",
            HTTP_AUTHORIZATION=f"Bearer {self.superadmin_token.key}",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertTrue(data.get("ok"))
        self.assertEqual(data["summary"]["contracts"], 1)
        self.assertEqual(data["summary"]["ledger_entries"], 2)
        self.assertEqual(data["summary"]["topups"], 1)

        credits_totals = data["summary"]["credits_totals"]
        self.assertEqual(credits_totals["recargados"], 100)
        self.assertEqual(credits_totals["gastados"], 30)
        self.assertEqual(credits_totals["neto"], 70)

        topups_totals = data["summary"]["topups_totals"]
        self.assertEqual(topups_totals["aprobados"], 1)
        self.assertEqual(topups_totals["creditos_aprobados"], 100)
        self.assertEqual(Decimal(topups_totals["ars_aprobado"]), Decimal("1500.00"))

        kinds = {item["value"]: item["label"] for item in data["options"]["transaction_kinds"]}
        self.assertEqual(kinds["TOPUP"], "Recarga")
        self.assertEqual(kinds["SPEND"], "Gasto")

        topup_statuses = {item["value"]: item["label"] for item in data["options"]["topup_statuses"]}
        self.assertEqual(topup_statuses["APPROVED"], "Aprobado")
        self.assertEqual(topup_statuses["PENDING"], "Pendiente")

        transaction_labels = {item["kind"]: item["kind_label"] for item in data["transactions"]}
        self.assertEqual(transaction_labels["TOPUP"], "Recarga")
        self.assertEqual(transaction_labels["SPEND"], "Gasto")

        topup_label = data["topups"][0]["status_label"]
        self.assertEqual(topup_label, "Aprobado")


class FakeResponse:
    def __init__(self, status_code, data):
        self.status_code = status_code
        self._data = data
        self.content = b"{}" if data is not None else b""
        self.text = json.dumps(data or {})

    def json(self):
        return self._data


@override_settings(MP_ACCESS_TOKEN="TEST_MP_ACCESS_TOKEN")
class MercadoPagoPreferencePayloadTests(TestCase):
    @patch("wallet.mp.requests.post")
    def test_create_preference_no_envia_notification_url_local(self, requests_post_mock):
        requests_post_mock.return_value = FakeResponse(
            201,
            {"id": "pref_local", "init_point": "https://mp.example/init"},
        )

        create_preference(
            title="Pack Test",
            description="Test",
            amount_ars=1000.0,
            external_reference="123",
            notification_url="http://127.0.0.1:8000/api/mp/webhook",
            success_url="http://localhost:8080/buy-credits?status=success",
            failure_url="http://localhost:8080/buy-credits?status=failure",
            pending_url="http://localhost:8080/buy-credits?status=pending",
        )

        payload = requests_post_mock.call_args.kwargs["json"]
        self.assertNotIn("notification_url", payload)

    @patch("wallet.mp.requests.post")
    def test_create_preference_envia_notification_url_publica_https(self, requests_post_mock):
        requests_post_mock.return_value = FakeResponse(
            201,
            {"id": "pref_public", "init_point": "https://mp.example/init"},
        )

        create_preference(
            title="Pack Test",
            description="Test",
            amount_ars=1000.0,
            external_reference="123",
            notification_url="https://mi-dominio.com/api/mp/webhook",
            success_url="http://localhost:8080/buy-credits?status=success",
            failure_url="http://localhost:8080/buy-credits?status=failure",
            pending_url="http://localhost:8080/buy-credits?status=pending",
        )

        payload = requests_post_mock.call_args.kwargs["json"]
        self.assertEqual(payload.get("notification_url"), "https://mi-dominio.com/api/mp/webhook")


@override_settings(
    MP_ACCESS_TOKEN="TEST_MP_ACCESS_TOKEN",
    FRONTEND_BASE_URL="http://localhost:8080",
)
class MercadoPagoFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="cliente_mp",
            email="cliente_mp@example.com",
            password="123456",
        )
        self.token = ApiToken.objects.create(
            user=self.user,
            key=ApiToken.generate_key(),
        )
        self.pack = CreditPack.objects.create(
            name="Pack MP",
            credits=120,
            price_ars=Decimal("2999.00"),
            active=True,
            mp_title="Pack 120 créditos",
            mp_description="Pack para testing",
        )

    def _auth_headers(self):
        return {"HTTP_AUTHORIZATION": f"Bearer {self.token.key}"}

    @patch("wallet.views.create_preference")
    def test_create_topup_envia_notification_url(self, create_preference_mock):
        create_preference_mock.return_value = {
            "id": "pref_123",
            "init_point": "https://mp.example/init",
            "sandbox_init_point": "https://mp.example/sandbox-init",
        }

        response = self.client.post(
            "/api/me/wallet/checkout",
            data=json.dumps({"pack_id": self.pack.id}),
            content_type="application/json",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, 200)
        topup_id = response.json().get("topup_id")
        kwargs = create_preference_mock.call_args.kwargs
        self.assertEqual(kwargs["notification_url"], "http://testserver/api/mp/webhook")
        self.assertEqual(kwargs["external_reference"], str(topup_id))

    @patch("wallet.views.requests.get")
    def test_webhook_aprobado_es_idempotente(self, requests_get_mock):
        topup = WalletTopup.objects.create(
            user=self.user,
            pack=self.pack,
            status=WalletTopup.Status.PENDING,
            amount_ars=self.pack.price_ars,
            credits=self.pack.credits,
        )

        requests_get_mock.return_value = FakeResponse(
            200,
            {
                "id": "pay_999",
                "status": "approved",
                "currency_id": "ARS",
                "transaction_amount": "2999.00",
                "external_reference": str(topup.id),
            },
        )

        first = self.client.post("/api/mp/webhook?data.id=pay_999", data="{}", content_type="application/json")
        second = self.client.post("/api/mp/webhook?data.id=pay_999", data="{}", content_type="application/json")

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)

        topup.refresh_from_db()
        self.assertEqual(topup.status, WalletTopup.Status.APPROVED)
        self.assertEqual(topup.mp_payment_id, "pay_999")

        wallet = Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.balance, self.pack.credits)
        self.assertEqual(
            LedgerEntry.objects.filter(user=self.user, reference_type="mp_payment", reference_id="pay_999").count(),
            1,
        )

    @patch("wallet.views.requests.get")
    def test_topup_status_sincroniza_rechazado(self, requests_get_mock):
        topup = WalletTopup.objects.create(
            user=self.user,
            pack=self.pack,
            status=WalletTopup.Status.PENDING,
            amount_ars=self.pack.price_ars,
            credits=self.pack.credits,
        )
        Wallet.objects.create(user=self.user, balance=50)

        requests_get_mock.return_value = FakeResponse(
            200,
            {
                "results": [
                    {"id": "pay_rejected", "status": "rejected"},
                ]
            },
        )

        response = self.client.get(
            f"/api/me/wallet/topups/{topup.id}/status",
            **self._auth_headers(),
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], WalletTopup.Status.REJECTED)
        self.assertFalse(body["credited"])

        topup.refresh_from_db()
        self.assertEqual(topup.status, WalletTopup.Status.REJECTED)
        self.assertEqual(topup.mp_payment_id, "pay_rejected")

        wallet = Wallet.objects.get(user=self.user)
        self.assertEqual(wallet.balance, 50)

    @override_settings(MP_WEBHOOK_SECRET="mi_secreto_webhook")
    @patch("wallet.views.requests.get")
    def test_webhook_rechaza_firma_invalida(self, requests_get_mock):
        response = self.client.post("/api/mp/webhook?data.id=pay_123", data="{}", content_type="application/json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("ignored"), "invalid_signature")
        requests_get_mock.assert_not_called()
