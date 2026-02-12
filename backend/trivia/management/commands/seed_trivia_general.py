from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Company
from trivia.models import Choice, Question, QuestionSet


DEFAULT_SET_NAME = "Cultura General Base"

GENERAL_QUESTIONS = [
    {
        "text": "Cual es la capital de Francia?",
        "choices": [
            ("Paris", True),
            ("Roma", False),
            ("Berlin", False),
            ("Lisboa", False),
        ],
    },
    {
        "text": "Que planeta es conocido como el planeta rojo?",
        "choices": [
            ("Jupiter", False),
            ("Marte", True),
            ("Venus", False),
            ("Saturno", False),
        ],
    },
    {
        "text": "Quien escribio Don Quijote de la Mancha?",
        "choices": [
            ("Gabriel Garcia Marquez", False),
            ("Julio Cortazar", False),
            ("Miguel de Cervantes", True),
            ("Pablo Neruda", False),
        ],
    },
    {
        "text": "Cual es el oceano mas grande del mundo?",
        "choices": [
            ("Oceano Atlantico", False),
            ("Oceano Pacifico", True),
            ("Oceano Indico", False),
            ("Oceano Artico", False),
        ],
    },
    {
        "text": "Cuantos continentes se consideran habitualmente?",
        "choices": [
            ("5", False),
            ("6", False),
            ("7", True),
            ("8", False),
        ],
    },
    {
        "text": "Que elemento quimico tiene el simbolo O?",
        "choices": [
            ("Oro", False),
            ("Osmio", False),
            ("Oxigeno", True),
            ("Plata", False),
        ],
    },
    {
        "text": "En que anio llego el ser humano a la Luna por primera vez?",
        "choices": [
            ("1965", False),
            ("1969", True),
            ("1972", False),
            ("1980", False),
        ],
    },
    {
        "text": "Cual es la moneda oficial de Japon?",
        "choices": [
            ("Yuan", False),
            ("Won", False),
            ("Yen", True),
            ("Baht", False),
        ],
    },
    {
        "text": "Que instrumento se usa para medir la temperatura?",
        "choices": [
            ("Barometro", False),
            ("Termometro", True),
            ("Higrometro", False),
            ("Altimetro", False),
        ],
    },
    {
        "text": "En que pais se encuentran las piramides de Guiza?",
        "choices": [
            ("Marruecos", False),
            ("Mexico", False),
            ("Egipto", True),
            ("Peru", False),
        ],
    },
]


def _seed_questions(question_set: QuestionSet) -> int:
    existing_texts = set(
        Question.objects.filter(question_set=question_set).values_list("text", flat=True)
    )
    created_questions = 0

    for item in GENERAL_QUESTIONS:
        if item["text"] in existing_texts:
            continue

        with transaction.atomic():
            question = Question.objects.create(
                question_set=question_set,
                text=item["text"],
                is_active=True,
            )
            Choice.objects.bulk_create(
                [
                    Choice(
                        question=question,
                        text=choice_text,
                        is_correct=is_correct,
                    )
                    for choice_text, is_correct in item["choices"]
                ]
            )
        created_questions += 1

    return created_questions


class Command(BaseCommand):
    help = "Carga 10 preguntas base de cultura general para Trivia por empresa."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            help="Sembrar preguntas solo para una empresa especifica.",
        )
        parser.add_argument(
            "--set-name",
            type=str,
            default=DEFAULT_SET_NAME,
            help=f"Nombre del QuestionSet destino (default: '{DEFAULT_SET_NAME}').",
        )

    def handle(self, *args, **options):
        company_id = options.get("company_id")
        set_name = (options.get("set_name") or DEFAULT_SET_NAME).strip() or DEFAULT_SET_NAME

        companies_qs = Company.objects.all().order_by("id")
        if company_id:
            companies_qs = companies_qs.filter(id=company_id)

        companies = list(companies_qs)
        if not companies:
            self.stdout.write(self.style.WARNING("No se encontraron empresas para procesar."))
            return

        total_created = 0
        for company in companies:
            question_set, _ = QuestionSet.objects.get_or_create(
                company=company,
                name=set_name,
                defaults={"is_active": True},
            )
            if not question_set.is_active:
                question_set.is_active = True
                question_set.save(update_fields=["is_active"])

            created_now = _seed_questions(question_set)
            total_created += created_now
            total_in_set = Question.objects.filter(
                question_set=question_set,
                is_active=True,
            ).count()
            self.stdout.write(
                self.style.SUCCESS(
                    f"[company_id={company.id}] set='{question_set.name}' "
                    f"+{created_now} preguntas (activas en set: {total_in_set})"
                )
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed finalizado. Preguntas creadas en esta ejecucion: {total_created}."
            )
        )
