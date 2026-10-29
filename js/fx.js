/*
  Efecto de hover: la imagen se inclina en 3D siguiendo el mouse
  y un reflejo de luz acompaña el cursor. Solo en equipos con mouse.
*/
(() => {
  const ok = window.matchMedia("(hover: hover)").matches &&
             !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!ok) return;

  let cur = null;
  const reset = (el) => {
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.classList.remove("is-tilting");
  };

  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest ? e.target.closest(".tilt") : null;
    if (el !== cur) { reset(cur); cur = el; }
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", ((0.5 - py) * 9).toFixed(2) + "deg");
    el.style.setProperty("--ry", ((px - 0.5) * 12).toFixed(2) + "deg");
    el.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
    el.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    el.classList.add("is-tilting");
  }, { passive: true });

  document.addEventListener("pointerout", (e) => {
    if (!e.relatedTarget) { reset(cur); cur = null; }
  });
})();
