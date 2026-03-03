import copy
import json
from pathlib import Path

from .default_questions import DEFAULT_QUESTIONS
from .image_store import list_image_keys

DATA_DIR = Path(__file__).resolve().parent / "data"
QUESTIONS_FILE = DATA_DIR / "questions.json"


def _ensure_seed_file() -> None:
    """Crea archivo de preguntas con defaults si no existe."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not QUESTIONS_FILE.exists():
        QUESTIONS_FILE.write_text(json.dumps(DEFAULT_QUESTIONS, ensure_ascii=False, indent=2), encoding="utf-8")


def _normalize_questions(questions: list[dict]) -> list[dict]:
    """Normaliza estructura y tipos del banco de preguntas."""
    normalized = []
    for question in questions:
        normalized.append(
            {
                "id": str(question["id"]),
                "type": str(question["type"]),
                "prompt": str(question["prompt"]),
                "questionImageKey": question.get("questionImageKey"),
                "correctAnswerId": str(question["correctAnswerId"]),
                "answers": [
                    {
                        "id": str(answer["id"]),
                        "label": str(answer["label"]),
                        "imageKey": answer.get("imageKey"),
                    }
                    for answer in question["answers"]
                ],
            }
        )
    return normalized


def validate_questions(questions: list[dict]) -> tuple[bool, str | None]:
    """Valida consistencia de ids, tipos, respuestas e imágenes."""
    if not isinstance(questions, list):
        return False, "Formato inválido para el banco de preguntas."

    if len(questions) == 0:
        return True, None

    available_image_keys = set(list_image_keys())

    question_ids = set()
    for question_index, question in enumerate(questions):
        question_label = f"pregunta {question_index + 1}"
        if question.get("id") in question_ids:
            return False, "Hay preguntas repetidas en el banco."
        question_ids.add(question.get("id"))

        question_type = question.get("type")
        if question_type not in {"image_answers", "text_answers"}:
            return False, f"El tipo de la {question_label} es inválido."

        if not question.get("prompt"):
            return False, f"La {question_label} debe tener enunciado."

        answers = question.get("answers")
        if not isinstance(answers, list) or len(answers) < 2:
            return False, f"La {question_label} debe tener al menos 2 respuestas."

        answer_ids = set()
        for answer in answers:
            answer_id = answer.get("id")
            if not answer_id:
                return False, f"Hay una respuesta inválida en la {question_label}."
            if answer_id in answer_ids:
                return False, f"Hay respuestas repetidas en la {question_label}."
            answer_ids.add(answer_id)

            if not answer.get("label"):
                return False, f"Hay una respuesta sin texto en la {question_label}."

            image_key = answer.get("imageKey")
            if question_type == "image_answers" and image_key not in available_image_keys:
                return False, f"Todas las respuestas con imagen de la {question_label} deben tener imagen válida."
            if image_key is not None and image_key not in available_image_keys:
                return False, f"Hay una imagen de respuesta inválida en la {question_label}."

        if question.get("correctAnswerId") not in answer_ids:
            return False, f"La respuesta correcta de la {question_label} no existe."

        question_image_key = question.get("questionImageKey")
        if question_image_key is not None and question_image_key not in available_image_keys:
            return False, f"La imagen de la {question_label} es inválida."

    return True, None


def load_questions() -> list[dict]:
    """Lee preguntas desde disco y las normaliza."""
    _ensure_seed_file()
    raw = QUESTIONS_FILE.read_text(encoding="utf-8")
    payload = json.loads(raw)
    return _normalize_questions(payload)


def save_questions(questions: list[dict]) -> list[dict]:
    """Valida y persiste el banco de preguntas."""
    normalized = _normalize_questions(questions)
    is_valid, error = validate_questions(normalized)
    if not is_valid:
        raise ValueError(error)

    QUESTIONS_FILE.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
    return normalized


def reset_questions() -> list[dict]:
    """Restaura preguntas por defecto."""
    return save_questions(copy.deepcopy(DEFAULT_QUESTIONS))
