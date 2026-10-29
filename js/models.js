/* Visor mixto GLB + FBX con clips de animacion.
   Compatible con Three.js r160 definido en index.html.
   Sustituye solamente js/models.js; respeta models-data.js y site-config.js. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
/* ---------- Referencias DOM ---------- */
const $ = (id) => document.getElementById(id);
const grid = $("modelsGrid");
const emptyBox = $("modelsEmpty");
const countEl = $("modelsCount");
const filtersEl = $("modelFilters");
const localInput = $("localFbx");
const modal = $("modelModal");
const host = $("modelCanvasHost");
const loadingEl = $("modelLoading");
const progressEl = $("modelProgress");
const loadingText = $("modelLoadingText");
// Acepta tanto `const MODELS_3D = [...]` como `window.MODELS_3D = [...]`.
const modelsData = typeof MODELS_3D !== "undefined" ? MODELS_3D : window.MODELS_3D;
const MODELS = Array.isArray(modelsData) ? modelsData : [];
// Optionally specify `format: "glb"` or `format: "fbx"` in models-data.js.
// Useful for blob: URLs when previewing a file from your computer.
function getFormat(model) {
  const explicit = String(model.format || "").toLowerCase().replace(/^\./, "");
  if (explicit) return explicit;
  const url = String(model.file || "").split(/[?#]/)[0].toLowerCase();
  return url.endsWith(".glb") ? "glb" : url.endsWith(".fbx") ? "fbx" : "";
}
let activeCategory = "Todos";
const esc = (v = "") =>
  String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/* ============================================================
   GALERÍA
   ============================================================ */
function modelCard(model, index) {
  const thumb = model.thumb
    ? `<img src="${esc(model.thumb)}" alt="Vista previa de ${esc(model.title)}" loading="lazy" onerror="this.remove()" />`
    : "";
  return `
    <article class="model-card" tabindex="0" role="button" data-index="${index}"
             aria-label="Ver ${esc(model.title)} en 3D">
      <div class="model-thumb tilt">
        <div class="model-thumb-fallback">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 0v10m0 0L3 7m9 5 9-5m-9 5v10"/>
          </svg>
        </div>
        ${thumb}
        <span class="model-badge">3D</span>
        <span class="model-open">Ver en 3D</span>
      </div>
      <div class="model-card-body">
        <span class="model-cat">${esc(model.category || "Modelo")}</span>
        <h3>${esc(model.title)}</h3>
        <p>${esc(model.description || "")}</p>
        <div class="tags">
          ${(model.tags || []).map((t) => `<span>${esc(t)}</span>`).join("")}
        </div>
      </div>
    </article>`;
}
function renderFilters() {
  const cats = [...new Set(MODELS.map((m) => m.category).filter(Boolean))];
  if (cats.length < 2) {
    filtersEl.hidden = true;
    return;
  }
  filtersEl.hidden = false;
  filtersEl.innerHTML = ["Todos", ...cats]
    .map((c) => `<button class="tab ${c === activeCategory ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join("");
}
function renderGallery() {
  const list = MODELS.map((m, i) => ({ m, i })).filter(({ m }) => activeCategory === "Todos" || m.category === activeCategory);
  grid.innerHTML = list.map(({ m, i }) => modelCard(m, i)).join("");
  emptyBox.hidden = MODELS.length !== 0;
  grid.hidden = MODELS.length === 0;
  countEl.textContent = MODELS.length ? `${list.length} ${list.length === 1 ? "modelo" : "modelos"}` : "";
}
filtersEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  activeCategory = btn.dataset.cat;
  renderFilters();
  renderGallery();
});
grid.addEventListener("click", (e) => {
  const card = e.target.closest(".model-card");
  if (card) openModel(MODELS[Number(card.dataset.index)]);
});
grid.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".model-card");
  if (card) {
    e.preventDefault();
    openModel(MODELS[Number(card.dataset.index)]);
  }
});
/* ============================================================
   VISOR 3D (se crea la primera vez que se abre un modelo)
   ============================================================ */
let V = null;
function createViewer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  // Studio lighting for FBX and PBR GLB materials.
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(4, 7, 6);
  const fill = new THREE.DirectionalLight(0xbfd8ff, 1.05);
  fill.position.set(-5, 3, -2);
  scene.add(key, fill, new THREE.HemisphereLight(0xffffff, 0x5d6d85, 1.35));
  const gridHelper = new THREE.GridHelper(6, 24, 0x2c3a4a, 0x1a2430);
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.7;
  scene.add(gridHelper);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;
  controls.minDistance = 0.5;
  controls.maxDistance = 20;
  const clock = new THREE.Clock();
  V = {
    renderer, scene, camera, controls, clock,
    pivot: null, mixer: null, clips: [], activeClip: 0, paused: false,
    running: false, raf: 0,
    home: { pos: new THREE.Vector3(3, 2.2, 3.6), target: new THREE.Vector3(0, 0.9, 0) },
    viewMode: "textures", displayMeshes: [], edgeCache: new WeakMap(),
    token: 0, localUrl: null,
  };
  initViewModeTools();
  initAnimationTools();
  new ResizeObserver(resize).observe(host);
  resize();
}
function resize() {
  if (!V) return;
  const w = host.clientWidth || 1;
  const h = host.clientHeight || 1;
  V.renderer.setSize(w, h, false);
  V.renderer.domElement.style.width = "100%";
  V.renderer.domElement.style.height = "100%";
  V.camera.aspect = w / h;
  V.camera.updateProjectionMatrix();
}
function loop() {
  if (!V.running) return;
  V.raf = requestAnimationFrame(loop);
  const dt = V.clock.getDelta();
  if (V.mixer) V.mixer.update(dt);
  updateDeformedQuadEdges();
  V.controls.update();
  V.renderer.render(V.scene, V.camera);
}
function disposeCurrent() {
  if (!V.pivot) return;
  disposeViewModes();
  V.scene.remove(V.pivot);
  V.pivot.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      if (!m) return;
      Object.values(m).forEach((v) => v && v.isTexture && v.dispose());
      m.dispose();
    });
  });
  V.pivot = null;
  V.mixer?.stopAllAction();
  V.mixer = null;
  V.clips = [];
  V.activeClip = 0;
  V.paused = false;
  refreshAnimationTools();
}
/* ============================================================
   VISTAS: SOLIDO / MALLA CON QUADS VISUALES / TEXTURAS
   Estas funciones NO modifican el modelo ni sus clips de animacion.
   ============================================================ */
function initViewModeTools() {
  const wireButton = $("toolWire");
  if (!wireButton || $("toolSolid")) return;
  const solidButton = document.createElement("button");
  solidButton.id = "toolSolid";
  solidButton.type = "button";
  solidButton.textContent = "Sólido";
  solidButton.setAttribute("aria-pressed", "false");
  wireButton.parentNode.insertBefore(solidButton, wireButton);
  wireButton.textContent = "Malla";
  const texturesButton = document.createElement("button");
  texturesButton.id = "toolTextures";
  texturesButton.type = "button";
  texturesButton.textContent = "Texturas";
  texturesButton.setAttribute("aria-pressed", "true");
  wireButton.insertAdjacentElement("afterend", texturesButton);
  solidButton.addEventListener("click", () => V && setViewMode("solid"));
  texturesButton.addEventListener("click", () => V && setViewMode("textures"));
  // toolWire ya tiene su listener al final de este archivo.
  syncViewModeButtons();
}

function syncViewModeButtons() {
  if (!V) return;
  for (const [id, mode] of [
    ["toolSolid", "solid"], ["toolWire", "wire"], ["toolTextures", "textures"]
  ]) {
    const b = $(id);
    if (!b) continue;
    const selected = V.viewMode === mode;
    b.classList.toggle("active", selected);
    b.setAttribute("aria-pressed", String(selected));
  }
}

// GLB y FBX suelen venir triangulados. Empareja dos triangulos vecinos
// aproximadamente coplanares que formen un quad convexo; omite la diagonal
// compartida al dibujar lineas. NO cambia los triangulos/UV del modelo.
function buildQuadEdges(geometry) {
  const pos = geometry.getAttribute("position");
  if (!pos) return {geometry: new THREE.BufferGeometry(), source: new Uint32Array(0), pairs: 0};
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const extent = geometry.boundingBox.getSize(new THREE.Vector3());
  const tol = Math.max(extent.x, extent.y, extent.z, 0.0001) * 0.00001;
  const index = geometry.index;
  const nTris = Math.floor((index ? index.count : pos.count) / 3);
  const ids = new Int32Array(pos.count).fill(-1);
  const keys = new Map(), vertices = [], sources = [];
  function weld(vertex) {
    if (ids[vertex] >= 0) return ids[vertex];
    const x = pos.getX(vertex), y = pos.getY(vertex), z = pos.getZ(vertex);
    const key = [x,y,z].map(n => Math.round(n / tol)).join(",");
    let id = keys.get(key);
    if (id === undefined) {
      id = vertices.length;
      keys.set(key, id);
      vertices.push([x,y,z]);
      sources.push(vertex);
    }
    ids[vertex] = id;
    return id;
  }
  const tris = new Array(nTris), edges = new Map();
  const edgeKey = (a,b) => a < b ? `${a}/${b}` : `${b}/${a}`;
  function addEdge(a,b,t) {
    const key = edgeKey(a,b);
    const e = edges.get(key);
    if (!e) edges.set(key,{a:Math.min(a,b),b:Math.max(a,b),t0:t,t1:-1,multi:false});
    else if (e.t1 < 0) e.t1=t;
    else e.multi=true;
  }
  function normal(a,b,c) {
    const A=vertices[a],B=vertices[b],C=vertices[c];
    const ux=B[0]-A[0],uy=B[1]-A[1],uz=B[2]-A[2];
    const vx=C[0]-A[0],vy=C[1]-A[1],vz=C[2]-A[2];
    const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
    const len=Math.hypot(nx,ny,nz);
    return len>1e-12 ? [nx/len,ny/len,nz/len] : null;
  }
  for(let t=0;t<nTris;t++) {
    const a=weld(index ? index.getX(3*t) : 3*t);
    const b=weld(index ? index.getX(3*t+1) : 3*t+1);
    const c=weld(index ? index.getX(3*t+2) : 3*t+2);
    if(a===b||b===c||c===a) continue;
    const n=normal(a,b,c);
    if(!n) continue;
    tris[t]={a,b,c,n};
    addEdge(a,b,t);addEdge(b,c,t);addEdge(c,a,t);
  }
  const candidates=[];
  for(const [key,e] of edges) {
    if(e.multi||e.t1<0) continue;
    const ta=tris[e.t0],tb=tris[e.t1];
    if(!ta||!tb) continue;
    const dot=ta.n[0]*tb.n[0]+ta.n[1]*tb.n[1]+ta.n[2]*tb.n[2];
    if(dot<0.965) continue; // conservar aristas duras
    const a=[ta.a,ta.b,ta.c].find(v=>v!==e.a&&v!==e.b);
    const b=[tb.a,tb.b,tb.c].find(v=>v!==e.a&&v!==e.b);
    if(a===undefined||b===undefined||a===b) continue;
    const quad=[a,e.a,b,e.b];
    let sign=0,penalty=0,valid=true;
    for(let j=0;j<4;j++) {
      const prev=vertices[quad[(j+3)%4]];
      const cur=vertices[quad[j]],next=vertices[quad[(j+1)%4]];
      const ux=prev[0]-cur[0],uy=prev[1]-cur[1],uz=prev[2]-cur[2];
      const vx=next[0]-cur[0],vy=next[1]-cur[1],vz=next[2]-cur[2];
      const ul=Math.hypot(ux,uy,uz),vl=Math.hypot(vx,vy,vz);
      if(ul<1e-10||vl<1e-10){valid=false;break;}
      const cos=(ux*vx+uy*vy+uz*vz)/(ul*vl);
      if(Math.abs(cos)>0.96){valid=false;break;}
      penalty+=Math.abs(cos);
      const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
      const oriented=cx*ta.n[0]+cy*ta.n[1]+cz*ta.n[2];
      if(Math.abs(oriented)<ul*vl*0.08){valid=false;break;}
      const side=Math.sign(oriented);
      if(sign&&side!==sign){valid=false;break;}
      sign=side;
    }
    if(valid) candidates.push({key,t0:e.t0,t1:e.t1,score:(1-dot)*4+penalty*.10});
  }
  candidates.sort((a,b)=>a.score-b.score);
  const matched=new Uint8Array(nTris), internal=new Set();
  for(const c of candidates) {
    if(matched[c.t0]||matched[c.t1]) continue;
    matched[c.t0]=1;matched[c.t1]=1;internal.add(c.key);
  }
  const values=[],source=[];
  for(const [key,e] of edges) {
    if(internal.has(key)) continue;
    const a=vertices[e.a],b=vertices[e.b];
    values.push(...a,...b);
    source.push(sources[e.a],sources[e.b]);
  }
  const lines=new THREE.BufferGeometry();
  lines.setAttribute("position",new THREE.Float32BufferAttribute(values,3));
  return {geometry:lines,source:new Uint32Array(source),pairs:internal.size};
}

function prepareDisplayMeshes(root) {
  V.displayMeshes = [];
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.geometry) return;
    const original=mesh.material;
    const originals=Array.isArray(original)?original:[original];
    const makeSolid=mat => {
      const basic=new THREE.MeshStandardMaterial({
        color:0xe1e7f4,metalness:0,roughness:0.93,flatShading:true,
        side:mat?.side ?? THREE.FrontSide,
        transparent:Boolean(mat?.transparent),opacity:mat?.opacity ?? 1,
        alphaMap:mat?.alphaMap || (mat?.alphaTest ? mat.map : null),
        alphaTest:mat?.alphaTest || 0,
        depthWrite:mat?.depthWrite ?? true,
      });
      return basic;
    };
    const solids=originals.map(makeSolid);
    const solid=Array.isArray(original)?solids:solids[0];
    V.displayMeshes.push({mesh,original,solid,solidMaterials:solids,edges:null});
  });
}

function ensureQuadOverlay(entry) {
  if(entry.edges) return;
  let result=V.edgeCache.get(entry.mesh.geometry);
  if(!result){
    result=buildQuadEdges(entry.mesh.geometry);
    V.edgeCache.set(entry.mesh.geometry,result);
  }
  const material=new THREE.LineBasicMaterial({
    color:0x192d4b,transparent:true,opacity:0.58,
    depthTest:true,depthWrite:false,toneMapped:false
  });
  const lines=new THREE.LineSegments(result.geometry,material);
  lines.name="Quad lines (visual reconstruction)";
  lines.renderOrder=5;
  lines.frustumCulled=false;
  entry.mesh.add(lines); // sigue traslacion / rotacion / escala animada
  entry.edges={lines,material,source:result.source,
    dynamic:Boolean(entry.mesh.isSkinnedMesh || entry.mesh.morphTargetInfluences?.length)};
}

function updateDeformedQuadEdges() {
  if(!V || V.viewMode==="textures" || !V.displayMeshes.length) return;
  // Los bordes normales siguen los transform de los huesos/objetos al ser hijos.
  // Para morphs y skinned mesh recalculamos los extremos cuando sea posible.
  const temp=new THREE.Vector3();
  for(const entry of V.displayMeshes) {
    const e=entry.edges;
    if(!e?.dynamic || !e.lines.visible || typeof entry.mesh.getVertexPosition!=="function") continue;
    // No modificar geometria compartida en el cache: cada skinned mesh
    // necesita una copia de su propia geometria animada.
    if(!e.owned) {
      e.lines.geometry=e.lines.geometry.clone();
      e.owned=true;
    }
    const attr=e.lines.geometry.getAttribute("position");
    for(let i=0;i<e.source.length;i++){
      entry.mesh.getVertexPosition(e.source[i],temp);
      attr.setXYZ(i,temp.x,temp.y,temp.z);
    }
    attr.needsUpdate=true;
  }
}

function setViewMode(mode) {
  if(!V) return;
  V.viewMode=["solid","wire","textures"].includes(mode)?mode:"textures";
  for(const entry of V.displayMeshes){
    const mesh=entry.mesh;
    mesh.material=V.viewMode==="solid"?entry.solid:entry.original;
    if(V.viewMode!=="textures") ensureQuadOverlay(entry);
    if(entry.edges){
      entry.edges.lines.visible=V.viewMode!=="textures";
      entry.edges.material.color.setHex(V.viewMode==="solid"?0x34496b:0xc6d4ed);
      entry.edges.material.opacity=V.viewMode==="solid"?0.58:0.8;
    }
  }
  syncViewModeButtons();
}

function disposeViewModes() {
  if (!V) return;
  for(const entry of V.displayMeshes) {
    entry.mesh.material=entry.original;
    if(entry.edges){
      entry.mesh.remove(entry.edges.lines);
      if(entry.edges.owned) entry.edges.lines.geometry.dispose();
      entry.edges.material.dispose();
    }
    for(const mat of entry.solidMaterials) mat.dispose();
  }
  // Cache geometries are unique to this model; clear them before original mesh disposal.
  // WeakMap is not iterable, so dispose each unique reference via mesh entries.
  const disposed=new Set();
  for(const entry of V.displayMeshes){
    const cached=V.edgeCache.get(entry.mesh.geometry);
    if(cached && !disposed.has(cached.geometry)){
      cached.geometry.dispose();disposed.add(cached.geometry);
    }
  }
  V.edgeCache=new WeakMap();
  V.displayMeshes=[];
}

function setRotate(on) {
  V.controls.autoRotate = on;
  const btn = $("toolRotate");
  btn.classList.toggle("active", on);
  btn.setAttribute("aria-pressed", String(on));
}
function resetView() {
  V.camera.position.copy(V.home.pos);
  V.controls.target.copy(V.home.target);
  V.controls.update();
}
function frameModel(object) {
  // Centra y escala tanto GLB como FBX (algunos FBX vienen en centimetros).
  const pivot = new THREE.Group();
  pivot.add(object);
  let box = new THREE.Box3().setFromObject(pivot);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const s = 2 / maxDim;
  pivot.scale.setScalar(s);
  pivot.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(pivot);
  const center = box.getCenter(new THREE.Vector3());
  pivot.position.set(-center.x, -box.min.y, -center.z);
  pivot.updateMatrixWorld(true);
  const h = size.y * s;
  V.home.target.set(0, h / 2, 0);
  const dist = 3.6;
  V.home.pos.set(dist * 0.75, h / 2 + dist * 0.35, dist * 0.85);
  return pivot;
}
function countTriangles(root) {
  let tris = 0;
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    tris += g.index ? g.index.count / 3 : (g.attributes.position?.count || 0) / 3;
  });
  return Math.round(tris);
}
const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
function setSpecs(model, tris) {
  const rows = [
    ["Software", model.software],
    ["Polígonos", model.polys || (tris ? `${fmt(tris)} tris` : "")],
    ["Año", model.year],
    ["Formato", getFormat(model).toUpperCase()],
    ["Animaciones", V?.clips?.length ? `${V.clips.length} clip(s)` : ""],
  ].filter(([, v]) => v);
  $("modelSpecs").innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
}
function showLoading(text, pct) {
  loadingEl.hidden = false;
  loadingEl.classList.remove("error");
  loadingText.textContent = text;
  progressEl.style.width = `${pct ?? 8}%`;
}
function showError(text) {
  loadingEl.hidden = false;
  loadingEl.classList.add("error");
  loadingText.textContent = text;
  progressEl.style.width = "0%";
}
// Controls are added inside the existing .model-tools bar (no HTML edits).
function initAnimationTools() {
  const tools = modal.querySelector(".model-tools");
  if (!tools || $("modelAnimationTools")) return;
  const ui = document.createElement("span");
  ui.id = "modelAnimationTools";
  ui.hidden = true;
  ui.innerHTML = `
    <label for="modelAnimClip" class="anim-label">Animacion:
      <select id="modelAnimClip" aria-label="Seleccionar animacion"></select>
    </label>
    <button type="button" id="modelAnimPlay" aria-pressed="true">Pausar</button>
    <label for="modelAnimSpeed" class="anim-label">Velocidad:
      <select id="modelAnimSpeed" aria-label="Velocidad de animacion">
        <option value="0.5">0.5x</option>
        <option value="1" selected>1x</option>
        <option value="1.5">1.5x</option>
        <option value="2">2x</option>
      </select>
    </label>`;
  tools.appendChild(ui);
  $("modelAnimClip").addEventListener("change", (e) => playClip(Number(e.target.value)));
  $("modelAnimPlay").addEventListener("click", () => {
    if (!V?.mixer) return;
    V.paused = !V.paused;
    V.mixer.timeScale = V.paused ? 0 : Number($("modelAnimSpeed").value);
    refreshAnimationTools();
  });
  $("modelAnimSpeed").addEventListener("change", (e) => {
    if (V?.mixer && !V.paused) V.mixer.timeScale = Number(e.target.value);
  });
  // Small scoped style, so only js/models.js needs replacing.
  const css = document.createElement("style");
  css.textContent = `
    #modelAnimationTools {display:inline-flex;align-items:center;gap:7px;flex-wrap:wrap}
    #modelAnimationTools[hidden]{display:none!important}
    #modelAnimationTools .anim-label{display:inline-flex;gap:5px;align-items:center;
      font-size:12px;font-weight:600;color:#eee}
    #modelAnimationTools .anim-label[hidden]{display:none!important}
    #modelAnimationTools select {max-width:140px;padding:7px 6px;
      color:#f5f5f5;background:#22272e;border:1px solid #56606d;border-radius:4px}
  `;
  document.head.appendChild(css);
}
function refreshAnimationTools() {
  const ui = $("modelAnimationTools");
  if (!ui || !V) return;
  const hasClips = Boolean(V.mixer && V.clips.length);
  ui.hidden = !hasClips;
  if (!hasClips) return;
  const select = $("modelAnimClip");
  if (select.options.length !== V.clips.length ||
      [...select.options].some((opt,i) => opt.textContent !== clipLabel(V.clips[i],i))) {
    select.innerHTML = "";
    V.clips.forEach((clip,i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = clipLabel(clip,i);
      select.appendChild(opt);
    });
  }
  select.value = String(V.activeClip);
  select.hidden = V.clips.length < 2;
  select.parentElement.hidden = V.clips.length < 2;
  const btn = $("modelAnimPlay");
  btn.textContent = V.paused ? "Reproducir" : "Pausar";
  btn.setAttribute("aria-pressed", String(!V.paused));
}
function clipLabel(clip, i) {
  return clip.name?.trim() || `Animacion ${i + 1}`;
}
function playClip(i) {
  if (!V?.mixer || !V.clips[i]) return;
  V.mixer.stopAllAction();
  V.activeClip = i;
  V.mixer.clipAction(V.clips[i]).reset().play();
  V.mixer.timeScale = V.paused ? 0 : Number($("modelAnimSpeed")?.value || 1);
  refreshAnimationTools();
}
function clearLocalUrl() {
  if (V?.localUrl) {
    URL.revokeObjectURL(V.localUrl);
    V.localUrl = null;
  }
}
function loadModel(model) {
  const my = ++V.token;
  disposeCurrent();
  clearLocalUrl();
  if (model.local) V.localUrl = model.file;
  const format = getFormat(model);
  if (!["glb", "fbx"].includes(format)) {
    showError("Formato no compatible. Utiliza .glb o .fbx en models-data.js.");
    return;
  }
  showLoading(`Cargando ${format.toUpperCase()}...`, 8);
  // GLB -> glTF root scene and glTF animation clips.
  // FBX -> Group root and animations attached to that Group.
  const loader = format === "glb" ? new GLTFLoader() : new FBXLoader();
  if (model.resourcePath) loader.setResourcePath(model.resourcePath);
  loader.load(
    model.file,
    (result) => {
      if (my !== V.token) return;
      const root = format === "glb" ? result.scene : result;
      const clips = result.animations || [];
      if (!root) {
        showError("El archivo se cargo pero no contiene una escena 3D valida.");
        clearLocalUrl();
        return;
      }
      // --- Materiales FBX: conserva texturas, múltiples materiales y mapas normales. ---
      // No se modifican los materiales GLB ni las animaciones.
      if (format === "fbx") {
        root.traverse((child) => {
          if (!child.isMesh) return;

          const corregirMaterial = (oldMat) => {
            if (!oldMat) return oldMat;

            // Los materiales PBR actuales ya son compatibles: no reemplazarlos.
            if (oldMat.isMeshStandardMaterial || oldMat.isMeshPhysicalMaterial) {
              return oldMat;
            }

            // Convertir solamente Phong y Lambert, evitando perder propiedades
            // especiales de otros tipos de material.
            if (!oldMat.isMeshPhongMaterial && !oldMat.isMeshLambertMaterial) {
              return oldMat;
            }

            const colorMap = oldMat.map || null;
            if (colorMap) colorMap.colorSpace = THREE.SRGBColorSpace;

            return new THREE.MeshStandardMaterial({
              name: oldMat.name,
              color: oldMat.color ? oldMat.color.clone() : new THREE.Color(0xffffff),
              map: colorMap,
              normalMap: oldMat.normalMap || null,
              roughness: 0.75,
              metalness: 0.0,
              transparent: oldMat.transparent,
              opacity: oldMat.opacity,
              side: oldMat.side,
              alphaTest: oldMat.alphaTest || 0,
              alphaMap: oldMat.alphaMap || null,
              emissive: oldMat.emissive
                ? oldMat.emissive.clone()
                : new THREE.Color(0x000000),
              emissiveMap: oldMat.emissiveMap || null,
            });
          };

          child.material = Array.isArray(child.material)
            ? child.material.map(corregirMaterial)
            : corregirMaterial(child.material);

          child.castShadow = true;
          child.receiveShadow = true;
        });
      }
      // --- Fin corrección de materiales FBX. ---

      V.pivot = frameModel(root);
      V.scene.add(V.pivot);
      prepareDisplayMeshes(root);
      V.clips = clips;
      V.paused = false;
      $("modelAnimSpeed").value = "1";
      if (clips.length) {
        V.mixer = new THREE.AnimationMixer(root);
        playClip(0);
      } else {
        refreshAnimationTools();
      }
      setViewMode(V.viewMode);
      setSpecs(model, countTriangles(root));
      resetView();
      loadingEl.hidden = true;
      clearLocalUrl();
    },
    (event) => {
      if (my !== V.token || !event.lengthComputable || !event.total) return;
      const pct = Math.min(99, Math.max(8, Math.round(event.loaded / event.total * 100)));
      showLoading(`Cargando ${format.toUpperCase()}... ${pct}%`, pct);
    },
    (err) => {
      if (my !== V.token) return;
      console.error(`Error cargando ${format.toUpperCase()}:`, err);
      const message = format === "fbx"
        ? "No se pudo cargar el FBX. Revisa la ruta y las texturas; prueba exportar como GLB si usa materiales PBR."
        : "No se pudo cargar el GLB. Revisa la ruta y exporta glTF Binario sin Draco/Meshopt.";
      showError(message);
      clearLocalUrl();
    }
  );
}
/* ============================================================
   MODAL
   ============================================================ */
function openModel(model) {
  if (!model) return;
  if (!V) {
    try {
      createViewer();
    } catch (err) {
      console.error(err);
      alert("Tu navegador no soporta WebGL, necesario para ver el modelo 3D.");
      return;
    }
  }
  $("modelCategory").textContent = model.category || "Modelo 3D";
  $("modelTitle").textContent = model.title;
  $("modelDesc").textContent = model.description || "";
  $("modelTags").innerHTML = (model.tags || []).map((t) => `<span>${esc(t)}</span>`).join("");
  setSpecs(model, 0);
  const dl = $("modelDownload");
  dl.hidden = !(model.download && !model.local);
  if (!dl.hidden) {
    dl.href = model.file;
    dl.textContent = `Descargar ${getFormat(model).toUpperCase()}`;
  }
  modal.hidden = false;
  document.body.classList.add("modal-open");
  resize();
  setRotate(true);
  setViewMode("textures");
  V.running = true;
  V.clock.getDelta();
  loop();
  loadModel(model);
  modal.querySelector(".model-close").focus();
}
function closeModal() {
  if (modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
  if (V) {
    V.token++;
    V.running = false;
    cancelAnimationFrame(V.raf);
    disposeCurrent();
    clearLocalUrl();
  }
}
modal.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});
$("toolRotate").addEventListener("click", () => V && setRotate(!V.controls.autoRotate));
$("toolWire").addEventListener("click", () => V && setViewMode("wire"));
$("toolReset").addEventListener("click", () => V && resetView());
/* ---------- Probar GLB o FBX local (solo en el navegador) ---------- */
localInput.accept = ".fbx,.glb";
const localLabel = localInput.closest("label");
if (localLabel) {
  localLabel.title = "Previsualiza GLB o FBX de tu computadora";
  const labelText = [...localLabel.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  if (labelText) labelText.textContent = " Probar GLB / FBX local ";
}
localInput.addEventListener("change", () => {
  const file = localInput.files?.[0];
  if (!file) return;
  const format = file.name.split(".").pop().toLowerCase();
  if (!["glb", "fbx"].includes(format)) {
    alert("Selecciona un archivo .glb o .fbx");
    localInput.value = "";
    return;
  }
  openModel({
    title: file.name.replace(/\.(glb|fbx)$/i, ""),
    category: "Vista previa local",
    description: "Vista previa local: no se ha subido a la web. Para publicarlo, copia el archivo a models/ y registralo en js/models-data.js.",
    software: "",
    file: URL.createObjectURL(file),
    format,
    local: true,
    tags: [],
  });
  localInput.value = "";
});
/* ---------- init ---------- */
renderFilters();
renderGallery();
if (!MODELS.length) {
  console.info("Modelos 3D: aún no hay modelos. Agrega tus .glb o .fbx en models/ y regístralos en js/models-data.js");
}
// Botón de prueba solo visible con  index.html?preview
if (new URLSearchParams(location.search).has("preview")) {
  localInput.closest("label").hidden = false;
}
