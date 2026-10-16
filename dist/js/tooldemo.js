/* ============================================================
   PORTFOLIO MATÍAS MEDRANO v3.2 — tooldemo.js
   Visor 3D (en nodos) de dos herramientas de la suite interna,
   con datos genéricos:
   · Plegador de troqueles: una caja pasa del plano a plegada.
   · Estiba de contenedor: cajas iguales llenando un contenedor 20'.
   Usa el mismo Three.js que neural.js (misma URL → se baja una vez).
   Se puede girar arrastrando. Solo anima cuando está a la vista.
   ============================================================ */
(() => {
  'use strict';

  /* ── CONTROLES ─────────────────────────────────────────────── */
  const DEMO_CONFIG = {
    threeURL: 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js',
    die: { w: 3, d: 2, h: 1.5, mm: [300, 200, 150], cycle: 7.5, grid: 0.25 },
    // contenedor 20' (medidas internas, m) y caja genérica (m)
    container: { L: 5.9, W: 2.35, H: 2.39, box: [0.6, 0.4, 0.4], perSecond: 28, hold: 2.5 },
    colors: { node: 0xf2b84b, edge: 0xa58bff, fold: 0xff8fd0, dim: 0x8f8bb2 },
  };
  /* ─────────────────────────────────────────────────────────── */

  const root = document.getElementById('toolDemo');
  if (!root) return;
  const canvas = root.querySelector('.demo__canvas');
  const view = root.querySelector('.demo__view');
  const stats = root.querySelector('.demo__stats');
  const caption = root.querySelector('.demo__caption');
  const tabs = Array.from(root.querySelectorAll('[data-demo]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CAPTIONS = {
    die: 'Desde el plano del troquel (PDF o DXF), la herramienta lo pliega en 3D para revisar encastres y medidas antes de imprimir. Simulación con una caja genérica.',
    container: 'Calcula cuántas cajas iguales entran en un contenedor de 20\' o 40\' y compara formas de estibarlas. Simulación: contenedor de 20\' con cajas genéricas de 60 × 40 × 40 cm.',
  };

  let mode = 'die';
  caption.textContent = CAPTIONS.die;

  try {
    const t = document.createElement('canvas');
    if (!(t.getContext('webgl2') || t.getContext('webgl'))) throw 0;
  } catch (e) { root.classList.add('is-static'); return; }

  import(DEMO_CONFIG.threeURL).then(start).catch(() => root.classList.add('is-static'));

  function start(THREE) {
    const C = DEMO_CONFIG, COL = C.colors;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

    // punto redondo y suave para los nodos
    const dot = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const nodeMat = (size) => new THREE.PointsMaterial({ color: COL.node, size, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const edgeMat = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });

    /* ── Troquel ───────────────────────────────────────────── */
    // Una cara: rectángulo (ancho w, largo l) en el plano XZ; arranca en la bisagra (z=0) o centrado.
    function face(w, l, centered) {
      const g = new THREE.Group(), z0 = centered ? -l / 2 : 0, s = C.die.grid;
      const pts = [];
      for (let x = -w / 2; x <= w / 2 + 1e-6; x += s) for (let z = 0; z <= l + 1e-6; z += s) {
        const edge = Math.abs(x + w / 2) < 1e-6 || Math.abs(x - w / 2) < 1e-6 || z < 1e-6 || Math.abs(z - l) < 1e-6;
        if (edge || Math.random() < 0.35) pts.push(x, 0, z0 + z);
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      g.add(new THREE.Points(pg, nodeMat(0.16)));
      const o = [-w / 2, z0, w / 2, z0, w / 2, z0 + l, -w / 2, z0 + l];
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.Float32BufferAttribute([
        o[0], 0, o[1], o[2], 0, o[3], o[2], 0, o[3], o[4], 0, o[5], o[4], 0, o[5], o[6], 0, o[7], o[6], 0, o[7], o[0], 0, o[1]], 3));
      g.add(new THREE.LineSegments(lg, edgeMat(COL.edge, 0.85)));
      // trama interna tenue
      const tr = [];
      for (let x = -w / 2 + s * 2; x < w / 2 - 1e-6; x += s * 2) tr.push(x, 0, z0, x, 0, z0 + l);
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.Float32BufferAttribute(tr, 3));
      g.add(new THREE.LineSegments(tg, edgeMat(COL.edge, 0.12)));
      return g;
    }
    function hinge(parent, x, z, rotY, w, l) {
      const orient = new THREE.Group();
      orient.position.set(x, 0, z); orient.rotation.y = rotY;
      const pivot = new THREE.Group();
      orient.add(pivot); pivot.add(face(w, l, false));
      // línea de plegado (punteada) sobre la bisagra
      const fg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w / 2, 0.002, 0), new THREE.Vector3(w / 2, 0.002, 0)]);
      const fl = new THREE.Line(fg, new THREE.LineDashedMaterial({ color: COL.fold, dashSize: 0.1, gapSize: 0.07, transparent: true, opacity: 0.9 }));
      fl.computeLineDistances(); orient.add(fl);
      parent.add(orient);
      return pivot;
    }

    const die = new THREE.Group();
    const dieInner = new THREE.Group();
    die.add(dieInner);
    const { w: W, d: D, h: H } = C.die;
    dieInner.add(face(W, D, true));
    const sides = [
      hinge(dieInner, 0, D / 2, 0, W, H),
      hinge(dieInner, 0, -D / 2, Math.PI, W, H),
      hinge(dieInner, W / 2, 0, Math.PI / 2, D, H),
      hinge(dieInner, -W / 2, 0, -Math.PI / 2, D, H),
    ];
    const lid = hinge(sides[1], 0, H, 0, W, D); // la tapa cuelga de la cara trasera
    die.scale.setScalar(1.12);
    scene.add(die);

    /* ── Contenedor ────────────────────────────────────────── */
    const K = C.container, [bx, by, bz] = K.box;
    const nx = Math.floor(K.L / bx), nz = Math.floor(K.W / by), ny = Math.floor(K.H / bz);
    const total = nx * ny * nz;
    const cont = new THREE.Group();
    const boxEdges = (x0, y0, z0, x1, y1, z1) => [
      x0, y0, z0, x1, y0, z0, x1, y0, z0, x1, y0, z1, x1, y0, z1, x0, y0, z1, x0, y0, z1, x0, y0, z0,
      x0, y1, z0, x1, y1, z0, x1, y1, z0, x1, y1, z1, x1, y1, z1, x0, y1, z1, x0, y1, z1, x0, y1, z0,
      x0, y0, z0, x0, y1, z0, x1, y0, z0, x1, y1, z0, x1, y0, z1, x1, y1, z1, x0, y0, z1, x0, y1, z1];
    const L2 = K.L / 2, W2 = K.W / 2;
    // estructura del contenedor + corrugado de las paredes
    const shell = boxEdges(-L2, 0, -W2, L2, K.H, W2);
    for (let x = -L2 + 0.25; x < L2; x += 0.25) shell.push(x, 0, -W2, x, K.H, -W2);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(shell, 3));
    cont.add(new THREE.LineSegments(sg, edgeMat(COL.dim, 0.45)));
    const shellPts = [];
    for (let i = 0; i < shell.length; i += 6) {
      for (let t = 0; t <= 1; t += 0.12) shellPts.push(shell[i] + (shell[i + 3] - shell[i]) * t, shell[i + 1] + (shell[i + 4] - shell[i + 1]) * t, shell[i + 2] + (shell[i + 5] - shell[i + 2]) * t);
    }
    const spg = new THREE.BufferGeometry();
    spg.setAttribute('position', new THREE.Float32BufferAttribute(shellPts, 3));
    const shellNodes = new THREE.Points(spg, nodeMat(0.07));
    shellNodes.material.color.set(COL.dim);
    cont.add(shellNodes);

    // todas las cajas en una sola geometría; se muestran de a poco con drawRange
    const order = [];
    for (let i = 0; i < nx; i++) for (let k = 0; k < ny; k++) for (let j = 0; j < nz; j++) order.push([i, k, j]);
    const gap = 0.02, edges = [], corners = [], slots = [];
    order.forEach(([i, k, j]) => {
      const x0 = -L2 + i * bx + gap, y0 = k * bz + gap, z0 = -W2 + j * by + gap;
      const x1 = x0 + bx - 2 * gap, y1 = y0 + bz - 2 * gap, z1 = z0 + by - 2 * gap;
      slots.push([x0, y0, z0]);
      edges.push(...boxEdges(x0, y0, z0, x1, y1, z1));
      corners.push(x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, x0, y1, z0, x1, y1, z0, x1, y1, z1, x0, y1, z1);
    });
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(edges, 3));
    const boxes = new THREE.LineSegments(bg, edgeMat(COL.edge, 0.7));
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
    const boxNodes = new THREE.Points(cg, nodeMat(0.09));
    cont.add(boxes, boxNodes);
    // la caja que va cayendo a su lugar
    const fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.Float32BufferAttribute(boxEdges(0, 0, 0, bx - 2 * gap, bz - 2 * gap, by - 2 * gap), 3));
    const falling = new THREE.LineSegments(fgeo, edgeMat(COL.node, 1));
    cont.add(falling);
    cont.position.y = -K.H / 2;
    cont.scale.setScalar(0.92);
    scene.add(cont);

    const boxVol = bx * by * bz, contVol = K.L * K.W * K.H;

    /* ── Vista, arrastre y tamaño ──────────────────────────── */
    let yaw = 0.6, pitch = 0, drag = null, autoSpin = true;
    canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; canvas.setPointerCapture(e.pointerId); autoSpin = false; });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      yaw = drag.yaw + (e.clientX - drag.x) * 0.008;
      pitch = Math.max(-0.35, Math.min(0.5, drag.pitch + (e.clientY - drag.y) * 0.005));
      kick();
    });
    const endDrag = () => { drag = null; setTimeout(() => { if (!drag) autoSpin = true; }, 2500); };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    function resize() {
      const r = view.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / Math.max(1, r.height);
      camera.updateProjectionMatrix();
      kick();
    }
    new ResizeObserver(resize).observe(view);

    /* ── Pestañas ──────────────────────────────────────────── */
    let tDie = 0, tCont = 0;
    function setMode(m) {
      mode = m;
      tabs.forEach((b) => { const on = b.dataset.demo === m; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      caption.textContent = CAPTIONS[m];
      tDie = 0; tCont = 0;
      kick();
    }
    tabs.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.demo)));
    root.querySelector('.demo__tabs').addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = mode === 'die' ? 'container' : 'die';
      setMode(next);
      tabs.find((b) => b.dataset.demo === next).focus();
    });

    /* ── Loop ──────────────────────────────────────────────── */
    const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    let visible = false, raf = 0, last = performance.now();
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    function updateDie(dt) {
      const cyc = C.die.cycle;
      tDie = (tDie + dt) % cyc;
      const p = tDie / cyc;
      // plano (quieto) → pliega → plegado (quieto) → despliega
      const u = reduced ? 1 : p < 0.15 ? 0 : p < 0.55 ? ease((p - 0.15) / 0.4) : p < 0.8 ? 1 : 1 - ease((p - 0.8) / 0.2);
      const u1 = ease(u / 0.7), u2 = ease((u - 0.55) / 0.45);
      sides.forEach((s) => { s.rotation.x = -u1 * Math.PI / 2; });
      lid.rotation.x = -u2 * Math.PI / 2;
      dieInner.position.set(0, -u * H / 2, (D / 2) * (1 - u) + D * 0.15 * (1 - u));
      const [a, b, c] = C.die.mm;
      const state = u < 0.02 ? 'plano' : u > 0.98 ? 'plegado' : 'plegando';
      stats.textContent = `${state} · ${a} × ${b} × ${c} mm · plegado ${Math.round(u * 100)}%`;
      camera.position.set(0, 6.2, 8.4);
      camera.lookAt(0, -0.2, 0);
    }

    function updateContainer(dt) {
      const fill = total / K.perSecond;
      tCont += dt;
      const cycle = fill + K.hold + 0.6;
      if (tCont > cycle) tCont = 0;
      const f = reduced ? total : Math.min(total, tCont * K.perSecond);
      const n = Math.floor(f);
      boxes.geometry.setDrawRange(0, n * 24);
      boxNodes.geometry.setDrawRange(0, n * 8);
      if (n < total && !reduced) {
        const s = slots[n], k = f - n;
        falling.visible = true;
        falling.position.set(s[0], s[1] + (1 - ease(k)) * 1.2, s[2]);
        falling.material.opacity = 0.4 + 0.6 * k;
      } else falling.visible = false;
      const fade = !reduced && tCont > fill + K.hold ? 1 - (tCont - fill - K.hold) / 0.6 : 1;
      boxes.material.opacity = 0.7 * fade; boxNodes.material.opacity = fade;
      const occ = (n * boxVol) / contVol;
      stats.textContent = `contenedor 20' · ${n} / ${total} cajas · ocupación ${Math.round(occ * 100)}%`;
      camera.position.set(0, 4.4, 8.8);
      camera.lookAt(0, -0.3, 0);
    }

    function frame(now) {
      raf = 0;
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      if (autoSpin && !reduced) yaw += dt * 0.18;
      die.visible = mode === 'die';
      cont.visible = mode === 'container';
      if (mode === 'die') updateDie(reduced ? 0 : dt); else updateContainer(reduced ? 0 : dt);
      const obj = mode === 'die' ? die : cont;
      obj.rotation.set(pitch, yaw, 0);
      renderer.render(scene, camera);
      if (visible && !reduced && !document.hidden) raf = requestAnimationFrame(frame);
    }

    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { last = performance.now(); kick(); }
    }, { threshold: 0.1 }).observe(root);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) { last = performance.now(); kick(); } });

    resize();
    root.classList.add('is-ready');
  }
})();
