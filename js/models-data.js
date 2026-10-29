/*
  ============================================================
  MODELOS 3D  –  aquí registras cada modelo que quieras mostrar
  ============================================================

  PASOS:
  1. Copia tu archivo .fbx a la carpeta  models/
     (opcional: una imagen de portada .jpg/.png en la misma carpeta)
  2. Copia un bloque de abajo, pégalo dentro de la lista y edítalo.
  3. Guarda. Listo, aparece solo en la web.

  CAMPOS:
    title        Nombre del modelo
    category     Categoría (se crean filtros automáticamente)
    file         Ruta del FBX, por ejemplo "models/robot.fbx"
    thumb        (opcional) Imagen de portada, por ejemplo "models/robot.jpg"
    description  Texto que se muestra junto al modelo
    software     Programa con el que lo hiciste
    polys        (opcional) Ej: "12.4k tris"  (si lo dejas vacío, se calcula solo)
    year         (opcional) Año
    tags         Etiquetas
    download     true = muestra botón "Descargar FBX"

  TEXTURAS:
    - Mejor opción: al exportar desde Blender marca
      Path Mode = Copy  +  el icono "Embed Textures".
    - Si no, deja las texturas en la misma carpeta que el FBX.
*/



  const data = [
  /* ---------- EJEMPLO (quita los comentarios y edítalo) ----------*/
  {
    title: "Jinx",
    category: "Personajes",
    file: "models/arma_tiburon-prueba10.fbx",
    thumb: "models/nika.jpg",
    description: "Personaje sci-fi modelado desde cero, con texturas PBR y rig básico.",
    software: "Blender",
    polys: "",
    year: "2026",
    tags: ["Hard surface", "PBR", "Sci-fi"],
    download: false
  },
  {
    title: "Jinx",
    category: "Personajes",
    file: "models/arma.fbx",
    thumb: "models/nika.jpg",
    description: "Personaje sci-fi modelado desde cero, con texturas PBR y rig básico.",
    software: "Blender",
    polys: "",
    year: "2026",
    tags: ["Hard surface", "PBR", "Sci-fi"],
    download: false
  },
  {
  title: "Arma tiburón",
  category: "Armas",
  file: "models/arma.glb",
  thumb: "models/nika.jpg",
  description: "Modelo 3D con texturas PBR.",
  software: "Blender",
  polys: "",
  year: "2026",
  tags: ["PBR", "Hard Surface"],
  download: false
  },{
  title: "Arma tiburón",
  category: "Armas",
  file: "models/jinx.glb",
  thumb: "models/nika.jpg",
  description: "Modelo 3D con texturas PBR.",
  software: "Blender",
  polys: "",
  year: "2026",
  tags: ["PBR", "Hard Surface"],
  download: false
  },{
  title: "Arma tiburón",
  category: "Armas",
  file: "models/jinx1.fbx",
  thumb: "models/nika.jpg",
  description: "Modelo 3D con texturas PBR.",
  software: "Blender",
  polys: "",
  year: "2026",
  tags: ["PBR", "Hard Surface"],
  download: false
  }
  /*---------------------------------------------------------------- */
  ];

