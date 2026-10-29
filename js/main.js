const $ = (id) => document.getElementById(id);

const featuredGrid = $("featuredGrid");
const listEl = $("projectsList");
const listHead = $("listHead");
const tabsEl = $("filterButtons");
const countEl = $("resultsCount");
const emptyEl = $("emptyState");
const showcaseEl = $("showcaseList");

let activeFilter = "Todos";

const esc = (v = "") =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const getDomain = (url) => new URL(url).hostname.replace("www.", "");

/* Vistas previas: se intenta con 3 servicios; si todos fallan queda la portada gráfica */
const previewA = (url) => `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1200`;
const previewB = (url) => `https://image.thum.io/get/width/1200/crop/675/noanimate/${url}`;
const previewC = (url) => `https://mini.s-shot.ru/1366x768/JPEG/1366/Z100/?${url}`;

function frame(project, withChrome, tilt = false) {
  return `
    <a class="frame${tilt ? " tilt" : ""}" href="${esc(project.url)}" target="_blank" rel="noopener noreferrer"
       aria-label="Visitar ${esc(project.name)} (se abre en una pestaña nueva)" tabindex="-1">
      ${withChrome ? `<span class="chrome"><i></i><i></i><i></i><b>${esc(getDomain(project.url))}</b></span>` : ""}
      <span class="frame-fallback"><b>${esc(project.code)}</b><em>${esc(project.name)}</em></span>
      <img class="preview-image"
           src="${previewA(project.url)}" data-step="1"
           data-b="${previewB(project.url)}" data-c="${previewC(project.url)}"
           alt="Vista previa de ${esc(project.name)}" loading="lazy" referrerpolicy="no-referrer" />
    </a>`;
}

const participationList = (p) => p.participation.map((i) => `<li>${esc(i)}</li>`).join("");
const tagList = (p) => p.tags.map((t) => `<span>${esc(t)}</span>`).join("");

function featureCard(p) {
  return `
    <article class="feature">
      ${frame(p, true, true)}
      <div class="feature-body">
        <div class="feature-title">
          <h3>${esc(p.name)}</h3>
          <span class="domain">${esc(getDomain(p.url))}</span>
        </div>
        <p class="feature-desc">${esc(p.description)}</p>
        <h4>Mi participación</h4>
        <ul class="part-list">${participationList(p)}</ul>
        <div class="feature-foot">
          <div class="tags">${tagList(p)}</div>
          <a class="link-ext" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Visitar sitio</a>
        </div>
      </div>
    </article>`;
}

function rowCard(p) {
  return `
    <article class="row">
      ${frame(p, false)}
      <div class="row-main">
        <h3>${esc(p.name)}</h3>
        <span class="domain">${esc(getDomain(p.url))}</span>
        <p>${esc(p.description)}</p>
      </div>
      <ul class="part-list">${participationList(p)}</ul>
      <div class="tags">${tagList(p)}</div>
      <a class="link-ext" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer"
         aria-label="Visitar ${esc(p.name)}">Visitar</a>
    </article>`;
}

function showcaseCard(p, i) {
  return `
    <article class="showcase" style="--i:${i}">
      <div class="showcase-media">${frame(p, true, true)}</div>
      <div class="showcase-body">
        <h3>${esc(p.name)}</h3>
        <span class="domain">${esc(getDomain(p.url))}</span>
        <p class="showcase-desc">${esc(p.description)}</p>
        <h4>Mi participación</h4>
        <ul class="part-list">${participationList(p)}</ul>
        <div class="feature-foot">
          <div class="tags">${tagList(p)}</div>
          <a class="link-ext" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Visitar sitio</a>
        </div>
      </div>
    </article>`;
}

function setupPreviewFallbacks(root) {
  root.querySelectorAll(".preview-image").forEach((img) => {
    img.addEventListener("error", function () {
      const step = this.dataset.step;
      if (step === "1") { this.dataset.step = "2"; this.src = this.dataset.b; return; }
      if (step === "2") { this.dataset.step = "3"; this.src = this.dataset.c; return; }
      this.style.display = "none";
    });
  });
}

function renderTabs() {
  const cats = ["Todos", ...new Set(PROJECTS.map((p) => p.category))];
  tabsEl.innerHTML = cats
    .map((c) => `<button class="tab ${c === activeFilter ? "active" : ""}" role="tab" aria-selected="${c === activeFilter}" data-filter="${esc(c)}">${esc(c)}</button>`)
    .join("");
}

function renderProjects() {
  const filtered = PROJECTS.filter((p) => activeFilter === "Todos" || p.category === activeFilter);
  const showcase = activeFilter !== "Todos";   // un sector elegido se muestra en grande
  const feat = filtered.filter((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured);

  featuredGrid.innerHTML = showcase ? "" : feat.map(featureCard).join("");
  featuredGrid.hidden = showcase || feat.length === 0;
  listEl.innerHTML = showcase ? "" : rest.map(rowCard).join("");
  listEl.hidden = showcase;
  listHead.hidden = showcase || rest.length === 0;
  showcaseEl.innerHTML = showcase ? filtered.map(showcaseCard).join("") : "";
  showcaseEl.hidden = !showcase;

  [featuredGrid, listEl, showcaseEl].forEach(setupPreviewFallbacks);

  countEl.textContent = `${filtered.length} ${filtered.length === 1 ? "proyecto" : "proyectos"}`;
  emptyEl.hidden = filtered.length !== 0;
}

tabsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  activeFilter = btn.dataset.filter;
  renderTabs();
  renderProjects();
});

/* ---------- Contacto (se alimenta de js/site-config.js) ---------- */
function setupContact() {
  const c = window.SITE || {};
  const section = $("contacto");
  const links = [];
  if (c.whatsapp) links.push({ label: "WhatsApp", href: `https://wa.me/${String(c.whatsapp).replace(/\D/g, "")}` });
  if (c.linkedin) links.push({ label: "LinkedIn", href: c.linkedin });
  if (c.behance) links.push({ label: "Behance", href: c.behance });
  if (c.github) links.push({ label: "GitHub", href: c.github });

  if (!c.email && !links.length) return; // sin datos: la sección sigue oculta

  section.hidden = false;
  $("headerContact").hidden = false;

  const main = $("contactMain");
  if (c.email) {
    main.textContent = c.email;
    main.href = `mailto:${c.email}`;
  } else {
    main.hidden = true;
  }
  $("contactLinks").innerHTML = links
    .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`)
    .join("");
}

/* ---------- Menú móvil ---------- */
const navToggle = $("navToggle");
const mainNav = $("mainNav");

function setNav(open) {
  mainNav.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
}
navToggle.addEventListener("click", () => setNav(!mainNav.classList.contains("open")));
mainNav.addEventListener("click", (e) => { if (e.target.closest("a")) setNav(false); });

/* ---------- init ---------- */
$("year").textContent = `© ${new Date().getFullYear()}`;
renderTabs();
renderProjects();
setupContact();
