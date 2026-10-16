/* ============================================================
   SINAPSTUDIO v3 — design.js
   Sección "Identidad y diseño": abre cada caso en un overlay a
   pantalla completa, con ficha, galería y módulos especiales:
     · compare  → comparador arrastrable (antes / propuesta)
     · timeline → evolución por etapas (p. ej. etiquetas por año)
   Las imágenes salen de assets/diseno/ (tools/build-design-assets.py)
   y sus medidas de window.DESIGN_SIZES (assets/diseno/sizes.js).

   Para editar un caso: CASES (abajo). Bloques posibles:
     { full: 'clave', cap: 'texto' }
     { pair: ['clave', 'clave'], caps: ['texto', 'texto'] }
     { compare: ['antes', 'después'], labels: ['…', '…'], cap: '…' }
     { timeline: [{ year, name, text, imgs: ['clave', …] }, …], title }
     { half: 'clave', cap: 'texto' }                      → figura a media caja
     { build: 'título', text: ['…'], notes: [[k, v], …] } → isotipo que se
       arma solo sobre su grilla (SVG en vivo, no una imagen)
   ============================================================ */
(() => {
  'use strict';

  /* Isotipo 2026 (Logo_2026.svg de Hierbas Blends), para la animación de
     construcción: cada path es una pieza que se dibuja y después se rellena. */
  const HB_LOGO = [
    'M235.01,321.64c-37.69,22-84.6,22.3-123.79,3.87-18.8-8.84-34.87-22.34-46.85-39.28-10-14.15-17.04-30.03-20.96-46.85l-1.34-7.8h252.82c-3.71,20.62-11.91,40.2-24.11,57.19-9.59,13.36-21.67,24.49-35.78,32.88ZM253.79,249.71l-7.18-.27-27.18-.2-64.78-.45-44.71-.25-41.79-.23-6.64.1c3.88,17.27,16.99,32.87,29.95,44.42,11.37,10.13,23.62,19.03,37.19,26.64-5.5-5.77-11.02-10.47-15.87-16.47-10.69-12.39-19.8-25.85-27.82-40.31l162.98-12.44,5.86-.55Z',
    'M163.46,187.24c-14.64,2.53-20.2,21.6-21.96,35.04l-7.84.04c.81-2.89,1.23-4.27,1.88-6.63,1.38-5.02,2.38-9.91,3.31-15.36-4.83-7.16-9.45-14.5-11.9-22.74-6.55-22.21-.98-45.29,13.8-63.02,16.6,18.13,19.76,42.49,13.94,66.12,7.8-3,13.42-9.32,15.27-17.43-3.31-3.88-5.7-8.06-7.76-12.71-3.42-7.84-5.65-15.78-7.31-24.24-7.07-31.57,2.62-64.02,24.73-87.86,10,13.33,18.35,27.89,22.81,44.26,7.77,28.9-.33,57.22-22.82,76.97l-1.38,6.71c3.92-2.98,7.7-5.35,12.08-7.38,6.66-3.11,13.36-5.37,20.54-7.24,13.7-3.57,27.45-5.69,41.63-6.77-9.84,32.45-42.94,52.17-75.64,47.51-5.01-.71-9.29-2.66-13.37-5.27Z',
    'M75.39,222.32c-7.22-5.2-13.46-11.22-18.66-18.38-13.82-19.18-14.47-42.6-3.51-63.42,20.02-.77,38.57,8.72,50.47,24.65,12.31,16.49,15.67,37.9,7.97,57.06l-36.27.09Z',
    'M243.37,222.29l-44.26.02,70.47-64.14c.94,6.35,5.36,11.15,11.73,11.92l-37.93,52.2Z',
    'M285.21,137.51c8.21-1.29,15.5,4.29,16.74,12.11,1.28,8.03-4.18,15.52-12.17,16.78-7.88,1.23-15.33-4.07-16.67-11.96-1.35-7.91,3.84-15.63,12.1-16.93Z',
    'M208.22,341.97l-14.9,14.92h-49.5s-14.93-15.01-14.93-15.01c25.04,7.44,53.22,5.69,79.34.09Z',
  ];
  const HB_VIEWBOX = [344.21, 405.33];

  const CASES = [
    {
      id: 'hierbas', client: 'Hierbas Blends', years: '2020–2026', place: 'Nogoyá, Entre Ríos',
      title: 'Una marca que creció etiqueta por etiqueta.',
      summary: 'Acompaño a Hierbas Blends desde 2020. El isotipo —un mortero con hojas— resume tradición y frescura, y funciona igual en un sello, una etiqueta o un perfil de Instagram. Sobre esa base diseñé tres generaciones de etiquetas, la línea de saquitos de 2026, piezas para fechas especiales y, en 2026, la tienda online.',
      spec: [['alcance', 'Identidad · Packaging · Ilustración · Web'], ['entregables', 'Isotipo y sistema de marca · 3 líneas de etiquetas · etiquetas de saquitos (14 blends) · tienda online'], ['herramientas', 'Illustrator · Photoshop · HTML/CSS/JS']],
      link: ['https://hierbasblends.com', 'Ver la tienda online ↗'],
      blocks: [
        { build: 'El isotipo se arma sobre su propia grilla',
          text: [
            'El mortero no se dibujó a mano alzada. La taza es una circunferencia completa, un eje vertical parte la marca en dos mitades iguales y la mano apoya sobre una diagonal que cruza ese eje; el remate es otro círculo, del mismo sistema.',
            'Esa geometría es la que permite usarlo a cualquier escala: desde los pocos milímetros de la etiqueta de un saquito hasta un sello pintado en la pared, sin que el dibujo se caiga.',
          ],
          notes: [['eje', 'vertical, al centro'], ['taza', 'circunferencia completa'], ['mano', 'diagonal sobre el eje'], ['versión', 'isotipo 2026']],
          cap: 'Construcción del isotipo, dibujada en vivo sobre la grilla.' },
        { pair: ['hb/cover', 'hb/ilustracion-acuarela'], caps: ['Línea 2023: paisajes de origen en acuarela.', 'Ilustración original para la línea ilustrada.'] },
        { title: 'Tres generaciones de etiquetas', timeline: [
          { year: '2023', name: 'Paisajes', text: 'Cada blend con el paisaje de su origen, en acuarela.', imgs: ['hb/paisaje-01', 'hb/paisaje-03', 'hb/paisaje-05'] },
          { year: '2025', name: 'Línea ilustrada', text: 'Flores y frutas como protagonistas, con nombre propio por blend.', imgs: ['hb/acuarela-01', 'hb/acuarela-02', 'hb/acuarela-03'] },
          { year: '2026', name: 'Sistema tipográfico', text: 'Un color por blend y la tipografía al frente.', imgs: ['hb/v4-01', 'hb/v4-03', 'hb/v4-06'] },
        ] },
        { full: 'hb/saq26-pliego', cap: 'Saquitos 10.2026: los 14 blends resueltos en una sola plancha troquelada.' },
        { pair: ['hb/saq26-tisanas', 'hb/saq26-te'], caps: ['Tisanas: nombre, ingredientes y un color por blend.', 'Blends de té: al dorso, isotipo y datos de contacto.'] },
        { half: 'hb/isotipo-argentina', cap: 'Versión mundial del isotipo.' },
      ],
    },
    {
      id: 'noer', client: 'NoER', years: '2026', place: 'Nogoyá, Entre Ríos',
      title: 'Movilidad de pueblo, con la confianza de una app grande.',
      summary: 'NoER (No + ER: Nogoyá + Entre Ríos) conecta remises habilitados y cadetería en la ciudad. Diseñé un logo cercano, "de pueblo", con un pin como isotipo, y rediseñé los flujos de la app: pedir un viaje o un envío, elegir en el mapa, seguir al chofer, cancelar, calificar, billetera y avisos, en modo claro y oscuro.',
      spec: [['alcance', 'Rebrand · UX/UI'], ['entregables', 'Logo y paleta · 22 pantallas · prototipo navegable · tokens y especificaciones para desarrollo'], ['herramientas', 'Illustrator · Figma · prototipo HTML']],
      blocks: [
        { full: 'noer/cover', cap: 'Un pin como isotipo: la app te encuentra donde estés.' },
        { pair: ['noer/bocetos', 'noer/paleta'], caps: ['Bocetos del isotipo.', 'Paleta: menta, rojo pin y verde profundo.'] },
        { full: 'noer/pantallas-a', cap: 'Pedir un viaje: opciones y precio, punto en el mapa y búsqueda de chofer.' },
        { full: 'noer/pantallas-b', cap: 'En viaje, calificación, billetera y modo oscuro.' },
        { pair: ['noer/propuesta', 'noer/logo-menta'], caps: ['Documento de propuesta para el cliente.', 'Versión sobre menta.'] },
      ],
    },
    {
      id: 'hotdog24', client: 'HotDog24', years: '2025', place: 'Rosario',
      title: 'Graffiti con reglas: una marca para la calle.',
      summary: 'Marca para un local de panchos: logotipo de trazo graffiti con variantes de color, manual de uso, carta vertical, tarjeta con QR y el diseño del ploteo de pared a medida del local.',
      spec: [['alcance', 'Identidad · Señalética · Editorial'], ['entregables', 'Logotipo y variantes · manual de uso · carta y tarjeta QR · diseño del ploteo'], ['herramientas', 'Illustrator · Photoshop']],
      blocks: [
        { compare: ['hd24/antes', 'hd24/propuesta'], labels: ['Local vacío', 'Propuesta de ploteo'], cap: 'Arrastrá para comparar el local con la propuesta de ploteo.' },
        { pair: ['hd24/boceto', 'hd24/amarillo'], caps: ['Del boceto…', '…al logotipo final.'] },
        { full: 'hd24/variantes', cap: 'El logotipo sobre su propio universo graffiti.' },
        { pair: ['hd24/menu', 'hd24/qr'], caps: ['Carta vertical.', 'Tarjeta con QR a la carta.'] },
        { full: 'hd24/medidas', cap: 'Relevamiento de medidas para el ploteo.' },
      ],
    },
    {
      id: 'fm', client: 'FM Libertad 101.5', years: '2024–2026', place: 'Nogoyá, Entre Ríos',
      title: 'Una radio con identidad propia, al aire y en pantalla.',
      summary: 'Rediseñé la identidad de la radio —logotipo, construcción, paleta Pantone y variantes— y la llevé a todo lo que sale al aire: los overlays del streaming, las placas para notas y la marca del programa «En Portada».',
      spec: [['alcance', 'Identidad · Gráfica al aire · Submarca'], ['entregables', 'Logotipo y variantes · paleta · overlays de streaming · marca y manual de «En Portada»'], ['herramientas', 'Illustrator · Photoshop']],
      link: ['https://radiofmlibertad.com', 'Ver el sitio de la radio ↗'],
      blocks: [
        { full: 'fm/construccion', cap: 'Construcción del logotipo.' },
        { pair: ['fm/colores', 'fm/variantes'], caps: ['Paleta institucional.', 'Variantes y reducciones.'] },
        { full: 'fm/stream', cap: 'Overlay para el streaming en vivo.' },
        { full: 'fm/en-portada', cap: '«En Portada»: logotipo y aplicaciones del programa.' },
        { pair: ['fm/en-portada-colores', 'fm/en-portada-pieza'], caps: ['Colores y tipografías.', 'Pieza de difusión.'] },
      ],
    },
    {
      id: 'weconnection', client: "We' Connection", years: '2026', place: 'Argentina · ONG',
      title: 'Dos personajes que hablan por toda una comunidad.',
      summary: 'Identidad ilustrada para una ONG: dos personajes que funcionan como logotipo, versiones sello y horizontal, ilustraciones de hojas en línea, un manual de marca de 18 páginas y la etiqueta de producto.',
      spec: [['alcance', 'Identidad ilustrada · Manual · Packaging'], ['entregables', 'Logotipo con personajes · sello · manual de 18 páginas · etiqueta'], ['herramientas', 'Illustrator']],
      blocks: [
        { full: 'wc/manual-01', cap: 'Manual de identidad visual.' },
        { pair: ['wc/manual-03', 'wc/manual-07'], caps: ['Propósito y valores.', 'Versiones del logotipo.'] },
        { full: 'wc/manual-09', cap: 'Área de seguridad y construcción.' },
        { pair: ['wc/manual-10', 'wc/manual-13'], caps: ['Usos incorrectos.', 'Colores institucionales.'] },
        { full: 'wc/etiqueta', cap: 'Etiqueta de producto.' },
        { pair: ['wc/sello', 'wc/manual-14'], caps: ['Versión sello.', 'Tipografía.'] },
      ],
    },
    {
      id: 'coverart', client: 'Ludmila Schimpf · Strato', years: '2023', place: 'Música independiente',
      title: 'Portadas para escuchar con los ojos.',
      summary: 'Para la compositora Ludmila Schimpf: la portada del single «Para no pensar», un logotipo gótico, piezas de lanzamiento y un kit para YouTube. Para Strato (Voidforest): la contratapa del EP «Orbe» y exploraciones visuales con luz.',
      spec: [['alcance', 'Cover art · Logotipo · Lanzamiento'], ['entregables', 'Portada del single · logotipo · posteos de lanzamiento · kit para YouTube · contratapa de EP'], ['herramientas', 'Photoshop · Illustrator']],
      blocks: [
        { pair: ['cover/portada', 'cover/logos'], caps: ['Portada de «Para no pensar».', 'Logotipo gótico y sus versiones.'] },
        { full: 'cover/banner', cap: 'Kit para YouTube.' },
        { pair: ['cover/fecha', 'cover/strato-orbe'], caps: ['Anuncio de lanzamiento.', 'Strato — «Orbe».'] },
        { full: 'cover/strato-luz', cap: 'Exploraciones con luz para Strato.' },
      ],
    },
    {
      id: 'growland', client: 'Growland', years: '2024–2026', place: 'Rosario',
      title: 'Un grow shop con voz propia, del feed al patio.',
      summary: 'Sistema de contenido para Instagram, íconos ilustrados para las historias destacadas, un catálogo de semillas imprimible, flyers de apertura con ilustración doodle y una propuesta para el patio del local.',
      spec: [['alcance', 'Redes · Ilustración · Editorial · Espacio'], ['entregables', 'Íconos de historias · ilustraciones doodle · catálogo de semillas · flyers · propuesta de patio'], ['herramientas', 'Illustrator · Photoshop']],
      blocks: [
        { full: 'grow/destacadas', cap: 'Íconos ilustrados para las historias destacadas.' },
        { pair: ['grow/doodle-01', 'grow/doodle-03'], caps: ['Ilustración doodle.', 'Pieza con contacto.'] },
        { pair: ['grow/flyer-apertura', 'grow/flyer-birra'], caps: ['Flyer de apertura.', 'Flyer de eventos.'] },
        { full: 'grow/catalogo-portada', cap: 'Catálogo de semillas: portada.' },
        { full: 'grow/catalogo-interior', cap: 'Catálogo de semillas: interior.' },
        { compare: ['grow/patio-antes', 'grow/patio-propuesta'], labels: ['Patio hoy', 'Propuesta'], cap: 'Arrastrá para comparar el patio con la propuesta.' },
      ],
    },
  ];

  const modal = document.getElementById('caseModal');
  if (!modal) return;
  document.body.appendChild(modal); // fuera de <main>, por encima de todo
  const body = document.getElementById('caseBody');
  const scroller = document.getElementById('caseScroll');
  const count = document.getElementById('caseCount');
  const SIZES = window.DESIGN_SIZES || {};
  const BASE = './assets/diseno/';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function img(key, alt, sizes, eager) {
    const s = SIZES[key];
    if (!s) return '';
    const [w, h, made] = s;
    const scale = (L) => Math.round(w * Math.min(1, L / Math.max(w, h)));
    const srcset = made.map((L) => `${BASE}${key}-${L}.webp ${L === 1600 ? w : scale(L)}w`).join(', ');
    const src = `${BASE}${key}-${made[made.length - 1]}.webp`;
    return `<img src="${src}" srcset="${srcset}" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}" ${eager ? '' : 'loading="lazy"'} decoding="async" />`;
  }

  // proporción ancho/alto: la figura nunca supera la altura de la pantalla
  const ar = (key) => { const s = SIZES[key]; return s ? (s[0] / s[1]).toFixed(3) : 1.6; };

  function figure(key, cap, sizes, cls = '') {
    return `<figure class="cm-fig ${cls}" style="--ar:${ar(key)}">${img(key, cap || '', sizes)}${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`;
  }

  /* Isotipo que se construye solo: la grilla se cruza, los trazos se dibujan
     y recién después entra el relleno. Las guías no están dibujadas a mano:
     salen de las medidas reales de los paths (getBBox), así que si cambia el
     logo, la grilla lo sigue. */
  function buildBlock(b) {
    const pieces = HB_LOGO.map((d, i) => `<path class="hb-build__piece" style="--i:${i}" d="${d}" />`).join('');
    return `<section class="cm-build">
      <figure class="cm-build__stage">
        <svg class="hb-build" viewBox="0 0 ${HB_VIEWBOX[0]} ${HB_VIEWBOX[1]}" role="img" aria-label="El isotipo de Hierbas Blends se arma sobre su grilla de construcción">
          <g class="hb-build__grid" aria-hidden="true"></g>
          <g class="hb-build__shape">${pieces}</g>
        </svg>
        ${b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ''}
      </figure>
      <div class="cm-build__text">
        <h3 class="cm-subtitle">${esc(b.build)}</h3>
        ${(b.text || []).map((t) => `<p>${esc(t)}</p>`).join('')}
        ${b.notes ? `<dl class="spec cm-build__spec">${b.notes.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      </div>
    </section>`;
  }

  function initBuild(svg) {
    if (svg.dataset.built) return;
    const pieces = Array.from(svg.querySelectorAll('.hb-build__piece'));
    if (!pieces.length || !pieces[0].getTotalLength) return;
    pieces.forEach((el) => el.style.setProperty('--len', Math.ceil(el.getTotalLength())));

    const [W, H] = HB_VIEWBOX;
    const taza = pieces[0].getBBox();   // la taza: su borde superior es el diámetro
    // mientras el overlay está oculto, getBBox() mide 0: esperamos a que pinte
    if (!taza.width) { requestAnimationFrame(() => initBuild(svg)); return; }
    svg.dataset.built = '1';
    const remate = pieces[4].getBBox(); // el círculo del extremo de la mano
    const cx = taza.x + taza.width / 2, cy = taza.y, r = taza.width / 2;
    const kx = remate.x + remate.width / 2, ky = remate.y + remate.height / 2, kr = remate.width / 2;
    const t = 1.35; // cuánto se estira la diagonal más allá de los dos centros
    const grid = svg.querySelector('.hb-build__grid');
    const NS = 'http://www.w3.org/2000/svg';
    const guides = [
      ['line', { x1: cx, y1: 0, x2: cx, y2: H }],                               // eje vertical
      ['line', { x1: 0, y1: cy, x2: W, y2: cy }],                               // diámetro de la taza
      ['line', { x1: 0, y1: cy + r, x2: W, y2: cy + r }],                       // base
      ['line', { x1: kx, y1: 0, x2: kx, y2: H }],                               // eje del remate
      ['line', { x1: kx + (cx - kx) * t, y1: ky + (cy - ky) * t, x2: kx - (cx - kx) * 0.45, y2: ky - (cy - ky) * 0.45 }], // diagonal de la mano
      ['circle', { cx, cy, r }],
      ['circle', { cx: kx, cy: ky, r: kr }],
      ['circle', { cx, cy, r: r * 0.52 }],
    ];
    guides.forEach(([tag, attrs], i) => {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      el.style.setProperty('--i', i);
      grid.appendChild(el);
      el.style.setProperty('--len', Math.ceil(el.getTotalLength ? el.getTotalLength() : 2 * Math.PI * attrs.r));
    });
    if (reduced) svg.classList.add('is-static');
  }

  function renderBlock(b) {
    if (b.full) return figure(b.full, b.cap, '(max-width: 760px) 100vw, 1180px', 'cm-fig--full');
    if (b.half) return figure(b.half, b.cap, '(max-width: 760px) 100vw, 520px', 'cm-fig--half');
    if (b.build) return buildBlock(b);
    if (b.pair) return `<div class="cm-pair">${b.pair.map((k, i) => figure(k, b.caps && b.caps[i], '(max-width: 760px) 100vw, 590px')).join('')}</div>`;
    if (b.compare) {
      const [a, z] = b.compare, [la, lz] = b.labels;
      return `<figure class="cm-fig cm-fig--full" style="--ar:${ar(a)}"><div class="compare" style="--pos:50%">
          <div class="compare__img">${img(a, la, '(max-width: 760px) 100vw, 1180px')}</div>
          <div class="compare__img compare__after">${img(z, lz, '(max-width: 760px) 100vw, 1180px')}</div>
          <span class="compare__label">${esc(la)}</span><span class="compare__label compare__label--r">${esc(lz)}</span>
          <span class="compare__handle" aria-hidden="true"></span>
          <input class="compare__range" type="range" min="0" max="100" value="50" aria-label="Comparar: ${esc(la)} y ${esc(lz)}" />
        </div>${b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ''}</figure>`;
    }
    if (b.timeline) {
      return `<section class="cm-timeline"><h3 class="cm-subtitle">${esc(b.title || '')}</h3><ol>${b.timeline.map((t) =>
        `<li><p class="cm-timeline__year">${esc(t.year)}</p><p class="cm-timeline__name">${esc(t.name)}</p><p class="cm-timeline__text">${esc(t.text)}</p>
          <div class="cm-timeline__imgs">${t.imgs.map((k) => img(k, `${t.name} ${t.year}`, '(max-width: 760px) 30vw, 130px')).join('')}</div></li>`).join('')}</ol></section>`;
    }
    return '';
  }

  function render(c, i) {
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(CASES.length).padStart(2, '0')} · ${c.client}`;
    body.innerHTML = `
      <header class="cm-head">
        <div>
          <p class="eyebrow">${esc(c.client.toLowerCase())} · ${esc(c.years)}</p>
          <h2 class="cm-title" id="caseTitle">${esc(c.title)}</h2>
          <p class="cm-summary">${esc(c.summary)}</p>
          ${c.link ? `<a class="link-strong" href="${c.link[0]}" target="_blank" rel="noopener">${esc(c.link[1])}</a>` : ''}
        </div>
        <dl class="spec cm-spec">
          <div><dt>cliente</dt><dd>${esc(c.client)}</dd></div>
          <div><dt>lugar</dt><dd>${esc(c.place)}</dd></div>
          ${c.spec.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
        </dl>
      </header>
      <div class="cm-blocks">${c.blocks.map(renderBlock).join('')}</div>
      <footer class="cm-foot">
        <button class="btn btn--ghost" type="button" data-case-step="1">Siguiente caso: ${esc(CASES[(i + 1) % CASES.length].client)} →</button>
      </footer>`;
    body.querySelectorAll('.compare').forEach(initCompare);
    scroller.scrollTop = 0;
  }

  function initCompare(el) {
    const range = el.querySelector('.compare__range');
    const set = (v) => el.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => set(range.value));
  }

  /* ── Abrir / cerrar / navegar ───────────────────────────── */
  let current = -1, lastFocus = null;

  function open(id, push = true) {
    const i = CASES.findIndex((c) => c.id === id);
    if (i < 0) return;
    if (current < 0) lastFocus = document.activeElement;
    current = i;
    render(CASES[i], i);
    modal.hidden = false;
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      body.querySelectorAll('.hb-build').forEach(initBuild); // ya visible: getBBox() mide bien
    });
    if (push) history.replaceState(null, '', '#caso-' + id);
    setTimeout(() => document.getElementById('caseClose').focus(), reduced ? 0 : 80);
  }

  function close() {
    if (current < 0) return;
    current = -1;
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    setTimeout(() => { if (current < 0) { modal.hidden = true; body.innerHTML = ''; } }, reduced ? 0 : 400);
    history.replaceState(null, '', '#diseno');
    if (lastFocus) lastFocus.focus();
  }

  function step(d) {
    if (current < 0) return;
    const i = (current + d + CASES.length) % CASES.length;
    open(CASES[i].id);
  }

  document.querySelectorAll('[data-case]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    open(a.dataset.case);
  }));
  document.getElementById('caseClose').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    const s = e.target.closest('[data-case-step]');
    if (s) step(+s.dataset.caseStep);
  });
  document.addEventListener('keydown', (e) => {
    if (current < 0) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.target.matches('input')) return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'Tab') { // foco atrapado en el overlay
      const f = Array.from(modal.querySelectorAll('a[href], button, input')).filter((el) => el.offsetParent !== null);
      const k = f.indexOf(document.activeElement);
      if (e.shiftKey && k <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  // Link directo a un caso: …/#caso-noer
  const m = location.hash.match(/^#caso-([\w-]+)$/);
  if (m) open(m[1], false);
})();
