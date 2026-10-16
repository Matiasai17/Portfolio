/* ============================================================
   PORTFOLIO MATÍAS MEDRANO v3.2 — main.js  (vanilla, sin dependencias)
   1. Año del footer            5. Carruseles + inclinación de los casos
   2. Header + migas (sección)  6. Simulador de automatizaciones (FLOWS)
   3. Menú overlay              7. Botón de sonido
   4. Reveals (títulos que "compilan" de mono a sans)
   La red 3D vive aparte, en js/neural.js.
   ============================================================ */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ── 1. Año ─────────────────────────────────────────────── */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ── 2. Header: fondo al scrollear + sección actual ─────── */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const crumb = $('#crumb');
  const menuLinks = $$('.menu__link');
  const sections = $$('main section[id]');
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const id = e.target.id;
      if (crumb) crumb.textContent = e.target.dataset.name || id;
      menuLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => sectionIO.observe(s));

  /* ── 3. Menú overlay ───────────────────────────────────── */
  const menu = $('#menu'), toggle = $('#menuToggle');
  let lastFocus = null;
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.menu-btn__label').textContent = open ? 'Cerrar' : 'Menú';
    document.body.classList.toggle('menu-open', open);
    if (open) {
      lastFocus = document.activeElement;
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      setTimeout(() => menuLinks[0] && menuLinks[0].focus(), 60);
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduced ? 0 : 450);
      if (lastFocus) lastFocus.focus();
    }
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') { setMenu(false); return; }
    if (e.key === 'Tab') { // foco atrapado dentro del menú (+ el botón para cerrarlo)
      const f = [toggle, ...$$('a', menu)];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ── 4. Reveals ─────────────────────────────────────────── */
  const reveals = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  }
  // El titular del hero compila al cargar
  requestAnimationFrame(() => document.body.classList.add('is-loaded'));

  /* ── 5. Carruseles + inclinación 3D de los casos ───────── */
  $$('[data-carousel]').forEach((car) => {
    const slides = $$('.carousel__slide', car);
    const bar = $('.carousel__progress', car);
    if (slides.length < 2) { if (bar) bar.remove(); return; }
    bar.innerHTML = slides.map(() => '<i><b></b></i>').join('');
    const segs = $$('i', bar);
    let i = 0, timer = 0;
    const DUR = 3800;
    const show = (n) => {
      slides[i].classList.remove('is-active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active');
      segs.forEach((s, k) => { s.classList.remove('is-active'); s.classList.toggle('is-done', k < i); });
      void bar.offsetWidth; // reinicia la animación de la barra
      segs[i].classList.add('is-active');
    };
    const play = () => { if (reduced) return; clearInterval(timer); timer = setInterval(() => show(i + 1), DUR); };
    const stop = () => clearInterval(timer);
    car.style.setProperty('--dur', DUR + 'ms');
    show(0);
    const frame = car.closest('.case__frame');
    frame.addEventListener('mouseenter', () => { stop(); car.classList.add('is-paused'); });
    frame.addEventListener('mouseleave', () => { play(); car.classList.remove('is-paused'); });
    new IntersectionObserver(([e]) => (e.isIntersecting ? play() : stop())).observe(car);
  });

  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.case__frame').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (x * 7).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
        el.style.setProperty('--gx', ((x + 0.5) * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', ((y + 0.5) * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ── 6. Simulador de automatizaciones (estilo n8n) ─────── */
  // Casos del simulador. real: true = caso real (muestra su stack); si no, es un ejemplo.
  // Cada nodo: { t: título, d: detalle, icon, trigger?, if? }. Un nodo { branch: [nodoTrue, nodoFalse] }
  // abre dos ramas desde el nodo IF anterior; cada corrida alterna la rama.
  // log: una línea [tipo, texto] por nodo; { branch: [[…], […]] } cuando depende de la rama.
  const FLOWS = [
    {
      id: 'hierbas', tab: 'hierbas blends', real: true, title: 'Cada compra, con seguimiento propio',
      text: 'El carrito de la tienda registra cada compra solo. A los 7 días le llega al cliente una encuesta de satisfacción: si responde bien, recibe un cupón; si algo salió mal, el dueño se entera al instante para darle soporte rápido.',
      stack: ['webhook', 'n8n', 'Airtable', 'Gmail'],
      nodes: [
        { t: 'Compra en la web', d: 'webhook del carrito', icon: 'cart', trigger: true },
        { t: 'Registrar compra', d: 'Airtable', icon: 'db' },
        { t: 'Encuesta a 7 días', d: 'espera + Gmail', icon: 'clock' },
        { t: '¿Respuesta positiva?', d: 'IF', icon: 'branch', if: true },
        { branch: [{ t: 'Enviar cupón', d: 'Gmail', icon: 'gift' }, { t: 'Avisar al dueño', d: 'Gmail', icon: 'alert' }] },
      ],
      log: [['webhook', 'compra nueva: 2 blends + 1 mate'], ['airtable', 'cliente y pedido registrados'], ['espera', '7 días después → encuesta enviada'],
        { branch: [['if', 'respuesta positiva → true'], ['if', 'respuesta negativa → false']] },
        { branch: [['listo', 'cupón de descuento enviado'], ['listo', 'dueño avisado para dar soporte']] }],
    },
    {
      id: 'sugerencias', tab: 'sugerencias', real: true, title: 'Ideas que llegan analizadas',
      text: 'En una suite de herramientas internas, cualquiera del equipo deja una sugerencia. Se registra sola, la IA evalúa si es factible, suma ideas para resolverla y me llega todo por mail, listo para decidir.',
      stack: ['n8n', 'Airtable', 'IA', 'Gmail'],
      nodes: [
        { t: 'Sugerencia nueva', d: 'formulario', icon: 'form', trigger: true },
        { t: 'Registrar', d: 'Airtable', icon: 'db' },
        { t: 'Analizar', d: 'IA · factibilidad + ideas', icon: 'ai' },
        { t: 'Enviar resumen', d: 'Gmail', icon: 'mail' },
      ],
      log: [['trigger', 'sugerencia nueva: “exportar etiquetas en lote”'], ['airtable', 'sugerencia registrada'], ['ia', 'factible · 3 ideas para implementarla'], ['listo', 'resumen enviado por mail']],
    },
    {
      id: 'atencion', tab: 'atención', title: 'Nunca más una consulta sin responder',
      text: 'Cada mensaje en WhatsApp, Instagram o tu web recibe respuesta al instante, a toda hora. Si hace falta que intervengas vos, te lo deriva.',
      nodes: [
        { t: 'Mensaje nuevo', d: 'WhatsApp · web', icon: 'chat', trigger: true },
        { t: 'Entender consulta', d: 'IA', icon: 'ai' },
        { t: '¿Puede responder?', d: 'IF', icon: 'branch', if: true },
        { branch: [{ t: 'Responder', d: 'al instante', icon: 'chat' }, { t: 'Derivarte', d: 'aviso a tu celular', icon: 'alert' }] },
      ],
      log: [['trigger', 'mensaje nuevo en WhatsApp: “¿hacen envíos a Rosario?”'], ['ia', 'consulta detectada → envíos'],
        { branch: [['if', 'tiene la respuesta → true'], ['if', 'necesita a una persona → false']] },
        { branch: [['listo', 'respuesta enviada con zonas y costos'], ['listo', 'consulta derivada con un resumen']] }],
    },
    {
      id: 'reportes', tab: 'reportes', title: 'Los números, servidos',
      text: 'Recibís cada semana un resumen claro de tus ventas, pedidos o métricas — directo en tu casilla, sin abrir una sola planilla.',
      nodes: [
        { t: 'Lunes 08:00', d: 'programado', icon: 'calendar', trigger: true },
        { t: 'Leer ventas', d: 'tienda + planilla', icon: 'db' },
        { t: 'Armar resumen', d: 'IA', icon: 'ai' },
        { t: 'Enviar reporte', d: 'Gmail', icon: 'mail' },
      ],
      log: [['trigger', 'lunes 08:00 — arranca el reporte semanal'], ['datos', 'ventas y pedidos de la semana, leídos'], ['ia', 'resumen armado: qué subió, qué bajó'], ['listo', 'enviado a tu casilla']],
    },
  ];

  const ICONS = {
    cart: '<path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
    db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    branch: '<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.4 6h7.2M7.7 7.7 16.3 16.3"/>',
    gift: '<path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C10 4 7 4 7 5.6S10 7 12 7c2 0 5-.1 5-1.4S14 4 12 7Z"/>',
    alert: '<path d="M12 3 2 20h20L12 3ZM12 10v4M12 17h.01"/>',
    form: '<path d="M5 3h14v18H5zM8.5 8h7M8.5 12h7M8.5 16h4"/>',
    ai: '<path d="M12 3l1.8 4.6 4.7 1.9-4.7 1.9L12 16l-1.8-4.6-4.7-1.9 4.7-1.9ZM19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/>',
    mail: '<path d="M3 6h18v12H3zM3 7l9 6 9-6"/>',
    chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"/>',
    calendar: '<path d="M4 5h16v15H4zM4 9.5h16M8 3v4M16 3v4"/>',
  };

  const sim = $('#sim');
  if (sim) {
    const tabs = $('.sim__tabs', sim), flowEl = $('#flowInner', sim), logEl = $('.console__log', sim);
    const tagEl = $('.sim__tag', sim), titleEl = $('.sim__title', sim), textEl = $('.sim__text', sim);
    const stackEl = $('.sim__stack', sim), badgeEl = $('.sim__badge-text', sim);
    const STEP = 1150, OK_AT = 430, HOLD = 4200;
    let current = 0, timers = [], userPicked = false, visible = false, runId = 0;
    const altBranch = {}; // rama elegida por caso; alterna en cada corrida
    let edges = [];        // conexiones dibujadas: { from, to, alt, path, label, packet }

    tabs.innerHTML = FLOWS.map((f, k) =>
      `<button class="sim__tab${f.real ? ' is-real' : ''}" role="tab" id="simtab-${f.id}" aria-controls="simPanel" aria-selected="${k === 0}" tabindex="${k === 0 ? 0 : -1}">${f.tab}</button>`).join('');
    const tabBtns = $$('.sim__tab', tabs);

    const clock = (offset) => new Date(Date.now() + offset).toTimeString().slice(0, 8);
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    const at = (ms, fn, id) => timers.push(setTimeout(() => { if (id === runId) fn(); }, ms));

    const nodeHTML = (n, col, alt) => `
      <div class="fn${n.trigger ? ' fn--trigger' : ''}${n.if ? ' fn--if' : ''}" data-col="${col}"${alt != null ? ` data-alt="${alt}"` : ''}>
        <div class="fn__box">
          <svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n.icon] || ''}</svg>
          ${n.trigger ? '<span class="fn__bolt" aria-hidden="true"></span>' : '<span class="fn__port fn__port--in"></span>'}
          ${n.if ? '<span class="fn__port fn__port--out fn__port--t"><em>true</em></span><span class="fn__port fn__port--out fn__port--f"><em>false</em></span>'
              : '<span class="fn__port fn__port--out"></span>'}
          <span class="fn__ok" aria-hidden="true"></span>
        </div>
        <p class="fn__t">${n.t}</p><p class="fn__d">${n.d}</p>
      </div>`;

    function render(k) {
      const f = FLOWS[k];
      tabBtns.forEach((b, i) => { b.setAttribute('aria-selected', String(i === k)); b.tabIndex = i === k ? 0 : -1; });
      $('#simPanel').setAttribute('aria-labelledby', 'simtab-' + f.id);
      tagEl.textContent = f.real ? '// caso real · ' + f.tab : '// ejemplo · ' + f.tab;
      titleEl.textContent = f.title;
      textEl.textContent = f.text;
      stackEl.innerHTML = (f.stack || []).map((s) => `<li>${s}</li>`).join('');
      stackEl.hidden = !f.stack;
      badgeEl.textContent = f.real ? 'caso real · simulación' : 'ejemplo ilustrativo';
      flowEl.innerHTML = `<svg class="flow__wires" aria-hidden="true"><defs><marker id="fwArrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 8 4 0 8z"/></marker></defs></svg>` +
        f.nodes.map((n, i) => `<div class="flow__col">${n.branch ? n.branch.map((b, j) => nodeHTML(b, i, j)).join('') : nodeHTML(n, i)}</div>`).join('');
      flowEl.style.setProperty('--cols', f.nodes.length);
      logEl.innerHTML = '';
      requestAnimationFrame(() => drawWires(f));
    }

    // Cables bezier entre puertos (como las conexiones de n8n)
    function drawWires(f) {
      const svg = $('.flow__wires', flowEl);
      if (!svg) return;
      $$('.fw, .fw-label, .fw-packet', flowEl).forEach((el) => el.remove());
      const box = flowEl.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      svg.setAttribute('width', box.width); svg.setAttribute('height', box.height);
      const pt = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top]; };
      edges = [];
      for (let i = 1; i < f.nodes.length; i++) {
        const prev = $(`.fn[data-col="${i - 1}"]`, flowEl);
        const targets = $$(`.fn[data-col="${i}"]`, flowEl);
        targets.forEach((tEl) => {
          const alt = tEl.dataset.alt != null ? +tEl.dataset.alt : null;
          const out = alt == null ? $('.fn__port--out', prev) : $(alt === 0 ? '.fn__port--t' : '.fn__port--f', prev);
          const [x1, y1] = pt(out), [x2, y2] = pt($('.fn__port--in', tEl));
          const dx = Math.max(30, (x2 - x1) * 0.5);
          const d = `M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)} ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)} ${(x2 - 6).toFixed(1)} ${y2.toFixed(1)}`;
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d); path.setAttribute('class', 'fw'); path.setAttribute('marker-end', 'url(#fwArrow)');
          svg.appendChild(path);
          const label = document.createElement('span');
          label.className = 'fw-label'; label.textContent = '1 item';
          label.style.left = ((x1 + x2) / 2) + 'px'; label.style.top = ((y1 + y2) / 2) + 'px';
          const packet = document.createElement('span');
          packet.className = 'fw-packet'; packet.style.offsetPath = `path('${d}')`;
          flowEl.append(label, packet);
          edges.push({ to: i, alt, path, label, packet });
        });
      }
    }
    new ResizeObserver(() => { if (FLOWS[current]) drawWires(FLOWS[current]); }).observe(flowEl);

    function run(k) {
      clear();
      const id = ++runId;
      current = k;
      render(k);
      const f = FLOWS[k];
      const steps = f.nodes.length;
      const alt = altBranch[f.id] = altBranch[f.id] === 0 ? 1 : 0;
      const nodeAt = (i) => $(`.fn[data-col="${i}"]${f.nodes[i].branch ? `[data-alt="${alt}"]` : ''}`, flowEl);
      const edgeTo = (i) => edges.find((e) => e.to === i && (e.alt == null || e.alt === alt));
      const addLog = (i) => {
        const entry = f.log[i];
        const [kind, msg] = entry.branch ? entry.branch[alt] : entry;
        const li = document.createElement('li');
        li.className = 'console__line' + (kind === 'listo' ? ' is-ok' : '');
        li.innerHTML = `<time>${clock(i * 900)}</time><b>${kind}</b><span></span>`;
        li.lastChild.textContent = msg;
        logEl.appendChild(li);
      };
      const skipOther = (i) => { if (f.nodes[i].branch) $$(`.fn[data-col="${i}"]:not([data-alt="${alt}"])`, flowEl).forEach((n) => n.classList.add('is-skip')); };

      if (reduced) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (let i = 0; i < steps; i++) {
            nodeAt(i).classList.add('is-ok'); skipOther(i); addLog(i);
            const e = edgeTo(i + 1); if (e) { e.path.classList.add('is-done'); e.label.classList.add('is-on'); }
          }
        }));
        return;
      }
      for (let i = 0; i < steps; i++) {
        const t0 = 350 + i * STEP;
        at(t0, () => {
          const n = nodeAt(i);
          n.classList.add('is-run'); skipOther(i); addLog(i);
          window.dispatchEvent(new CustomEvent('sinap:flow', { detail: { step: Math.min(i, 3), total: steps } }));
          if (window.SinapAudio) window.SinapAudio.play('step', i);
        }, id);
        at(t0 + OK_AT, () => {
          const n = nodeAt(i);
          n.classList.remove('is-run'); n.classList.add('is-ok');
          const e = edgeTo(i + 1);
          if (e) {
            e.path.classList.add('is-flow');
            e.packet.classList.remove('is-go'); void e.packet.offsetWidth; e.packet.classList.add('is-go');
            at(STEP - OK_AT, () => { e.path.classList.add('is-done'); e.label.classList.add('is-on'); }, id);
          }
        }, id);
      }
      // si nadie eligió un caso, pasa solo al siguiente
      at(350 + steps * STEP + HOLD, () => { if (!userPicked && visible) run((k + 1) % FLOWS.length); }, id);
    }

    tabBtns.forEach((b, k) => b.addEventListener('click', () => { userPicked = true; run(k); }));
    tabs.addEventListener('keydown', (e) => {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const k = (current + dir + FLOWS.length) % FLOWS.length;
      userPicked = true; run(k); tabBtns[k].focus();
    });
    $('.sim__replay', sim).addEventListener('click', () => { userPicked = true; run(current); });

    render(0);
    new IntersectionObserver(([e]) => {
      const was = visible;
      visible = e.isIntersecting;
      if (visible && !was) run(current);
      if (!visible) clear();
    }, { threshold: 0.35 }).observe(sim);
  }

  /* ── 7. Botón de sonido ────────────────────────────────── */
  const snd = $('#soundToggle');
  if (snd) {
    const paint = () => {
      const on = !!(window.SinapAudio && window.SinapAudio.isEnabled());
      snd.setAttribute('aria-pressed', String(on));
      snd.classList.toggle('is-off', !on);
      const label = on ? 'Silenciar sonidos' : 'Activar sonidos';
      snd.setAttribute('aria-label', label);
      snd.title = label;
    };
    paint();
    snd.addEventListener('click', () => {
      if (!window.SinapAudio) return;
      window.SinapAudio.setEnabled(!window.SinapAudio.isEnabled());
      paint();
    });
  }
})();
