console.log("SESSION DATA:", typeof SESSION !== "undefined" ? SESSION : null);

function qs(params) {
  return new URLSearchParams(params).toString();
}

function setText(el, text) {
  if (el) el.textContent = text ?? "";
}

function normalizeLetter(value) {
  if (!value) return "";
  return value.trim().slice(0, 1).toUpperCase();
}

function isValidLetter(letter) {
  return /^[A-ZÑ]$/.test(letter);
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// --- Runner: obtener sesión ---
async function getSessionState() {
  const sessionId = SESSION?.sessionId;
  const userId = SESSION?.userId;
  const token = SESSION?.sessionToken;

  const url =
    `/runner/sesiones/${sessionId}?` +
    qs({ user_id: userId, session_token: token });

  const { res, data } = await fetchJSON(url);
  return { ok: res.ok, status: res.status, data };
}

// --- Runner: finalizar sesión ---
async function finishSession({ result = {}, estado_cliente = {} } = {}) {
  const sessionId = SESSION?.sessionId;
  const userId = Number(SESSION?.userId);
  const token = SESSION?.sessionToken;

  if (!sessionId || !userId || !token) {
    console.error("No hay SESSION completa para finalizar:", SESSION);
    return null;
  }

  const url = `/runner/sesiones/${sessionId}/finalizar`;
  const payload = {
    user_id: userId,
    session_token: token,
    result,
    estado_cliente,
  };

  const { res, data } = await fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Finish error:", res.status, data);
    return null;
  }

  return data;
}

// --- Hangman: palabra sticky por sesión ---
async function getWord() {
  const sessionId = SESSION?.sessionId;
  const userId = SESSION?.userId;
  const token = SESSION?.sessionToken;

  const url =
    `/runner/hangman/word?` +
    qs({ session_id: sessionId, user_id: userId, session_token: token });

  const { res, data } = await fetchJSON(url);
  return { ok: res.ok, status: res.status, data };
}

document.addEventListener("DOMContentLoaded", async () => {
  const elHint = document.getElementById("hint");
  const elStatus = document.getElementById("statusMsg");
  const elWord = document.getElementById("word");
  const elWrong = document.getElementById("wrong");
  const elLives = document.getElementById("lives");
  const elDebug = document.getElementById("debug"); // opcional

  const input = document.getElementById("inputLetter");
  const btnGuess = document.getElementById("btnGuess");
  const btnRestart = document.getElementById("btnRestart");

  // 1) Validación de DOM
  const missing = [];
  if (!elHint) missing.push("#hint");
  if (!elStatus) missing.push("#statusMsg");
  if (!elWord) missing.push("#word");
  if (!elWrong) missing.push("#wrong");
  if (!elLives) missing.push("#lives");
  if (!input) missing.push("#inputLetter");
  if (!btnGuess) missing.push("#btnGuess");
  if (!btnRestart) missing.push("#btnRestart");

  if (missing.length) {
    console.error("Faltan elementos en HTML:", missing.join(", "));
    alert("Error: faltan elementos en el HTML: " + missing.join(", "));
    return;
  }

  // 2) Validación de SESSION
  if (
    typeof SESSION === "undefined" ||
    !SESSION?.sessionId ||
    !SESSION?.sessionToken ||
    !SESSION?.userId
  ) {
    setText(elStatus, "❌ Sesión inválida. Volvé a iniciar el juego desde el catálogo.");
    btnGuess.disabled = true;
    btnRestart.disabled = true;
    input.disabled = true;
    return;
  }

  const MAX_MISTAKES = 6;

  let palabraSecreta = "";
  let hint = "";
  let guessed = new Set();
  let wrong = new Set();
  let sessionFinished = false;

  function render() {
    if (!palabraSecreta) {
      setText(elWord, "");
      setText(elWrong, "");
      setText(elLives, "");
      return;
    }

    const display = palabraSecreta
      .split("")
      .map((ch) => (guessed.has(ch) ? ch : "_"))
      .join(" ");

    setText(elWord, display);
    setText(elWrong, wrong.size ? `Mal: ${Array.from(wrong).join(", ")}` : "");
    setText(elLives, `${wrong.size}/${MAX_MISTAKES}`);

    const won = palabraSecreta.split("").every((ch) => guessed.has(ch));
    const lost = wrong.size >= MAX_MISTAKES;

    if (won) endGame("win");
    if (lost) endGame("lose");
  }

  async function endGame(outcome) {
    if (sessionFinished) return;
    sessionFinished = true;

    setText(
      elStatus,
      outcome === "win"
        ? "✅ ¡Ganaste! 🎉"
        : `❌ Perdiste. La palabra era: ${palabraSecreta}`
    );

    input.disabled = true;
    btnGuess.disabled = true;

    const result = {
      outcome,
      word: palabraSecreta,
      moves: guessed.size + wrong.size,
      mistakes: wrong.size,
    };

    const resp = await finishSession({
      result,
      estado_cliente: { finished: true, outcome },
    });

    // Debug opcional (si existe #debug)
    setText(elDebug, JSON.stringify(resp ?? { error: "finish_failed" }, null, 2));
  }

  async function init() {
    setText(elStatus, "Cargando…");
    btnGuess.disabled = true;
    input.disabled = true;
    btnRestart.disabled = true;

    // (A) Chequeo sesión
    const sess = await getSessionState();
    setText(elDebug, JSON.stringify(sess.data, null, 2));

    if (!sess.ok) {
      setText(elStatus, "❌ No se pudo validar la sesión. Reintentá desde el catálogo.");
      return;
    }

    const estado = sess.data?.sesion?.estado;
    if (estado !== "active") {
      setText(elStatus, "ℹ️ Esta partida ya terminó. Iniciá una nueva desde el catálogo.");
      btnRestart.disabled = false;
      return;
    }

    // (B) Palabra sticky
    const w = await getWord();
    if (!w.ok) {
      const err = w.data?.error || "error_desconocido";
      setText(elStatus, `❌ No se pudo cargar palabra (${err}).`);
      btnRestart.disabled = false;
      return;
    }

    palabraSecreta = String(w.data.word || "").toUpperCase();
    hint = String(w.data.hint || "");

    setText(elHint, hint ? `Pista: ${hint}` : "");
    setText(elStatus, "");

    guessed = new Set();
    wrong = new Set();
    sessionFinished = false;

    input.disabled = false;
    btnGuess.disabled = false;
    btnRestart.disabled = false;

    input.value = "";
    input.focus();

    render();
  }

  function guessLetter(letter) {
    if (sessionFinished) return;
    if (!isValidLetter(letter)) return;

    if (guessed.has(letter) || wrong.has(letter)) return;

    if (palabraSecreta.includes(letter)) guessed.add(letter);
    else wrong.add(letter);

    render();
  }

  btnGuess.addEventListener("click", () => {
    const letter = normalizeLetter(input.value);
    input.value = "";
    input.focus();
    guessLetter(letter);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnGuess.click();
  });

  // ✅ Reiniciar: volver al catálogo UI (no reload de la misma sesión)
  btnRestart.addEventListener("click", () => {
    window.location.href = "/juegos";
  });

  await init();
});