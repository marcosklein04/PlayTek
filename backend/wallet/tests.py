from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import Company
from api_auth.models import ApiToken
from games_catalog.models import ContratoJuego, ContratoJuegoFecha, Game
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
