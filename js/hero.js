/*
  HERO v3 - modelo del arma incluido en este archivo.
  Hero: modelo 3D integrado al fondo (canvas 2D, sin librerías).
  Incluye sombreado con bordes rosa/azul,
  órbitas, anotaciones con datos reales de la malla y un fondo de líneas en movimiento.
  Arrastra para girar. El botón alterna entre sólido y malla.
  Si el equipo va lento, baja solo la calidad (modo ligero).
*/
(() => {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // La misma ruta GLB alimenta las tres vistas. La malla antigua solo sirve
  // como respaldo mientras termina la carga o si el GLB no se encuentra.
  init(window.HERO_MESH || embeddedMesh());

  function init(HM) {
    const D = 4.4;
    const INK = "14,26,43";
    const SEL = "255,122,26";
    const LO = [120, 134, 176], HI = [252, 252, 255];
    const PINK = [255, 92, 168], BLUE = [88, 128, 255];
    const fmt = (n) => n.toLocaleString("es").replace(/\u00a0/g, " ");
    const Lr = Math.hypot(-0.5, 0.8, 0.6), LX = -0.5 / Lr, LY = 0.8 / Lr, LZ = 0.6 / Lr;

    /* ---------- malla (arreglos planos) ---------- */
    let V0, N0, FI, fk;
    let usingModel = false;

    function accumulateNormals(nv, idx, k) {
      const n = new Float32Array(nv * 3);
      for (let f = 0; f < idx.length; f += k) {
        const a = idx[f] * 3, b = idx[f + 1] * 3, c = idx[f + 2] * 3, d = k === 4 ? idx[f + 3] * 3 : 0;
        let nx, ny, nz;
        if (k === 3) {
          const ux = V0[b] - V0[a], uy = V0[b + 1] - V0[a + 1], uz = V0[b + 2] - V0[a + 2];
          const wx = V0[c] - V0[a], wy = V0[c + 1] - V0[a + 1], wz = V0[c + 2] - V0[a + 2];
          nx = uy * wz - uz * wy; ny = uz * wx - ux * wz; nz = ux * wy - uy * wx;
        } else {
          const ux = V0[c] - V0[a], uy = V0[c + 1] - V0[a + 1], uz = V0[c + 2] - V0[a + 2];
          const wx = V0[d] - V0[b], wy = V0[d + 1] - V0[b + 1], wz = V0[d + 2] - V0[b + 2];
          nx = uy * wz - uz * wy; ny = uz * wx - ux * wz; nz = ux * wy - uy * wx;
        }
        for (let u = 0; u < k; u++) { const o = idx[f + u] * 3; n[o] += nx; n[o + 1] += ny; n[o + 2] += nz; }
      }
      for (let i = 0; i < n.length; i += 3) {
        const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
        n[i] /= l; n[i + 1] /= l; n[i + 2] /= l;
      }
      return n;
    }

    function fromHeroMesh(m) {
      const un = (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
      const pv = new Int16Array(un(m.v));
      V0 = new Float32Array(pv.length);
      for (let i = 0; i < pv.length; i++) V0[i] = pv[i] / m.s;
      FI = Uint32Array.from(new Uint16Array(un(m.t)));
      fk = 3;
      N0 = accumulateNormals(V0.length / 3, FI, 3);
    }

    function fallbackSphere() {
      const NU = 56, NV = 34, vs = [], fs = [];
      for (let j = 0; j <= NV; j++) {
        const v = (j / NV) * Math.PI;
        for (let i = 0; i < NU; i++) {
          const u = (i / NU) * Math.PI * 2;
          const r = 1 + 0.10 * Math.sin(2 * u + 3 * v) + 0.07 * Math.cos(3 * u - 2 * v + 1) + 0.05 * Math.sin(5 * v + u);
          vs.push(Math.sin(v) * Math.cos(u) * r, Math.cos(v) * r * 1.1, Math.sin(v) * Math.sin(u) * r);
        }
      }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
        const i2 = (i + 1) % NU;
        fs.push(j * NU + i, j * NU + i2, (j + 1) * NU + i2, (j + 1) * NU + i);
      }
      V0 = Float32Array.from(vs); FI = Uint32Array.from(fs); fk = 4;
      // orientar hacia afuera (la esfera es "estrellada": centro en el origen)
      for (let f = 0; f < FI.length; f += 4) {
        const a = FI[f] * 3, c = FI[f + 2] * 3, b = FI[f + 1] * 3, d = FI[f + 3] * 3;
        const ux = V0[c] - V0[a], uy = V0[c + 1] - V0[a + 1], uz = V0[c + 2] - V0[a + 2];
        const wx = V0[d] - V0[b], wy = V0[d + 1] - V0[b + 1], wz = V0[d + 2] - V0[b + 2];
        const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        const cx_ = V0[a] + V0[b] + V0[c] + V0[d], cy_ = V0[a + 1] + V0[b + 1] + V0[c + 1] + V0[d + 1], cz_ = V0[a + 2] + V0[b + 2] + V0[c + 2] + V0[d + 2];
        if (nx * cx_ + ny * cy_ + nz * cz_ < 0) { const t = FI[f + 1]; FI[f + 1] = FI[f + 3]; FI[f + 3] = t; }
      }
      N0 = accumulateNormals(V0.length / 3, FI, 4);
    }

    try {
      if (HM && HM.v && HM.t) { fromHeroMesh(HM); usingModel = true; }
    } catch (e) { console.warn("hero-mesh.js no se pudo leer; uso la esfera de respaldo", e); }
    if (!usingModel) fallbackSphere();

    let nV = V0.length / 3, nF = FI.length / fk;
    const isTri = fk === 3;
    let realVertexCount = nV, realTriangleCount = nF;
    canvas.setAttribute("data-modelo", usingModel ? "arma" : "esfera-respaldo");
    console.info(usingModel
      ? "Hero v3: modelo del arma cargado (" + nF.toLocaleString("es") + " triángulos)"
      : "Hero v3: usando la esfera de respaldo (no se pudo leer la malla)");
    let R = new Float32Array(nV * 3), P = new Float32Array(nV * 2), NDV = new Float32Array(nV);
    const COL = new Float32Array(nV * 3), FZ = new Float32Array(nF);
    const vis = new Uint32Array(nF), order = new Uint32Array(nF), BUCKETS = 2048, cnt = new Int32Array(BUCKETS + 1);

    /* ---------- estado ---------- */
    let yaw = usingModel ? 0.9 : 0.8, pitch = usingModel ? 0.18 : 0.3, mode = "solid", T = 0;
    let W = 0, H = 0, dpr = 1, dprCap = 1.5, f = 1, cx = 0, cy = 0, Rpx = 1;
    let dragging = false, lx = 0, ly = 0, visible = true, last = 0, lite = false;
    let cyw = 1, syw = 0, cp = 1, sp = 0;

    // UNA sola ruta para Sólido, Malla y Texturas y solido
    // Puedes cambiarla sin editar el archivo mediante window.HERO_GLB_URL.
    const GLB_URL = window.HERO_GLB_URL || "models/arma-hero.glb";
    const textureView = {
      ready: false, loading: false, renderer: null, scene: null,
      camera: null, model: null, button: null,
      THREE: null, materials: new Map()
    };

    // Tercer botón: los tres modos usan la misma geometría GLB.
    const switchBar = document.querySelector(".vp-switch");
    if (switchBar && !switchBar.querySelector('[data-mode="texture"]')) {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.mode = "texture";
      button.textContent = "Texturas";
      button.setAttribute("aria-pressed", "false");
      switchBar.appendChild(button);
      textureView.button = button;
    } else {
      textureView.button = switchBar?.querySelector('[data-mode="texture"]') || null;
    }

    function markMode() {
      document.querySelectorAll(".vp-switch button").forEach((btn) => {
        const on = btn.dataset.mode === mode;
        btn.classList.toggle("on", on);
        btn.setAttribute("aria-pressed", String(on));
      });
    }

    // Se carga al iniciar el hero. El mismo GLB sirve a los tres modos.
    // Las órbitas, cometas, marcadores y el arrastre siguen siendo canvas 2D.
    async function loadTextureGLB() {
      if (textureView.ready || textureView.loading) return;
      textureView.loading = true;
      if (textureView.button) {
        textureView.button.disabled = true;
        textureView.button.textContent = "Cargando GLB…";
      }
      try {
        const [THREE, { GLTFLoader }] = await Promise.all([
          import("three"),
          import("three/addons/loaders/GLTFLoader.js")
        ]);
        const gltf = await new GLTFLoader().loadAsync(GLB_URL);
        const glbScene = gltf.scene;
        if (!glbScene) throw new Error("El GLB no contiene una escena válida");
        glbScene.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(glbScene);
        if (box.isEmpty()) throw new Error("El GLB no contiene mallas visibles");
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        // Mantener las mismas proporciones de cámara que el modo Texturas previo.
        //const scale = 3.5 / Math.max(size.x, size.y, size.z);
        const isMobile = window.innerWidth <= 600;

        const scale = (isMobile ? 3.5 : 3) /Math.max(size.x, size.y, size.z);

        // Guardar un muestreo real del GLB para los puntos animados y los
        // indicadores. Los contadores corresponden a la geometría completa.
        syncGLBMarkers(THREE, glbScene, center, scale);
        glbScene.position.sub(center);
        const pivot3D = new THREE.Group();
        pivot3D.scale.setScalar(scale);
        pivot3D.rotation.order = "XYZ";
        pivot3D.add(glbScene);

        const glCanvas = document.createElement("canvas");
        const renderer3D = new THREE.WebGLRenderer({
          canvas: glCanvas, alpha: true, antialias: true,
          preserveDrawingBuffer: true
        });
        renderer3D.setClearColor(0x000000, 0);
        renderer3D.outputColorSpace = THREE.SRGBColorSpace;
        renderer3D.toneMapping = THREE.ACESFilmicToneMapping;
        renderer3D.toneMappingExposure = 1.25;
        const scene3D = new THREE.Scene();
        scene3D.add(pivot3D);
        scene3D.add(new THREE.HemisphereLight(0xffffff, 0x667fae, 2.0));
        const key = new THREE.DirectionalLight(0xffffff, 2.7);
        key.position.set(-3, 8, 10);
        scene3D.add(key);
        const fill = new THREE.DirectionalLight(0x92b5ff, 1.5);
        fill.position.set(4, 2, -6);
        scene3D.add(fill);
        const rose = new THREE.DirectionalLight(0xff85bd, 0.55);
        rose.position.set(-4, -1, 2);
        scene3D.add(rose);
        const camera3D = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
        camera3D.position.set(0, 0, D);
        camera3D.lookAt(0, 0, 0);

        textureView.renderer = renderer3D;
        textureView.scene = scene3D;
        textureView.camera = camera3D;
        textureView.model = pivot3D;
        textureView.THREE = THREE;
        textureView.materials.clear();
        // Estilo "Sólido" del hero original: tonos claros, ribete rosa/azul
        // de acuerdo con la normal y líneas trianguladas grises por encima.
        // Se utiliza el mismo GLB en las tres vistas sin modificar orbitas.
        const solidEdgeColor = 0x324064;
        const solidEdgeOpacity = 0.38;
        const edgeGeometryCache = new WeakMap();

        // QUADS VISUALES: el formato GLB contiene triangulos. Detectamos
        // parejas de triangulos contiguos que forman un cuadrilatero convexo,
        // con normales muy parecidas, y ocultamos SOLO la diagonal interior.
        // No se altera la geometria original, sus UV ni sus materiales PBR.
        function makeQuadStyleEdges(geometry) {
          const position = geometry.getAttribute('position');
          if (!position) return new THREE.BufferGeometry();
          if (!geometry.boundingBox) geometry.computeBoundingBox();
          const extent = geometry.boundingBox.getSize(new THREE.Vector3());
          const weldTolerance = Math.max(
            extent.x, extent.y, extent.z, 1e-4
          ) * 0.00001;

          const weldIds = new Int32Array(position.count).fill(-1);
          const byCoord = new Map();
          const verts = [];
          function weldedId(index) {
            if (weldIds[index] !== -1) return weldIds[index];
            const x = position.getX(index), y = position.getY(index), z = position.getZ(index);
            const key = [x, y, z].map(v => Math.round(v / weldTolerance)).join(',');
            let id = byCoord.get(key);
            if (id === undefined) {
              id = verts.length;
              verts.push([x, y, z]);
              byCoord.set(key, id);
            }
            weldIds[index] = id;
            return id;
          }

          const idx = geometry.index;
          const nTriangles = Math.floor((idx ? idx.count : position.count) / 3);
          const triangles = new Array(nTriangles);
          const edges = new Map();
          function edgeKey(a, b) { return a < b ? `${a}:${b}` : `${b}:${a}`; }
          function recordEdge(a, b, t) {
            const key = edgeKey(a, b);
            let e = edges.get(key);
            if (!e) {
              e = { a: Math.min(a,b), b: Math.max(a,b), t0: t, t1: -1, nonmanifold: false };
              edges.set(key,e);
            } else if (e.t1 === -1) e.t1 = t;
            else e.nonmanifold = true;
          }
          function crossNormal(a,b,c) {
            const A=verts[a], B=verts[b], C=verts[c];
            const ux=B[0]-A[0], uy=B[1]-A[1], uz=B[2]-A[2];
            const vx=C[0]-A[0], vy=C[1]-A[1], vz=C[2]-A[2];
            const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
            const length=Math.hypot(nx,ny,nz) || 1;
            return [nx/length,ny/length,nz/length];
          }
          for (let t=0;t<nTriangles;t++) {
            const a=weldedId(idx ? idx.getX(t*3)   : t*3);
            const b=weldedId(idx ? idx.getX(t*3+1) : t*3+1);
            const c=weldedId(idx ? idx.getX(t*3+2) : t*3+2);
            if (a===b || b===c || c===a) continue;
            triangles[t] = { a,b,c, normal:crossNormal(a,b,c) };
            recordEdge(a,b,t); recordEdge(b,c,t); recordEdge(c,a,t);
          }

          const candidates=[];
          for (const [key,e] of edges) {
            if (e.nonmanifold || e.t1<0) continue;
            const ta=triangles[e.t0], tb=triangles[e.t1];
            if (!ta || !tb) continue;
            const normalDot=ta.normal[0]*tb.normal[0]
              + ta.normal[1]*tb.normal[1]
              + ta.normal[2]*tb.normal[2];
            // No unir triángulos en pliegues o bordes duros.
            if (normalDot < 0.965) continue;
            const a=[ta.a,ta.b,ta.c].find(v=>v!==e.a && v!==e.b);
            const b=[tb.a,tb.b,tb.c].find(v=>v!==e.a && v!==e.b);
            if (a===undefined || b===undefined || a===b) continue;
            const quad=[a,e.a,b,e.b];
            let sign=0, anglePenalty=0, valid=true;
            for (let j=0;j<4;j++) {
              const prev=verts[quad[(j+3)%4]], cur=verts[quad[j]], next=verts[quad[(j+1)%4]];
              const ux=prev[0]-cur[0], uy=prev[1]-cur[1], uz=prev[2]-cur[2];
              const vx=next[0]-cur[0], vy=next[1]-cur[1], vz=next[2]-cur[2];
              const ul=Math.hypot(ux,uy,uz), vl=Math.hypot(vx,vy,vz);
              if (ul<1e-9 || vl<1e-9) { valid=false; break; }
              const cos=(ux*vx+uy*vy+uz*vz)/(ul*vl);
              // Cuadrilateros convexos sin esquinas excesivamente cerradas.
              if (Math.abs(cos)>0.96) { valid=false; break; }
              anglePenalty += Math.abs(cos);
              const crossx=uy*vz-uz*vy, crossy=uz*vx-ux*vz, crossz=ux*vy-uy*vx;
              const oriented=crossx*ta.normal[0]+crossy*ta.normal[1]+crossz*ta.normal[2];
              if (Math.abs(oriented)<ul*vl*.08) { valid=false; break; }
              const currentSign=Math.sign(oriented);
              if (sign && currentSign!==sign) { valid=false; break; }
              sign=currentSign;
            }
            if (!valid) continue;
            candidates.push({ key, t0:e.t0, t1:e.t1,
              score:(1-normalDot)*4 + anglePenalty*.10 });
          }
          candidates.sort((a,b)=>a.score-b.score);
          const assigned=new Uint8Array(nTriangles);
          const hiddenDiagonals=new Set();
          for (const c of candidates) {
            if (assigned[c.t0] || assigned[c.t1]) continue;
            assigned[c.t0]=1; assigned[c.t1]=1;
            hiddenDiagonals.add(c.key);
          }

          // Dibujar todos los bordes restantes: 4 aristas por quad reconstruido
          // y 3 para triángulos que no tengan pareja compatible.
          const linePositions=[];
          for (const [key,e] of edges) {
            if (hiddenDiagonals.has(key)) continue;
            const a=verts[e.a], b=verts[e.b];
            linePositions.push(a[0],a[1],a[2],b[0],b[1],b[2]);
          }
          const result=new THREE.BufferGeometry();
          result.setAttribute('position',new THREE.Float32BufferAttribute(linePositions,3));
          console.info('Hero Sólido · quads visuales:', hiddenDiagonals.size,
            'diagonales ocultadas de', nTriangles, 'triángulos');
          return result;
        }

        function createOriginalStyleSolid(oldMaterial) {
          const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: oldMaterial?.side ?? THREE.FrontSide,
            transparent: Boolean(oldMaterial?.transparent),
            opacity: oldMaterial?.opacity ?? 1,
            alphaTest: oldMaterial?.alphaTest || 0,
            // A diferencia de MeshStandardMaterial, evita blanquear el modelo
            // por las luces intensas usadas en el modo Texturas.
            toneMapped: false,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
          });
          // Reproduce el sombreado del primer hero (no el PBR de Blender).
          // Los chunks de THREE manejan correctamente skinning y morphs.
          mat.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
              '#include <common>',
              '#include <common>\nvarying vec3 vHeroNormal;\nvarying vec3 vHeroView;'
            );
            // MeshBasicMaterial no usa defaultnormal_vertex: calculamos
            // la normal de forma explicita (tambien para modelos con rig).
            shader.vertexShader = shader.vertexShader.replace(
              '#include <project_vertex>',
              `#include <project_vertex>
               vec3 heroObjectNormal = normal;
               #ifdef USE_SKINNING
                 mat4 heroBone = mat4(0.0);
                 heroBone += skinWeight.x * getBoneMatrix(skinIndex.x);
                 heroBone += skinWeight.y * getBoneMatrix(skinIndex.y);
                 heroBone += skinWeight.z * getBoneMatrix(skinIndex.z);
                 heroBone += skinWeight.w * getBoneMatrix(skinIndex.w);
                 heroObjectNormal = mat3(bindMatrixInverse * heroBone * bindMatrix) * heroObjectNormal;
               #endif
               vHeroNormal = normalize(normalMatrix * heroObjectNormal);
               vHeroView = -mvPosition.xyz;`
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <common>',
              '#include <common>\nvarying vec3 vHeroNormal;\nvarying vec3 vHeroView;'
            );
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <color_fragment>',
              `#include <color_fragment>
               vec3 heroN = normalize(vHeroNormal);
               vec3 heroV = normalize(vHeroView);
               float heroDiffuse = max(0.0, dot(heroN, normalize(vec3(-0.5, 0.8, 0.6))));
               float heroLight = 0.3 + 0.7 * pow(heroDiffuse, 0.8);
               vec3 heroBase = mix(vec3(120.0,134.0,176.0)/255.0,
                                   vec3(252.0,252.0,255.0)/255.0, heroLight);
               float heroRim = pow(1.0 - clamp(dot(heroN,heroV),0.0,1.0),2.4)*0.70;
               float heroSide = clamp((heroN.x+0.6)/1.2, 0.0, 1.0);
               vec3 heroAccent = mix(vec3(255.0,92.0,168.0)/255.0,
                                     vec3(88.0,128.0,255.0)/255.0, heroSide);
               vec3 heroDisplayColor = mix(heroBase,heroAccent,heroRim);
               // Los valores de referencia eran sRGB de canvas 2D.
               diffuseColor.rgb = pow(heroDisplayColor,vec3(2.2));`
            );
          };
          mat.customProgramCacheKey = () => 'hero-solid-original-style-v1';
          return mat;
        }
        glbScene.traverse((obj) => {
          if (!obj.isMesh) return;
          const originals = Array.isArray(obj.material) ? obj.material : [obj.material];
          const solid = originals.map(createOriginalStyleSolid);
          let edges = edgeGeometryCache.get(obj.geometry);
          if (!edges) {
            // Mantiene las aristas exteriores e intenta recuperar quads,
            // eliminando la diagonal interna de cada pareja compatible.
            edges = makeQuadStyleEdges(obj.geometry);
            edgeGeometryCache.set(obj.geometry, edges);
          }
          const edgeMaterial = new THREE.LineBasicMaterial({
            color: solidEdgeColor,
            transparent: true,
            opacity: solidEdgeOpacity,
            depthTest: true,
            depthWrite: false
          });
          const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
          edgeLines.name = 'Aristas quad - Solido y Malla';
          edgeLines.frustumCulled = false;
          edgeLines.renderOrder = 2;
          // Mantener la misma geometría, posición y rotación del objeto.
          obj.add(edgeLines);
          textureView.materials.set(obj, {
            originals,
            solid,
            // Malla: superficie muy tenue + aristas QUAD compartidas con Solido.
            // wireframe:true dibujaria otra vez las diagonales trianguladas.
            wire: originals.map(() => new THREE.MeshBasicMaterial({
              color: 0xeaf0fc, wireframe: false, transparent: true,
              opacity: 0.10, depthWrite: false, side: THREE.DoubleSide
            })),
            edgeLines
          });
        });
        textureView.ready = true;
        applyGLBMode();
        canvas.setAttribute("data-modelo", GLB_URL);
        markMode();
        draw();
        console.info("Hero: los tres modos usan", GLB_URL);
      } catch (err) {
        console.error("No se pudo cargar el GLB del hero:", GLB_URL, err);
        if (textureView.button) {
          textureView.button.title = "No se pudo cargar " + GLB_URL + ". Revisa la ruta y usa Live Server.";
        }
        // Ante un error se conserva el respaldo 2D, sin tocar las órbitas.
      } finally {
        textureView.loading = false;
        if (textureView.button) {
          textureView.button.disabled = false;
          textureView.button.textContent = "Texturas";
        }
      }
    }

    function applyGLBMode() {
      if (!textureView.ready) return;
      for (const [obj, mats] of textureView.materials) {
        const use = mode === "texture" ? mats.originals : mode === "wire" ? mats.wire : mats.solid;
        obj.material = use.length === 1 ? use[0] : use;
        // Malla usa las MISMAS aristas quad, con trazos mas visibles.
        // Texturas no dibuja lineas y conserva los materiales GLB originales.
        mats.edgeLines.visible = mode === "solid" || mode === "wire";
        mats.edgeLines.material.opacity = mode === "wire" ? 0.70 : 0.38;
        mats.edgeLines.material.color.setHex(mode === "wire" ? 0x34496f : 0x324064);
      }
    }

    function syncGLBMarkers(THREE, root, center, scale) {
      let totalVertices = 0, totalTriangles = 0;
      const meshes = [];
      root.traverse((obj) => {
        if (!obj.isMesh || !obj.geometry?.attributes?.position) return;
        const g = obj.geometry;
        totalVertices += g.attributes.position.count;
        totalTriangles += Math.floor((g.index?.count || g.attributes.position.count) / 3);
        meshes.push(obj);
      });
      const step = Math.max(1, Math.ceil(totalVertices / 5500));
      const positions = [], normals = [];
      const v = new THREE.Vector3();
      const normal = new THREE.Vector3();
      const normalMatrix = new THREE.Matrix3();
      for (const obj of meshes) {
        const position = obj.geometry.attributes.position;
        const attrNormal = obj.geometry.attributes.normal;
        normalMatrix.getNormalMatrix(obj.matrixWorld);
        for (let i=0; i<position.count; i+=step) {
          v.fromBufferAttribute(position,i).applyMatrix4(obj.matrixWorld).sub(center).multiplyScalar(scale);
          positions.push(v.x,v.y,v.z);
          if (attrNormal) {
            normal.fromBufferAttribute(attrNormal,i).applyMatrix3(normalMatrix).normalize();
          } else {
            normal.set(0,0,1);
          }
          normals.push(normal.x,normal.y,normal.z);
        }
      }
      if (!positions.length) return;
      V0 = Float32Array.from(positions);
      N0 = Float32Array.from(normals);
      nV = positions.length / 3;
      nF = totalTriangles;
      realVertexCount = totalVertices;
      realTriangleCount = totalTriangles;
      R = new Float32Array(nV*3);
      P = new Float32Array(nV*2);
      NDV = new Float32Array(nV);
      callouts[0].idx = callouts[1].idx = callouts[2].idx = -1;
    }

    function drawGLBTexture() {
      if (!textureView.ready) return;
      const { renderer, scene, camera, model } = textureView;
      // Los tres valores son los mismos que usa el lienzo original (canvas 2D).
      // Esto permite intercalar el GLB entre órbitas traseras y delanteras.
      renderer.setPixelRatio(1);
      if (renderer.domElement.width !== W || renderer.domElement.height !== H) {
        renderer.setSize(W, H, false);
      }
      camera.aspect = W / H;
      camera.fov = 2 * Math.atan(H / (2 * f)) * 180 / Math.PI;
      camera.updateProjectionMatrix();
      // Corrige el punto principal para que el GLB aparezca en (cx, cy).
      camera.projectionMatrix.elements[8] = (W / 2 - cx) * 2 / W;
      camera.projectionMatrix.elements[9] = (cy - H / 2) * 2 / H;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      model.rotation.set(pitch, yaw, 0, "XYZ");
      renderer.render(scene, camera);
      ctx.drawImage(renderer.domElement, 0, 0, W, H);
    }

    const setRot = () => { cyw = Math.cos(yaw); syw = Math.sin(yaw); cp = Math.cos(pitch); sp = Math.sin(pitch); };
    const rotP = (p) => [p[0], p[1] * cp - p[2] * sp, p[1] * sp + p[2] * cp];
    const proj = (p) => { const s = f / (D - p[2]); return [cx + p[0] * s, cy - p[1] * s]; };

    function layout() {
      const cw = W / dpr;
      if (cw >= 860) { cx = W * 0.68; cy = H * 0.52; Rpx = Math.min(0.24 * W, 0.46 * H); }
      else if (cw <= 600) {
        // MOVIL: dejar el arma debajo del texto y la fila de datos,
        // sin cambiar la posicion ni el zoom de escritorio/tablet.
        cx = W * 0.50;
        cy = H * 0.65 ;
        Rpx = Math.min(0.30 * W, 0.18 * H);
      }
      else { cx = W * 0.5; cy = H * 0.76; Rpx = Math.min(0.4 * W, 0.22 * H); }
      f = (Rpx * D) / 1.15;
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      W = canvas.width = Math.max(1, Math.round(r.width * dpr));
      H = canvas.height = Math.max(1, Math.round(r.height * dpr));
      layout();
      draw();
    }

    /* ---------- fondo: líneas en movimiento + regla ---------- */
    function drawWaves(t) {
      const rows = lite ? 14 : 22;
      ctx.lineWidth = dpr;
      for (let i = 0; i < rows; i++) {
        const yb = H * (0.05 + (0.9 * i) / (rows - 1));
        const a = i % 3 === 0 ? 0.2 : 0.1;
        ctx.strokeStyle = `rgba(40,70,190,${a})`;
        ctx.beginPath();
        for (let x = 0; x <= W + 14 * dpr; x += 14 * dpr) {
          const xn = x / W;
          const y = yb
            + Math.sin(xn * 5.2 + t * 0.45 + i * 0.34) * 18 * dpr * (0.4 + xn)
            + Math.sin(xn * 11 - t * 0.3 + i * 0.2) * 6 * dpr;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function drawRuler() {
      ctx.strokeStyle = `rgba(${INK},.28)`;
      ctx.lineWidth = dpr;
      ctx.beginPath();
      let k = 0;
      for (let x = 0; x <= W; x += 12 * dpr, k++) {
        ctx.moveTo(x, 0); ctx.lineTo(x, (k % 5 === 0 ? 11 : 5) * dpr);
      }
      ctx.stroke();
    }

    function drawHalo() {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rpx * 1.9);
      g.addColorStop(0, "rgba(255,255,255,.65)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    /* ---------- órbitas ---------- */
    const rings = [
      { rad: 1.95, tz: 0.0, tx: 0.14, spin: 0, ticks: true, dash: false, comet: { sp: 0.7, off: 0 } },
      { rad: 1.7, tz: 1.1, tx: 0.35, spin: 0.14, ticks: false, dash: false, comet: { sp: -0.55, off: 2 } },
      { rad: 2.25, tz: -0.55, tx: -0.2, spin: -0.09, ticks: true, dash: true, comet: null },
    ];
    function ringPt(th, rad, ring, t) {
      const x = rad * Math.cos(th), z = rad * Math.sin(th);
      const x1 = x * Math.cos(ring.tz), y1 = x * Math.sin(ring.tz);
      const y2 = y1 * Math.cos(ring.tx) - z * Math.sin(ring.tx);
      const z2 = y1 * Math.sin(ring.tx) + z * Math.cos(ring.tx);
      const sp_ = ring.spin * t, cs_ = Math.cos(sp_), ss = Math.sin(sp_);
      return rotP([x1 * cs_ + z2 * ss, y2, -x1 * ss + z2 * cs_]);
    }

    function drawRings(pass, t) {
      for (const ring of rings) {
        const pts = [];
        const n = lite ? 64 : 96;
        for (let k = 0; k <= n; k++) pts.push(ringPt((k / n) * Math.PI * 2, ring.rad, ring, t));
        ctx.lineWidth = dpr;
        ctx.setLineDash(ring.dash ? [5 * dpr, 7 * dpr] : []);
        ctx.strokeStyle = `rgba(${INK},${pass > 0 ? 0.5 : 0.2})`;
        ctx.beginPath();
        for (let k = 0; k < n; k++) {
          const a = pts[k], b = pts[k + 1];
          if (((a[2] + b[2]) / 2 > 0 ? 1 : -1) !== pass) continue;
          const pa = proj(a), pb = proj(b);
          ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        if (ring.ticks) {
          const dir = ring.spin < 0 ? -1 : 1;
          ctx.beginPath();
          for (let k = 0; k < 72; k++) {
            const th = (k / 72) * Math.PI * 2 + t * 0.03 * dir;
            const o = ringPt(th, ring.rad, ring, t);
            if ((o[2] > 0 ? 1 : -1) !== pass) continue;
            const i = ringPt(th, ring.rad - (k % 6 === 0 ? 0.11 : 0.05), ring, t);
            const po = proj(o), pi = proj(i);
            ctx.moveTo(po[0], po[1]); ctx.lineTo(pi[0], pi[1]);
          }
          ctx.stroke();
        }

        if (ring.comet) {
          const head = t * ring.comet.sp + ring.comet.off;
          const seg = 16;
          ctx.lineCap = "round";
          for (let s = 0; s < seg; s++) {
            const a = ringPt(head - s * 0.06, ring.rad, ring, t);
            const b = ringPt(head - (s + 1) * 0.06, ring.rad, ring, t);
            if (((a[2] + b[2]) / 2 > 0 ? 1 : -1) !== pass) continue;
            const pa = proj(a), pb = proj(b);
            ctx.strokeStyle = `rgba(${SEL},${(1 - s / seg) * 0.95})`;
            ctx.lineWidth = 2.6 * dpr;
            ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
          }
          ctx.lineCap = "butt";
          const h = ringPt(head, ring.rad, ring, t);
          if ((h[2] > 0 ? 1 : -1) === pass) {
            const ph = proj(h);
            ctx.fillStyle = `rgb(${SEL})`;
            ctx.beginPath(); ctx.arc(ph[0], ph[1], 3.6 * dpr, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }

    /* ---------- modelo ---------- */
    function drawModel() {
      // 1) transformar, proyectar y colorear cada vértice (sin reservar memoria por cuadro)
      for (let k = 0, i3 = 0, i2 = 0; k < nV; k++, i3 += 3, i2 += 2) {
        const x = V0[i3], y = V0[i3 + 1], z = V0[i3 + 2];
        const xr = x * cyw + z * syw, zr = -x * syw + z * cyw;
        const yr = y * cp - zr * sp, zz = y * sp + zr * cp;
        R[i3] = xr; R[i3 + 1] = yr; R[i3 + 2] = zz;
        const s = f / (D - zz);
        P[i2] = cx + xr * s; P[i2 + 1] = cy - yr * s;

        const nx0 = N0[i3], ny0 = N0[i3 + 1], nz0 = N0[i3 + 2];
        const nxr = nx0 * cyw + nz0 * syw, nzr = -nx0 * syw + nz0 * cyw;
        const nx = nxr, ny = ny0 * cp - nzr * sp, nz = ny0 * sp + nzr * cp;

        let vx = -xr, vy = -yr, vz = D - zz;
        const vl = Math.sqrt(vx * vx + vy * vy + vz * vz);
        let ndv = (nx * vx + ny * vy + nz * vz) / vl; if (ndv < 0) ndv = 0;
        NDV[k] = ndv;

        let diff = nx * LX + ny * LY + nz * LZ; if (diff < 0) diff = 0;
        const tt = 0.3 + 0.7 * Math.pow(diff, 0.8);
        const rim = Math.pow(1 - ndv, 2.4) * 0.7;
        let sd = (nx + 0.6) / 1.2; sd = sd < 0 ? 0 : sd > 1 ? 1 : sd;
        for (let c = 0; c < 3; c++) {
          const base = LO[c] + (HI[c] - LO[c]) * tt;
          const rc = PINK[c] + (BLUE[c] - PINK[c]) * sd;
          COL[i3 + c] = base + (rc - base) * rim;
        }
      }

      // Cuando el GLB está listo, las tres vistas se dibujan desde el GLB.
      // Este cálculo únicamente mantiene las anotaciones sobre su geometría.
      if (textureView.ready) return;

      // 2) caras visibles (se decide en pantalla: horario = de frente) y profundidad
      let nv = 0, zmin = 1e9, zmax = -1e9;
      for (let q = 0, o = 0; q < nF; q++, o += fk) {
        const a = FI[o], b = FI[o + 1], c = FI[o + 2];
        let area;
        if (isTri) {
          area = (P[b * 2] - P[a * 2]) * (P[c * 2 + 1] - P[a * 2 + 1]) - (P[b * 2 + 1] - P[a * 2 + 1]) * (P[c * 2] - P[a * 2]);
        } else {
          const d = FI[o + 3];
          area = (P[c * 2] - P[a * 2]) * (P[d * 2 + 1] - P[b * 2 + 1]) - (P[c * 2 + 1] - P[a * 2 + 1]) * (P[d * 2] - P[b * 2]);
        }
        if (area >= 0) continue;
        let z = R[a * 3 + 2] + R[b * 3 + 2] + R[c * 3 + 2];
        z = isTri ? z / 3 : (z + R[FI[o + 3] * 3 + 2]) / 4;
        FZ[q] = z; vis[nv++] = q;
        if (z < zmin) zmin = z; if (z > zmax) zmax = z;
      }

      // 3) ordenar de lejos a cerca (por cubetas, sin comparaciones)
      cnt.fill(0);
      const sc = (BUCKETS - 1) / ((zmax - zmin) || 1);
      for (let i = 0; i < nv; i++) cnt[((FZ[vis[i]] - zmin) * sc | 0) + 1]++;
      for (let i = 1; i <= BUCKETS; i++) cnt[i] += cnt[i - 1];
      for (let i = 0; i < nv; i++) { const b = (FZ[vis[i]] - zmin) * sc | 0; order[cnt[b]++] = vis[i]; }

      // 4) dibujar
      ctx.lineJoin = "round";
      const wire = mode === "wire";
      const strokeOn = wire || !lite;
      if (wire) {
        ctx.lineWidth = Math.max(1, dpr);
        ctx.strokeStyle = `rgba(${INK},.6)`;
        ctx.fillStyle = "rgba(236,240,252,.35)";
      } else {
        ctx.lineWidth = Math.max(0.8, dpr * 0.7);
        ctx.strokeStyle = isTri ? "rgba(50,62,100,.2)" : "rgba(50,62,100,.3)";
      }
      for (let i = 0; i < nv; i++) {
        const q = order[i], o = q * fk;
        const a = FI[o], b = FI[o + 1], c = FI[o + 2];
        ctx.beginPath();
        ctx.moveTo(P[a * 2], P[a * 2 + 1]);
        ctx.lineTo(P[b * 2], P[b * 2 + 1]);
        ctx.lineTo(P[c * 2], P[c * 2 + 1]);
        if (!isTri) { const d = FI[o + 3]; ctx.lineTo(P[d * 2], P[d * 2 + 1]); }
        ctx.closePath();
        if (!wire) {
          let r = COL[a * 3] + COL[b * 3] + COL[c * 3];
          let g = COL[a * 3 + 1] + COL[b * 3 + 1] + COL[c * 3 + 1];
          let bl = COL[a * 3 + 2] + COL[b * 3 + 2] + COL[c * 3 + 2];
          const k = isTri ? 3 : 4;
          if (!isTri) { const d = FI[o + 3] * 3; r += COL[d]; g += COL[d + 1]; bl += COL[d + 2]; }
          ctx.fillStyle = `rgb(${(r / k) | 0},${(g / k) | 0},${(bl / k) | 0})`;
        }
        ctx.fill();
        if (strokeOn) ctx.stroke();
      }
    }

    /* ---------- ficha compacta para movil ---------- */
    // En escritorio los datos siguen conectados al modelo mediante lineas.
    // En movil pasan a una fila HTML para no invadir el titulo ni el visor.
    const heroInner = document.querySelector(".hero-inner");
    const heroCopy = heroInner?.querySelector(".hero-copy");
    let mobileSpecs = null;
    if (heroCopy) {
      mobileSpecs = document.createElement("div");
      mobileSpecs.className = "hero-mobile-specs";
      mobileSpecs.setAttribute("aria-label", "Datos del modelo 3D");
      mobileSpecs.innerHTML = `
        <div class="hero-mobile-stat"><span>Vertices</span><strong data-hero-stat="vertices">--</strong></div>
        <div class="hero-mobile-stat"><span>Triangulos</span><strong data-hero-stat="triangles">--</strong></div>
        <div class="hero-mobile-stat"><span>Rotacion</span><strong data-hero-stat="rotation">--</strong></div>`;
      heroCopy.insertAdjacentElement("afterend", mobileSpecs);
    }
    const mobileStatsEls = mobileSpecs && {
      vertices: mobileSpecs.querySelector('[data-hero-stat="vertices"]'),
      triangles: mobileSpecs.querySelector('[data-hero-stat="triangles"]'),
      rotation: mobileSpecs.querySelector('[data-hero-stat="rotation"]')
    };
    function updateMobileStats() {
      if (!mobileStatsEls || W / dpr > 600) return;
      const rotation = `Y ${Math.round(((yaw * 180 / Math.PI) % 360 + 360) % 360)}°`;
      const values = {
        vertices: fmt(realVertexCount),
        triangles: fmt(realTriangleCount),
        rotation
      };
      for (const key of Object.keys(values)) {
        if (mobileStatsEls[key].textContent !== values[key]) {
          mobileStatsEls[key].textContent = values[key];
        }
      }
    }

    /* ---------- anotaciones (datos reales de la malla) ---------- */
    const callouts = [
      { title: "Vértices", val: () => fmt(realVertexCount), dir: [1, 1], idx: -1, born: 0 },
      { title: "Triángulos", val: () => fmt(realTriangleCount), dir: [1, 0.15], idx: -1, born: 0 },
      {
        title: "Rotación",
        val: () => {
          const yd = Math.round(((yaw * 180) / Math.PI) % 360 + 360) % 360;
          const xd = Math.round((pitch * 180) / Math.PI);
          return `Y ${yd}°  X ${xd}°`;
        },
        dir: [1, -1], idx: -1, born: 0,
      },
    ];
    let BW = 170;   // ancho real de las etiquetas (se mide en cada cuadro)

    function labelPos(i) {
      const x = W - 28 * dpr - BW * dpr;
      const y = [H * 0.17, H * 0.17 + 62 * dpr, H * 0.72][i];
      return [x, y];
    }

    function drawCallouts(t) {
      // Los indicadores con lineas son exclusivos de escritorio.
      // En movil se muestran abajo del texto, dentro del flujo normal.
      if (W / dpr <= 600) return;
      let mw = 0;
      ctx.font = `800 ${17 * dpr}px Archivo, system-ui, sans-serif`;
      callouts.forEach((co) => { mw = Math.max(mw, ctx.measureText(co.val()).width); });
      BW = Math.max(110, mw / dpr + 4);
      callouts.forEach((co, i) => {
        const [lxp, lyp] = labelPos(i);
        const px = lxp - 14 * dpr, py = lyp + 8 * dpr;
        if (Math.hypot(px - cx, py - cy) < Rpx * 1.15) return; // no tapar el modelo

        if (co.idx < 0 || NDV[co.idx] < 0.18) {
          let best = -1, bs = -1e9;
          for (let k = 0; k < nV; k++) {
            if (NDV[k] < 0.3) continue;
            const sc = R[k * 3] * co.dir[0] + R[k * 3 + 1] * co.dir[1];
            if (sc > bs) { bs = sc; best = k; }
          }
          co.idx = best; co.born = t;
        }
        const a = Math.min(1, (t - co.born) / 0.35);

        ctx.fillStyle = `rgb(${SEL})`;
        ctx.fillRect(lxp, lyp - 10 * dpr, 22 * dpr, 2 * dpr);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = `rgba(${INK},.62)`;
        ctx.font = `600 ${11.5 * dpr}px Archivo, system-ui, sans-serif`;
        ctx.fillText(co.title, lxp, lyp + 8 * dpr);
        ctx.fillStyle = `rgb(${INK})`;
        ctx.font = `800 ${17 * dpr}px Archivo, system-ui, sans-serif`;
        ctx.fillText(co.val(), lxp, lyp + 30 * dpr);

        if (co.idx < 0) return;
        const Ax = P[co.idx * 2], Ay = P[co.idx * 2 + 1];
        ctx.strokeStyle = `rgba(${INK},${0.55 * a})`;
        ctx.lineWidth = dpr;
        ctx.beginPath();
        ctx.moveTo(Ax, Ay);
        ctx.lineTo(px - 30 * dpr, py);
        ctx.lineTo(px, py);
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.strokeStyle = `rgba(${INK},${a})`;
        ctx.beginPath(); ctx.arc(Ax, Ay, 3.4 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const ph = (t * 1.1) % 1;
        ctx.strokeStyle = `rgba(${SEL},${(1 - ph) * 0.6 * a})`;
        ctx.beginPath(); ctx.arc(Ax, Ay, (3.4 + ph * 11) * dpr, 0, Math.PI * 2); ctx.stroke();
      });
    }

    /* ---------- frame ---------- */
    function draw() {
      if (!W) return;
      setRot();
      ctx.clearRect(0, 0, W, H);
      drawWaves(T);
      drawHalo();
      drawRings(-1, T);
      drawModel();
      if (textureView.ready) drawGLBTexture();
      drawRings(1, T);
      drawCallouts(T);
      updateMobileStats();
      drawRuler();
    }

    /* ---------- interacción ---------- */
    canvas.addEventListener("pointerdown", (e) => {
      dragging = true; lx = e.clientX; ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      yaw += (e.clientX - lx) * 0.01;
      pitch = Math.min(0.95, Math.max(-0.2, pitch + (e.clientY - ly) * 0.006));
      lx = e.clientX; ly = e.clientY;
      if (reduce) draw();
    });
    const endDrag = () => { dragging = false; canvas.style.cursor = ""; };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    document.querySelectorAll(".vp-switch button").forEach((btn) => {
      btn.addEventListener("click", () => {
        mode = btn.dataset.mode;
        markMode();
        applyGLBMode();
        if (!textureView.ready && !textureView.loading) loadTextureGLB();
        draw();
      });
    });

    /* ---------- animación + modo ligero automático ---------- */
    let ema = 16.7, slowFrames = 0;
    function tick(ms) {
      requestAnimationFrame(tick);
      if (!visible || document.hidden) { last = ms; return; }
      const raw = ms - last;
      const dt = Math.min(0.05, raw / 1000 || 0);
      last = ms;
      T = ms / 1000;
      if (!dragging) yaw += dt * 0.3;
      draw();

      if (!lite && raw > 0 && raw < 250) {
        ema = ema * 0.92 + raw * 0.08;
        slowFrames = ema > 26 ? slowFrames + 1 : 0;
        if (slowFrames > 90) {            // ~1,5 s por debajo de 38 fps: bajar calidad
          lite = true; dprCap = 1; resize();
        }
      }
    }

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
    }

    resize();
    if (!reduce) requestAnimationFrame(tick);
    loadTextureGLB(); // Carga una sola vez para las tres vistas.
  }

  /* ---------- malla del hero (arma tiburón, generada desde arma.glb) ---------- */
  function embeddedMesh() {
    return {"s":20000,"v":"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cgCL6GREAACw6NdEmQCM6MhGowCs6DZIbgCt6HZIAABk6biOzQB26WCQAADq6RSnAACq6UytAABm6XPLAABY6QfNAABX6QXUAABA6W3VAADL6WnkAAB/6WnoAADq6XXsAACG6Y71AAC36UkEAADp6E8GAAAX6XE1AACe6eE5rADq6ERGAACN6p+RAABq6kDNAAC86mHOAADi6ojPAAAJ61rQAAC46mDTAABe6tTTAADS6kjgBwEW6/fnAAA96nkQAABM6qUlAAB76oUriwD76mdJBgH56xWqAAC/61erAADY69ivAACP673HAAA+6/HJcwCj67rQAAC96+PRhACj6yPTAAD663fVAADu6wHYAABg6yXcBwEM7DPkAABn6wErAACy6yVEAAAD7Y+uAABl7SuyAABS7Za7AACG7Ye9AADx7BbHAABf7UrWAACq7NvXBgF+7abcBgEC7W/gAABH7Xo1AABA7tS4AAC67VO7AACh7TnBAAAm7nLCAAB97v3EBgH77d3YAACg7t01AACL7WRLAAAs7qpSAABB7sJaAAB/7itcAAA371KrAADr7uK0AAD77ji4AADL76vHAAB/74vVAAAO73bqAADl7oc6AAB1765MAABr77xQAAB67ydVAADY70NXAACP7yhZAAA87zFeAADr8F6oAAD677GtAACL8Ma4AAC78BLHAAA68DjWAACe8Is6AAC58CBEAABa8JZNAABt8DZgAADo8d+jAABP8bGlAAB18RLHAAD48cw5AADG8eo9AAAa8ss/AADW8S9CAAAX8h1EAADR8axFAADW8YlJAABe8QtMAAA08c5QAAAS8fxSAACk8dRUAACX8bVWAAB38bJYAACJ8eVaAAD58QpdAACK8dBiAAAN8uJjAAAX8zWkAABn8i5fAADN8hljAAA/8nFjAADe89mwAACo85LVAAD289Y1AAAn9G1mAACi8/hnAACw9IE1AACb9Yc5AACA9hPHAAD49bDoAADC9RdnAACC9xLHAADy94zVAADz9jLWAADo9oLqAADo9/IsAACe98MtAAD09nFnAAB492ZoAABo+RHHAABE+s41AABL+oE5AABO+w/HAABZ+zIQAABN+3IxAACg/A7HAAA2/JnVAADm+z0KAABJ/WAIAACG/YAJAACC/lqkAAAR/lCxAAD9/hnWAAD9/oXqAABz/rIDAAD6/ns5AACe/+2jAAA+/wvHAAAy////AAACAGwxAAA4ALSlAACkACWoAABWAJ/VAADAAOrpAAAKAY01AACTAMY1AAA9Amm4AAB+AiS6AACcAQnHAABuAog5pwDxAYxokwAKAoZpAAC8Ajm4AAAgAxy6AABCAya/AABnAznCAAChA7LEAABDA3fHAAB3A0XqAADLApryAABDA3U7AACeArw/AACwAjNCAAC0AhBEAACZA8RHAAB0A8lpAAC+A9TEAADdA4jHAABnBALKAAA6BIXQAAA8BPDRAABBBGPTAAD2A6vVAADHBOfkAAAEBHfoAABXBMnsAADFBK8nAAD5Azk6AAC6BJ9AAAASBBREAAD6A2holQAHBUG3aABDBXW4AAClBdy5AACSBVnNAABwBY/OAABgBabPAABSBXrQAABSBXXTAACCBezTAACLBVfhAADSBYbqAAABBgDtAADdBSL2AADwBO0qAADwBb81AADrBDZMAAB0BQ5RAADKBURmAAAwBctqAAB/BozLAAC2BifNAAAGB1jPAAABB9fQ7gAjB07RXQDaBjfTAAC/BvvTAADGBqTVNQAKB0XWXQDXBsDYAAAGB0/aAADKBpnbegD6BuDbWgBTBsXdAADJBkXeAADHBsHfAADgBj7hAAEIB8HhWwDTBrzjAADIBj7lWADiBs3mVQDJBj7pAABCBpbqAABiBmHsAADFBnrtAAC8BgjvAACKBtn1AAAhBiY3AAAIB/pSAADoBulrAAA3CJSzmACYB8+0ewDWB4+1AADkB3K2ZwDkB57OAABDBxvPAADQB/vQjwD1B4XRcwDoBwPTgwD0B23WxgDaBzrYAAD2B6XYdgAACNPbxwDWB7TdAAACCDreAAD5B1fhPABWCHPiegD3B5HjfAD9B9XmAADOB/3ncgD8BxrpAAB9B3D/AAAxCL0JAAB1B7ULAABuB2kWAABmBzIfAABnBxIhAABiBx8pAAAlCPMzuwBuCKbRAADmCGT/AADeCOMGAAA1CWkgAADUCLEnAADhCK0rAACwCEQxAAA7CexXAACsClypAAD0CSurAAAVCoutAAAZCojRAAAZCtnuAABcCvYKAADXCYkUAADbCfEzAADbCYg1AACWClNaAAB7C36nlwDWCqKxAAAPCz2yfQDMC37RAAAEC7ISAAAmC8kUAAD6CqccAAAhC3Es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","t":"2g/ZD9MPzQ/SD9EPzQ/RD8wP2A/XD9EP2Q/YD9EP2Q/RD9IP0w/ZD9IP0g/ND5oQzA/RD5sQzA+bEJkQmxDRD9gPmhCbENIPmxDRD9IPmxCaEJkQmhDND8wPmhDMD5kQrAalBqsGoQagBqMGoQajBqQGqgZpB6sGqgajBqkGqwakBqMGqwajBqoGpQakBqsGsBOhEqASnxKgEqgSsBOxE70TsBO9E6ESqBKnEp8SrxOwE6ASrxOgEp8SoBKhEqgSoRK9E7wTsBO8E70TvBOgEqgSpxKoEqASpxKgEp8SoBK8E7sToBK7E58SrxO7E7wTrxO8E7ATpxKfErsTvBOoEqESrxOfErsTHAQdBA8DHAQPAw4DHgQPAx0EHQQoBCkEJwQxBCgEHQQpBB4EMQQnBDAEHAQnBCgEHAQoBB0EKAQxBCkEHgQQAw8DDwMpBCgEMAQnBCgEMAQoBDEEDwMQAykEDgMPAygEDgMoBCcEHgQpBBADHAQOAycEYhBjEI4RfhGNEX0RfBFiEFIQfhFjEI0RYhB8EX0RcBFxEX0RcBF9EXwRYRBSEGIQfhGOEWMQjRFiEH0RYxBiEI0RchF+EX0RchF9EXERfBFSEIwRfhGNEY4RjRF9EXwRjBGNEXwRjBFhEGIQjBFiEI0RUhBhEIwRYhCOEY0RugW5BcoFDgW6BcsFugXKBcsFygW5BbgFpQW4BbkFpQW5BaYFyQXKBbgFpwWmBbkFpwW5BboFpwUGBQUFpwUFBaYFuAUEBQwFDgXKBQ0FpgUFBQQFpgUEBaUFDAXKBbgFDgXLBcoFygUMBQ0FBAUFBQ0FBAUNBQwFBgUOBQ0FBgUNBQUFpwW6BQ4FpwUOBQYFpQUEBbgF2BXUFdkVxRXJFcgVyBXJFdQVyBXUFdMVxRXGFcoVxRXKFckVyxXVFcoV1BXYFdMVyBXEFcUV1RXUFckV1RXJFcoV2RXUFdUVyxXWFdUVyhXLFdYV3QDeANgA2QA4ANEAQADZAN4AQADeAEQAMgDOAM8AzgDXANgAzgDYAM8ANwDQANEANwDRADgAMgDPANAAMgDQADMA0QDQANkA2ADXAN0AzgAyADEA2QDQAM8A2QDPANgA3gDZANgANwAzANAAOADZAEAAOABAAEEAQwA/AEQANQA+ANcANQDXAM4AMgA2ADUANQA2AD8ANQA/AD4ANwBBADgAMgAzADcAMgA3ADYAOABAADcAPwBDAD4ANQAxADIAPgBDAN0APgDdANcAQAA/ADYAQAA2ADcARAA/AEAAMQA1AM4A3QBDAEQA3QBEAN4AgQFZAA8AgQEPAG8AcACIAYEBcACBAW8AiAH5AFkAiAFZAIEBiAFwAHEAiAFxAPkAmxQqFZkVmxSZFREVERX9E5sU/RMrFSoV/RMqFZsU/RMRFZkV/ROZFSsVogCjAMEAogDBAEcB2AEyAaIA2AGiAEcBPQHYAUcBPQFHAcEAMgHYAT0BMgE9AaMAWxXmFHkVWxV5FbUV5hTdFHkVWxVcFd0UWxXdFOYUmgAfAKMAmgCjAKIAMgGaAKIAmwCjAB8AmgAyAaMAmgCjAJsArRVbFbUVrRW1Fa4VXBWuFbUVUhVbFa0VUhWuFVwVUhVcFVsVbwAPABMAbwATABIAfgBwAG8AfgBvABIAcQATAA8AcAB+ABMAcAATAHEAKhWcFZ4VKhWeFZkVKxWdFZwVKxWcFSoVKxWZFZ4VKxWeFZ0VEgATAB8AEgAfAJoAmgB+ABIAfgCaAJsAfgCbABMAnBWtFa4VnBWuFZ4VnRVSFa0VnRWtFZwVnRWeFa4VnRWuFVIVWQBkABQAWQAUAA8AfwBxAA8AfwAPABQA+QByAGQA+QBkAFkA+QBxAH8A+QB/AHIAERWZFZ8VERWfFR0VLBURFR0VmRU4FZ8VERUsFTgVERU4FZkVowAgALQAowC0AMEAtAA9AcEAowCcACAAowA9AbQAowC0AJwAtRV5FW0VtRVtFa8VUxVcFbUVUxW1Fa8V3RRtFXkVXBVTFW0VXBVtFd0UEwAUACAAEwAgAB8AnACbAB8AnAAfACAAEwAaABQAEwCbAJwAEwCcABoAnhWuFa8VnhWvFZ8VqBWeFZ8VnhWoFa8VZABzABUAZAAVABQAcwCAABUAcgBzAGQAcgB/AIAAcgCAAHMAHRWfFaAVHRWgFS0VLRUsFR0VoRUtFaAVLBUtFaEVLBWhFTgVIAAhAKQAIACkALQAnQCkACEAnAC0AKQAnACkAJ0ArxVtFV0VrxVdFbAVXRVUFbAVUxVUFV0VUxVdFW0VrxWwFVQVrxVUFVMVFAAVABsAGgB/ABQAgACWABsAgAAbABUAfwAaAJYAfwCWAIAAnxWpFaAVqhWhFaAVqhWgFakVOBWoFZ8VOBWhFaoV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QQ9ND2UNQQ9lDV4NEg55DL0KEg69CngKdQpcDFgKdQpYCnQKYQwEDlwMYQxcDHUKQQ9eDRIOXg15DBIOXg1lDXwMXg18DHkMawxhDHUKawx1CpIKgw40DVwMgw5cDAQOjg47DTQNjg40DYMOOQ8MDjsNOQ87DY4OQQ8SDgwOQQ8MDjkP4Ap8DHoM4Ap6DNIKfAxlDWENfAxhDXoMPw8aDhsOPw8bDqYOTQ8JEEUPTQ9FD6gOSA1rDG8MSA1vDFANZQ1ND6gOZQ2oDmENkgqRCqIKkgqiCm4MawySCm4MawxuDG8MGg5IDVANGg5QDRsOCRA/D6YOCRCmDkUPqA5FD5kOqA6ZDqAOYQ2oDqAOYQ2gDlENpg4bDgUOpg4FDo0ORQ+mDo0ORQ+NDpkObgyiCmkKbgxpCmoKbwxuDGoKbwxqCmIMUA1vDGIMUA1iDDoNegxhDVENegxRDa8K0gp6DK8K0gqvCrAKGw5QDToNGw46DQUOOg1iDFgKOg1YCl8KYgxqClgKagppClgKjQ4FDmAKjQ5gCmsKBQ46DV8KBQ5fCmAKoA6ZDnYKoA52CncKmQ6NDmsKmQ5rCnYKUQ2gDncKUQ13CpMKsAqvCpMKrwpRDZMKkweMB2wKkwdsCngKOwgYCQ4JOwgOCS4IjAcyCGEKjAdhCmwKMggQCVkKMghZCmEKEAkLCVgKEAlYClkKnQc7CC4InQcuCIUH0gadB4UH0gaFB7sGJQbSBrsGJQa7BssG2wmRCnQK2wl0CtYJKAYlBssGKAbLBtMGIgm9CuAKIgngCiUJ0wZTCFwI0wZcCCgGkwd4Cr0Kkwe9CiIJ1gl0ClgK1glYCgsJDgnWCQsJDgkLCS4I0waTB1MIkwciCVMIUwgiCSUJUwglCVwIGAnbCdYJGAnWCQ4JhQcuCAsJhQcLCRAJuwaFBxAJuwYQCTIIywa7BjIIywYyCIwH0wbLBowH0waMB5MH4ArSCiMJ4AojCSUJJQkjCVcIJQlXCFwI0gaeB50HKAbWBtUGKAbVBiUGOwhDCB0JOwgdCRgJXAhXCNYGXAjWBigG2wkcCaIK2wmiCpEKGAkdCRwJGAkcCdsJnQeeB0MInQdDCDsIJQbVBtIG1gbMBsUG1gbFBtUGVwhECMwGVwjMBtYG0gaSB4UH0gaFB54H1QbFBpIH1QaSB9IGHAnTCWkKHAlpCqIKHQkPCdMJHQnTCRwJQwgxCA8JQwgPCR0JIwniCUQIIwlECFcI0gqwCuIJ0griCSMJngeFBzEIngcxCEMIMQhfClgKMQhYCg8JDwlYCtMJWAppCtMJkgdrCmAKkgdgCoUHhQdgCl8KhQdfCjEIzAZ3CnYKzAZ2CsUGxQZ2CmsKxQZrCpIHRAiTCncKRAh3CswGsAqTCuIJkwpECOIJJwMpAxkCJwMZAhcCKQMnAzoEKQM6BDwEOgQnAyYDOgQmAzkEOgRLBDEFOgQxBTwEOgQ5BC8FOgQvBTAFSgQ4BDcESgQ3BC4FLwU+BT8FLwU/BTAFSgQuBT0FSgQ9BT4FPAUuBS0FPQVqBGsEPQVrBD4FPAVpBGoEaAQ7BToFaAQ6BWcEZwRFA0YDZwRGA2gEZwRmBEQDZwREA0UDRANmBGUERANlBEMDRAMnAigCRAMoAkUDRANDAzwCRAM8Aj0CPAJDA0IDPAJCAzsCPAImAicCPAInAj0CPAI7AiUCJAINAg4CDQIjAiICDQIwAzEDDQIxAw4CLwMMAgsCLwMLAi4DLwMuA0AELwNABEEEQAQmBUEEPwRTBEAEUwQ+BFIEUwQyBTMFUwQzBUAEUwRSBEQFUwREBUUFRAVSBFEERAVRBEMFRAVfBGAERAVgBEUFRAVDBXUERAV1BF8EdARDBUIFdARQA3UEUARRBD0EUARCBUMFUARDBVEEPQQqA1AEPQRRBFIEKwMJAh4CCQIgAh8CCgILAiECCgIhAiACCgItAwsCIQI4AjcCIQI3AiACIQIiAjkCIQI5AjgCIQILAgwCIQIMAiICOQJAAzgCOQI6AkEDOQJBA0ADOQIiAiMCOQIjAjoCQQNjBHgEQQN4BEADZARCA0MDZARDA2UEZQQ4BTcFZQQ3BWQEZQRmBDkFZQQ5BTgFOQUrBSkFOQUpBTgFOQU6BSwFOQUsBSsFOQVmBGcEOQVnBDoFLAU1BDQELAU0BCsFLAUtBTYELAU2BDUELAU6BTsFLAU7BS0FNgQjAyIDNgQiAzUENgQ3BCQDNgQkAyMDNgQtBS4FNgQuBTcEJAMUAhMCJAMTAiMDJAMlAxUCJAMVAhQCJAM3BDgEJAM4BCUDFQIsAisCFQIrAhQCFgIXAiwCFgImAycDFgInAxcCFwItAiwCFwIZAi8CFwIvAi0CLwJMA0sDLwJLAy0CQQUxBUsEQQVLBD8FQQU/BW0EQQVtBG4EbAQ/BT4FbAQ+BWsEbQRLA0wDbQRMA24EbARrBEkDbARJA0sDSQNrBGoESQNqBEgDSANqBGkESANpBEcDSAMrAiwCSAMsAkkDSANHA0ACSANAAisCPwJGA0UDPwJFAz4CQAIqAisCPwI+AigCPwIoAikCKAISAhMCKAITAikCKAInAhECKAIRAhICEQInAiYCEQImAg8CEQIhAyIDEQIiAxICEQIPAjIDEQIyAyEDMgNEBDQEMgM0BCEDQwQxAzADQwQwA0IEQwRCBCcFQwQnBSgFJwVCBCYFJwU2BSgFJwUmBTQFJwU0BTUFNAUmBUAENAVABDMFNAViBGMENAVjBDUFNAUzBWEENAVhBGIEYQQzBTIFYQR4BGIEdgRgBF8EdwRTAz8DUgM2AjcCUQM1AjYCNQIeAh8CNQIfAjYCNQI0Ah4CNAIdAh4CHQIqAx4CHgIJAh8CNgIfAiACNgIgAjcCUwM3AjgCUwM4Aj8DYgR4BGMEKQU3BTgFRAQpBSsFRAQrBTQEIQM0BDUEIQM1BCIDEgIiAyMDEgIjAxMCKgITAhQCSQMsAi0CSQMtAksDJgMlAzkEMQVNBDwEMAVLBDoEOQRKBC8FOwUtBUgENwRJBC4FSgQ5BDgEPwVLBDAFLgU9BUkELwVKBD4FLQU7BTwFSAQ8BTsFPAU9BS4FPQU8BUkEagQ9BTwFPAU7BWkEaARpBDwFaAQ8BTsFaQRoBDsFSAQ2BC0FRgNHA2kERgNpBGgELQU8BUgERwNGA2gERwNoBGkEKAIpAkUDPQInAkQDQgNBAzoCQgM6AjsCQQNCAzsCQQM7AjoCJQImAjwCOwI6AiQCOwIkAiUCOgI7AiUCOgIlAiQCOgIjAiQCDwImAiUCJQIkAg4CJQIOAg8CJAIlAg8CJAIPAg4CJAIjAg0CNQUnBTYFIgIMAg0CMQMyAw8CMQMPAg4CMgMxAw4CMgMOAg8CDQIMAi8DDQIvAzADDAINAjADDAIwAy8DCwItAy4DQAQtAy4DQgQmBUEEMAMvA0EEMANBBEIELwMwA0IELwNCBEEELQMsAz4ELQM+BD8ELAMtAz8ELAM/BD4EPwRABC4DPwQuAy0DQAQ/BC0DQARUBD8EPwQ+BFMEXwREBVIEMgVgBFMEMwVUBEAERQUyBVMEdARDBV4EYAQyBUUFQwV0BHUEXgRfBHQEQgVdBHQEdARfBFEDUQNQA3QEUQN0BF4EUANRA3UEUQRDBV4ENAJJAlADUARdBEIFOQMdAjoDKgM5A1AEUAQ5AzoDPQQrAyoDPQRRBCsDPQQ+BCwDPQQsAysDCQIsAx8CPgQ9BCsDPgQrAywDUgQ+BD0EKwMsAwkCLAMrAx8CLAMKAgkCCQIKAiACCgIsAy0DQAN4BGIEQAM/AzgCQQNCA2QEQQNkBGMEQgNBA2MEQgNjBGQEOQUrBUYENwU2BWMENwVjBGQENgU3BWQENgVkBGMELAU6BUcERgQ0BCsFIQM0BEYESAQ2BCMDNQQsBUcEIgNHBDUERwQiAzUDSAQ2AyMDNwRJBDcDNwQ3AyQDJAM3AxQCNwQkA0kEJQMmAxYCJQMWAhUCJgMlAxUCJgMVAhYCOAQ5BCYDOAQmAyUDOQQ4BCUDKwIqAhQCFQIWAiwCFwIuAi0CLQJKA0sDSwMuAi0CQQVNBDEFPwVsBG0EbQRWBD8FbQRsBEsDSwNWBG0EPwJHAykCRwM/AkACRwMqAikCRQMoAj4CIgMSAjUDPwJHA0YDKgIpAkYDKgJGA0cDQAI/AikCQAIpAioCRwNAAioCEwIqAikCIQMRAjQDRgQ0AyEDMgMxA0MEMgNDBEQEMQMyA0QEMQNEBEMEYwQ1BTYFRARDBCgFRAQoBSkFQwREBCkFQwQpBSgFNAUmBUEENgU3BSkFNgUpBSgFNwU2BSgFNwUoBSkFJwVCBDYFNgU1BUIEMgVgBGEEMgVTBGEEdQRRAz0DYQR3BHgEYQRiBHcEYQRgBHcEXwR1BHYEdgR3BGAEPwNAA3gEPwN4BHcEQAM/A3cEQAN3BHgEdwQ+A1MDUQM2Aj0DdwQ/Az4DUgM/A3cEUgN3BHYEPwM+A2AEPwNgBHcEdgR1BFEDdgRRA1IDdQR2BD0DNwI/A1IDNwI+Az8DUgNRAzYCUQNQAzUCUANJAjUCNQJJAjQCXgR0BHUEXgR1BFEDKgMrAx4CHQI5AyoDdQR0BFEDKwMJAh8CUwM+AzcCdwRiBD8DIwM2AxMCKQMnAxcCKQMXAhkCOgQ8BE0EOgRNBEsEOgRLBEoEOgRKBDkESgRJBDgESgRLBD8FSgQ/BT4FSgQ9BUkEPAVIBEkERAMnAjwCQARBBFQEPwRUBFMEUwRUBDMFUwRfBFIEXwReBFEEXwRRBFIEXwRTBGAEdARdBF4EXwR1BFEDUARRBF4EUAReBF0EUQRQBDoDUQQ6AysDKwMeAh8COQI4Aj8DOQI/A0ADQQNAA2IEQQNiBGMEOQUpBUYEOQVGBEcEOQVHBDoFRwRIBDsFRwQ7BToFSARHBDUDSAQ1AzYDSAQjAzcDSAQ3A0kENwMjAxMCNwMTAhQCJAM4BEkEFwIuAi8CLwIuAksDQQVLBE0EVgRrBD4FVgQ+BT8FVgRLA0kDVgRJA2sESAMrAioCSAMqAkcDKQJFA0YDEQIiAzQDEQI0AzIDMgM0A0YEMgNGBEQEQwQoBUIEQgQoBTYFQgQ1BTQFQgQ0BUEENAUzBVQENAVUBEEEYQRTBDMFYAQ+Az0DYAQ9A3YEPQM+AzcCPQM3AjYCPQM2AjUCPQM1AlEDNQI0AlADHQIeAisDHQIrAzoDPwM4AjcCYgRAAz8DRARGBCkFNAMiA0cENANHBEYEEgITAjYDEgI2AzUDHQYeBmoFHQZqBcIEowHNAcUBowHFAaIBUgFKAUMBUgFDAU4BHQbCBMEEHQbBBMAEEgabBIMDEgaDA1oF3ALmAtsC3ALbAsQB1QHwAU4B1QFOAUMB2wLMAsQB9AHqAUoB9AFKAVIBogGnBIMDpwRaBYMDlQebBBIG2gLbAuEB1AauBx4G1AYeBh0GzALFAcQB1AYdBsAEuQKyAcEE7gLmArAF7gKwBb8FvwWwBUkLvwVJC0gLeAZtC2sLeAZrC+AF4AXqAfQB4AX0AXgGFAaiB5UHFAaVBxIGWQUUBhIGWQUSBloFsQFKAeoBsQHqAbgCsgFDAUoBsgFKAbEBxQHNAdwCxQHcAsQB7AHxAVIB7AFSAU4BwQSyAbEBwQSxAcAEwASxAbgC1QFDAbIB1QGyAbkCmwSjAaIBmwSiAYMDowHQAs0BzQHQAtwC8QH0AVIBwwquB9QGwwrUBsIKSQuwBaMFSQujBTkLsAXmAtwCsAXcAqMF3AlACE0I3AlNCOAJrweuB6gHrweoB6kHmgqVB3wKrgfDCrgKrge4CqgHQAjcCXwKQAh8CpUHPwhACJUHPwiVB6IH5wnmCbgK5wm4CrkK5glPCKgH5gmoB7gKVQhaCOwJVQjsCeoJ3wncCeAJ3wngCekJTwjmCewJTwjsCVoIUAhPCFoIUAhaCFUIPwhMCFYIPwhWCFEI5wnoCesJ5wnrCeoJUQhWCOsJUQjrCekJ3wnoCakK3wmpCpkKUAhMCKsHUAirB6kHogeqB6sHawUZBhoGawUaBmQFGQavB6oHGQaqBxoGTwahBagFTwaoBakFJgotCqgJJgqoCacJ8genCagJ8geoCU8HuwXfBcoFLQryC/cLtgV0Bt4FtgXeBaQF9QfSCFcH9QdXB5EGLgowCtIILgrSCPUHMwq3CdIIMwrSCDAKMQwzCjAKMQwwCiQMkQZXB5UGkQaVBv0F0gi3CQAI0ggACFcHQgbxCTAJQgYwCZwFoQWgBagFuQnbCNwI8gRCBpwF9QeRBv0F9Qf9BVIH7wTyBOYDLgr1B1IHLgpSB6oJAQo5CQIKTwY5CWUJTwZlCTQHAQoUCmUJAQplCTkJNAdlCacJNAenCfIHFAomCqcJFAqnCWUJdAaFBk8HdAZPB48GhQaABvIHhQbyB08HgAZnBjQHgAY0B/IHZwahBU8GZwZPBjQH8QTvBOYD8QTmA+4DBQwuCqoJBQyqCS8KOQlPBqkFuwWgBaEFuwWhBWcG3wW7BWcG3wVnBoAGyAXfBYAGyAWABoUGtgXIBYUGtgWFBnQG/wdsBwAI/wcACNwILAQgBMoILATKCMkIMgw1CjQKMgw0CjMM/QWVBv4F/QX+BRsFLwotCvcLLwr3CwYMuQndCDQKuQk0CjUK3AgACN0I3AjdCLkJlQYACGwHlQZsB/4F5gPyBPgE5gP4BO4DnAWoBaAFnAUwCTkJnAU5CakF8gkCCjkJ8gk5CTAJygW3BaQFygWkBfgEuwXKBfgEuwX4BKAFqAmqCVIHqAlSB1AHUAdSB/0FUAf9BfcF9wX9BRsF9wUbBRgF8QlRC1IL8QlSC/IJVwcACJUG3wXIBbcF3wW3BcoFxwXxBO4DxwXuAxgF2wj+B/8H2wj/B9wIyAW2BaQFyAWkBbcF/QeSBv4F/Qf+BWwHTweoCVAHkgbsBRsFkgYbBf4F/gf9B2wH/gdsB/8HtwkzCjQKtwk0Ct0IjwZPB1AHjwZQB/cFdAaPBvcFdAb3Bd4F7AXHBRgF7AUYBRsFMgy5CTUKAAi3Cd0IKAADAAIALAQZA+AALATgAFcBbg6aEqQSbg6kEtkNmwamBhYMmwYWDAEMMAAqALYAJwAEACYAXAedBhkDXAcZAywEUwFXATAAUwEwALYALgDbANYAEwMSA9oAEwPaADkA2gBCAAUA2gAFACsAOQDaACsAOQArAAYAMADgANsAMADbAC4A1gDbABED1gARAx8EtgAqANwAtgDcAFMBGQMRA9sAGQPbAOAAnAYRAxkDnAYZA50GFAMTAzkAFAM5ADoAAwA6ADkAAwA5AAYAAgADAAYAAgAGAAAAJwAwAC4AJwAuAAQAEgMhBFMBEgNTAVgBpganBhcMpgYXDBYMBQBCANwABQDcACoA3ABCAOEAVwHgADAAKwAFAAYAZAenBhQDZAcUAyME0wA6AAMA0wADACgAAgAAAAEAUwHcAOEAUwHhAFgBIwQUAzoAIwQ6ANMAJgAEAC4AAQAAACcAWAHhAEIAWAFCANoAVgecBvgLVgf4C+4LHwQRA5wGHwScBlYHDgwXDKcGDgynBmQHEwMUA6cGEwOnBqYG+AucBp0G+AudBgcM8wsHDJ0G8wudBlwHEwOmBpsG+QvJCMoI+QvKCPULZgdnBwwMZgcMDAsMYQdmBwsMYQcLDP8LmgabBgEMmgYBDAAMAAwMDGcHAAxnB5oGmgZnB2YHmgZmB2EHIQUqBCsEIQUrBP8FVgfuC+0LGgQwBCAFGgQgBRsExQAuANYAxQDWAFYBygDFAFYBygBWAfUB/gIaBPUBFgQaBJYGFgSWBpQGlAaWBusLlAbrC+kLMAQaBP4CMAT+AioEVQdWB+0LVQftC+wLIAX/BVYHnhOjEpYSnhOWEnUUVgHWAE8BVgFPAfkB/gJWAfkB1gAfBBcE1gAXBE8BlgYaBBsElgYbBFUHKgT+AisE6wuWBlUH6wtVB+wLHwRWBxcEMAQhBf8FMAT/BSAFxQDKANoBxQDaAc4BLgDFAM4BLgDOATkBlAbpC+gLlAboC1MHygD1AfQCygD0AtoB9QEWBB4F9QEeBfQCFgSUBlMHFgRTBx4F6g0pDB0M6g0dDOgNXwf5B2oHXwdqB6IGcwfjCAMIcwcDCK8G3wg1DDgM3wg4DOMIaAfaCJ8GWQdaB5kGWQeZBgAG4whzB3EH4whxB98IlwZYBwMGlwYDBgIGHQzVCPwHbQeeBgQGbQcEBgcGWAdZBwAGWAcABgMG1QjYCPkHngaXBgIGngYCBgQGAwg4DDcMAwg3DAII+AcVDB0M+AcdDPwHrgYIBq8GogYABpkGrQYHBgQGrQYEBgUGrwYIBgcGrwYHBq0GBQYDBgAGBQYABgYGBAYCBgMGBAYDBgUGBgaiBmoHBgZqB6gG4wg4DAMIaAeYBgYGaAcGBqgGmAafBgUGmAYFBgYGNgzgCAIINgwCCDcMnwZxB60GnwatBgUG+Qf7B2sH+QdrB2oH4AhyB64G4AiuBgIIzAj9CxUMzAgVDPgHcQdzB68GcQevBq0G+wdoB6gG+weoBmsHcgdvBwgGcgcIBq4G1QhfB6IG1QiiBvwHWgfMCPgHWgf4B5kGbwdtBwcGbwcHBggGWgdZB14HWgdeB/YHWAeXBl0HngZtB24HngZuB2UHbwdyB3AHbQdvB3AHbQdwB24HzAhaB/YHzAj2B9EI4Ag2DOEIWQdYB10HWQddB14HlwaeBmUH/QvMCNEI/QvRCAoMcgfgCOEIXQeXBs8IcgfhCOIIcgfiCN4IbgdwBwEIbgcBCLUJZQduB7UJZQe1Ca4J4Qg2DDQM4Qg0DOII0Qj2B9AI0QjQCNQIXgddB88IXgfPCMsICgzRCNQICgzUCBQMlwZlB64JlwauCc8I9gdeB8sI9gfLCNAIcAdyB94IcAfeCAEILgA5AdwBLgDcAcYAHgVTB1QHHgVUBx8FJwAmACkAJwApALUA9AIeBR8F9AIfBfcCKAACAB4AKAAeACwA2gH0AvcC2gH3AucCZAcjBCIEZAciBGMHzgHaAecCzgHnAt4CKAAsANMAAgABAB0AAgAdAB4A0wAiBCMEOQHOAd4COQHeAtwBJgAuAMYAJgDGACkAAQAnALUAAQC1AB0AUwfoC+oLUwfqC1QHDgxkB2MHDgxjBw0MDQxjB1sHDQxbB+8LYwciBEkHYwdJB1sHVAfqC9gLVAfYC1EH0wD6BkkH0wBJByIEHwVUB1EHHwVRB5ELtQApABoLtQAaCxYL9wIfBZEL9wKRCzoLHQC1ABYLHQAWC+wG5wL3AjoL5wI6CyULLAD0BvoGLAD6BtMA3gLnAiUL3gIlCyELKQDGABwLKQAcCxoL3AHeAiEL3AEhCxsLHgAdAOwGHgDsBu0GLAAeAO0GLADtBvQGxgDcARsLxgAbCxwL7AYWCw4L9AYXCyYL9AYmC/oG7QbsBg4L7QYOCw8L9AbtBg8L9AYPCxcLWwdJB6QLWwekC+8L+gYmC6QL+gakC0kH2AuRC1EHAQjeCC4MAQguDCwMzwgJDPoL0AjLCPsL0Aj7C/wLtQkBCCwMtQksDCgMrAmzCbIJrAmyCdcIzwiuCSAMzwggDAkMywjPCPoLywj6C/sLNAwuDN4INAzeCOII1AjQCPwL1Aj8CxQM7AWSBpMG7AWTBo4G/gfbCLYJ/ge2CdkI8gTvBJ8F8gSfBU4G/Qf+B9kI/QfZCPoHkgb9B/oHkgb6B5MG2wi5CbgJ2wi4CbYJQgbyBE4GQgZOBgEH8QTHBXQG8QR0BqQFxwXsBY4GxwWOBnQG7wTxBKQF7wSkBZ8F4gfoB7AL4gewC6YLsAm0CSYMsAkmDCIMtAkxCioMtAkqDCYM4wfiB6YL4wemC6cLyAjWCBoMyAgaDPEL6AfxB7kL6Ae5C7ALdwjjB6cLdwinC6gL8Qf0B80L8QfNC7kL9AfICPEL9AfxC80L1giwCSIM1ggiDBoMMQq4CTIKMgwyCrgJMgy4CbkJ8QlCBgEH8QkBBy4J9AkuCQEH9AkBB3cI8QkuCfQJMwQjBRgMMwQYDAIM9wfNCBkM9wcZDBEMJAUBBgQMJAUEDAMMJQUgAyEMJQUhDB4MIwUzBF0BIwVdAQUCYgcBBhUEYgcVBPwFIANKAAsAAQYkBTIEAQYyBC8EIAMlBVwBIANcAUoAzQjtB4ALzQiAC/YLOwA8AAkAOwAJAAgAWQEFAl0BWQFdAeIA4gBGAN8A4gDfAFkBOwBIAFQBOwBUAUsBXAFUAUgAXAFIAEoAMwQCDA8MMwQPDB8DPAA0AAcAPAAHAAkANAA8AEwBNABMAeUBrwA0AOUBrwDlAb8BPAA7AEsBPABLAUwB1QDJAPcB1QD3AVUB3wDVAFUB3wBVAVkBJAUjBRoDJAUaAzIEIwUkBQMMIwUDDBgMBgIaAyMFBgIjBQUC9wdiB/wF9wf8BY0GAQZiBxAMAQYQDAQMCwUXBRYFCwUWBQgETQH4AfcBTQH3AckAvwHPAb0AvwG9AK8ApQvrBfUFpQv1BX8LvQDPAegCvQDoAr4A6wXwAugC6wXoAvUF6wVwBpsF6wWbBewDzQj3B40GzQiNBu0HYgf3BxEMYgcRDBAMzwHaBfUFzwH1BegCfwv1BdoFfwvaBWALYAvaBdkFYAvZBV8LXwvZBbQFXwu0BT8LvwHZBdoFvwHaBc8B5QG0BdkF5QHZBb8BPwu0BbMFPwuzBU0LTAGzBbQFTAG0BeUBTQuzBQEFTQsBBTsLOwsBBfsDOwv7A34LSwEBBbMFSwGzBUwBVAH7AwEFVAEBBUsBfgv7A/8Cfgv/Ap0LnQv/AiIFnQsiBfALXAH/AvsDXAH7A1QBJQUiBf8CJQX/AlwBHgzwCyIFHgwiBSUFYQDrAOwAYQDsAAEBcwWsA3QFlQGNAo4ClQGOAp8CnwKOApUDnwKVA6ACtQQnBm8F5gCNAocBcAUnBi4GcAUuBjYGYQABAWIAEQu4B7MHEQuzBwQLjgKNAtsKjgLbCtwKJwa1BN4KJwbeCucKswf7CgQLtQSsBNEKtQTRCt4K2QYuBvoKjQLmAM8KjQLPCtsKlQOOAtwKlQPcCt0KrASJA9AKrATQCtEK5gDsANoK5gDaCs8KLgYnBucKLgbnCvoKiQOVA90KiQPdCtAK7ADrANkK7ADZCtoK5wa4B2YI5wZmCLsHqQK0Ab0CqQK9AqoDuAcRC2YItAGrA70CqwPUA+IEegAKAZsBegCbARIB1ANzBeIECgEpAbMBCgGzAZsBKQGcAaYCKQGmArMBPAY9Bu8GPAbvBu4GnAGdAacCnAGnAqYCPQbwBu8GnQGpAqoDnQGqA6cCngKjA6ADngKgA58DlAGlApYClAGWApUCowOkA8QEowPEBKADZQgJCwMLZQgDC2QIpQKeAp8DpQKfA5YCkwGUAZUCkwGVAosBLwbcBtgGLwbYBi0GxgSqA70CxgS9AqsDxgSrA+IExgTiBHMFNAbGBHMF7gbvBvAG7gbwBrsHiwGVAvMKiwHzCuYKlgL0CvMKlgLzCpUCnwOgA/YKnwP2CvUKnwP1CvQKnwP0CpYCxATFBPgKxAT4CvcKxAT3CvYKxAT2CqADLQbYBv0KLQb9CvkKLQb5CvgKLQb4CsUE/QrYBmQI/QpkCP4KAwv+CmQI6wCLAeYK6wDmCtkKYQCTAYsBYQCLAesAzQj2CxkMCwgTCH0HCwh9B3sH8gjtCEAK8ghACkMKdgd5B3UHdgd1B3QHBAh0B3UHBAh1BwcI5gjpCDsK5gg7CjkKdwd6B3kHdwd5B3YHBQh2B3QHBQh0BwQICAh3B3YHCAh2BwUIBwh1B3kHBwh5Bw8I9QhFCowK9QiMCtcJDwj0CBcJDwgXCTQI8ghDCkUK8ghFCvUIEQlzCkEKEQlBCu8I7whBCjsK7wg7CukI6gg8CkAK6ghACu0I5wjmCDkK5wg5CjoKSwB6AqQCSwCkAnoAzQDzA+IDzQDiA7cAjACjAs0CjADNArwATAH0A/MDTAHzA80AFwFyBVsIFwFbCPMAyADrA/QDyAD0A0wBvADNAusDvADrA8gAowKMAI0AtwDiA3IFtwByBRcBtwCoAMIAtwDCAM0A5QBOAPsA5QD7APMAvACuAIsAvACLAIwAzQDCAMcAzQDHAEwBdgFMAE4AdgFOAOUA8wD7AIUA8wCFABcBTAHHAMQATAHEAMgAjACLAHgAjAB4AI0AyADEAK4AyACuALwATQBQAHYBFwGFAKgAFwGoALcAWAANAEsATABPAE4ATQANAAwAhQCGAKgATABQAE8AwgDDAMcAxACtAK4ArgCtAIsAxwDDAMQAUABNAAwA+wCGAIUAWAAMAA0A+wAYAYYAhgAYAagATgBaAPsA+wBaAIYAUAAMAA4AxAC7AK0AegB5AGEAegBhAFgAiwB3AHgAwwC7AMQAWABhAA4AWAAOAAwAhgCpAKgAqACpAMIAqQA+AcIAUAAOAFEAwgA+AcMAuwChAK0ArQChAIsAYQBRAA4ATgD8AFoAWgD8ABgBWgAYAYYAhgAYAakATwBQAFUAqQAqAToBqQA6AT4BUABRAFYAUABWAFUAPgE6AbkAPgG5AMMAUQBXAFYAeQB4AGAAeQBgAGEAoQCKAIsAiwCKAHcAwwC5ALsAYQBgAFcAYQBXAFEATgBUAP0ATgD9APwA/AD9ABkB/AAZARgBTwBUAE4AGAEZASoBGAEqAakAigChACgBigAoAR8BoQC7ADYBoQA2ASgBuwC5ADsBuwA7ATYBuQA6ATsBOgEqASsBKgEZASsB/QBUAP4AVABPAP8AVAD/AP4ATwBVAAABTwAAAf8ACAFoAIoACAGKAB8BigBoAF8AigBfAHcAYABfAFYAYABWAFcAVQBWAAgBVQAIAQABaAAIAVYAaABWAF8AdwB4AHkAeAB6AI0AXwBgAHgAXwB4AHcAdwB5AHoAdwB6AHgA/QBbAIcA/QCHABkBNgGsAJkANgGZACgBKwGfALgAKwG4ADoBAAEIAWcAAAFnAF4A/gBcAFsA/gBbAP0AOwG6AKwAOwGsADYBGQGHAJ8AGQGfACsBHwGKAGcAHwFnAAgB/wBdAFwA/wBcAP4AOgG4ALoAOgG6ADsBKAGZAIoA/wAAAV4A/wBeAF0AXgBnAHYAXgB2AGYAXABlAFsAugCrAKAAugCgAKwAnwCqALgAigCJAHYAigB2AGcAuACqAKsAuACrALoAhwCIAJ8AmQCJAIoAXQBeAGYAWwBlAIgAWwCIAIcArACgAJkAoAAuASgBoAAoAZkAZgB2ABEBZgARAQcBXAD+AAQBXAAEAWUAqwA0AS4BqwAuAaAAnwArATMBnwAzAaoAiQAeAREBiQARAXYAXQD/AP4AXQD+AFwAqgAzATQBqgA0AasAiAAaASsBiAArAZ8AmQAoAR4BmQAeAYkAXQBmAAcBXQAHAf8AZQAEARoBZQAaAYgABAEbARoBLgEnASgBBwERAR0BBwEdARAB/gAPARsB/gAbAQQBNAEmAScBNAEnAS4BKwEbASYBKwEmATMBHgEdAREB/wAPAf4AMwEmATQBGgEbASsBKAEnAR0BKAEdAR4B/wAHARAB/wAQAQ8BJwEmARwBJwEcAR0BHQEcAQ8BHQEPARABJgEbARwBHAEbAQ8B5wg6CjwK5wg8CuoICwh7B3cHCwh3BwgIewd9B3oHewd6B3cHfQcTCPQIfQf0CHoHeQd6B/QIeQf0CA8IBQjnCOoIBQjqCAgIBQgECOYIBQjmCOcICAjqCO0ICAjtCAsIDwjvCOkIDwjpCAcINAgRCe8INAjvCA8IEwjyCPUIEwj1CPQI9Aj1CNcJ9AjXCRcJBAgHCOkIBAjpCOYIEwgLCO0IEwjtCPIIdgFOCHoCdgF6AksATgh2AeUATgjlAFIIUgjlAPMAUgjzAFsIQQhSCFsIQQhbCCEJGgkRCTQIGgk0CDoIQQgaCToIQQg6CEIIEQkaCYsKEQmLCnMKUghBCEIIUghCCE4IGglBCCEJGgkhCYsKFwlCCDoIFwk6CDQI1wlOCEII1wlCCBcJegJOCLwKegK8Cs4K8gqkAnoC8gp6As4K8QqjAqQC8QqkAvIK7grsCscE7grHBMgE8AruCsgE8ArIBKkD2ApbCHIF2ApyBesKWwjYCosKWwiLCiEJMwsoCy0JMwstCWkIaQgtCfkGaQj5Bp0FnQX5BpMFnQWTBeED4QOTBXkF4QN5BbgDuAN5BdsGuAPbBikGKQbbBiYJKQYmCVgIWAgmCd8KWAjfCtQK2wZ5BX8F2wZ/Bd4GfwWSBT4GfwU+BjsG+QYtCWgI+QZoCPYGMwtpCFgIMwtYCNQKaQidBSkGaQgpBlgInQXhA7gDnQW4AykG3womCV0I3wpdCOkKkwX5BvYGkwX2BpIFJgnbBt4GJgneBl0ILQkoCycLLQknC2gIeQWTBZIFeQWSBX8F3QY7BuoG3QbqBrYH6QpdCF8I6QpfCOgK3gZ/BTsG3gY7Bt0GkgX2BvUGkgX1Bj4GaAgnCyMLaAgjC2cIXQjeBt0GXQjdBl8I9gZoCGcI9gZnCPUGJwm2B7cHJwm3BygJPgb1BsEHPgbBB/EG9QZnCCoJ9QYqCcEHXwjdBrYHXwi2BycJOwY+BvEGOwbxBuoGZwgjCx0LZwgdCyoJ6ApfCCcJ6AonCfwK6gbxBvMG6gbzBusGKgkdCx4LKgkeCykJ/AonCSgJ/AooCQALtgfqBusGtgfrBrcH8QbBB8IH8QbCB/MGwQcqCSkJwQcpCcIHfwcJCHgHfwd4B7AGGAgzCLYGGAi2BoEHCQZ/B7AGCQawBkYFDQh+B3wH6AjkCOUI6AjlCAYIGAgNCOwIGAjsCD4KsAcmBm0FPgrsCAoIPgoKCD8K5Ag2CjcK5Ag3CuUIPwoKCDgKjQcRBgsGewrTCrAHewqwB40HeAd+B7EGeAexBrAGCwYRBkcFCwZHBUYFCgjlCDcKCgg3CjgKsQYLBkYFsQZGBbAGEAYJBkYFEAZGBUcFbAUQBkcFbAVHBbYEgQe2BgsGgQcLBrEGMwh5CnoKMwh6Co0HfAcGCOUIfAflCAoIfgeBB7EGfgd4BwYIfgcGCHwHtgYzCI0HtgaNBwsGegp7Co0HgQd+Bw0IgQcNCBgICQjoCAYICQgGCHgH7AgNCHwH7Ah8BwoIPgp5CjMIPgozCBgIjQewB20FjQdtBREGbQUmBmwFbQVsBbYE5AjoCAwI5AgMCOsIbAUmBhwGbAUcBhsGsAfTCr4KsAe+Cq0HfwcJBrIGfweyBoAHCQYQBgoGCQYKBrIGCQh/B4AHCQiABxQIJgawB60HJgatBxwGNgrkCOsINgrrCD0K6AgJCBQI6AgUCAwIEAZsBRsGEAYbBgoGgAeyBoIHgAeCByMIHAatB0UIHAZFCJ8HFAiAByMIFAgjCBwIsgYKBoYHsgaGB4IHPQrrCPMIPQrzCEQKDAgUCBwIDAgcCBcICgYbBpQHCgaUB4YH6wgMCBcI6wgXCPMIrQe+CrEKrQexCkUIGwYcBp8HGwafB5QHRQixCpQKRQiUChkJlAefBzwIlAc8CDUIIwiCBykIIwgpCCQInwdFCBkJnwcZCTwIHAgjCCQIHAgkCPwIggeGBy8IggcvCCkIRArzCPsIRAr7CEgKFwgcCPwIFwj8CPoIhgeUBzUIhgc1CC8I8wgXCPoI8wj6CPsIEwkZCZQKEwmUCm0K/QgCCU0K/QhNCkoKBgkMCWIKBgliClUKDAkTCW0KDAltCmIKPAgZCRMJPAgTCTUINQgTCQwJNQgMCS8IAgkGCVUKAglVCk0KLwgMCQYJLwgGCSkIKQgGCQIJKQgCCSQI+wj9CEoK+whKCkgKJAgCCf0IJAj9CPwI+wj6CPwI+wj8CP0IUwVHBUsFXgVVBREGbQW2BGgFTgVVBRUGXgVpBWgFXgVoBVQFaAVnBVMFaAVTBVQFTgVVBVQFTgVUBU0FUwVMBU0FUwVNBVQFVQVeBVQFSwVMBVMFSwVIBU0FSwVNBUwFSAVOBU0FBgIFAlkBBgJZAVsB/wH6AfsB/wEGAlsBHQMEAwUDHQMFAy8E/gH6AVoBMgQdAy8E+gH/AVsB+gFbAVoBBAP+AQUDGAQBAwgDGAQIAxYDHQMyBCYEMgQaAy0EBgL/AfsBBgL7AQYD/gEEAxQE/gEUBPoCGgMGAgYDGgMGAy0E+gH+AfoCBAMdAyYEBAMmBBQE+gL5AvoBJAQuBDIEJAQyBC0EBwMkBC0EBwMtBAYD+wEAAwYDqBOnE6USqBOlErcT/AL4AvkC/AL9AgID/AICAwECEgQZBAsDEgQLAwID/AIBAgQCGQQlBBcDGQQXAwsDJQQYBBYDJQQWAxcDAQP8AgQCAQMEAggD/QISBAIDJgQlBBkEJQQkBBgE/QITBBIE+wL4AvwC+QL9AvwCEwQmBBkEEwQZBBIE+QL4AvoB+AL8AfoBGwMYAxwDGwMcAx4DJgQYAxsDJgQbAyUEEwQMAxgDEwQYAyYEFAQNAwwDFAQMAxMEJgQcAw0DJgQNAxQELgQeAxwDLgQcAyYEJQQbAx4DJQQeAy4E/AEAAv8B+wIAAvwB+wL8AfgCAAMIAgACAAMAAvsCAAMHAggC+wH/AQcC+wEHAgAD/AH/AfsBCAIVAxoDCAIaAwcCJAQVAwgCJAQIAgcDJQQbAxUDJQQVAyQELgQbAyUEJAQaAxsDJAQbAy4EBwMHAhoDBwMaAyQEBwMIAgcCAwMCAgMCAwMDAgQD/QICAgMD/QIDAxME+QL9AQIC+QICAv0C+gIDAv0B+gL9AfkCFAQEAwMCFAQDAvoCEwQDAwQDEwQEAxQEWQFVAVoBWQFaAVsB7APiAvAC7APwAusFXA5PDqgPXA6oD4oQ2wPiAuwD2wPsA+cE9wTqBJEF9wSRBUUG8ASRBeoE8ATqBO0D7QPbA+cE7QPnBPAExAUFB/gGxAX4BkAGtQUABwUHtQUFB8QFQAb4BsoHQAbKB00GQQYAB7UF8ALiAt8BtQXEBdsFtQXbBRcFygfPB2YGygdmBk0GmxGXEZcTmxGXE4wSmwXwBOcEmwXnBOwDgAvtB+EHgAvhB2IL2wXEBWYG2wVmBn8GCwX3BLUFCwW1BRcFRQaRBfAERQbwBEwGPwb3BEUGzwfVB38Gzwd/BmYG3wG+AOgC3wHoAvACIwfgB9UHMgczByIHMgciBxIHMwfgByMHMwcjByIHEwcjB9UHEwfVB88H+AYTB88H+AbPB8oHIgcjBxMHIgcTBwUHBQcABxIHBQcSByIHQQY/BkUGQQZFBgAHTAYSBwAHTAYAB0UGMgcSB0wGMgdMBnEGxA/OD3UOxA91DnIOrwtwBusFrwvrBaULXA5iC0ALXA5AC08O7gksCSsJ7gkrCe0J7QkrCdQH7QnUB08LcQZwBq8LYQtPC9QHYQvUB+AH1AfVB+AH1QfUBysJ1QcrCSwJBQcTB/gGQAvuCe0JQAvtCU8LCgT4Ae8BCgTvAQcEFQQBBi8EFQQvBAUD9wEVBAUD9wEFA/4BVQH3Af4BVQH+AVoB8QLiAu0D8QLtA/wDQQa1BfcEQQb3BD8GTQZmBsQFTQbEBUAG1QcsCe4J1QfuCUALUQvxCfQJUQv0CYELgQv0CXcIgQt3CKgLKgwxCjIKKgwyCi0M+gfZCLAJ+gewCdYIjgaTBsgIjgbICPQHdAaOBvQHdAb0B/EHAQdOBuMHAQfjB3cIpAV0BvEHpAXxB+gHkwb6B9YIkwbWCMgITgafBeIHTgbiB+MHtgm4CTEKtgkxCrQJ2Qi2CbQJ2Qi0CbAJnwWkBegHnwXoB+IHMwoxDDMMMwozDDQK8QnyCTAJUguECwIKUgsCCvIJqgmoCS0KqgktCi8KBgwFDC8KMAouCgUMMAoFDCQMsgvOCyYKsgsmChQKgwuyCxQKgwsUCgEKgwsBCgIKgwsCCoQLzgvyCy0KzgstCiYKIQUwBCoEaweoBmoHFwMWAwkDFwMJAwoDCwMXAwoDqROAFIUUqROFFLgTCgMCAwsDAgMKAwECAQIKAwkDAQIJAwQCjAqhCtgJjArYCdcJoQqOCtgJjgpWCsoJjgrKCdgJVgpUCskJVgrJCcoJVApPCsQJVArECckJTwpQCsUJTwrFCcQJUApRCsYJUArGCcUJUQpXCssJUQrLCcYJVwqQCtoJVwraCcsJkAquCuEJkArhCdoJrgq8Ck4IrgpOCOEJxAnFCcYJxAnGCcsJygnJCcQJygnECcsJ2AnKCcsJ2AnLCdkJ3gnYCdkJ3gnZCeEJTgjdCd4JTgjeCeEJ3QlOCNcJ3gndCdcJ3gnXCdgJywnaCdkJ2QnaCeEJqwkSDAgMqwkIDM4IHAysCdcIHAzXCBsM8wtcB6kJ8wupCfQLEgyrCckIEgzJCPkLHwz0C6kJHwypCa0JrQmpCckIrQnJCKsJrgm1CbMJrgmzCawJtQkoDCcMtQknDLMJIAyuCawJIAysCRwMHwytCa8JswknDLIJrQmrCc4IrQnOCK8JGwzXCNMIGwzTCBMMsgknDCUMsgklDLEJ1wiyCbEJ1wixCdMIsQmvCc4IsQnOCNMIJQwfDK8JJQyvCbEJEwzTCM4IEwzOCAgMyQDVAD0AyQA9AC8AXQEzBB8DXQEfA+MANACvAC0ANAAtAAcASAA7AAgASAAIAAoA1QDfAEcA1QBHAD0ArwC9AL4ArwC+AC0ASgBIAAoASgAKAAsA8QrwCqkD8QqpA6MC7ArrCnIF7ApyBccEewt8C1UJewtVCVQJVAlVCZUIVAmVCJQIlAiVCK4IlAiuCK0IrQiuCMYIrQjGCMUIxQjGCKYJxQimCaUJpQmmCecLpQnnC+YLjgmPCdALjgnQC88LkAmRCdILkAnSC9ELlAmVCdcLlAnXC9YLmQmaCdsLmQnbC9oLnQmeCd4LnQneC90LoQmiCeILoQniC+ELrwiwCI8JrwiPCY4Jswi0CJMJswiTCZIJtgi3CJcJtgiXCZYJuwi8CJwJuwicCZsJwAjBCKAJwAigCZ8JwwjECKQJwwikCaMJlwiYCLAIlwiwCK8ImwicCLQImwi0CLMInwigCLcInwi3CLYIowikCLwIowi8CLsIpwioCMEIpwjBCMAIJwooChgKJwoYChcKqwisCMQIqwjECMMIfAh9CJgIfAiYCJcIfgh/CJoIfgiaCJkIgwiECJ4IgwieCJ0IlAmTCRkKhwiICKIIhwiiCKEIigiLCKYIigimCKUIjwiQCKoIjwiqCKkIOwk8CX0IOwl9CHwIPQk+CX8IPQl/CH4ImQmYCRwKQglDCYQIQgmECIMIeAsAChEKeAsRCpULRglHCYgIRgmICIcISglLCYsISgmLCIoI/gl3C5ML/gmTCw8KTwlQCZAITwmQCI8IZQtmCzwJZQs8CTsJdQv9CQ0KdQsNCpILagtrC0EJagtBCTQJbQtuC0UJbQtFCTUJ/AlzC5AL/AmQCwwKcgtzC0kJcgtJCTYJoQmgCSIKoQkiCiMKdgt3C04JdgtOCTcJcQv7CQoKcQsKCo8LeQt6C1MJeQtTCTgJ+glvC40L+gmNCwkKsQiZCGcJbAv5CQcKbAsHCowL9wlrC4oL9wmKCwYKtAidCGoJtAhqCWkJaAv2CQUKaAsFCokLnwiFCGsJ9QlmC4cL9QmHCwQKuAihCG4JuAhuCW0JUgmSCGQJowiICG8JowhvCXAJkAhRCWIJvQilCHIJTQmOCGEJpwiMCHQJpwh0CXUJPAk9CX4IPAl+CH0IfQh+CJkIfQiZCJgIjAhMCV8JwQipCHcJwQh3CXYJjwmQCdELjwnRC9ALSQmJCF4JqwiRCHkJiAhHCVwJaAtqCzQJaAs0CT4JKwosCiUKKwolCiQKmgibCLMImgizCLIIsgizCJIJsgiSCZEJRQmGCFsJkgirCHkJkgh5CXoJhAhECVkJQQlCCYMIQQmDCIIIggiDCJ0IggidCJwIUQlSCRIK+An3CQYK+AkGCgcKkwmUCdYLkwnWC9ULbAttCzUJbAs1CUMJ+wn6CQkK+wkJCgoKngifCLYIngi2CLUItQi2CJYJtQiWCZUJkgh6CWQJRwlICQsKkQiQCGIJkQhiCXkJRQlGCYcIRQmHCIYIhgiHCKEIhgihCKAIogmhCSMKlwmZCdoLlwnaC9kLjgiNCHUJjgh1CWEJqQjCCHgJqQh4CXcJTAlNCQ4KjAhfCXQJcQtyCzYJcQs2CUcJAAr/CRAKAAoQChEK/wn+CQ8K/wkPChAKogijCLsIogi7CLoIugi7CJsJugibCZoJiQhxCV4JiAhcCW8JSQlKCYoISQmKCIkIiQiKCKUIiQilCKQInAmdCd0LnAndC9wLhghsCVsJhQiECFkJhQhZCWsJdQt2CzcJdQs3CUsJpginCMAIpgjACL8IvwjACJ8JvwifCZ4JjQinCHUJmwjzB+8HmwjvB4EITglPCY8ITgmPCI4IjgiPCKkIjgipCKgIoAmhCeELoAnhC+ALwgiMCXgJwQh2CYoJeAt5CzgJeAs4CVAJqgirCMMIqgjDCMIIwgjDCKMJwgijCaIJvgiJCXMJpAmlCeYLpAnmC+ULxAjFCKUJxAilCaQJrAitCMUIrAjFCMQIkwiUCK0IkwitCKwIUwlUCZQIUwmUCJMIegt7C1QJegtUCVMJUQlQCTgJ/gn/CU8J/glPCU4JTQlMCUsJTQlLCTcJ/AlKCUkJSAlHCTYJ+gn7CUYJ+glGCUUJRAlDCTUJ9wn4CUIJ9wlCCUEJQAk/CT4JQAk+CTQJ9Qk9CTwJkQirCKoIqQjBCKgIjAinCKYIpQi9CKQIiAijCKIIoQi4CKAIhQifCJ4InQi0CJwIgAibCJoImQixCJgIKwqiCaMJIQogCp4JIQqeCZ8JHgodCpoJHgqaCZsJmAmZCZcJKQqVCZYJKAonCpEJKAqRCZIJJwrTC9ILJwrSC5EJ1QsoCpMJKQrXC5UJ2QsqCpcJHQrCC9sLHQrbC5oJxAsfCpwJxAucCdwLIArfC94LIAreC54J4AshCqAJKwriC6IJ5AssCqQJ5AukCeULsAiQCY8JuAiYCZcJuAiXCbcImQm6CJoJvAidCZwJngm+CL8IsQiwCJgIuAi3CKAIugi5CKIIvQi8CKQIvgimCL8IgAiaCH8IgQiCCJwIhAiFCJ4IjAimCIsIjQiOCKgIkAiRCKoIkgiTCKwIPwmACH8IPwl/CD4JgghACUEJRAmECEMJTAmMCIsITAmLCEsJjghNCU4JUQmQCFAJkghSCVMJkghTCZMIZgv1CTwJ9gloCz4Jawv3CUEJ+QlsC0MJbwv6CUUJbwtFCW4L+wlxC0cJcwv8CUkJ/Ql1C0sJdwv+CU4JAAp4C1AJ9Qn2CT4J9Qk+CT0JsgiZCJoIQAk0CUEJmwiBCJwIKAqSCZMJ+An5CUMJ+AlDCUIJtQidCJ4IRQlECTUJnwiGCKAIKgopCpYJKgqWCZcJ+wlHCUYJuQihCKIISQlICTYJowiJCKQIHwoeCpsJHwqbCZwJ/An9CUsJ/AlLCUoJvgilCKYITQk3CU4JpwiNCKgIIQqfCaAJ/wkAClAJ/wlQCU8JwgipCKoIUglRCTgJUgk4CVMJqwiSCKwILAorCqMJLAqjCaQJGAq+C70LGgobCsELGgrBC8ALHgofCsQLHgrEC8MLIQrHC8YLJAolCsoLJArKC8kLfwmACZEJfwmRCZAJggmDCZQJggmUCRkKhQmGCZkJhQmZCRwKiAmJCZ4JiAmeCZ0JiwmMCaIJiwmiCSMKZwloCYAJZwmACX8JagmDCYIJbgmGCYUJcglzCYkJcgmJCYgJdwl4CYwJdwmMCYsJggiBCO8HggjvB+oHWglbCWwJWglsCWsJXQleCXEJXQlxCXAJYAlhCXUJYwlkCXoJYwl6CXkJggjqB0AJCApFCVsJCApbCVoJCwpJCV4JCwpeCV0JDgpNCWEJDgphCWAJEgpSCWQJEgpkCWMJiAuJCwUKiAsFCgQKiwuMCwcKjguPCwoKkQuSCw0KkQsNCgwKlAuVCxEKlAsRChAKQAnqB+QHQAnkB+kHQAnpBz8JhwuICwQKZwl/CX4Jfgl/CZAJPwnpB4AIgAjpB+4HgAjuB/MHgAjzB5sIFwoYCr0LFwq9C7wLiguLCwcKigsHCgYKaQlqCYIJaQmCCYEJgQmCCRkKgQkZCpMJRAkICloJRAlaCVkJWQlaCWsJGgrAC78LjQuOCwoKjQsKCgkKbQluCYUJbQmFCYQJhAmFCRwKhAkcCpgJRwkLCl0JRwldCVwJXAldCXAJXAlwCW8JHQoeCsMLHQrDC8ILkAuRCwwKcgmICYcJhwmICZ0JTAkOCmAJTAlgCV8JXwlgCXUJXwl1CXQJIAohCsYLIArGC8ULkwuUCxAKkwsQCg8Kdgl3CYsJdgmLCYoJigmLCSMKigkjCiIKUQkSCmMJUQljCWIJYgljCXkJJArJC8gL9gn1CQQK9gkECgUKmQiyCGgJmQhoCWcJ+Qn4CQcK0wsnChcK0wsXCrwLnQi1CGoJKArVC74LKAq+CxgKlQmUCRkK1wspChoK1wsaCr8LKgrZC8ELKgrBCxsKRAlFCQgK3wsgCsULhgifCGsJhghrCWwJIQrgC8cLKQoqChsKKQobChoK4gsrCiQK4gskCsgLLArkC8oLLArKCyUKkAmwCH4JsgiRCYAJkwm0CIEJoQi5CG4JtQiVCZQJtQiUCYMJmAm4CIQJugiZCYYJnQm8CIcJvgieCYkJSAlJCQsKoAnBCIoJoAmKCSIKiQijCHAJiQhwCXEJwgiiCYwJsAixCGcJsAhnCX4JsgiACWgJtAhpCYEJtQiDCWoJ/Qn8CQwK/QkMCg0KuAhtCYQJpQi+CHMJpQhzCXIJuQi6CIYJuQiGCW4JvAi9CHIJvAhyCYcJjgnPC7sLfAiXCFcJlwivCH0JZQs7CYYLrwiOCX0JOwl8CFcJjgm7C7oLjgm6C40JVwmXCJYIVwmWCFYJlwh9CXwJlwh8CZYIhgs7CToJhgs6CYULfQmOCY0JfQmNCXwJOwlXCVYJOwlWCToJOglWCQMKjQm6CxYKVgmWCGYJlgh8CWYJhQs6CQMKfAmNCRYKAwpWCVgJAwpYCRMKFgq6C7MLFgqzCxUKVglmCWcJVglnCVgJZgl8CX8JZgl/CWcJhQsDChMKhQsTCogLfAkWChUKfAkVCn8JRgiyCrMKRgizCkcIVAjBCrIKVAiyCkYIcAhDC0ILcAhCC28IRghHCM4GRgjOBs0GVAhGCM0GVAjNBl8FcAhvCAYHcAgGBwcHVwYHBwYHVwYGB1YGzgZgBV8FzgZfBc0GjwKYApcCjwKXApYDmAKgAaYBmAKmAZcCvQHPAs4CvQHOArwBwwfAB84CwwfOAu8DvAe5B6YBvAemAawBuQdeCJcCuQeXAqYBXghUCF8FXghfBbcEwwcYCxULwwcVC8AHvAcKCwcLvAcHC7kHuQcHC+oKuQfqCl4IXgjiCsEKXgjBClQIvgcSCwoLvgcKC7wHvge8B6wBvgesAbwBoAGtAawBoAGsAaYBxQckCxgLxQcYC8MHxQfDB+8DxQfvA/kEzwLwA+8DzwLvA84CyQfFB/kEyQf5BFYGbwjJB1YGbwhWBgYHyQcvCyQLyQckC8UH8AP6BPkE8AP5BO8D+gRXBlYG+gRWBvkEXgjqCuIKXgi3BJYDYAWKA7cEYAW3BF8FbwhCCy8LbwgvC8kHxgYTBlYFogSQAoQCogSEAn0DjAGYAQwBIQHJATcBIQE3ASAB4wLXAuQC0AHjAuwC0QcJBxUH+wRoBrwF+wS8BQAEkQKZApACFAfQB3QIXgYIB2gGpQpJCEgIpQpICKQKpgoeCUoIpgpKCKUKmAGZAaEBFAd0CHkIFAd5CCUHqAo+CCAJqAogCacK0AdxCHUIpApICD0IpAo9CKMKEwGuASMBGAd2CPMJGAfzCRcHFgcyCTEJFgcxCdEHFgfRBxUHAQS9BQcFAQQHBfoDJAGwARUB/QStBV8G/QRfBvwE/AReBmgG/ARoBvsE1AHtAvoD1AH6A9MB0gH2A/UD0gH1A9EB0QH1A+UCJQE4ATEBJQExASQBIwEvAcMBIwHDASIBIgHCAckBIgHJASEBkAENARUBkAEVAY8BjgEUARMBjgETAY0BjQETAZoBgQOIAo0DgQONA6YEpASMA5ICpASSAqMEowSRApACowSQAqIEygZYBaYEygamBMkGyAZXBaQEyAakBMcGxwakBBcGpgRjBWIFpgRiBVcF+gP3A/YDMQnvCUQLMQlEC1YLHgnHBkoIHwnIBscGHwnHBh4JPgjKBskGPgjJBiAJSAjGBj0IFgajBKIEFgaiBBMGpASjBBcGVwtGC/AJVwvwCfMJWAWBA6YEEwaiBH0DEwZ9A1YFjAONAZIClAOOAY0BlAONAYwDiAKQAY8BiAKPAY0DkAKMAYQCoQEiASEBoQEhAZgBEwEjASIBEwEiAZoBkAKZAowBDQElASQBDQEkARUBmAEhASABmAEgAQwBLwHRAcMBMAHSAdEBMAHRAS8BOAHUAdMBOAHTATEByQHQATcB5AL8BPsE5AL7BOMC9QP9BPwE9QP8BOUC7QIBBPoD4wL7BAAE4wIABOwCjQGbApICrQUWBxUHrQUVB18GrgUWB60FvQUYBxcHvQUXBwcFaAYUB7wFdQhVC1QLdQhUC9AHMQlWC1ULMQlVC9EHdghYC1cLdghXC/MJ0AdUC1ML0AdTC3QI0QdVC3UI5QL8BOQCmgEiAaEBkgKbApECFwajBBYGXwYJB14GaAYIB8sHaAbLBxQHowSSApECIgHDAcIB/ARfBl4GFQcJB18GpQpKCEkIpARhBbAExgalB88GxgbPBhMGBwUXBxYHBwUWB64FpgSyBGMFMQHTAdIBMQHSATABlAO9BI0DjQOPAY4BjQOOAZQDFwbRBqcHFwanB8cGIAnJBsgGIAnIBh8JHgnjCeQJHgnkCR8JyQamBFcFyQZXBcgGjwEVARQBjwEUAY4B0wH6A/YD0wH2A9IBrgWvBQcFFwfzCTIJFwcyCRYHwwHKAcIBtQrkCeMJtQrjCbQKzAdxCNAHzAfQB8sH/gSuBa0F/gStBf0E2ALkAtcCrwG+AbYBrwG2Aa4BmgKZAZgBmgKYAZkCsQSUA7sEsQS7BLAEpgfQBs8GpgfPBqUHSQimB6UHSQilB6AHYgWxBLAEYgWwBGEFkQKaApkCpwGvAa4BwgHYAtcCwgHXAskB9gP+BP0E9gP9BPUDXgbMB8sHXgbLBwgHLwlFC0QLLwlEC+8JCQfMB14GygHRAdgCygHYAsIBmwKaApECoQenB6YHoQemB0kIpwfRBtAGpwfQBqYHmwKaAZkBmwKZAZoC0QHZAuQC0QHkAtgCCQfRB3EICQdxCMwH8AlGC0UL8AlFCy8J9wP/BP4E9wP+BPYDsAGvAacBYwWyBLEEYwWxBGIFsgS9BJQDsgSUA7EEsAG3Ab4BsAG+Aa8B/wSvBa4F/wSuBf4EtgrlCeQJtgrkCbUK5ALZAuUCFAfLB9AHEwbPBtAGEwbQBhYGBwWvBf8EBwX/BPoDSgihB0kIFgbQBtEGFgbRBhcG8wnwCS8J8wkvCTIJFQGwAacBFQGnARQB0QHKAcMB5QLZAtEByQHXAtABMgkvCe8JMgnvCTEJ0AHXAuMCFAGnAa4BFAGuARMBMQG3AbABMQGwASQBMAG+AbcBMAG3ATEBIwGuAbYBIwG2AS8BjAO7BJQDdQhxCNEHSQigB0gIIAnlCbYKIAm2CqcKVwViBWEFVwVhBaQEoQGZAZoBpgq0CuMJpgrjCR4JLwG2Ab4BLwG+ATABxwanB6EHxwahB0oIHwnkCeUJHwnlCSAJmgGbAo0BSAigB6UHSAilB8YG+gP/BPcDjAGZApgBjQO9BLIEjQOyBKYEpASwBLsEpAS7BIwDvAUUByUHvAUlB80FAAS8Bc0F7AIABOcB0AHsAucB0AHnAUABNwHQAUABNwFAAbEAIAE3AbEAIAGxAI8ADAEgAY8ADAGPAGwAjAEMAWwAjAFsAPUAhAKMAfUAhAL1AHcBfQOEAncBVgV9A1AFxgZWBVAFxgZQBb0GPQjGBr0GPQi9BjcIowo9CDcIowo3CJYKPgioCpcKPgiXCjgIygY+CDgIygY4CL4GWAXKBr4GWAW+BlEFgQNYBVEFiAKBA3gBkAGIAngBkAF4AfYADQGQAfYADQH2AG0AJQENAW0AJQFtAJAAOAElAZAAOAGQALIA1AE4AbIA1AGyAEEB7QLUAUEB7QJBAegBAQTtAugBvQUBBM4FGAe9Bc4FGAfOBSYHdAhTC2QLdAhkC3kIdggYByYHdggmB3oIWAt2CHoIWAt6CGkLegh7CGoLeghqC2kLeQh4CCQHeQgkByUHlwqYCjkIlwo5CDgIvQa8BjYIvQY2CDcIvga/BlIFvgZSBVEFfQN8A08FfQNPBVAFgQOCA4ABgQOAAXgBOAg5CL8GOAi/Br4G9QD0AH8B9QB/AXcBNwg2CJUKNwiVCpYK9gD3AG4A9gBuAG0AUQVSBYIDUQWCA4EDjwCOAGsAjwBrAGwAUAVPBbwGUAW8Br0GkACRALMAkACzALIAeAGAAfcAeAH3APYAQAE/AbAAQAGwALEAdwF/AXwDdwF8A30DQQFCAekBQQHpAegBbQBuAJEAbQCRAJAAAAT/A+YBAATmAecBbABrAPQAbAD0APUAAQQCBM8FAQTPBc4FsgCzAEIBsgBCAUEBJQckB8wFJQfMBc0FsQCwAI4AsQCOAI8AJgcnB3sIJgd7CHoI6AHpAQIE6AECBAEEZAtjC3gIZAt4CHkI5wHmAT8B5wE/AUABzgXPBScHzgUnByYHzQXMBf8DzQX/AwAEjgCtAaABjgCgAWsAeAhwCAcHeAgHByQHTwVgBc4GTwXOBrwGPwHPAr0BPwG9AbAAfwGPAooDfwGKA3wD/wP6BPAD/wPwA+YBawCgAZgCawCYAvQAJAcHB1cGJAdXBswFvAbOBkcIvAZHCDYIsAC9Aa0BsACtAY4AYwtDC3AIYwtwCHgIfAOKA2AFfANgBU8F5gHwA88C5gHPAj8B9ACYAo8C9ACPAn8BzAVXBvoEzAX6BP8DNghHCLMKNgizCpUKwAe+B7wBwAe8Ac4CwAcVCxILwAcSC74HrQG9AbwBrQG8AawBXgiWA5cCigOPApYDigOWA7cEwATjCsIKwATCCtQGuAIMC+MKuALjCsAE6gEfCwwL6gEMC7gC4AVrCx8L4AUfC+oBmgUqCzkLmgU5C6MF0AKaBaMF0AKjBdwCOAYICyoLOAYqC5oFowE4BpoFowGaBdAClQeaCggLlQcICzgGmwSVBzgGmwQ4BqMB7wdHB+sH7wfrB+oH8wdGB0cH8wdHB+8H7gdFB0YH7gdGB/MH6Qc+B0UH6QdFB+4H6Qc1Bz4H5AflBzUH5Ac1B+kH6gflB+QH6gfrB+UHRwc/B+sHRgeQBkcHRQeGBpAGRQeQBkYHPgeBBoYGPgeGBkUHNQeBBj4H5Qc2B4EG5QeBBjUH5QfmBzYH6wc/B+YH6wfmB+UHRwdABz8HkAaHBkAHkAZAB0cHhgb4BYcGhgaHBpAGgQbtBfgFgQb4BYYGgQZ1Bu0FNgcoB3UGNgd1BoEG5gcoBzYHPwdAB+YHhwaIBkAH+AX5BYgG+AWIBocG7QX5BfgFdQZ2Bu0FKAd2BnUG5gc3BygHQAc3B+YHQAeJBkEHiAaJBkAH+QXuBYkG+QWJBogG7QXhBe4F7QXuBfkFdgZ3BuEFdgbhBe0FKAcpB3cGKAd3BnYGNwcpBygHQAdBBzcHiQaKBjgHiQY4B0EHiQb6BYoG7gXvBfoF7gX6BYkG4QXiBe8F4QXvBe4FdwZ4BuIFdwbiBeEFKQcqB3gGKQd4BncGNwcqBykHQQc4ByoHQQcqBzcHigaLBjkHigY5BzgH+gX7BYsG+gWLBooG7wXwBfsF7wX7BfoF4gXjBfAF4gXwBe8FeAZpBuMFeAbjBeIFKgcZB2kGKgdpBngGKgcrBxkHOAc5BysHOAcrByoHiwaCBjoHiwY6BzkH+wXyBYIG+wWCBosG8AXxBfIF8AXyBfsF4wXkBfEF4wXxBfAFaQZqBuQFaQbkBeMFGQcaB2oGGQdqBmkGKwcsBxoHKwcaBxkHOQc6BywHOQcsBysHggaDBi0HggYtBzoH8gXzBYMG8gWDBoIG8QXmBfMF8QXzBfIF5AXQBeYF5AXmBfEFagZrBtAFagbQBeQFGgcbB2sGGgdrBmoGLActBxsHLAcbBxoHOgctBywHgwaEBi4HgwYuBy0H8wX0BYQG8wWEBoMG5gXnBfQF5gX0BfMF0AXRBecF0AXnBeYFawZhBtEFawbRBdAFGwcKB2EGGwdhBmsGLQccBwoHLQcKBxsHLQcuBxwHhAZ5Bi8HhAYvBy4H9AXoBXkG9AV5BoQG5wXoBfQF0QXSBegF0QXoBecFYQZiBtIFYQbSBdEFCgcLB2IGCgdiBmEGHAcdBwsHHAcLBwoHLgcvBx0HLgcdBxwHeQZ6BjAHeQYwBy8H6AXpBXoG6AV6BnkG6AXTBekF0gW+BdMF0gXTBegFYgZjBr4FYga+BdIFCwcMB2MGCwdjBmIGHQceBwwHHQcMBwsHLwcwBx4HLwceBx0HegZ7Bh8HegYfBzAH6QXqBXsG6QV7BnoG0wXUBeoF0wXqBekFvgW/BdQFvgXUBdMFYwZYBr8FYwa/Bb4FDAcNB1gGDAdYBmMGHgcNBwwHMAcfBw0HMAcNBx4HewZ8BiAHewYgBx8H6gXVBXwG6gV8BnsG1AXVBeoFvwXABdUFvwXVBdQFWAZZBsAFWAbABb8FDQcCB1kGDQdZBlgGDQcOBwIHHwcgBw4HHwcOBw0HfAZsBiEHfAYhByAH1QXWBWwG1QVsBnwG1QXBBdYFwAXBBdUFWQZaBsEFWQbBBcAFAgdaBlkGDgcPB1oGDgdaBgIHIAchBw8HIAcPBw4HbAZtBhAHbAYQByEH1gXXBW0G1gVtBmwGwQXCBdcFwQXXBdYFwQWwBcIFWgZbBrAFWgawBcEFDwcDB1sGDwdbBloGIQcQBwMHIQcDBw8HbQZuBhEHbQYRBxAH1wXYBW4G1wVuBm0GwgXDBdgFwgXYBdcFsAWxBcMFsAXDBcIFWwajBbEFWwaxBbAFWwZHBqMFAwcEB0cGAwdHBlsGEAcRBwQHEAcEBwMHwwWxBQ8F2AXDBQ8FYgNdAlwCigKJAoECXQJmAVwCgQKPA44DYwNiA4oEiwKKAoMCqQSHA6oEVwJeA2QDZgFkAWcBjwOFA44DXgNjA2QDZQFiAVICZQFSAlcCZAFiAWUBZAFhAWIBZgFjAWEBZgFhAWQBXQJWAmMBXQJjAWYBYgNcA1YCYgNWAl0CYwODBFwDYwNcA2IDYwNdA4MEXgNdA2MDVwJSAl0DVwJdA14DYgFNAlICYgFgAU0CYQFfAWABYQFgAWIBYwFhAV8BVgJRAmEBVgJhAWMBXANYA1ECXANRAlYCXAN/BFgDgwR/BFwDXQNZA38EXQN/BIMEUgJNAlkDUgJZA10DYAFeAUYCYAFGAk0CXwFeAWABYQFMAl8BUQJLAkwCUQJMAmEBUQJUA0sCWANUA1ECfwR6BFQDfwRUA1gDWQN7BHoEWQN6BH8EWQNVA3sETQJGAlUDTQJVA1kDRgIyAjsDXgExAjICXgEyAkYCXwFFAjECXwExAl4BTAJEAkUCTAJFAl8BSwJEAkwCVANEAksCegR5BFQDegRwBHkEewRwBHoEVQNOA3AEVQNwBHsERgI7A04DRgJOA1UDMgIbAjgDMgI4AzsDMQIbAjICRQIwAjECRAIwAkUCVANNA0QCVANvBE0DeQRvBFQDcARvBHkEcARaBG8ETgNaBHAEOwM4A1oEOwNaBE4DGwIaAjgDMQIaAhsCMAIaAjECRAJDAjACTQNMA0MCTQNDAkQCbwRuBEwDbwRMA00DbwRZBG4EWgRZBG8EWgROBFkEOANOBFoEGgIpAzgDGgIZAikDMAIZAhoCMAIvAhkCQwIvAjACWQRBBVgEWQRYBG4EWQRNBEEFTgQ8BE0ETgRNBFkEOAMpAzwEOAM8BE4EGQIYAigDGQIoAykDLwIuAhgCLwIYAhkCQwJCAi4CQwIuAi8CTANLA0ICTANCAkMCbgRtBEsDbgRLA0wDWARXBG0EWARtBG4EQQVABVcEQQVXBFgETQRMBEAFTQRABUEFPAQ7BEwEPARMBE0EKQMoAzsEKQM7BDwEGAIWAiYDGAImAygDLgIsAhYCLgIWAhgCQgJBAiwCQgIsAi4CSwNJA0ECSwNBAkICbQRrBEkDbQRJA0sDVwRVBGsEVwRrBG0EQAU+BVUEQAVVBFcETARKBD4FTAQ+BUAFOwRKBEwEKAMmA0oEKANKBDsEFgIUAiQDFgIkAyYDFgIqAhQCLAIqAhYCQQJAAioCQQIqAiwCSQNHA0ACSQNAAkECawRpBEcDawRHA0kDVQRpBGsEPgU8BWkEPgVpBFUESgQuBTwFSgQ8BT4FSgRJBC4FJgMkA0kEJgNJBEoEJAM1AyIDFAISAjUDFAI1AyQDKgIoAhICKgISAhQCQAI+AigCQAIoAioCRwNFAz4CRwM+AkACaQRnBEUDaQRFA0cDPAU6BWcEPAVnBGkELgUsBToFLgU6BTwFSQRHBCwFSQQsBS4FJAMiA0cEJANHBEkENQMzAyIDEgIQAjMDEgIzAzUDKAImAhACKAIQAhICPgJDAyYCPgImAigCRQNDAz4CZwRlBEMDZwRDA0UDOgU4BWUEOgVlBGcELAUqBTgFLAU4BToFRwRFBCoFRwQqBSwFIgMzA0UEIgNFBEcEEAIOAjEDEAIxAzMDJgIkAg4CJgIOAhACQwNBAyQCQwMkAiYCZQRjBEEDZQRBA0MDOAU2BWMEOAVjBGUEKgUoBTYFKgU2BTgFRQRDBCgFRQQoBSoFMwMxA0MEMwNDBEUEDgIMAi8DDgIvAzEDJAIiAgwCJAIMAg4CJAI5AiICQQM5AiQCYwRiBEADYwRAA0EDNgU0BWIENgViBGMEKAU0BTYFQwRBBDQFQwQ0BSgFMQMvA0EEMQNBBEMEDAIKAi0DDAItAy8DIgIhAgoCIgIKAgwCQANTAz8DYgR3BFMDYgRTA0ADQQQ/BFQELwMtAz8ELwM/BEEECgIfAiwDIQIfAgoCOAI2Ah8COAIfAiECPwM9AzYCPwM2AjgCUwNRAz0DUwM9Az8DdwR1BFEDdwRRA1MDYQRfBHUEYQR1BHcEMwVEBV8EMwVfBGEEVARSBEQFVAREBTMFPwQ+BFIEPwRSBFQELAM6AyoDHwIdAjoDHwI6AywDHwIeAh0CNgI1Ah4CNgIeAh8CPQNKAjUCUQNQA0oCUQNKAj0DXwR0BHUERAVDBXQERAV0BF8EUgRRBEMFUgRDBUQFPgRQBFEEPgRRBFIELAMqA1AELANQBD4EOgM5AyoDHQIcAjkDHgI0AhwCHgIcAh0CSgI0AjUCQwVdBHMEQwVzBHQEUQRcBF0EUQRdBEMFUARPBFwEUARcBFEEKgM5A08EKgNPBFAEHAIzAjwDHAI8AzkDNAIzAhwCNAJJAjMCSgJJAjQCUANJAkoCXQRyBHMEXARyBF0ETwRbBFwEOQM8A1sEOQNbBE8EMwJHAk8DMwJPAzwDMwJIAkcCSQJIAjMCUANXA0kCdAR+BFcDdARXA1ADcwR+BHQEcgR+BHMEXARxBHIEWwRxBFwEPANPA3EEPANxBFsETwNOAlYDRwJOAk8DSAJPAk4CSAJOAkcCSQJQAk8CSQJPAkgCVwNQAkkCcgR9BH4EcQR8BH0EcQR9BHIETwNWA3wETwN8BHEETgJTAloDTgJaA1YDTwJUAlMCTwJTAk4CUAJVAlQCUAJUAk8CVwNbA1UCVwNVAlACfgSCBFsDfgRbA1cDfQSBBIIEfQSCBH4EfASABIEEfASBBH0EVgNaA4AEVgOABHwEUwJYAmADUwJgA1oDUwJZAlgCVAJZAlMCVAJaAlkCVQJbAloCVQJaAlQCWwNhA1sCWwNbAlUCggSIBGEDggRhA1sDggSHBIgEgQSHBIIEgASGBIcEgASHBIEEWgNgA4YEWgOGBIAEWAJfAmYDWAJmA2ADWQJgAl8CWQJfAlgCWgJhAmACWgJgAlkCWwJhAloCYQNnA2ECYQNhAlsCiASRBGcDiARnA2EDhwSQBJEEhwSRBIgEhgSPBJAEhgSQBIcEhgSOBI8EYANmA44EYAOOBIYEYQJoAmcCYQJnAmACZwNyA2gCZwNoAmECkQSaBHIDkQRyA2cDkASZBJoEkASaBJEEkASYBJkEjwSYBJAEjgSYBI8EXwJmAnEDXwJxA2YDYAJmAl8CZwJmAmACcgOAA3UCcgN1AmgCmgSmBIADmgSAA3IDmQSmBJoEmASmBJkEjgSXBJgEZgNxA5cEZgOXBI4EZgJwA3EDZwJ0AnMCZwJzAmYCaAJ0AmcCdQKAAnQCdQJ0AmgCgAONA4ACgAOAAnUCpgSNA4ADpgSlBLIEmASlBKYElwSkBKUElwSlBJgEcQNwA5cEZgJyAnADcwJyAmYCdAJ+AnMCdAJ/An4CgAKHAn8CgAJ/AnQCjQOUA4cCjQOHAoACsgS8BJQDsgSUA40DpQSxBLwEpQS8BLIEpQSwBLEEpASwBKUElwSjBKQEcAOjBJcEcgJ/A3ADfgJ9AnICfgJyAnMCfwKGAn0CfwJ9An4ChwKGAn8ClAOTA4YClAOGAocCvAS7BJMDvASTA5QDsQS6BLsEsQS7BLwEsASvBLoEsAS6BLEEpASjBK8EpASvBLAEcAN/A6MEcgJ+A38DcgJxAn4DfQJ8AnECfQJxAnIChgKFAnwChgJ8An0CkwOYA4UCkwOFAoYCuwSSA5gDuwSYA5MDugS5BJIDugSSA7sErwSuBLkErwS5BLoEowSuBK8EowSiBK4EfwN+A6IEfwOiBKMEcQJ7An0DcQJ9A34DfAJ7AnEChQKEAnsChQJ7AnwCmAOXA4QCmAOEAoUCkgOXA5gDuQS4BJcDuQSXA5IDrgS4BLkErgStBLgEogShBK0EogStBK4EfgN9A6EEfgOhBKIEhwOpBIYDhwOGA5ADqQSoBIUDqQSFA4YDkAOCAoMCkAOGA48DkAOPA4IChgOFA48DgwKCAooCggKPA4kCggKJAooCjwOBAokCoQStBLgErQSRA7gEkQOXA7gEfQOLA60EfQOtBKEEiwOEApEDiwORA60EhAKXA5EDfQN7AosDewKEAosDgwJ4ApADgwJ6AXgCigJ5AXoBigJ6AYMCgQJ5AYoCjgOEA4EChQOEA44DkAN4AocDeAJyAWoCegFxAXIBegFyAXgCeQFxAXoBgQJwAXEBgQJxAXkBgQJ3AnABhAN2AncChAN3AoEChQNzA3YChQN2AoQDqAScBHMDqARzA4UDqQSdBJwEqQScBKgEhwN1A50EhwOdBKkEeAJqAnUDeAJ1A4cDcgFqAWMCcgFjAmoCcQFsAWoBcQFqAXIBcAFrAWwBcAFsAXEBdwJrAXABdgJpAmsBdgJrAXcCcwNpAnYCnQRzA5wEdQN0A50EdQNqA3QDagJjAmoDagJqA3UDagFoAV4CagFeAmMCbAFnAWgBbAFoAWoBbAHkAGcBawFpAeQAawHkAGwBaQJiAmkBaQJpAWsBcwNoA2ICcwNiAmkCnQSSBGgDnQRoA3MDdANpA5IEdAOSBJ0EagNpA3QDYwJeAmoDaAFlAVcCaAFXAl4CZwFkAWUBZwFlAWgB5ABnAWQBaQFmAWcBaQFnAeQAYgJcAmYBYgJmAWkBaANiA1wCaANcAmICkgSKBGIDkgRiA2gDaQNjA4oEaQOKBJIEagNkA2MDagNjA2kDXgJXAmQDXgJkA2oDHAMYAwwDHAMMAw0DAwICAv0B/wEAAggC/wEIAgcCGgMVAxsD9wTtA+oEBgYABqIG7QHuAvMC7QHzAvIB4QHtAfIB4QHyAeAB5QXSBVkL5QVZC3AL8QHzAtIF8QHSBeUF6wHgAewB1gHLAeAB1gHgAesBzAHMAtsCzAHbAtoCwQLCAssBwQLLAdYBxQLFAcwCxQLMAswBogOnA8ICogPCAsECoQKiAcUBoQLFAcUCvgS/BKcDvgSnA6IDswSnBKIBswSiAaECawVkBb8EawW/BL4EWQVaBacEWQWnBLMEIAMfAw8MIAMPDCEMHwMgAwsAHwMLAOMACwAKAEkACwBJAOMARQBJAAoARQAKAAgARwBFAAgARwAIAAkAPQAHAC0APQAtAC8ARwAJAAcARwAHAD0ALwAtAL4ALwC+AEkB4gBdAeMA4gDjAEkARgDiAEkARgBJAEUA3wBGAEUA3wBFAEcATQHJAC8ATQEvAEkB4gPzA8cE4gPHBHIF8wP0A8gE8wPIBMcE9APrA6kD9AOpA8gE6wPNAqMC6wOjAqkDsQeyBzMGsQczBjAGzATNBOMDzATjA9wD8wT0BEsG8wRLBkgGzQfOB04LzQdOC0wLSAZLBs4HSAbOB80H5ArlCrIH5AqyB7EHMAYzBs0EMAbNBMwE3APjA/QE3AP0BPME7wpjCLIH7wqyB+UK4gaEBc0E4gbNBDMG7ASZBfQE7AT0BOMD/wZtCM4H/wbOB0sGbQg+C04LbQhOC84HYwjiBjMGYwgzBrIHhAXsBOMDhAXjA80EmQX/BksGmQVLBvQEYwjvCu4KYwjuCmIIhAXiBuEGhAXhBoMF4gZjCGII4gZiCOEGmQXsBOsEmQXrBJgF7ASEBYMF7ASDBesEbQj/Bv4GbQj+BmwI/waZBZgF/waYBf4GPgttCGwIPgtsCD0LbAj+BkoG/gaYBUoGgwXhBjIG4QZiCDIGgwUyBuUGMgZiCOUGmAXrBJQF6wSDBZQFbAhKBv0GSgaYBf0GlwWOBegEYgjuCu0KYgjtCmEIgwXlBuAGgwXgBoIF5QZiCGEI5QZhCOAGmAWUBY4FmAWOBZcFlAWDBYIFlAWCBY4FbAj9BvwGbAj8BmsI/QaYBZcF/QaXBfwGPQtsCGsIPQtrCDwLjgWCBegEawj8BkkG/AaXBUkGggXgBjEG4AZhCDEGlwWOBY0FlwWNBZYFggXgBuQG4AZhCOQGjgWCBYEFjgWBBY0Fawj8BvsGawj7BmoI/AaXBZYF/AaWBfsGPAtrCGoIPAtqCDALYQjtCusKYQjrCmAIggXkBt8GggXfBoEF5AZhCGAI5AZgCN8G6woGC7oH6wq6B2AIBgsUC78HBgu/B7oHFAsiC8YHFAvGB78HIgswC2oIIgtqCMYHYAi6B4EFYAiBBd8Guge/B40FugeNBYEFvwfGB5YFvweWBY0FxgdqCPsGxgf7BpYFXQYzCcgHXQbIB/IDMwleCywLMwksC8gH8gPIB/IG8gPyBsYCyAcsCxMLyAcTC/IGxgLyBrUHxgK1B7oD8gYTCwIL8gYCC7UHugO1ByQJugMkCSwGtQcCC80KtQfNCiQJugMsBqAEugOgBAIBxgK6AwIBxgICAaYAsQcwBnsDsQd7A8QGzATcA6cAzASnAAMB8wRIBg8E8wQPBFEBJAnNCp8KJAmfCroGLAYkCboGLAa6BqAEzQdMC8wLzQfMC04HSAbNB04HSAZOBw8EpgCnAFEBpgBRAVABoAR7AwMBoAQDAQIBnwqgCsQGnwrEBroGHQUPBE4HHQVOB8cIxwhOB8wLxwjMC8sLUAFRAQ8EUAEPBB0FAgEDAacAAgGnAKYAugbEBnsDugZ7A6AEXQbyA1ABXQZQAR0F8gPGAqYA8gOmAFABXgszCccIXgvHCMsL3APzBFEB3ANRAacAMAbMBAMBMAYDAXsDMwldBh0FMwkdBccI5AqxB8QG5ArEBqAKEwObBpoG9QvKCGAH9QtgB/4LVwEgBCwEygggBCEEygghBGAH/gtgB2EH/gthB/8LYAchBBIDYAcSA2EHUwEhBCAEUwEgBFcB7gP4BKQF3gX3BRgF+ATyBKAF8gScBaAFnAWpBagFqQlcB8kIXAcsBMkIAAAGAAUAKgAwACcAFgT1ARoE9QFWAf4CVQcbBCAF/wUrBFYHKwQXBFYHVQcgBVYH+QFPARcE2AjVCB0MKQzqDe8NKQzvDTUM6g3LDykP6g0pD+8NnwaYBmgHXwfVCPkH+wf5B9gI/gL5ARcE/gIXBCsEbxFwEosRbxGLEXIQFQT3AfgBRhVHE0gTRhVIEzQVTAB2AVAAdgFLAE0ASwANAE0ASwB6AFgAiwB6AHgAUwVnBbYEEQZIBUcFSAVLBUcFtgRnBWgFaAVpBW0FbQVpBV4FbQVeBREGVQVOBREG9wQLBfwD9wT8A+0D2wPtA+ICTAbwBJsFrwthCzIHYQvgBzMHMgdhCzMHMgdxBq8LWAHaABID3w/eD3wO3w98Dn0OAAAFACoAAAAqACcA2AjaCPsH2ghoB/sHaQAJAZMBaQCTAWEANQboBrsHNQa7B2YIZAjYBtwGZAjcBmUILQbFBC8GxASkA8UENAY1BtwGNAbcBi8GCQGbAZQBCQGUAZMBqgGmAp4CqgGeAqUCZggQCwkLZggJC2UIpwKqA6QDpwKkA6MDmwGqAaUCmwGlApQBpgKnAqMDpgKjA54CNQY6BugG6QbnBrsHswfZBvoKswf6Cv8KqQKoAp4BLgbZBtoGlQGfApYBqAKcAZ0BqAKdAZ4BnwKgApYBnAELAWoAnAFqAJ0BjQKVAYcBCwEKAWoAegBpAAoBCgELASkBKQELAZwBnQGoAqkCqQKfAbQBtAGfAaUDtAGlA6sDqwOlA6wDqwOsA9QD1AOsA3MFcwU2BjUGNQY2BjcGNQY3BjoGPAbmBj0GOgY3BuYGOgbmBjwG8AY9BuYG8AbmBukGswf/CvsK8AbpBrsHmwGzAaoBZggRCxALswGmAqoBEgGbAQkBcwU1BjQGegASAQkBegAJAWkA6AbuBrsHZQjcBjUGZQg1BmYILwbFBMYELwbGBDQGpAOqA8YEpAPGBMUEOgY8Bu4GOgbuBugGAQHsAOYAAQHmAGMAYwDmAIcBYwCHAZUBoAKVA4kDoAKJA5cBlwGJA6wElwGsBKEDoQOsBLUEoQO1BKYDpgO1BG8F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6QpnDWYNrw6uDmIPrw5iDx0QLRBmD70OLRC9Dr4OdA1zDSMLdA0jCycLZg1nDa4OZg2uDq8Ovg69DnMNvg5zDXQNbQ1+DDQObQ00DjMOZg+6Dj4OZg8+Dr0OvQ4+DnANvQ5wDXMNZw1tDTMOZw0zDq4OYg+0DroOYg+6DmYPcw1wDR0Lcw0dCyML6Ar8Cm0N6AptDWcNPw68DrUOPw61DjQOtA61DrwOtA68DroOcA1/DB4LcA0eCx0L/AoAC34M/Ap+DG0NMw40DrUOMw61DrQOug68Dj8Oug4/Dj4OPg4/Dn8MPg5/DHAN/w1+DvgN/w34DQINEg0BDocOEg2HDgcOLA/pD34OLA9+Dv8NBg38Df4N/gz/DDoM/gw6DDkMEg0+CkAMEg1ADAYNKw4KEEwPPgo/CgMNPgoDDUAMOQw6DDcKOQw3CjYKPwo4CgMNDQ4wD+wPDQ7sD4gOewqIDisOeworDtMK+A1+Dn8O+A1/Dv4NMA/pD+oPMA/qD+wPAw04CjcKAw03CjoMfw5+DukPfw7pDzAP6g/pDywPCRAoEeoPAQ5/DjAPAQ4wD4cOBw4NDnoKBw56CnkK/A0DDToM/A06DP8M/g1/DgEO/g38Df8M/g3/DPgNhw4wDw0Ohw4NDgcOegoNDogOegqIDnsKAQ4SDQYNAQ4GDf4NAg34Df8MAg3/DP4MQAwDDfwNQAz8DQYNPgoSDQcOPgoHDnkKiA7sDwoQiA4KECsOChAoEQkQChAJEEwPOQw/DAUNOQwFDf4MCRBAD0IPCRBCD0wPKw4nDr4KKw6+CtMK/w0ADoAO/w2ADiwPLA+ADi8PLA8vD+oPAg0NDQAOAg0ADv8NTA9CDycOTA8nDisONgo9Cj8MNgo/DDkM/gwFDQ0N/gwNDQIN6g8vD0AP6g9ADwkQAA4CDgMOAA4DDoAOQg8cDlINQg9SDScODQ0XDQIODQ0CDgAOgA4DDgYOgA4GDi8PPQpECkYMPQpGDD8MBQ0RDRcNBQ0XDQ0NLw8GDo8OLw+PDkAPPwxGDBENPwwRDQUNJw5SDbEKJw6xCr4KQA+PDhwOQA8cDkIPUg1BDZQKUg2UCrEKjw5ADUkNjw5JDRwOAg4lDS8NAg4vDQMOHA5JDUENHA5BDVINFw0cDSUNFw0lDQIOAw4vDTUNAw41DQYORApICkoMRApKDEYMEQ0XDRwN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4Q3cDQgM4Q0IDBIMHAwbDOYN8wv0C/AM8wvwDBoPEgz5C9kNEgzZDeENHwzyDPAMHwzwDPQL8gzhDdkN8gzZDfAM5w3mDfcM5w33DPkM+Qz3DCcM+QwnDCgMIAwcDOYNIAzmDecNHwzzDPIM9wz2DCcM8gzzDNwN8gzcDeENGwwTDOINGwziDeYN9gz1DCUM9gwlDCcM5g3iDfUM5g31DPYM9QziDdwN9QzcDfMMJQz1DPMMJQzzDB8MEwwIDNwNEwzcDeINgBXCFdIVkhWTFcQTkhXEE6oSxxXpFb8VxxW/FbkV3RXsFeoV3RXqFdAV0hXcFY0VuRW/FXYVuRV2FXUV3xXtFewV3xXsFd0V8QpHEy8S8QovEvAK7Ao0EREQ7AoREOsKewutDK4MewuuDHwLrQyjDaQNrQykDa4Mow29Db4Now2+DaQNvQ3WDdcNvQ3XDb4N1g3pDOoM1g3qDNcN6QzmC+cL6QznC+oM0gzPC9AL0gzQC9MM1AzRC9IL1AzSC9UM2AzWC9cL2AzXC9kM3QzaC9sL3QzbC94M4QzdC94L4QzeC+IM5QzhC+IL5QziC+YMwA3SDNMMwA3TDMENxA3WDNcMxA3XDMUNxw3aDNsMxw3bDMgNzA3fDOAMzA3gDM0N0Q3jDOQM0Q3kDNIN1A3nDOgM1A3oDNUNpg3ADcENpg3BDacNaw7EDcUNaw7FDaoNrQ3HDcgNrQ3IDa4Nsg3MDc0Nsg3NDbMNtw3RDdINtw3SDbgN0wu8C9YM0wvWDOwMuw3UDdUNuw3VDbwNiw2mDacNiw2nDYwNjQ2oDakNjQ2pDY4Nkg2rDawNkg2sDZMNlg2wDbENlg2xDZcNmQ20DbUNmQ21DZoN2AvAC9oM2AvaDO0Mng25DboNng26DZ8NlQyLDYwNlQyMDZYMlwyNDY4NlwyODZgMmwySDZMNmwyTDZwMnwyWDZcNnwyXDaAMowyZDZoNowyaDaQMqAyeDZ8NqAyfDakMZQuVDJYMZQuWDGYLaguKDJoMaguaDGsLbQuMDJ4MbQueDG4LdAuRC5ALdAuQC3MLcguODKIMcguiDHMLdguQDKcMdgunDHcLcQuPC44LcQuOC3ALeQuSDKwMeQusDHoL4wvJC+cM4wvnDO4MbAuMC4sLxQ2qDasNZwuIC4cLZwuHC2YLyQ2vDbANqwy8DKENsg2xDZcNnw26DKoMpgy5DJ0Ntw22DZsNlgyMDY0NlgyNDZcMjA2nDagNjA2oDY0Nmw23DKUM0g24DbkN0wzQC9EL0wzRC9QMogy2DJgNlw20DKAMaAuYDIoMaAuKDGoL7gznDMoL7gzKC+QLiQyXDIgLiQyIC2cLqQ3DDcQNqQ3EDWsOww3VDNYMww3WDMQNngyzDJUNoQ28DbsNkw2xDJ0MmgyRDZINmgySDZsMkQ2qDasNkQ2rDZINiwybDIoLiwyKC2sL1wzVC9YL1wzWC9gMbAucDIwMbAuMDG0LjQyfDI0LjQyNC28LrA3GDccNrA3HDa0Nxg3ZDNoMxg3aDMcNoQ28DLwNoA27DboMoA26DJ8NngyVDZYNngyWDZ8MlQ2uDbANlQ2wDZYNjwyjDJELjwyRC3QL2wzZC9oL2wzaC90MnQ25DLcNnQ23DZwNuQ26DdMNmw22DbcMcQugDI4McQuODHILeAuVC6gMeAuoDJEMkQyoDJMLkQyTC3cLsQ3LDcwNsQ3MDbINyw3eDN8Myw3fDMwNmA22DLMNlw2xDbQMogyYDZkNogyZDaMMmA2zDbQNmA20DZkN4AzcC90L4AzdC+EMlQ2zDK4NlA2tDbEMlA2xDJMNdQukDJAMdQuQDHYLtQ3QDdENtQ3RDbcN0A3iDOMM0A3jDNENaw6QDWgOpwydDZ4NpwyeDagMnQ24DbkNnQ25DZ4N5AzgC+EL5AzhC+UM0w26DdAM0g3ODLgNeAupDJIMeAuSDHkLug3TDdQNug3UDbsN0w3mDOcM0w3nDNQNzw21Dc0M6AzlC+YL6AzmC+kM1Q3oDOkM1Q3pDNYNvA3VDdYNvA3WDb0Nog28Db0Nog29DaMNrAyiDaMNrAyjDa0MegusDK0MegutDHsLqgySDKkMdwunDKgMdwuoDJEMpgyQDKQMpgykDKUMdAuiDKMMdAujDI8MoQyODKAMbwueDJ8MbwufDI0MnQyMDJwMawuaDJsMawubDIsMmQyKDJgMmQyYDIgNZwuWDJcMZwuXDIkMoA26DbsNmw21DbcNtA2zDc4NsA2uDckNlA2sDa0NZw6pDWsOqA2nDcIN7gznDOYM7gzmDOML4wziDMUL3wzeDMIL3AzbDN0M7QzaDNkM7QzZDNgL7AzWDNUM7AzVDNML0wvVDNIL1QvXDNQL2AvZDNcLwgveDNsLxAvcC+AMxQviDN4LxQveC98L4AvkDMYL4wvmDOIL5AvlC+gMwQ3TDNQMyQ3IDdsMyQ3bDNwM3QzeDMsNzQ3gDOEM4gzQDc8Nwg2nDcENyQ2uDcgNyw2xDcoNzg2zDc0Nzw3QDbUNjw2ODakNjw2pDWcOkA2qDZENkw2sDZQNmw2aDbUNnA24DZ0Nnw26DaANoQ28DaINiA2YDI4NiA2ODY8NkQ2aDIkNnQycDJMNpQykDJoNpQyaDZsNnQ2nDKYMqgypDJ8NoQ2iDawMoQ2sDKsMZguWDGcLbwtuC54McAugDHELcwuiDHQLiQyXDJgMiQyYDGgLww2pDagNiQ2aDIoMiQ2KDJkMaw6qDZAN1AvXDNYM1AvWDOwMiwybDJwMiwycDGwLxg2sDasNngyMDJ0MrQ2uDZUN2QvbDNoM2QvaDO0MjQyfDKAMjQygDHALyg2xDbANogyODKEMsg2zDZgNxAvgDN8MjwyjDKQMjwykDHULzw21DbQNpgynDJAMtw24DZwNxgvkDOMMkQyoDKkMkQypDHgLqwysDJIMqwySDKoM5AvoDOcM5AvnDO4M1gy9C74L2gzAC8EL3wzDC8QL4wzGC8cL5wzJC8oLwwzUDNUMwwzVDMQMxgzYDMcMyQzdDMoMzAzhDOIMzAziDM0MzwzlDOYMzwzmDNAMqA3DDMQMqA3EDKkNqw3GDMcMsA3JDMoMtA3MDM0MtA3NDLUNuQ3PDNAMuQ3QDLoNkQ1jDmgOkQ1oDpANsgytDa4NsgyuDbMMtQyyDbMNtQyzDbYMuAy3DbkMuwy7DbwNuwy8DbwMkQ2JDWMOnQyyDLMMnQyzDJ4MoQy1DLYMoQy2DKIMpgy4DLkMqgy7DLwMqgy8DKsMiAuXDIkLkQujDJILlAuoDJULiQ2ZDF8OiQ1fDmMOmQyIDWIOmQxiDl8OhwuIC5cMqA3CDMMMwgzUDMMMiA2PDWIOjw1nDgIPjw0CD2IOZw5rDgIPvAu9C9YMigubDIsLqg3FDMYMqg3GDKsNxQzXDNgMxQzYDMYMnQyxDLIMsQytDbIMjQufDI4Lrw3IDMkMrw3JDLANyAzcDN0MyAzdDMkMoAy0DLUMoAy1DKEMtAyxDbINtAyyDbUMwgvDC98MkAuRC6MMtA3LDMwMywzhDMwMpQy3DLgMpQy4DKYMtwy2DbcNtwy3DbgMxQvGC+MMkwuoDJQL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CgkDCcMJCgnDCc4JzgnDCV4KXgrDCU4KXgpOCl0KXQpOClsMWwxOClQMWwxUDFMMWwxTDC0NLQ1TDCQNLQ0kDSMNLQ0jDSwNLA0jDSINLA0iDR8NLA0fDSoNKg0fDR4NKg0eDSkNKQ0eDR0NKQ0dDVYMVgwdDU4MVgxODFUMVQxODE0MVQxNDEsKVQxLClMKUwpLCscJxwlLCsEJxwnBCcgJyAnBCf4IyAn+CAQJBAn+CP8IBAn/CAUJBQn/CCAIBQkgCCcIJwggCCEIJwghCCgIKAghCB0IKAgdCB4IKAgeCCYIJggeCB8IJggfCAMJAwkfCAAJAwkACQEJAwkBCcMJwwkBCcIJwwnCCcAJwwnACU4KTgrACUkKTgpJClQMVAxJCksMVAxLDFMMUwxLDCgNKA1LDBsNKA0bDScNJw0bDSMNIw0bDRUNIw0VDSYNJg0VDRQNJg0UDSENIQ0UDRMNIQ0TDVEMUQwTDUgMUQxIDFAMUAxIDEsKSwpIDEYKSwpGCr0JSwq9CcEJwQm9CbwJwQm8Cf4I/gi8CfYI/gj2CP8I/wj2CBkI/wgZCCAIIAgZCCEIIQgZCBoIIQgaCBYIIQgWCB4IHggWCCIIIggWCPQIIgj0CAAJAAn0CPkIAAn5CAEJAQn5CPUIAQn1CMIJwgn1CL8Jwgm/CUUKwglFCkwKTApFCkcKTApHCk8MTwxHCkkMTwxJDEcMTwxHDCANIA1HDBANIA0QDQ8NIA0PDRoNGg0PDQkNGg0JDR8NHw0JDQ4NHw0ODRkNGQ0ODRgNGA0ODQcNGA0HDRMNEw0HDUgMSAwHDUMMSAxDDEYKRgpDDEEKRgpBCroJRgq6Cb0JvQm6CbsJvQm7CfYI9gi7Ce8I9gjvCA4I9ggOCPcI9wgOCA8I9wgPCBkIGQgPCB0IHQgPCBAIHQgQCBsIGwgQCBEIGwgRCPgI+AgRCBII+AgSCPkI+QgSCPAI+QjwCPEI+QjxCMAJwAnxCEUKwAlFCkkKSQpFCkIKSQpCCkQMSQpEDEkMSQxEDAsNSQwLDRYNFg0LDQoNFg0KDRUNFQ0KDQkNFQ0JDRkNGQ0JDQgNGQ0IDQcNGQ0HDRMNEw0HDUMMEw1DDEgMSAxDDEIMSAxCDEEKSAxBCkYKvQm6Ce4IvQnuCL4JvgnuCO8IvgnvCPYI9wgOCBkIGQgOCA8IGQgPCBUI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4wHkAQ4E4wEOBA0ESAdEB7YLSAe2C7ULPQfnB6ILPQeiC6EL3QHeAQYE3QEGBAkEgwGEARcAgwEXABYAgweEB18DgwdfA2UDrAe0BHcDrAd3A8MGogKlACMAogIjAJIBkwKeBGsDkwJrA4kB7wIZBQwE7wIMBO4BnQKfBHYDnQJ2A5EB7AesC7QL7Ae0C0MHlAKUBHgDlAJ4A/oAjAKWBGUDjAJlA4MBmAeCCm8KmAdvCrcGmQeeCoQKmQeECsIGiQeVBG0DiQdtA7kGmgeGCnAKmgdwCrgGggGBACUAggElAPIAigdlCloKigdaCoMH3wcKBVwG3wdcBm4ITAe3C6MLTAejC/AHswaEBEoFswZKBZEH0gAQBIwG0gCMBvYBkAeRB0oFkAdKBUkF9gGMBvMBSgV6A3kDSgV5A0kFhgGEAIUBkAecB60KkAetCocKhARkAnoDhAR6A0oF6QAQAIQA6QCEAIYBhAGLBF0FhAFdBZsD7gSpAYQA7gSEAPMB7QSyAqkB7QSpAe4EiwdmCqwKiwesCpsH0wKDALIC0wKyAu0EcwhkBowGcwiMBvAHnANlBXkDnAN5A4UBpAe7Cq0KpAetCpwHbghcBmQGbghkBnMImwekB2UFmwdlBV0FmwNdBWUFmwNlBZwDRgF9ABgARgEYAL8A7wCTBGsC7wBrAlIAjwd/Cm4KjwduCgwGjweTBJIEjweSBI4H2Ad8C1sL2AdbC9cH7wB9AHwA7wB8AO4ARgERBRAFRgEQBUUBgQqcCsAGgQrABg4GwAaIA3ACwAZwAg4G2AcRBfUC2Af1An0GRQEQBbIFRQGyBdcBjgeSBFwFjgdcBZcH1wdbC0oL1wdKC9MH7gB8ABYB7gAWAYoC1wGyBRAF1wEQBUUBlwdcBYoElweKBIgH0wdKC3oL0wd6C9cHigIWAXwAigJ8AO4ARQEQBQ8FRQEPBUQBiAeKBIkEiAeJBIcH1wd6C3kL1wd5C9YH7gB8AHsA7gB7AO0A1gd5C1oL1gdaC9IH7QB7AKgB7QCoAZoDRAEPBbEFRAGxBeUDhweJBFsFhwdbBZYHfQqHB5YHewBEAeUDewDlA6gBiQTtAJoDiQSaA1sFDwXWB9IHDwXSB7EFigTuAO0AigTtAIkEEAXXB9YHEAXWBw8FfgqIB4cHfgqHB30KfABFAUQBfABEAXsAXAWKAu4AXAXuAIoEsgXTB9cHsgXXBxAFmwqXB4gHmwqIB34KFgHXAUUBFgFFAXwAkgTuAIoCkgSKAlwFEAXXB9MHEAXTB7IFfgqOB5cHfgqXB5sKfABFAdcBfADXARYBfAvYB30GcAKIA/gAcAL4APEAfQBGAUUBfQBFAXwAkwTvAO4AkwTuAJIEEQXYB9cHEQXXBxAFfwqPB44HfwqOB34KkwSPBwwGkwQMBmsCfQDvAFIAfQBSABgAEQVGAb8AEQW/APUCsgKbA5wDsgKcA6kBrAq7CqQHrAqkB5sHSwtuCHMISwtzCF0LZQWkB5wHZQWcB3kDqQGcA4UBqQGFAYQAXQtzCPAHXQvwB6MLCgXTAu0ECgXtBFwGiwSLB5sHiwSbB10FXAbtBO4EXAbuBGQGZAbuBPMBZAbzAYwGgwCEAZsDgwCbA7ICZALpAIYBZAKGAXoDSQV5A5wHSQWcB5AHegOGAYUBegOFAXkDhAD2AfMBhwqICpEHhwqRB5AHEADSAPYBEAD2AYQAcQqzBpEHcQqRB4gKEARMB/AHEATwB4wGnAvfB24InAtuCEsLlgSKB4MHlgSDB2UDlQSCAfIAlQTyAG0DlASaB7gGlAS4BngDZAqJB7kGZAq5BmMKnwSZB8IGnwTCBnYDngSYB7cGngS3BmsDggCMAoMBggCDARYAmACUAvoAmAD6ACQAGQXsB0MHGQVDBwwElwCdApEBlwCRASIApQDvAu4BpQDuASMAlACTAokBlACJAZUAtASiApIBtASSAXcDqwqsB8MGqwrDBoUKWgpbCoQHWgqEB4MHZQNfA4QBZQOEAYMBFgAXAN4BFgDeAd0BCQQGBOcHCQTnBz0HDQQOBEQHDQREB0gHJAAlAOQBJADkAeMBeANtA/IAeAPyAPoAcApjCrkGcAq5BrgGCwQMBEMHCwRDB0IHIgAjAO4BIgDuAeIBdgN3A5IBdgOSAZEBhAqFCsMGhArDBsIGBAQFBDwHBAQ8BzsHlQAcANsBlQDbAdoBawNsA4oBawOKAYkBbwqDCsEGbwrBBrcGgQDRAuQBgQDkASUACAXdB0QHCAVEBw4ElgvZBzsHlgs7B58LmAvbB0IHmAtCB6sLnQqjB8EGnQrBBoMKmQvcB0gHmQtIB7ULCgXfB+cHCgXnBwYEqwScAooBqwSKAWwDmwveBz0Hmws9B6ELgwDTAt4BgwDeARcAngDfAtsBngDbARwAiwSEAV8DEwXaBzwHEwU8BwUEZgqLB4QHZgqEB1sKEgXdAtoBEgXaAQQEFAXgAuIBFAXiAQsEFQXhAuMBFQXjAQ0ECQXSAt0BCQXdAQkEZAplCooHZAqKB4kHqwqGCpoHqwqaB6wHnQqeCpkHnQqZB6MHnAqCCpgHnAqYB8AGlQSWBIwClQSMAoIBtASUBJQCtASUAqICqwSfBJ0CqwSdApwCiAOeBJMCiAOTAvgAgQCCANICgQDSAtECpQCYAOECpQDhAu8CngCXAOACngDgAt8CmgCUAN0CmgDdAtkBAwQSBdkHAwTZBzEHEwUUBdsHEwXbB9oHGQUVBdwHGQXcB+wHCAUJBd4HCAXeB90HsQXSB/cGsQX3BuUD5QP3BjkG5QM5BqgBqAE5BtcGqAHXBpoDmgPXBpYHmgOWB1sF0gdaCyAL0gcgC/cG9wYgCw0L9wYNCzkGOQYNC9cKOQbXCtcG1wbXCn0K1wZ9CpYHbgqACg0GbgoNBgwGawJvAlMAawJTAFIAGAAZAMAAGADAAL8A9QL2An4G9QJ+Bn0GfQZ+Bn0LfQZ9C3wLvwDAAPYCvwD2AvUCUgBTABkAUgAZABgADAYNBm8CDAZvAmsCDQYOBnACDQZwAm8C8ADxAJMA8ACTAJIAPAFIAQMEPAEDBPYCbwYxB30L9gIDBDEH9gIxB28GkgCTAEgBkgBIATwBbwJwAvEAbwLxAPAAgAqBCg4GgAoOBg0G9gJvBn4G+ACaAJMA+ACTAPEA2QFIAZMA2QGTAJoA2QEDBEgBfgZvBn0LMQdcC30LwAA8AfYCUwDwAJIAUwCSABkACw+4C60LCw+tCwcPTQcRBBwFTQccBUoHtAZyCokKlRSbFS4VmhEID24RmhFuEYQVAAVLBx0FAAUdBcwAZgV+AW8DZgVvAw8GbhErCwULbhEFCzUSKwsABckEKwvJBAULNRIvFYQVNRKEFW4RNRIFC8YKNRLGChoRBQvJBGYFBQtmBcYKAAXMAHUAAAV1AMkEnwqKCoYOnwqGDjQPGhHGCp8KGhGfCjQPxgpmBQ8GxgoPBp8KDwa1BooKDwaKCp8KNA+GDvkQNA/5EBETbhEID64LbhGuCysLKwuuC0sHKwtLBwAFjQS1Bg8GjQQPBm8DEAARANQAEADUANIAcQpyCrQGcQq0BrMGEAQRBE0HEARNB0wHswa0BoUEswaFBIQEhASFBGUChARlAmQC6QDqABEA6QARABAAZAJlAuoAZALqAOkATAdNB7gLTAe4C7cL0gDUABEE0gARBBAEmhXMFc8VmhXPFZsVcQotDy4PcQouD3IKkxIKDwsPkxILD5QSLQ/lEeYRLQ/mES4P5REPExAT5REQE+YRlBSaFZsVlBSbFZUUDxOUFJUUDxOVFBATCg+3C7gLCg+4CwsPzBWTEpQSzBWUEs8VgxWZEZoRgxWaEYQVBw+tC64LBw+uCwgPEBOVFJYUEBOWFBETlRQuFS8VlRQvFZYU+BAQExET+BARE/kQhQ74EPkQhQ75EIYOmREHDwgPmREID5oRiQqFDoYOiQqGDooKLhWDFYQVLhWEFS8VywDMAB0FywAdBRwFSgdLB64LSgeuC60LbgNvA34BbgN+AX0BfQF+AXUAfQF1AHQAjASNBG8DjARvA24DtAa1Bo0EtAaNBIwEHAUdBUsHHAVLB0oHiQqKCrUGiQq1BrQGdAB1AMwAdADMAMsA6gBlAm4D6gBuA30BuAtNB0oHuAtKB60LyQR1AH4ByQR+AWYFEQTUAMsAEQTLABwFmxXPFYMVmxWDFS4VcgouD4UOcgqFDokKlBILDwcPlBIHD5kRLg/mEfgQLg/4EIUO5hEQE/gQ1AARAHQA1AB0AMsANA8RE5YUNA+WFBoRUgZTBjYLUgY2CzULrwPHA7YCrwO2ArECIwYkBrkDIwa5A68DzgKsBcgBJAYrBsgDJAbIA7kDxwK1AqsBxwKrAcABywrVCisGyworBiQGUQZSBjULUQY1Cy4LUQbnA+gDUQboA1IG6gPpA9UC6gPVAtYCrgOvA7ECrgOxArACVQbqA9YCVQbWAqsFyAPOAsACygrLCiQGygokBiMGxAK/ArkBxAK5AboB5wNRBqoF5wOqBdQCUAaiBTML5APpA1QG5ANUBlMG6gNVBlQG6gNUBukD6QPkA8cB6QPHAdUCygLEAroBygK6AcEBqwWsBUILqwVCC0ELtgLAAsgBtgLIAbsBsQK2ArsBsQK7AboBpQGwArkBpQG5AbUBsAKxAroBsAK6AbkBwAHUAqIFpAGlAbUBpAG1AbgBogWqBTQLogU0CzMLuwHWAsEBuwHBAboB1gLVAscB1gLHAcEBUQYuCzQLUQY0C6oFxwPAArYCqwKuA7ACqwKwAqUBvgLIAsYBvgLGAbUBUAbHAsABUAbAAaIFrAU4C0ILvwK+ArUBvwK1AbkByALnA9QCyALUAsYBqgKrAqUBqgKlAaQBwALOAsgB5APKAsEB5APBAccBNwtVBqsFNwurBUELyQrKCiMGyQojBiIGIgYjBq8DIgavA64DvwrACiEGvwohBiAGIAYhBqsCIAarAqoCRAY4C6wFRgbHAlAGuQPIA8ACuQPAAscDLQtGBlAGLQtQBjMLxwLGA7UCzgJEBqwFrwO5A8cDRgYtC0MGxwofBioGxwoqBuEKOAtEBisGOAsrBtUKzgLIAysGzgIrBkQGQwYtC+EKQwbhCioGxgPhA0MGxgNDBioGxgPHAuEDxwJGBkMGxwJDBuEDHwbGAyoGyQLKAuQDyQLkA+gDyQK/AsQCyQLEAsoCVAZVBjcL1gK7AcgBwAG4AbUBwAG1AcYB1AKqBaIFwAHGAdQCyAK+Ar8CyAK/AskCyAGsBasFyAGrBdYC6APkA1MG6ANTBlIGqgK1AsYDqgLGA60DtQKqAqQBtQKkAasBqwGkAbgBqwG4AcABHwYgBq0DHwatA8YDxwrICiAGxwogBh8GIAaqAq0DvwogBsgKyQoiBiEGyQohBsAKqwIhBiIGqwIiBq4DNgtTBlQGNgtUBjcL5wPIAskC5wPJAugDfg81CzYLfg82C38PNBJVE1wTSg80Ej4SSg8+EksPSw8+Ek0SSw9NEk8PcBM5FCIUcBMiFFsTywpLD08PywpPD9UKfQ8uCzULfQ81C34PfQ9+D2sSfQ9rEmoSbRJ8E3sTbRJ7E2wSMxJUE1UTMxJVEzQSgQ9EEHwTgQ98E20STRJmE0AUTRJAFHgTygpKD0sPygpLD8sKbRMzFDIUbRMyFGUTahJ6E0MQahJDEH0PMws9EEIQdxN/D4APdxOAD2wSbRJsEoAPbRKAD4EPbBJ7Ez8UbBI/FHcTcxM6FDMUcxMzFG0TRBBBC0ILRBBCC0UQXBM0FEAUXBNAFC0UVRMzFDQUVRM0FFwTHRQsFDIUHRQyFFQTVBMyFDMUVBMzFFUTORQ9EHoTHBQxFCwUHBQsFB0UPRAzCzQLPRA0C0MQNBQzFDoUNBQ6FHwTfBM6FD8UfBM/FHsTfQ9DEDQLfQ80Cy4LXBMtFGYTThMdFFQTThNUEzMSLBQ+FHETQhA9EDkUQhA5FHATRRBCCzgLZRMyFCwUcRM+FHoTcRN6E2oSTRMcFB0UTRMdFE4TZhMtFEAUdxM/FDoUdxM6FHMTNwtBC0QQNwtEEIEPyQpJD0oPyQpKD8oKSQ8zEjQSSQ80EkoPvwpHD0gPvwpID8AKRw9NE04TRw9OE0gPbA9FEDgLcg9CEHATPhJcE2YTPhJmE00SLQszC0IQLQtCEHIPeBNAFEUQeBNFEGwPNBJcEz4Scg9rDy0LxwrhCk4PxwpOD0YPOAvVCk8POAtPD2wPeBNsD08PeBNPD00Saw9OD+EKaw/hCi0LTBJOD2sPTBJrD3ATWxNMEnATcBNrD3IPRg9OD0wSRg9MElsTchNrEncTchN3E3MTchNzE20TchNtE2UTgA83C4EPfBNAFDQUORQ+FCwUORQsFDEUehM9EEMQORR6Ez4UcRNyE2UTcRNlEywUQBR8E0QQQBREEEUQaxJ+D38PaxJ/D3cTWxMiFBwUWxMcFE0TIhQ5FDEUIhQxFBwURg9bE00TRg9NE0cPxwpGD0cPxwpHD8gKvwrICkcPyQrACkgPyQpID0kPThMzEkkPThNJD0gPNgs3C4APNguAD38PahJrEnITahJyE3ET2ggpDDUM2gg1DN8IHQwpDNoIHQzaCNgIcQefBtoIcQfaCN8I4Qf2BX8G4Qd/BtUHbhRtFJcTbhSXE38SphObEYwSphOMEnQUlxGbEZAQlxGQEIoQ/AUKBAcE/AUHBBoFBwT8AwsFBwQLBQgE7wHfAeIC7wHiAvECMgoyDC0MLwwtDDIMxg+1E7QTxg+0E8UPUwW2BEcFTgVIBREGMgQuBCYEAQMAA/sCAQP7AvwCAQMHAwADBwMGAwAD+gH8AfsBdhR3FHgUeBScE5gTnBOZE5gTnBOdE5kTqRKeEqYSoBOnE6gToROcE5sToRObE6ATqBOhE6ATCAMEAgkDCAMJAxYD","verts":5617,"tris":11970};
  }
})();