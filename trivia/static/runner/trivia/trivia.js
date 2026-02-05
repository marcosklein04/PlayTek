// static/runner/trivia/trivia.js

function qsParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

const sessionId = qsParam("session_id");
const userId = qsParam("user_id");
const token = qsParam("session_token");

const questionText = document.getElementById("question-text");
const optionsBox = document.getElementById("options");
const messageBox = document.getElementById("message");
const progressBox = document.getElementById("progress");
const nextBtn = document.getElementById("next-btn");

let lastProgress = { score: 0, answered: 0, max_questions: 5 };

function setMsg(text, kind) {
  messageBox.textContent = text || "";
  messageBox.className = "msg" + (kind ? " " + kind : "");
}

async function fetchQuestion() {
  setMsg("", "");
  nextBtn.style.display = "none";
  optionsBox.innerHTML = "";
  questionText.textContent = "Cargando pregunta…";

  const url = `/runner/trivia/question?session_id=${sessionId}&user_id=${userId}&session_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    questionText.textContent = "No hay más preguntas.";
    setMsg(data.error || "Error", "bad");
    return;
  }

  const q = data.question;
  const p = data.progress;

  lastProgress = {
    score: p.score ?? 0,
    answered: p.answered ?? 0,
    max_questions: p.max_questions ?? 5,
  };

  questionText.textContent = q.text;
  progressBox.textContent = `${lastProgress.answered} / ${lastProgress.max_questions}`;

  q.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "opt";
    btn.textContent = opt;
    btn.onclick = () => sendAnswer(q.id, idx);
    optionsBox.appendChild(btn);
  });
}

async function sendAnswer(questionId, choiceIndex) {
  Array.from(document.querySelectorAll("button.opt")).forEach(b => (b.disabled = true));

  const res = await fetch("/runner/trivia/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      user_id: userId,
      session_token: token,
      question_id: questionId,
      choice_index: choiceIndex,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    setMsg(data.error || "Error", "bad");
    return;
  }

  setMsg(data.correct ? "¡Correcto!" : "Incorrecto", data.correct ? "ok" : "bad");

  // progress del server (source of truth)
  const p = data.progress || {};
  lastProgress = {
    score: p.score ?? lastProgress.score,
    answered: p.answered ?? lastProgress.answered,
    max_questions: p.max_questions ?? lastProgress.max_questions,
  };

  progressBox.textContent = `${lastProgress.answered} / ${lastProgress.max_questions}`;

  if (!p.done) {
    nextBtn.style.display = "inline-block";
  } else {
    // ✅ cerrar sesión runner
    await finishSession();
  }
}

async function finishSession() {
  // Armamos estado_cliente + result para persistir
  const currentState = await fetchRunnerSessionState();

    const estado_cliente = {...currentState,
    trivia: {
        ...(currentState.trivia || {}),
        score: lastProgress.score,
        answered: lastProgress.answered,
        max_questions: lastProgress.max_questions,
        finished: true
        }
    };

  const result = {
    game: "trivia",
    score: lastProgress.score,
    answered: lastProgress.answered,
    max_questions: lastProgress.max_questions,
  };

  const url = `/api/runner/sesiones/${sessionId}/finalizar`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      session_token: token,
      estado_cliente: estado_cliente,
      result: result,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // si falla, al menos informamos pero el juego “terminó”
    setMsg((data && data.error) ? `${data.error} (no se pudo cerrar sesión)` : "No se pudo cerrar sesión", "bad");
    return;
  }

  setMsg(`Trivia finalizada · Puntaje: ${lastProgress.score}/${lastProgress.max_questions}`, "ok");
  nextBtn.style.display = "none";
}

nextBtn.addEventListener("click", fetchQuestion);

// init
fetchQuestion();