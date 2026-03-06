import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Company


class ApiAuthRegisterTests(TestCase):
    def test_register_assigns_company_from_organization(self):
        response = self.client.post(
            "/api/register",
            data=json.dumps(
                {
                    "email": "cliente@example.com",
                    "password": "secret123",
                    "name": "Cliente Demo",
                    "organization": "Playtek Events",
                }
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        user_model = get_user_model()
        user = user_model.objects.get(email="cliente@example.com")

        self.assertEqual(user.profile.company.name, "Playtek Events")
        self.assertTrue(Company.objects.filter(name="Playtek Events").exists())
        self.assertEqual(response.json()["user"]["organization"], "Playtek Events")
