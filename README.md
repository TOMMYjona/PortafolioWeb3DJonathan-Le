# Portafolio Jonathan Veloz - V9

Rediseño completo con dirección de "estudio 3D": gris de estudio, sección oscura
tipo viewport para los modelos y un solo acento naranja (objeto seleccionado).

## Qué cambió en V9
- Hero integrado: el modelo 3D va a pantalla completa sobre un fondo degradado en movimiento,
  con malla quad, bordes rosa/azul, órbitas, anotaciones con datos reales de la malla y regla.
- Hover dinámico (reemplaza el marcado naranja): la imagen se inclina en 3D siguiendo el mouse,
  con reflejo de luz y una línea de escaneo. Las filas de la tabla se iluminan con un barrido.
- Al elegir un sector en los filtros, sus proyectos se muestran en grande. "Todos" mantiene la lista.
- Corregido el texto encimado en las tarjetas grandes.
- Los efectos de movimiento se desactivan si el sistema pide "reducir movimiento".

## Contacto  (importante)
Abre `js/site-config.js` y llena tu correo, WhatsApp y redes.
Lo que dejes vacío no se muestra. Si todo está vacío, la sección Contacto no aparece.

## Agregar un modelo 3D
1. Copia el `.fbx` a `models/` (y una portada `.jpg` si quieres).
2. En `js/models-data.js` copia el bloque de ejemplo y edítalo.
3. Guarda. Aparece solo.
Tip de exportación: Path Mode = Copy + Embed Textures. Cada FBX idealmente bajo ~15 MB.

Para probar un FBX sin publicarlo, abre el sitio con `?preview` al final de la URL
(aparece el botón "Probar un FBX local").

## Marcar proyectos destacados
En `js/projects.js`, agrega `featured: true` al proyecto que quieras mostrar grande.

## Archivos
- index.html, css/style.css
- js/site-config.js  ← tus datos de contacto
- js/projects.js     ← proyectos web
- js/models-data.js  ← tus modelos 3D
- js/hero.js (hero 3D), js/fx.js (hover), js/models.js (visor), js/main.js
- models/            ← tus .fbx

## Abrir
Visual Studio Code + Live Server (no funciona con doble clic: los módulos JS necesitan servidor).
Requiere internet para la fuente (Google Fonts) y three.js (CDN).
