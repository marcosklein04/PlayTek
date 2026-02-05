function setText(el, t) { if (el) el.textContent = t ?? ""; }

function getToken() {
  return localStorage.getItem("PLAYTEK_BEARER") || "";
}
function setToken(t) {
  localStorage.setItem("PLAYTEK_BEARER", t);
}
function clearToken() {
  localStorage.removeItem("PLAYTEK_BEARER");
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function gameCard(game) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <div class="title">${game.nombre}</div>
    <div class="desc">${game.descripcion || ""}</div>
    <div class="meta">
      <span>Slug: <b>${game.slug}</b></span>
      <span>Costo: <b>${game.costo_por_partida}</b> créditos</span>
    </div>
    <button class="btn" data-slug="${game.slug}">Iniciar</button>
    <div class="msg"></div>
  `;
  return div;
}

async function loadGames() {
  const grid = document.getElementById("games");
  setText(grid, "Cargando...");
  const { res, data } = await fetchJSON("/api/juegos");

  if (!res.ok) {
    setText(grid, "Error cargando juegos");
    return;
  }

  grid.textContent = "";
  (data.resultados || []).forEach((g) => {
    const card = gameCard(g);
    grid.appendChild(card);
  });

  grid.querySelectorAll("button[data-slug]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const slug = btn.getAttribute("data-slug");
      const card = btn.closest(".card");
      const msg = card.querySelector(".msg");

      const token = getToken().trim();
      if (!token) {
        setText(msg, "❌ Pegá y guardá un Bearer token primero.");
        return;
      }

      setText(msg, "Iniciando...");
      btn.disabled = true;

      const { res, data } = await fetchJSON(`/api/juegos/${slug}/iniciar`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      btn.disabled = false;

      if (!res.ok) {
        setText(msg, `❌ Error: ${data?.error || res.status}`);
        return;
      }

      // Redirige al runner
      const runnerUrl = data?.juego?.runner_url;
      if (!runnerUrl) {
        setText(msg, "❌ No vino runner_url");
        return;
      }
      window.location.href = runnerUrl;
    });
  });
}

function initTokenUI() {
  const input = document.getElementById("tokenInput");
  const status = document.getElementById("tokenStatus");
  const save = document.getElementById("saveToken");
  const clear = document.getElementById("clearToken");

  input.value = getToken();

  function refreshStatus() {
    const t = getToken();
    setText(status, t ? "✅ Token guardado" : "⚠️ Sin token");
  }

  save.addEventListener("click", () => {
    setToken(input.value.trim());
    refreshStatus();
  });

  clear.addEventListener("click", () => {
    clearToken();
    input.value = "";
    refreshStatus();
  });

  refreshStatus();
}

document.addEventListener("DOMContentLoaded", async () => {
  initTokenUI();
  await loadGames();
});