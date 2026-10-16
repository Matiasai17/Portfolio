/* ============================================================
   PORTFOLIO MATÍAS MEDRANO v3.2 — shapes.js
   Las 6 formas que adopta la red neuronal, generadas por
   matemática pura (sin modelos .glb ni archivos externos).

   Cada forma devuelve N posiciones (x,y,z) + su tamaño nominal
   (w,h) en unidades del mundo 3D, que neural.js usa para
   encajarla en su "escenario" (.stage) del HTML.

   Orden = orden de las secciones:
     0 tree     · árbol + flor easter egg (hero)
     1 flow     · flujo n8n        (automatizaciones)
     2 browser  · navegador        (webs)
     3 rocket   · cohete           (herramientas)
     4 monogram · MM               (sobre mí)
     5 synapse  · tejido neuronal  (contacto)
   ============================================================ */
(() => {
  'use strict';

  const TAU = Math.PI * 2;

  // RNG con semilla: la red es siempre la misma en cada visita
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function unit(R) {
    const u = R() * 2 - 1, th = R() * TAU, s = Math.sqrt(1 - u * u);
    return [s * Math.cos(th), u, s * Math.sin(th)];
  }

  // Reparte n puntos entre "partes" según pesos; cada parte es una fn(R) → [x,y,z]
  function compose(n, R, parts) {
    const total = parts.reduce((s, p) => s + p[0], 0);
    const out = new Float32Array(n * 3);
    let i = 0;
    parts.forEach(([w, fn], k) => {
      const cnt = k === parts.length - 1 ? n - i : Math.round((w / total) * n);
      for (let j = 0; j < cnt && i < n; j++, i++) {
        const p = fn(R);
        out[i * 3] = p[0]; out[i * 3 + 1] = p[1]; out[i * 3 + 2] = p[2];
      }
    });
    return out;
  }

  // Punto sobre el perímetro de un rectángulo redondeado (centro cx,cy)
  function rrectEdge(R, cx, cy, w, h, r) {
    const sw = w - 2 * r, sh = h - 2 * r, arc = (Math.PI / 2) * r;
    const per = 2 * sw + 2 * sh + 4 * arc;
    let d = R() * per;
    const segs = [
      [sw, (t) => [cx - sw / 2 + t, cy + h / 2]],
      [arc, (t) => corner(cx + sw / 2, cy + sh / 2, r, Math.PI / 2 - t / r)],
      [sh, (t) => [cx + w / 2, cy + sh / 2 - t]],
      [arc, (t) => corner(cx + sw / 2, cy - sh / 2, r, -t / r)],
      [sw, (t) => [cx + sw / 2 - t, cy - h / 2]],
      [arc, (t) => corner(cx - sw / 2, cy - sh / 2, r, -Math.PI / 2 - t / r)],
      [sh, (t) => [cx - w / 2, cy - sh / 2 + t]],
      [arc, (t) => corner(cx - sw / 2, cy + sh / 2, r, Math.PI - t / r)],
    ];
    for (const [len, f] of segs) { if (d <= len) return f(d); d -= len; }
    return [cx, cy];
  }
  function corner(cx, cy, r, a) { return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }

  function rectFill(R, x0, y0, x1, y1) { return [x0 + R() * (x1 - x0), y0 + R() * (y1 - y0)]; }
  function jit(R, a) { return (R() - 0.5) * 2 * a; }

  /* ───────────── 0 · ÁRBOL (hero) ─────────────
     Muy de cerca: tronco con corteza, raíces largas y ramas que salen del
     cuadro, claras (alto contraste). Todo en la paleta del sitio, salvo UNA flor de color: el easter egg.
     Cada punto trae dos colores: el de siempre y el "en flor" (al tocar la
     flor, el color se contagia en onda por todo el árbol; ver neural.js). */
  const TREE = {
    wood: [[0.98, 0.92, 0.8], [0.95, 0.72, 0.3], [0.74, 0.78, 1.0]],
    woodBloom: [[0.62, 0.36, 0.18], [0.78, 0.47, 0.22], [0.52, 0.3, 0.16]],
    leaf: [[0.22, 0.17, 0.46], [0.15, 0.13, 0.34], [0.3, 0.2, 0.52], [0.16, 0.27, 0.48]],
    leafBloom: [[0.3, 0.62, 0.28], [0.42, 0.78, 0.36], [0.22, 0.52, 0.3], [0.55, 0.85, 0.42]],
    bud: [[0.95, 0.72, 0.3], [0.74, 0.6, 1.0], [0.52, 0.86, 1.0]],
    petal: [[1.0, 0.32, 0.6], [1.0, 0.4, 0.28], [0.68, 0.46, 1.0], [1.0, 0.94, 0.9], [1.0, 0.55, 0.78]],
    core: [1.0, 0.82, 0.35],
    special: [1.0, 0.36, 0.62],
  };
  function tree(n, R) {
    // Vista de cerca: tronco con corteza, raíces largas que se abren y ramas
    // grandes que salen del cuadro (la copa casi no se ve).
    const RS = rng(707);
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const pickI = (arr) => Math.floor(R() * arr.length);
    const trunk = [], limbs = [], roots = [], twigTips = [];
    let anchor = null; // punto de la rama derecha donde nace la flor

    // tubo a lo largo de una curva: genera segmentos con radio decreciente
    // g0/g1: orden de crecimiento a lo largo del tubo (lo usa la intro "semilla que crece")
    function tube(list, pts, r0, r1, g0 = 0, g1 = 1) {
      for (let k = 0; k < pts.length - 1; k++) {
        const t0 = k / (pts.length - 1), t1 = (k + 1) / (pts.length - 1);
        list.push({ a: pts[k], b: pts[k + 1], r0: r0 + (r1 - r0) * t0, r1: r0 + (r1 - r0) * t1, g0: g0 + (g1 - g0) * t0, g1: g0 + (g1 - g0) * t1 });
      }
    }
    const gAt = (g0, g1, idx, len) => g0 + (g1 - g0) * (idx / (len - 1));
    const curve = (p0, p1, p2, p3, steps) => Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps, u = 1 - t;
      return [0, 1, 2].map((c) => u * u * u * p0[c] + 3 * u * u * t * p1[c] + 3 * u * t * t * p2[c] + t * t * t * p3[c]);
    });

    // tronco: grueso, levemente inclinado
    tube(trunk, curve([0, -1.25, 0], [0.05, -0.65, 0.05], [-0.06, 0.05, 0], [0.04, 0.6, 0.02], 9), 0.5, 0.36, 0.3, 0.5);

    // ramas grandes (salen hacia arriba y afuera del cuadro) + secundarias
    const limbDirs = [[-1, 0.75, 0.2], [1, 0.8, 0.1], [0.15, 1.2, 0.8], [-0.3, 1.1, -0.85]];
    limbDirs.forEach((d, li) => {
      const m = Math.hypot(...d), dir = d.map((v) => v / m), L = 2.6 + RS() * 0.8, s = [0.04, 0.5, 0.02];
      const end = s.map((v, c) => v + dir[c] * L);
      const pts = curve(s, s.map((v, c) => v + dir[c] * L * 0.3 + (c === 1 ? 0.15 : 0)), end.map((v, c) => v - dir[c] * L * 0.35 + (c === 0 ? (RS() - 0.5) * 0.4 : 0)), end, 10);
      tube(limbs, pts, 0.24, 0.07, 0.5, 0.82);
      if (li === 1) anchor = pts[4];
      // secundarias desde el tramo medio
      for (let k = 0; k < 4; k++) {
        const bi = 3 + Math.floor(RS() * 6), base = pts[bi], a = RS() * Math.PI * 2, gb = gAt(0.5, 0.82, bi, pts.length);
        const sd = [dir[0] + Math.cos(a) * 0.7, dir[1] + 0.35, dir[2] + Math.sin(a) * 0.7], sm = Math.hypot(...sd);
        const l2 = 0.8 + RS() * 0.9, e2 = base.map((v, c) => v + (sd[c] / sm) * l2);
        const mid = base.map((v, c) => (v + e2[c]) / 2 + (c === 1 ? 0.12 : (RS() - 0.5) * 0.25));
        tube(limbs, curve(base, mid, mid, e2, 5), 0.08, 0.02, gb, gb + 0.1);
        twigTips.push({ p: e2, li });
      }
    });

    // raíces largas: se abren en abanico y bajan, con raicillas
    const nRoots = 9;
    for (let k = 0; k < nRoots; k++) {
      const a = (k / nRoots) * Math.PI * 2 + RS() * 0.5, L = 2.4 + RS() * 1.8;
      const dx = Math.cos(a), dz = Math.sin(a) * 0.75;
      const s = [dx * 0.38, -1.15, dz * 0.38];
      const e = [dx * L, -1.65 - RS() * 1.1, dz * L];
      const pts = curve(s, [dx * 0.9, -1.45, dz * 0.9], [dx * L * 0.6, -1.5 - RS() * 0.4, dz * L * 0.6], e, 12);
      tube(roots, pts, 0.2, 0.012, 0.02, 0.32);
      for (let j = 0; j < 3; j++) {
        const bi = 3 + Math.floor(RS() * 7), b = pts[bi], a2 = a + (RS() - 0.5) * 1.6, l2 = 0.5 + RS() * 0.9, gb = gAt(0.02, 0.32, bi, pts.length);
        const e2 = [b[0] + Math.cos(a2) * l2, b[1] - 0.2 - RS() * 0.5, b[2] + Math.sin(a2) * l2 * 0.75];
        tube(roots, curve(b, b.map((v, c) => (v + e2[c]) / 2 + (c === 1 ? 0.08 : 0)), e2, e2, 4), 0.05, 0.006, gb, gb + 0.12);
      }
    }

    const weigh = (list) => { const w = list.map((s) => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]) * (s.r0 + s.r1 + 0.04)); return { list, w, total: w.reduce((a, b) => a + b, 0) }; };
    const pools = { trunk: weigh(trunk), limbs: weigh(limbs), roots: weigh(roots) };
    const pickFrom = (pool) => { let u = R() * pool.total; for (let i = 0; i < pool.list.length; i++) { if ((u -= pool.w[i]) <= 0) return pool.list[i]; } return pool.list[0]; };
    let lastG = 0;
    const onTube = (s, bark) => {
      const t = R(), r = s.r0 + (s.r1 - s.r0) * t;
      lastG = s.g0 + (s.g1 - s.g0) * t;
      let a = R() * Math.PI * 2;
      if (bark && R() < 0.55) a = Math.round(a / (Math.PI / 11)) * (Math.PI / 11); // surcos de la corteza
      const rr = r * (bark ? 0.93 + R() * 0.07 : 1);
      return [s.a[0] + (s.b[0] - s.a[0]) * t + Math.cos(a) * rr, s.a[1] + (s.b[1] - s.a[1]) * t, s.a[2] + (s.b[2] - s.a[2]) * t + Math.sin(a) * rr];
    };

    // flor especial: en la punta de una rama secundaria a la vista (derecha, media altura)
    const SF = { c: [anchor[0] + 0.2, anchor[1] + 0.1, anchor[2] + 0.28], s: 0.22, rot: 0.4 };
    // ramita que lleva a la flor
    tube(limbs, curve(anchor, anchor.map((v, c) => v + [0.05, 0.08, 0.1][c]), SF.c.map((v, c) => v - [0.08, 0.02, 0.08][c]), SF.c, 4), 0.06, 0.02, 0.8, 0.92);
    pools.limbs = weigh(limbs);

    const P = (p, c, cb, size, sp = 0, g = lastG) => [p[0], p[1], p[2], ...c, ...cb, size, sp, g];
    const bark = () => { const i = pickI(TREE.wood); return P(onTube(pickFrom(pools.trunk), true), TREE.wood[i], TREE.woodBloom[i], 1.05); };
    const limb = () => { const i = pickI(TREE.wood); return P(onTube(pickFrom(pools.limbs), false), TREE.wood[i], TREE.woodBloom[i], 0.95); };
    const root = () => { const i = pickI(TREE.wood); return P(onTube(pickFrom(pools.roots), false), TREE.wood[i], TREE.woodBloom[i], 0.9); };
    const leaves = () => {
      const t = pick(twigTips).p, [dx, dy, dz] = unit(R), k = 0.25 + 0.35 * Math.cbrt(R()), i = pickI(TREE.leaf);
      return P([t[0] + dx * k, t[1] + dy * k * 0.8, t[2] + dz * k], TREE.leaf[i], TREE.leafBloom[i], 0.55, 0, 0.84 + R() * 0.1);
    };
    const buds = Array.from({ length: 60 }, () => { const t = twigTips[Math.floor(RS() * twigTips.length)].p, [dx, dy, dz] = unit(RS); return { c: [t[0] + dx * 0.3, t[1] + dy * 0.25, t[2] + dz * 0.3], col: TREE.petal[Math.floor(RS() * TREE.petal.length)], rot: RS() * 6.28, s: 0.05 + RS() * 0.04 }; });
    const petalAt = (f, spread) => {
      const p = Math.floor(R() * 5), a = f.rot + (p / 5) * Math.PI * 2, d = f.s * (0.35 + R() * spread), w = jit(R, 0.4);
      return [f.c[0] + Math.cos(a + w * 0.5) * d, f.c[1] + Math.sin(a + w * 0.5) * d * 0.9, f.c[2] + jit(R, 0.02)];
    };
    const flower = () => { const f = pick(buds); return P(petalAt(f, 0.75), pick(TREE.bud), f.col, 0.9, 0, 0.9 + R() * 0.07); };
    const special = () => {
      if (R() < 0.18) return P([SF.c[0] + jit(R, 0.03), SF.c[1] + jit(R, 0.03), SF.c[2] + jit(R, 0.02)], TREE.core, TREE.core, 1.5, 1, 0.97);
      return P(petalAt(SF, 0.85), TREE.special, TREE.special, 1.45, 1, 0.97);
    };
    const soil = () => { const i = pickI(TREE.leaf), a = R() * Math.PI * 2, r = 0.5 + Math.sqrt(R()) * 3.4; return P([Math.cos(a) * r, -1.6 - R() * 1.2, Math.sin(a) * r * 0.7], TREE.leaf[i], TREE.leafBloom[i], 0.45, 0, R() * 0.3); };
    const spores = () => { const i = pickI(TREE.petal); return P([jit(R, 2.4), -1 + R() * 3.4, jit(R, 1.4)], [0.42, 0.36, 0.8], TREE.petal[i], 0.75, 0, 0.9 + R() * 0.1); };

    const parts = [[20, bark], [23, limb], [26, root], [10, leaves], [7, flower], [4, special], [5, soil], [5, spores]];
    const totalW = parts.reduce((s, p) => s + p[0], 0);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), bloom = new Float32Array(n * 3), size = new Float32Array(n), flag = new Float32Array(n), grow = new Float32Array(n);
    let i = 0;
    parts.forEach(([w, fn], k) => {
      const cnt = k === parts.length - 1 ? n - i : Math.round((w / totalW) * n);
      for (let j = 0; j < cnt && i < n; j++, i++) {
        const v = fn();
        pos.set(v.slice(0, 3), i * 3); col.set(v.slice(3, 6), i * 3); bloom.set(v.slice(6, 9), i * 3); size[i] = v[9]; flag[i] = v[10]; grow[i] = v[11];
      }
    });
    // w/h nominales chicos a propósito: la forma desborda su escenario (efecto zoom)
    return { pos, extras: { colors: [col, 3], bloom: [bloom, 3], sizes: [size, 1], special: [flag, 1], grow: [grow, 1] }, flower: SF.c, flowerR: SF.s, w: 3.2, h: 4.2, link: 0.22 };
  }

  /* ───────────── 1 · FLUJO (estilo n8n) ───────────── */
  const FLOW_X = [-3.3, -1.1, 1.1, 3.3];
  const FLOW_Y = [0.32, -0.32, 0.32, -0.32];
  const CARD_W = 1.35, CARD_H = 0.86;
  function flow(n, R) {
    const st = () => Math.floor(R() * 4);
    const border = () => {
      const k = st(), [x, y] = rrectEdge(R, FLOW_X[k], FLOW_Y[k], CARD_W, CARD_H, 0.16);
      return [x, y, R() < 0.5 ? -0.07 : 0.07];
    };
    const fill = () => {
      const k = st(), [x, y] = rectFill(R, FLOW_X[k] - CARD_W / 2 + 0.08, FLOW_Y[k] - CARD_H / 2 + 0.08, FLOW_X[k] + CARD_W / 2 - 0.08, FLOW_Y[k] + CARD_H / 2 - 0.08);
      return [x, y, jit(R, 0.06)];
    };
    const icon = () => { // ícono circular + líneas de texto dentro de cada card
      const k = st();
      if (R() < 0.5) { const a = R() * TAU; return [FLOW_X[k] - 0.38 + Math.cos(a) * 0.15, FLOW_Y[k] + 0.08 + Math.sin(a) * 0.15, 0.09]; }
      const row = R() < 0.6 ? 0.14 : -0.08, len = row > 0 ? 0.62 : 0.42;
      return [FLOW_X[k] - 0.13 + R() * len, FLOW_Y[k] + row - 0.04, 0.09];
    };
    const ports = () => {
      const k = st(), side = R() < 0.5 ? -1 : 1, a = R() * TAU;
      return [FLOW_X[k] + side * CARD_W / 2 + Math.cos(a) * 0.08, FLOW_Y[k] + Math.sin(a) * 0.08, 0];
    };
    const cable = () => {
      const k = Math.floor(R() * 3), t = R();
      const x0 = FLOW_X[k] + CARD_W / 2, y0 = FLOW_Y[k], x3 = FLOW_X[k + 1] - CARD_W / 2, y3 = FLOW_Y[k + 1];
      const mx = (x3 - x0) * 0.55, u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * (x0 + mx) + 3 * u * t * t * (x3 - mx) + t * t * t * x3;
      const y = u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y3 + t * t * t * y3;
      return [x + jit(R, 0.015), y + jit(R, 0.03), jit(R, 0.03)];
    };
    const dust = () => [jit(R, 4.4), jit(R, 1.2), jit(R, 1.2)];
    return { pos: compose(n, R, [[40, border], [14, fill], [9, icon], [5, ports], [28, cable], [4, dust]]), w: 8.2, h: 2.2, link: 0.26,
      stations: FLOW_X.map((x, i) => [x, FLOW_Y[i], 0]) };
  }

  /* ───────────── 2 · NAVEGADOR ───────────── */
  function browser(n, R) {
    const W = 4.6, H = 3, top = H / 2;
    const outline = () => { const [x, y] = rrectEdge(R, 0, 0, W, H, 0.14); return [x, y, jit(R, 0.02)]; };
    const lineH = (x0, x1, y) => () => [x0 + R() * (x1 - x0), y + jit(R, 0.008), 0.02];
    const box = (x0, y0, x1, y1, z) => () => { const [x, y] = rrectEdge(R, (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, 0.06); return [x, y, z]; };
    const bar = lineH(-W / 2, W / 2, top - 0.32);
    const dots = () => { const k = Math.floor(R() * 3), a = R() * TAU, r = 0.055 * Math.sqrt(R()) + 0.02; return [-W / 2 + 0.24 + k * 0.17 + Math.cos(a) * r, top - 0.16 + Math.sin(a) * r, 0.02]; };
    const url = box(-0.9, top - 0.25, 1.3, top - 0.07, 0.02);
    const nav = () => { const k = Math.floor(R() * 5); return k === 0 ? [-2.0 + R() * 0.45, 0.95 + jit(R, 0.03), 0.04] : [0.55 + (k - 1) * 0.42 + R() * 0.26, 0.95, 0.04]; };
    const headline = () => { const r = R() < 0.55 ? 0 : 1; return [-2.0 + R() * (r ? 1.4 : 2.0), 0.62 - r * 0.22 + jit(R, 0.05), 0.06]; };
    const image = () => {
      if (R() < 0.7) return box(0.5, 0.15, 2.0, 0.82, 0.06)();
      const t = R(); return R() < 0.5 ? [0.5 + t * 1.5, 0.15 + t * 0.67, 0.06] : [0.5 + t * 1.5, 0.82 - t * 0.67, 0.06];
    };
    const btn = box(-2.0, 0.08, -1.25, 0.26, 0.06);
    const cards = () => { const k = Math.floor(R() * 3), x0 = -2.0 + k * 1.36; return box(x0, -1.25, x0 + 1.2, -0.18, 0.04)(); };
    const cardText = () => { const k = Math.floor(R() * 3), x0 = -1.88 + k * 1.36, r = Math.floor(R() * 3); return [x0 + R() * (r === 2 ? 0.55 : 0.95), -0.42 - r * 0.16, 0.05]; };
    const fill = () => { const [x, y] = rectFill(R, -W / 2 + 0.06, -H / 2 + 0.06, W / 2 - 0.06, top - 0.36); return [x, y, -0.03]; };
    const dust = () => [jit(R, 3.2), jit(R, 2.2), jit(R, 1)];
    return { pos: compose(n, R, [[22, outline], [4, bar], [3, dots], [4, url], [4, nav], [9, headline], [7, image], [2, btn], [15, cards], [7, cardText], [19, fill], [4, dust]]),
      w: 4.8, h: 3.2, link: 0.24 };
  }

  /* ───────────── 3 · COHETE ───────────── */
  function rocket(n, R) {
    const RB = 0.45, Y0 = -1.2, Y1 = 0.8, Y2 = 2.05;
    const noseR = (y) => RB * Math.pow(Math.max(0, 1 - Math.pow((y - Y1) / (Y2 - Y1), 1.7)), 0.62);
    const ringOrLong = (y, r) => {
      const m = R();
      let a = R() * TAU;
      if (m < 0.35) a = Math.round(a / (TAU / 18)) * (TAU / 18); // líneas longitudinales
      return [Math.cos(a) * r, y, Math.sin(a) * r];
    };
    const body = () => {
      let y = Y0 + R() * (Y1 - Y0);
      if (R() < 0.5) y = Y0 + Math.round((y - Y0) / 0.13) * 0.13; // anillos
      return ringOrLong(y, RB);
    };
    const nose = () => {
      let y = Y1 + Math.pow(R(), 0.8) * (Y2 - Y1);
      if (R() < 0.45) y = Y1 + Math.round((y - Y1) / 0.11) * 0.11;
      return ringOrLong(y, noseR(y));
    };
    const fins = () => {
      const k = Math.floor(R() * 4), ang = Math.PI / 4 + k * (Math.PI / 2);
      // aleta: trapecio entre raíz (sobre el cuerpo) y punta
      const u = R(), v = R();
      const rootTop = -0.42, rootBot = Y0, tipTop = -1.08, tipBot = -1.6, rOut = 1.1;
      let rr, yy;
      if (R() < 0.6) { // bordes
        const e = Math.floor(R() * 3);
        if (e === 0) { rr = RB + u * (rOut - RB); yy = rootTop + u * (tipTop - rootTop); }
        else if (e === 1) { rr = rOut; yy = tipTop + u * (tipBot - tipTop); }
        else { rr = RB + u * (rOut - RB); yy = rootBot + u * (tipBot - rootBot); }
      } else {
        rr = RB + u * (rOut - RB);
        const top = rootTop + u * (tipTop - rootTop), bot = rootBot + u * (tipBot - rootBot);
        yy = bot + v * (top - bot);
      }
      return [Math.cos(ang) * rr, yy, Math.sin(ang) * rr];
    };
    const nozzle = () => { const t = R(), a = R() * TAU, r = 0.28 + t * 0.12; return [Math.cos(a) * r, Y0 - t * 0.28, Math.sin(a) * r]; };
    const port = () => { const a = R() * TAU, r = 0.15 + jit(R, 0.012); return [Math.cos(a) * r, 0.3 + Math.sin(a) * r, RB + 0.02]; };
    const exhaust = () => {
      const t = Math.pow(R(), 1.6), a = R() * TAU, r = (0.18 + t * 0.6) * Math.sqrt(R());
      return [Math.cos(a) * r, Y0 - 0.35 - t * 2.1, Math.sin(a) * r];
    };
    const dust = () => [jit(R, 2), jit(R, 2.6), jit(R, 2)];
    return { pos: compose(n, R, [[30, body], [18, nose], [15, fins], [4, nozzle], [3, port], [24, exhaust], [6, dust]]), w: 2.6, h: 4.4, link: 0.28 };
  }

  /* ───────────── 4 · MONOGRAMA MM ───────────── */
  function monogram(n, R) {
    const c = document.createElement('canvas');
    const CW = 900, CH = 420;
    c.width = CW; c.height = CH;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 360px Recursive, "Arial Black", Arial, sans-serif';
    const mw = ctx.measureText('M').width, gap = 46;
    ctx.fillText('M', CW / 2 - (mw + gap) / 2, CH / 2 + 12);
    ctx.fillText('M', CW / 2 + (mw + gap) / 2, CH / 2 + 12);
    const data = ctx.getImageData(0, 0, CW, CH).data;
    const inside = (x, y) => x >= 0 && y >= 0 && x < CW && y < CH && data[(y * CW + x) * 4 + 3] > 128;
    const fillPx = [], edgePx = [];
    for (let y = 0; y < CH; y += 2) {
      for (let x = 0; x < CW; x += 2) {
        if (!inside(x, y)) continue;
        if (!inside(x - 3, y) || !inside(x + 3, y) || !inside(x, y - 3) || !inside(x, y + 3)) edgePx.push(x, y);
        else fillPx.push(x, y);
      }
    }
    let minX = CW, maxX = 0;
    for (let i = 0; i < edgePx.length; i += 2) { minX = Math.min(minX, edgePx[i]); maxX = Math.max(maxX, edgePx[i]); }
    const scale = 4.6 / Math.max(1, maxX - minX), D = 0.24;
    const map = (arr) => {
      const k = Math.floor(R() * (arr.length / 2)) * 2;
      return [(arr[k] - CW / 2) * scale, -(arr[k + 1] - CH / 2 - 12) * scale];
    };
    const ok = edgePx.length > 0;
    const edge = () => { if (!ok) return [jit(R, 2), jit(R, 1), 0]; const [x, y] = map(edgePx); return [x, y, R() < 0.5 ? -D : D]; };
    const wall = () => { if (!ok) return [jit(R, 2), jit(R, 1), 0]; const [x, y] = map(edgePx); return [x, y, jit(R, D)]; };
    const face = () => { const src = fillPx.length ? fillPx : edgePx; if (!src.length) return [jit(R, 2), jit(R, 1), 0]; const [x, y] = map(src); return [x, y, R() < 0.5 ? -D : D]; };
    const core = () => { const src = fillPx.length ? fillPx : edgePx; if (!src.length) return [0, 0, 0]; const [x, y] = map(src); return [x, y, jit(R, D * 0.8)]; };
    const dust = () => [jit(R, 3.2), jit(R, 2), jit(R, 1.2)];
    return { pos: compose(n, R, [[54, edge], [14, wall], [18, face], [9, core], [5, dust]]), w: 4.9, h: 2.4, link: 0.2 };
  }

  /* ───────────── 5 · TEJIDO NEURONAL (contacto) ─────────────
     Un "zoom" a la red funcionando: somas, dendritas que se ramifican y axones
     que conectan neuronas vecinas. Abstracto, sin forma reconocible; ocupa
     todo el fondo de la sección. */
  const FIELD = { w: 10, h: 5.6, d: 2.6, somas: 34 };
  function synapse(n, R) {
    const RS = rng(4242);
    const somas = Array.from({ length: FIELD.somas }, () => ({
      c: [(RS() - 0.5) * FIELD.w, (RS() - 0.5) * FIELD.h, (RS() - 0.5) * FIELD.d],
      r: 0.08 + RS() * 0.12,
    }));
    // dendritas: cada soma tiene 4–7 ramas curvas; cada rama puede bifurcarse
    const branches = [];
    somas.forEach((s) => {
      const k = 4 + Math.floor(RS() * 4);
      for (let b = 0; b < k; b++) {
        const [dx, dy, dz] = unit(RS), len = 0.5 + RS() * 1.1;
        const bend = [(RS() - 0.5) * 0.9, (RS() - 0.5) * 0.9, (RS() - 0.5) * 0.4];
        const p0 = s.c, p2 = [s.c[0] + dx * len, s.c[1] + dy * len, s.c[2] + dz * len * 0.5];
        const p1 = [(p0[0] + p2[0]) / 2 + bend[0], (p0[1] + p2[1]) / 2 + bend[1], (p0[2] + p2[2]) / 2 + bend[2]];
        branches.push({ p0, p1, p2, w: len });
        if (RS() < 0.6) { // bifurcación desde la mitad de la rama
          const m = bez(p0, p1, p2, 0.55), [ex, ey, ez] = unit(RS), l2 = len * (0.35 + RS() * 0.35);
          const q2 = [m[0] + (dx + ex) * 0.5 * l2, m[1] + (dy + ey) * 0.5 * l2, m[2] + ez * l2 * 0.3];
          branches.push({ p0: m, p1: [(m[0] + q2[0]) / 2 + (RS() - 0.5) * 0.3, (m[1] + q2[1]) / 2 + (RS() - 0.5) * 0.3, (m[2] + q2[2]) / 2], p2: q2, w: l2 });
        }
      }
    });
    // axones: largos y suaves entre somas cercanos
    const axons = [];
    somas.forEach((s, i) => {
      const near = somas.map((o, j) => [Math.hypot(o.c[0] - s.c[0], o.c[1] - s.c[1]), j]).filter(([d, j]) => j !== i && d < 2.8).sort((a, b) => a[0] - b[0]).slice(0, 2);
      near.forEach(([, j]) => {
        if (j < i) return;
        const o = somas[j].c, mid = [(s.c[0] + o[0]) / 2 + (RS() - 0.5) * 1.2, (s.c[1] + o[1]) / 2 + (RS() - 0.5) * 1.2, (s.c[2] + o[2]) / 2];
        axons.push({ p0: s.c, p1: mid, p2: o });
      });
    });
    const totalW = branches.reduce((a, b) => a + b.w, 0);
    const pickBranch = () => { let u = R() * totalW; for (const b of branches) { if ((u -= b.w) <= 0) return b; } return branches[0]; };

    const soma = () => { const s = somas[Math.floor(R() * somas.length)], [dx, dy, dz] = unit(R), k = s.r * Math.cbrt(R()); return [s.c[0] + dx * k, s.c[1] + dy * k, s.c[2] + dz * k]; };
    const dendrite = () => { const b = pickBranch(), t = Math.pow(R(), 0.8), p = bez(b.p0, b.p1, b.p2, t), j = 0.025 * (1 - t * 0.6); return [p[0] + jit(R, j), p[1] + jit(R, j), p[2] + jit(R, j)]; };
    const axon = () => { const a = axons[Math.floor(R() * axons.length)], p = bez(a.p0, a.p1, a.p2, R()); return [p[0] + jit(R, 0.012), p[1] + jit(R, 0.012), p[2] + jit(R, 0.012)]; };
    const spine = () => { const b = pickBranch(), p = bez(b.p0, b.p1, b.p2, R()), [dx, dy, dz] = unit(R), l = 0.04 + R() * 0.06; return [p[0] + dx * l, p[1] + dy * l, p[2] + dz * l]; };
    const dust = () => [jit(R, FIELD.w * 0.6), jit(R, FIELD.h * 0.6), jit(R, FIELD.d)];
    return { pos: compose(n, R, [[14, soma], [52, dendrite], [20, axon], [11, spine], [3, dust]]), w: FIELD.w, h: FIELD.h, link: 0.27 };
  }
  function bez(p0, p1, p2, t) {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1], u * u * p0[2] + 2 * u * t * p1[2] + t * t * p2[2]];
  }

  /* ───────────── Ordenar + vecinos (aristas) ───────────── */
  // Ordena por x: así, al mutar, cada partícula viaja a una zona "equivalente"
  // de la forma siguiente y la transformación se ve como un barrido coherente.
  function sortByX(pos, R, extras) {
    const n = pos.length / 3, idx = new Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    const key = new Float32Array(n);
    for (let i = 0; i < n; i++) key[i] = pos[i * 3] + pos[i * 3 + 1] * 0.15 + (R() - 0.5) * 0.25;
    idx.sort((a, b) => key[a] - key[b]);
    const out = new Float32Array(pos.length);
    idx.forEach((s, d) => { out[d * 3] = pos[s * 3]; out[d * 3 + 1] = pos[s * 3 + 1]; out[d * 3 + 2] = pos[s * 3 + 2]; });
    const ex = {};
    for (const [k, [arr, sz]] of Object.entries(extras || {})) {
      const o = new Float32Array(arr.length);
      idx.forEach((s, d) => { for (let c = 0; c < sz; c++) o[d * sz + c] = arr[s * sz + c]; });
      ex[k] = o;
    }
    return { pos: out, extras: ex };
  }

  // k vecinos más cercanos entre las "neuronas" (subconjunto), con grilla espacial
  function links(pos, neurons, maxD, k) {
    const cell = maxD, grid = new Map(), keyOf = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    neurons.forEach((i) => {
      const key = keyOf(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    });
    const edges = [], seen = new Set(), adj = new Map();
    neurons.forEach((i) => {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
      const cand = [];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        const list = grid.get(`${cx + a},${cy + b},${cz + c}`);
        if (!list) continue;
        for (const j of list) {
          if (j === i) continue;
          const dx = pos[j * 3] - x, dy = pos[j * 3 + 1] - y, dz = pos[j * 3 + 2] - z;
          const d = dx * dx + dy * dy + dz * dz;
          if (d < maxD * maxD && d > 1e-6) cand.push([d, j]);
        }
      }
      cand.sort((p, q) => p[0] - q[0]);
      for (let m = 0; m < Math.min(k, cand.length); m++) {
        const j = cand[m][1], key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push(i, j);
        if (!adj.has(i)) adj.set(i, []);
        if (!adj.has(j)) adj.set(j, []);
        adj.get(i).push(j); adj.get(j).push(i);
      }
    });
    return { edges: new Uint32Array(edges), adj };
  }

  const GENERATORS = { tree, flow, browser, rocket, monogram, synapse };
  const ORDER = ['tree', 'flow', 'browser', 'rocket', 'monogram', 'synapse'];

  // Construye todas las formas para n partículas. "neuronEvery": 1 de cada k
  // partículas es neurona (tiene conexiones); el resto es polvo luminoso.
  function build(n, neuronEvery) {
    const neurons = [];
    for (let i = 0; i < n; i += neuronEvery) neurons.push(i);
    return ORDER.map((name, s) => {
      const R = rng(1708 + s * 131);
      const shape = GENERATORS[name](n, R);
      const sorted = sortByX(shape.pos, R, shape.extras);
      shape.pos = sorted.pos; Object.assign(shape, sorted.extras);
      const { edges, adj } = links(shape.pos, neurons, shape.link, 3);
      return Object.assign(shape, { name, edges, adj, neurons });
    });
  }

  window.SinapShapes = { build, ORDER, rng };
})();
