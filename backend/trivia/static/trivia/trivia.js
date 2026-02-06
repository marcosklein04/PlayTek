function qs(params) {
  return new URLSearchParams(params).toString();
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
}

function renderChoices(choices, onPick) {
  const wrap = document.getElementById("choices");
  wrap.innerHTML = "";
  choices.forEach((c) => {
    const btn = document.createElement("button");
    btn.textContent = c;
    btn.addEventListener("click", () => onPick(c));
    wrap.appendChild(btn);
  });
}

async function getNext() {
  const url = `/runner/trivia/next?` + qs({
    session_id: SESSION.sessionId,
    user_id: SESSION.userId,
    session_token: SESSION.sessionToken,
  });
  return fetchJSON(url);
}

async function postAnswer(answer) {
  const url = `/runner/trivia/answer`;
  const payload = {
    session_id: SESSION.sessionId,
    user_id: Number(SESSION.userId),
    session_token: SESSION.sessionToken,
    answer,
  };
  return fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!SESSION?.sessionId || !SESSION?.userId || !SESSION?.sessionToken) {
    setText("status", "❌ Sesión inválida. Volvé a iniciar desde el catálogo.");
    return;
  }

  const btnNext = document.getElementById("btnNext");

  async function loadQuestion() {
    setText("status", "Cargando…");
    const { res, data } = await getNext();
    if (!res.ok) {
      setText("status", `❌ Error: ${data?.error || res.status}`);
      return;
    }

    const q = data.question;
    setText("status", "");
    setText("questionText", q.text);

    renderChoices(q.choices, async (pick) => {
      setText("status", "Validando…");
      const r = await postAnswer(pick);
      if (!r.res.ok) {
        setText("status", `❌ Error respuesta: ${r.data?.error || r.res.status}`);
        return;
      }
      setText("status", r.data.correct ? `✅ Correcto (score ${r.data.score})` : `❌ Incorrecto (score ${r.data.score})`);
    });
  }

  btnNext.addEventListener("click", loadQuestion);

  await loadQuestion();
});