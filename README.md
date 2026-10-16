# Matías Medrano v3.2 — Portfolio (red neuronal que muta)

> **v3.2 — cambio de comunicación.** Se retira la marca **SinapStudio**: el sitio
> firma con el nombre propio (header, footer, SEO y JSON-LD como `Person`). El hero
> pasa a *"De la idea a la marca. Del diseño al software."*, el eyebrow a
> `diseño × ia`, y toda la copy se reescribe en un registro más sobrio, apuntado a
> dueños de marca y empresas medianas: qué hago, qué hice y qué puedo hacer.
> Novedades de contenido: tira de **tres pilares** bajo el hero, fila `resultado` en
> cada caso web, bajada de *diseño dentro de empresas* (Liliana / NutriBlend como
> aval) y bloque **"hacia dónde voy"** en Quién soy (fotografía, audiovisual con IA
> y 3D: lo que todavía no tiene casos propios, dicho sin inflar).
> Los nombres del menú hablan el idioma del cliente: Automatización e IA · Webs y
> tiendas · Marca y packaging · Software a medida · Quién soy.
> **La estética, las formas 3D y el orden de secciones no se tocaron.**
>
> **v3.1** (piel azul noche con acento ámbar `#f2b84b`, violeta `#a58bff`, rosa
> `#ff8fd0`; aurora animada y vidrio translúcido) sigue en
> `../web-sinapstudio_v3.1/`, y la v3 sunset en `../web-sinapstudio_v3/`. Los tokens
> conservan los nombres viejos (`--lime` es ámbar, `--copper` violeta).

Portfolio de Matías Medrano. Sitio estático (HTML + CSS + JS vanilla, sin build).
Three.js se carga desde CDN (jsDelivr) dentro de `js/neural.js`; no hay npm.

## Concepto

Detrás de todo el sitio hay **una red neuronal 3D** que cambia de forma según la
sección: **árbol con flores** (inicio, con color propio) → **flujo de automatización** (automatizaciones) →
**navegador** (webs) → **cohete** que despega (herramientas) → **monograma MM**
(sobre mí) → **tejido neuronal**: un zoom abstracto a la red funcionando, que cubre todo el fondo (contacto).

- El scroll controla la mutación (para atrás, se rearma al revés).
- El cursor aparta los nodos; **el clic dispara una sinapsis** (onda + pulsos + sonido).
- El **simulador de automatizaciones** enciende las estaciones del flujo 3D en
  sincronía con su registro.
- Los títulos aparecen en monoespaciada y "compilan" a sans (tipografía Recursive,
  eje `MONO`).

## Archivos

```text
index.html        Contenido (secciones comentadas 1·HERO … 6·CONTACTO)
css/styles.css    Tokens en :root + componentes + responsive + movimiento reducido
js/main.js        Menú, reveals, carruseles, simulador (FLOWS), botón de sonido
js/neural.js      Red 3D: render, mutación, cursor, clic, pulsos (NEURAL_CONFIG)
js/shapes.js      Las 6 formas, generadas por matemática
js/audio.js       Ambiente espacial + sonidos de evento, sintetizados (AUDIO_CONFIG)
js/tooldemo.js    Visor 3D: plegado de troquel + estiba de contenedor (DEMO_CONFIG)
js/design.js      Identidad y diseño: casos (CASES), overlay, comparador antes/propuesta
assets/diseno/    Imágenes de diseño GENERADAS (no editar a mano) + sizes.js
tools/build-design-assets.py  Genera assets/diseno/ desde los originales del CV
assets/           Capturas de los casos
build-dist.ps1    Regenera dist/ (lo que se sube a Hostinger / Vercel)
```

## Dónde tocar qué

| Querés cambiar… | Dónde |
|---|---|
| Colores | `css/styles.css` → `:root` |
| Textos | `index.html` |
| Casos del simulador (reales y ejemplos, con bifurcación opcional) | `js/main.js` → `FLOWS` |
| Lista de herramientas de la suite interna | `index.html` → `#herramientas` (`.tool-row`) |
| Visor 3D de troquel y contenedor (medidas, velocidad, colores) | `js/tooldemo.js` → `DEMO_CONFIG` |
| Textos y galería de cada caso de diseño | `js/design.js` → `CASES` |
| Portadas de la grilla, logotipos, marcas | `index.html` → `#diseno` |
| Sumar/cambiar imágenes de diseño | agregarlas en `tools/build-design-assets.py` y correr `python tools/build-design-assets.py` (lee los originales de `Desktop/Diseño/cv/Matias Medrano/03_Proyectos-destacados`) |
| Cantidad/tamaño de nodos, fuerza del cursor, velocidad de mutación | `js/neural.js` → `NEURAL_CONFIG` |
| Dónde aparece cada forma | el `div.stage[data-stage]` de cada sección (la red se ubica y escala sobre él) |
| Forma de cada figura | `js/shapes.js` (una función por forma) |
| Sonidos de clic/nodos | `js/audio.js` → `AUDIO_CONFIG.connect` · `.impulse` · `.step` |
| Música ambiental de fondo | `js/audio.js` → `AUDIO_CONFIG.ambient` (y `.reverb`) |

> Las 6 `.stage[data-stage]` tienen que existir y estar en el orden de
> `ORDER` en `js/shapes.js`.

## Probar en local

Abrí `index.html` con un servidor local (por ejemplo la extensión Live Server, o
`python -m http.server` dentro de la carpeta). Abrirlo con doble clic también
funciona en Chrome/Edge, pero un servidor es más fiel a producción.

## Accesibilidad y performance

- `prefers-reduced-motion`: la red queda quieta (cambia de forma sin animar), sin
  pulsos ni sonido; los textos aparecen sin movimiento.
- Mobile: menos partículas y menor resolución. Si el equipo no llega a ~30 fps, la
  red baja la resolución sola.
- Sin WebGL (o si falla el CDN): se muestra un fondo con degradés; el sitio funciona igual.
- El sonido arranca recién con el primer gesto del usuario y se puede silenciar.

## Deploy

1. Si cambiaste CSS o JS, subí el número de versión (`?v=…`) en los `<link>`/`<script>`
   de `index.html`: así los navegadores bajan los archivos nuevos (el `.htaccess` los
   cachea por un año).
2. `powershell -File build-dist.ps1`
3. Subir **el contenido** de `dist/` a `public_html/` (incluido `.htaccess`).

## Pendientes

- Retrato real (opcional: hoy el monograma MM de nodos ocupa ese lugar).
- Imagen OG `assets/og.png` (1200×630).
- Primera herramienta real en `#herramientas` (reemplaza la card de terminal).
- Dominio definitivo: falta completar `canonical` y `og:url` en `index.html` (hay un TODO) y la línea `Sitemap:` de `dist/robots.txt`.
