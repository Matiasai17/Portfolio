/* ============================================================
   SINAPSTUDIO v3 — neural.js
   La red neuronal 3D de fondo (Three.js por CDN, sin build).

   · Muta de forma según la sección: cada sección tiene un
     "escenario" (.stage[data-stage]) y la red se ubica y escala
     sobre él. Entre dos escenarios, el scroll controla la mutación.
   · El cursor aparta los nodos; el clic dispara un impulso
     (onda + pulsos que recorren las conexiones) con sonido.
   · Pulsos espontáneos recorren las conexiones todo el tiempo.
   · El simulador de automatizaciones (main.js) emite 'sinap:flow'
     y la red ilumina la estación correspondiente del flujo.

   Ajustes en NEURAL_CONFIG. Formas en js/shapes.js.
   ============================================================ */
(() => {
  'use strict';

  /* ── CONTROLES ─────────────────────────────────────────────── */
  const NEURAL_CONFIG = {
    threeURL: 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js',
    particles: { desktop: 7000, mobile: 3200 },
    neuronEvery: 3,          // 1 de cada 3 partículas es neurona (con conexiones)
    dprMax: { desktop: 1.75, mobile: 1.5 },
    pointSize: 6.2,          // tamaño base de los nodos
    lineOpacity: 0.22,       // intensidad de las conexiones
    mouseRadius: 1.25,       // radio de influencia del cursor (unidades 3D)
    mouseForce: 0.42,        // cuánto aparta los nodos
    morphFollow: 3.4,        // qué tan rápido la red persigue al scroll (más alto = más directo)
    introSeconds: 2.6,       // duración del ensamblado inicial
    pulses: { max: 72, ambient: { desktop: 16, mobile: 8 }, speed: 1.05 },
    // Por forma: cuánto llena su escenario, opacidad y comportamiento
    stages: {
      // árbol visto de cerca: más grande que su escenario (se corta un poco)
      tree:     { fill: 1.28, op: 1.0,  opMobile: 0.7 },
      flow:     { fill: 1.0,  op: 0.95, opMobile: 0.7 },
      browser:  { fill: 0.95, op: 0.9,  opMobile: 0.55 },
      rocket:   { fill: 0.82, op: 0.95, opMobile: 0.5, free: true },
      monogram: { fill: 0.95, op: 1.0,  opMobile: 0.6 },
      // contacto: zoom al tejido neuronal; cubre todo el fondo (cover), nodos más grandes y más pulsos
      synapse:  { fill: 1.12, op: 0.8,  opMobile: 0.62, cover: true, size: 1.7, line: 0.36, pulseMul: 3 },
    },
    palette: {
      lime: [0.95, 0.72, 0.29], tea: [0.62, 0.89, 1.0], copper: [0.62, 0.52, 1.0],
      amber: [1.0, 0.56, 0.82], bone: [0.95, 0.94, 1.0],
    },
  };
  /* ─────────────────────────────────────────────────────────── */

  const canvas = document.getElementById('neural');
  if (!canvas || !window.SinapShapes) return;

  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth < 760 || window.matchMedia('(pointer: coarse)').matches;
  const mobile = isMobile();

  // Probar WebGL antes de bajar Three.js
  try {
    const test = document.createElement('canvas');
    if (!(test.getContext('webgl2') || test.getContext('webgl'))) throw new Error('no webgl');
  } catch (e) { root.classList.add('no-webgl'); return; }

  const fontsReady = Promise.race([
    document.fonts ? document.fonts.load('900 100px Recursive') : Promise.resolve(),
    new Promise((r) => setTimeout(r, 2200)),
  ]).catch(() => {});

  Promise.all([import(NEURAL_CONFIG.threeURL), fontsReady])
    .then(([THREE]) => start(THREE))
    .catch((err) => { console.warn('[neural] sin red 3D:', err); root.classList.add('no-webgl'); });

  /* ── GLSL compartido ───────────────────────────────────────── */
  const COMMON = /* glsl */`
    uniform float uTime, uMorph, uIntro, uMotion, uOpacity;
    uniform vec2  uMouse;  uniform float uMouseOn, uMouseR, uMouseF;
    uniform vec2  uWave;   uniform float uWaveT;
    uniform vec3  uGlow;   uniform float uGlowAmt;
    uniform vec3  uBloomO; uniform float uBloomR, uBloomOn, uOpen;
    uniform float uGrow, uZap, uZapAmt, uRootGlow;  // intro: semilla que crece + rayo
    uniform vec3  uImpact; uniform float uShatter, uShatterGlow;  // el rayo destruye el árbol al scrollear

    vec3 ambient(vec4 r){
      return vec3(sin(uTime*.6 + r.x*6.283), cos(uTime*.5 + r.y*6.283), sin(uTime*.7 + r.z*6.283))
             * (0.02 + 0.035*r.w) * uMotion;
    }
    // Pasa a espacio de cámara y aplica cursor + onda del clic. boost = brillo extra.
    vec4 toView(vec3 p, out float boost){
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      boost = 0.;
      vec2 d = mv.xy - uMouse; float l = length(d);
      float k = smoothstep(uMouseR, 0., l) * uMouseOn;
      mv.xy += (l > 1e-4 ? d / l : vec2(0.)) * k * uMouseF;
      boost += k * .9;
      float wr = uWaveT * 4.2;
      vec2 wd = mv.xy - uWave; float wl = length(wd);
      float ring = exp(-pow((wl - wr) / .38, 2.)) * exp(-uWaveT * 1.15);
      mv.xy += (wl > 1e-4 ? wd / wl : vec2(0.)) * ring * .28;
      boost += ring * 2.2;
      boost += exp(-dot(p - uGlow, p - uGlow) / .28) * uGlowAmt;
      return mv;
    }
  `;

  const POINTS_VS = /* glsl */`
    ${COMMON}
    attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec3 aP4; attribute vec3 aP5;
    attribute vec4 aRand; attribute vec3 aColor; attribute vec3 aColor0; attribute vec3 aBloom; attribute float aSize; attribute float aSize0; attribute float aSpecial; attribute float aGrow;
    uniform float uSize, uPR;
    varying vec3 vColor; varying float vAlpha;

    // fragmentos que salen despedidos desde el impacto del rayo (con algo de gravedad)
    vec3 shatterOff(){
      if (uShatter <= 0.) return vec3(0.);
      vec3 dir = normalize(position - uImpact + (aRand.yzw - .5) * 1.1 + vec3(0., .25, 0.));
      float k = uShatter * (.55 + aRand.x * 1.7);
      return dir * k + vec3(0., -uShatter * uShatter * (.6 + aRand.y * 1.4), 0.);
    }
    vec3 shp(float i){
      return i < .5 ? position + (position - uBloomO) * (uOpen * aSpecial * .4) + shatterOff() : i < 1.5 ? aP1 : i < 2.5 ? aP2 : i < 3.5 ? aP3 : i < 4.5 ? aP4 : aP5;
    }
    void main(){
      float a = clamp(floor(uMorph), 0., 5.);
      float f = uMorph - a;
      float t = clamp((f - aRand.x * .35) / .65, 0., 1.);
      t = t * t * (3. - 2. * t);
      vec3 p = mix(shp(a), shp(min(a + 1., 5.)), t);
      // remolino mientras muta
      float sw = sin(t * 3.14159);
      p += vec3(sin(p.y * 1.7 + aRand.y * 6.28 + uTime * .3),
                cos(p.z * 1.5 + aRand.z * 6.28),
                sin(p.x * 1.3 + aRand.w * 6.28)) * sw * .6 * uMotion;
      // ensamblado inicial: llegan desde una nube dispersa
      float it = clamp(uIntro * 1.4 - aRand.x * .4, 0., 1.);
      it = 1. - pow(1. - it, 3.);
      vec3 sc = normalize(aRand.yzw - .5 + .001) * (6. + aRand.x * 6.);
      p = mix(sc, p, it);
      p += ambient(aRand);

      float boost; vec4 mv = toView(p, boost);
      gl_Position = projectionMatrix * mv;
      // árbol: aparece según su orden de crecimiento; frente de luz al crecer; onda del rayo
      float w0 = 1. - smoothstep(0., .6, uMorph);
      float show = mix(1., smoothstep(aGrow, aGrow + .035, uGrow), w0);
      boost += w0 * (exp(-pow((uGrow - aGrow) / .025, 2.)) * 1.8 * step(uGrow, 1.04)
                   + exp(-pow((aGrow - uZap) / .045, 2.)) * uZapAmt * 3.2
                   + uRootGlow * (1. - smoothstep(.3, .36, aGrow)) * 1.5);
      boost += w0 * uShatterGlow * (1.2 + aRand.w * 1.8);
      boost *= 1. - aSpecial * .75;  // la flor conserva su color con el rayo y el cursor
      float tw = .72 + .28 * sin(uTime * (1.1 + aRand.w * 2.2) + aRand.x * 40.);
      float bw = (1. - smoothstep(uBloomR - .5, uBloomR, distance(position, uBloomO))) * uBloomOn;
      float beat = 1. + aSpecial * (.2 + .2 * sin(uTime * 2.4)) * (1. - uOpen * .5);  // la flor late: invita a tocarla
      float sz = mix(aSize0 * beat * (1. + bw * .35), aSize, smoothstep(0., .6, uMorph));
      gl_PointSize = show * sz * uSize * uPR * (12. / -mv.z) * (1. + boost * .55) * (.85 + .3 * tw);
      // la forma 0 (árbol) tiene colores propios; al mutar vuelve a la paleta del sitio
      vec3 base = mix(mix(aColor0, aBloom, bw), aColor, smoothstep(0., .6, uMorph));
      vColor = mix(base, vec3(.94, .93, 1.), clamp(boost * .45, 0., .8));
      float depth = smoothstep(-19., -9., mv.z);
      vAlpha = show * uOpacity * (.3 + .7 * depth) * tw * (.25 + .75 * it) * (1. + boost);
    }
  `;
  const POINTS_FS = /* glsl */`
    varying vec3 vColor; varying float vAlpha;
    void main(){
      float d = length(gl_PointCoord - .5);
      if (d > .5) discard;
      float soft = smoothstep(.5, 0., d);
      float core = smoothstep(.17, 0., d);
      gl_FragColor = vec4(vColor * (soft * soft * .7 + core), vAlpha);
    }
  `;

  const LINES_VS = /* glsl */`
    ${COMMON}
    attribute vec4 aRand;
    uniform float uStage, uLine;
    varying float vA; varying float vB;
    void main(){
      vec3 p = position + ambient(aRand);
      float boost; vec4 mv = toView(p, boost);
      gl_Position = projectionMatrix * mv;
      float vis = (1. - smoothstep(.02, .14, abs(uMorph - uStage))) * (uStage < .5 ? smoothstep(.95, 1.1, uGrow) * (1. - smoothstep(0., .25, uShatter)) : 1.);
      vA = uLine * uOpacity * vis * smoothstep(.8, 1., uIntro) * (1. + boost * 1.4);
      vB = clamp(boost, 0., 1.);
    }
  `;
  const LINES_FS = /* glsl */`
    uniform vec3 uLineA; uniform vec3 uLineB;
    varying float vA; varying float vB;
    void main(){ gl_FragColor = vec4(mix(uLineA, uLineB, vB), vA); }
  `;

  const PULSE_VS = /* glsl */`
    ${COMMON}
    attribute vec3 aFrom; attribute vec3 aTo; attribute vec4 aRF; attribute vec4 aRT;
    attribute float aProg; attribute float aTrail; attribute float aAlive;
    uniform float uPR, uPulseVis;
    varying float vA; varying float vT;
    void main(){
      float k = clamp(aProg - aTrail * .1, 0., 1.);
      vec3 p = mix(aFrom + ambient(aRF), aTo + ambient(aRT), k);
      float boost; vec4 mv = toView(p, boost);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = (11. - aTrail * 2.2) * uPR * (12. / -mv.z);
      vA = aAlive * uPulseVis * uOpacity * (1. - aTrail * .24) * step(.0001, aProg - aTrail * .1 + .0001);
      vT = aTrail;
    }
  `;
  const PULSE_FS = /* glsl */`
    varying float vA; varying float vT;
    void main(){
      float d = length(gl_PointCoord - .5);
      if (d > .5) discard;
      float g = smoothstep(.5, 0., d);
      vec3 c = mix(vec3(1., .96, .88), vec3(.95, .72, .29), clamp(vT / 2., 0., 1.));
      gl_FragColor = vec4(c * (g * g + smoothstep(.2, 0., d)), vA);
    }
  `;

  /* ── Arranque ──────────────────────────────────────────────── */
  function start(THREE) {
    const C = NEURAL_CONFIG;
    const N = mobile ? C.particles.mobile : C.particles.desktop;
    const shapes = window.SinapShapes.build(N, C.neuronEvery);
    const ORDER = window.SinapShapes.ORDER;
    const LAST = ORDER.length - 1;

    const stageEls = ORDER.map((name) => document.querySelector(`[data-stage="${name}"]`));
    if (stageEls.some((el) => !el)) { console.warn('[neural] falta algún .stage'); return; }

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    let pr = Math.min(window.devicePixelRatio || 1, mobile ? C.dprMax.mobile : C.dprMax.desktop);
    renderer.setPixelRatio(pr);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
    camera.position.set(0, 0, 12);
    const group = new THREE.Group();
    scene.add(group);

    /* — Atributos de partículas — */
    const R = window.SinapShapes.rng(42);
    const rand = new Float32Array(N * 4), color = new Float32Array(N * 3), size = new Float32Array(N);
    const P = C.palette;
    const pick = (table) => { let u = R(); for (const [w, c] of table) { if ((u -= w) <= 0) return c; } return table[0][1]; };
    const neuronColors = [[0.36, P.lime], [0.16, P.tea], [0.16, P.bone], [0.16, P.amber], [0.16, P.copper]];
    const dustColors = [[0.42, P.copper], [0.26, P.amber], [0.16, P.lime], [0.16, P.tea]];
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < 4; k++) rand[i * 4 + k] = R();
      const neuron = i % C.neuronEvery === 0;
      const c = pick(neuron ? neuronColors : dustColors);
      color.set(c, i * 3);
      size[i] = neuron ? 1 + R() * 0.45 : 0.42 + R() * 0.32;
    }

    const uniforms = {
      uTime: { value: 0 }, uMorph: { value: 0 }, uIntro: { value: 1 }, uMotion: { value: reduced ? 0 : 1 },
      uOpacity: { value: 1 },
      uMouse: { value: new THREE.Vector2(99, 99) }, uMouseOn: { value: 0 }, uMouseR: { value: C.mouseRadius }, uMouseF: { value: C.mouseForce },
      uWave: { value: new THREE.Vector2(99, 99) }, uWaveT: { value: 99 },
      uGlow: { value: new THREE.Vector3(99, 99, 99) }, uGlowAmt: { value: 0 },
      uPR: { value: pr },
      uBloomO: { value: new THREE.Vector3(...(shapes[0].flower || [99, 99, 99])) }, uBloomR: { value: 0 }, uBloomOn: { value: 0 }, uOpen: { value: 0 },
      uGrow: { value: reduced ? 2 : 0 }, uZap: { value: -1 }, uZapAmt: { value: 0 }, uRootGlow: { value: 0 },
      uImpact: { value: new THREE.Vector3(0.3, 0.95, 0.3) }, uShatter: { value: 0 }, uShatterGlow: { value: 0 },
    };

    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(shapes[0].pos, 3));
    for (let s = 1; s <= LAST; s++) pg.setAttribute('aP' + s, new THREE.BufferAttribute(shapes[s].pos, 3));
    pg.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
    pg.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    pg.setAttribute('aColor0', new THREE.BufferAttribute(shapes[0].colors || color, 3));
    pg.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    pg.setAttribute('aSize0', new THREE.BufferAttribute(shapes[0].sizes || size, 1));
    pg.setAttribute('aBloom', new THREE.BufferAttribute(shapes[0].bloom || color, 3));
    pg.setAttribute('aSpecial', new THREE.BufferAttribute(shapes[0].special || new Float32Array(N), 1));
    pg.setAttribute('aGrow', new THREE.BufferAttribute(shapes[0].grow || new Float32Array(N), 1));
    const points = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uSize: { value: C.pointSize } },
      vertexShader: POINTS_VS, fragmentShader: POINTS_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    points.frustumCulled = false;
    group.add(points);

    /* — Conexiones: una malla de líneas por forma — */
    shapes.forEach((sh, s) => {
      const E = sh.edges, pos = new Float32Array(E.length * 3), rr = new Float32Array(E.length * 4);
      for (let k = 0; k < E.length; k++) {
        const i = E[k];
        pos[k * 3] = sh.pos[i * 3]; pos[k * 3 + 1] = sh.pos[i * 3 + 1]; pos[k * 3 + 2] = sh.pos[i * 3 + 2];
        rr.set(rand.subarray(i * 4, i * 4 + 4), k * 4);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aRand', new THREE.BufferAttribute(rr, 4));
      const lines = new THREE.LineSegments(g, new THREE.ShaderMaterial({
        uniforms: { ...uniforms, uStage: { value: s }, uLine: { value: C.stages[ORDER[s]].line || C.lineOpacity },
          uLineA: { value: new THREE.Color(0.36, 0.34, 0.85) }, uLineB: { value: new THREE.Color(0.95, 0.72, 0.3) } },
        vertexShader: LINES_VS, fragmentShader: LINES_FS,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      lines.frustumCulled = false;
      group.add(lines);
    });

    /* — Pulsos (impulsos que viajan por las conexiones) — */
    const TRAIL = 4, PM = C.pulses.max;
    const pa = {
      aFrom: new Float32Array(PM * TRAIL * 3), aTo: new Float32Array(PM * TRAIL * 3),
      aRF: new Float32Array(PM * TRAIL * 4), aRT: new Float32Array(PM * TRAIL * 4),
      aProg: new Float32Array(PM * TRAIL), aTrail: new Float32Array(PM * TRAIL), aAlive: new Float32Array(PM * TRAIL),
    };
    for (let i = 0; i < PM * TRAIL; i++) pa.aTrail[i] = i % TRAIL;
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PM * TRAIL * 3), 3));
    const pAttr = {};
    for (const [k, arr] of Object.entries(pa)) {
      const sz = k === 'aFrom' || k === 'aTo' ? 3 : k === 'aRF' || k === 'aRT' ? 4 : 1;
      pAttr[k] = new THREE.BufferAttribute(arr, sz);
      if (k !== 'aTrail') pAttr[k].setUsage(THREE.DynamicDrawUsage);
      pgeo.setAttribute(k, pAttr[k]);
    }
    const pulseUniforms = { ...uniforms, uPulseVis: { value: 0 } };
    const pulsePoints = new THREE.Points(pgeo, new THREE.ShaderMaterial({
      uniforms: pulseUniforms, vertexShader: PULSE_VS, fragmentShader: PULSE_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    pulsePoints.frustumCulled = false;
    group.add(pulsePoints);

    const pulses = Array.from({ length: PM }, () => ({ alive: 0, dying: false, a: 0, b: 0, prog: 0, len: 1, hops: 0, speed: 1, bias: null }));
    let pulseStage = 0;

    function nodePos(s, i) { const p = shapes[s].pos; return [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]]; }
    function nextNode(s, from, prev, bias) {
      const nb = shapes[s].adj.get(from);
      if (!nb || !nb.length) return -1;
      let options = nb.length > 1 ? nb.filter((j) => j !== prev) : nb;
      if (bias) {
        const f = nodePos(s, from);
        options = options.slice().sort((x, y) => {
          const px = nodePos(s, x), py = nodePos(s, y);
          return ((py[0] - f[0]) * bias[0] + (py[1] - f[1]) * bias[1]) - ((px[0] - f[0]) * bias[0] + (px[1] - f[1]) * bias[1]);
        });
        return options[Math.random() < 0.8 ? 0 : Math.floor(Math.random() * options.length)];
      }
      return options[Math.floor(Math.random() * options.length)];
    }
    function spawn(s, node, hops, speed, bias) {
      const p = pulses.find((q) => q.alive <= 0);
      if (!p) return;
      const b = nextNode(s, node, -1, bias);
      if (b < 0) return;
      const A = nodePos(s, node), B = nodePos(s, b);
      Object.assign(p, { alive: 1, dying: false, a: node, b, prog: 0, hops, speed, bias,
        len: Math.max(0.06, Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2])) });
    }
    function randomNeuron(s) { const ns = shapes[s].neurons; return ns[Math.floor(Math.random() * ns.length)]; }

    /* — Proyección a pantalla (para el clic y el sonido cerca del cursor) — */
    const v3 = new THREE.Vector3();
    function toScreen(s, i) {
      const p = nodePos(s, i);
      v3.set(p[0], p[1], p[2]).applyMatrix4(group.matrixWorld).project(camera);
      return [(v3.x * 0.5 + 0.5) * vw, (-v3.y * 0.5 + 0.5) * vh];
    }

    /* — Tamaño / escenarios — */
    let vw = 1, vh = 1, visH = 1, visW = 1;
    const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
    function resize() {
      vw = window.innerWidth; vh = window.innerHeight;
      renderer.setSize(vw, vh, false);
      camera.aspect = vw / vh;
      camera.updateProjectionMatrix();
      visH = 2 * tanHalf * camera.position.z;
      visW = visH * camera.aspect;
      requestRender();
    }

    function layoutFor(s, rect, time) {
      const sh = shapes[s], cfg = C.stages[ORDER[s]];
      const wpp = visH / vh;
      const x = (rect.left + rect.width / 2 - vw / 2) * wpp;
      let y = -(rect.top + rect.height / 2 - vh / 2) * wpp;
      // en pantallas verticales, las formas "cover" se giran 90° para llenar el alto
      const turn = cfg.cover && rect.height > rect.width;
      const [fw, fh] = turn ? [sh.h, sh.w] : [sh.w, sh.h];
      const fit = (cfg.cover ? Math.max : Math.min)((rect.width * wpp) / fw, (rect.height * wpp) / fh) * cfg.fill;
      const prog = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      const mx = mouse.sx, my = mouse.sy;
      let rx = 0, ry = 0, rz = 0;
      if (cfg.free) {
        // el cohete sube con el scroll y gira sobre su eje
        y += Math.pow(prog, 2) * visH * 0.35;
        ry = prog * Math.PI * 2.2 + time * 0.12 * (1 - reduced);
        rz = -0.18 + mx * 0.05; rx = 0.12 + my * 0.05;
      } else if (!mobile) {
        // en desktop la forma "se pega" cerca del borde mientras leés la sección;
        // en mobile se va con su escenario para no quedar detrás del texto
        y = Math.max(-visH * 0.3, Math.min(visH * 0.3, y));
      }
      const tm = reduced ? 0 : time;
      switch (ORDER[s]) {
        case 'tree':     rx = 0.1 + my * 0.08; ry = tm * 0.12 + mx * 0.35; break;
        case 'flow':     rx = -0.32 + my * 0.08; ry = Math.sin(tm * 0.25) * 0.12 + mx * 0.18; break;
        case 'browser':  rx = 0.1 + my * 0.12; ry = -0.38 + mx * 0.22 + Math.sin(tm * 0.3) * 0.04; break;
        case 'monogram': rx = my * 0.18; ry = Math.sin(tm * 0.35) * 0.28 + mx * 0.32; break;
        case 'synapse':  rx = my * 0.08 + Math.sin(tm * 0.09) * 0.06; ry = Math.sin(tm * 0.12) * 0.16 + mx * 0.14; rz = Math.sin(tm * 0.07) * 0.04; break;
      }
      if (turn) rz += Math.PI / 2;
      const op = mobile ? cfg.opMobile : cfg.op;
      return { x, y, s: fit, rx, ry, rz, op, size: cfg.size || 1 };
    }

    function target() {
      const mid = vh * 0.5;
      const rects = stageEls.map((el) => el.getBoundingClientRect());
      const c = rects.map((r) => r.top + r.height / 2);
      let k = 0, raw = 0;
      if (mid <= c[0]) { k = 0; raw = 0; }
      else if (mid >= c[LAST]) { k = LAST; raw = 0; }
      else {
        for (k = 0; k < LAST; k++) if (mid < c[k + 1]) break;
        raw = (mid - c[k]) / Math.max(1, c[k + 1] - c[k]);
      }
      const e = raw <= 0.2 ? 0 : raw >= 0.8 ? 1 : ((raw - 0.2) / 0.6) ** 2 * (3 - 2 * ((raw - 0.2) / 0.6));
      return { m: Math.min(LAST, k + e), rects, prog: k + Math.max(0, raw) };
    }

    /* — Puntero — */
    const mouse = { x: -9999, y: -9999, sx: 0, sy: 0, tx: 0, ty: 0, on: 0, last: 0 };
    function viewXY(clientX, clientY) {
      const nx = (clientX / vw) * 2 - 1, ny = -(clientY / vh) * 2 + 1;
      return [nx * tanHalf * camera.aspect * camera.position.z, ny * tanHalf * camera.position.z];
    }
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.last = performance.now();
      mouse.tx = (e.clientX / vw) * 2 - 1; mouse.ty = (e.clientY / vh) * 2 - 1;
      const [x, y] = viewXY(e.clientX, e.clientY);
      uniforms.uMouse.value.set(x, y);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.last = 0; });

    const IGNORE = 'a, button, input, textarea, select, label, .panel, .case, .menu, .site-header, .chain, .prose, .case-modal, .logos, .clients';
    window.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || e.target.closest(IGNORE)) return;
      if (overFlower(e.clientX, e.clientY)) { bloom(); return; }
      if (reduced) return;
      if (morph < 0.1 && uniforms.uGrow.value > 1.02) { lightning(); return; }
      impulse(e.clientX, e.clientY);
    });

    /* — Easter egg: la flor — */
    const egg = { t: -1, flowerPx: [-999, -999], flowerR: 0 };
    const fv = new THREE.Vector3(), fv2 = new THREE.Vector3();
    function updateFlowerScreen() {
      const f = shapes[0].flower;
      if (!f) return;
      fv.set(f[0], f[1], f[2]).applyMatrix4(group.matrixWorld).project(camera);
      fv2.set(f[0] + shapes[0].flowerR, f[1], f[2]).applyMatrix4(group.matrixWorld).project(camera);
      egg.flowerPx = [(fv.x * 0.5 + 0.5) * vw, (-fv.y * 0.5 + 0.5) * vh];
      egg.flowerR = Math.abs(fv2.x - fv.x) * 0.5 * vw;
    }
    function overFlower(x, y) {
      if (morph > 0.08 || uniforms.uGrow.value < 1.02 || uniforms.uShatter.value > 0) return false;
      const r = Math.max(26, egg.flowerR * 1.5);
      return (x - egg.flowerPx[0]) ** 2 + (y - egg.flowerPx[1]) ** 2 < r * r;
    }
    window.addEventListener('pointermove', (e) => {
      root.classList.toggle('flower-hover', !e.target.closest(IGNORE) && overFlower(e.clientX, e.clientY));
    }, { passive: true });

    function bloom() {
      if (egg.t >= 0) return;
      egg.t = 0;
      root.classList.remove('flower-hover');
      // pulsos desde la flor y un arpegio
      const s = 0, f = shapes[0].flower, ns = shapes[0].neurons;
      const near = ns.filter((i) => { const p = nodePos(s, i); return Math.hypot(p[0] - f[0], p[1] - f[1], p[2] - f[2]) < 0.7; });
      for (let k = 0; k < 24 && near.length; k++) spawn(s, near[Math.floor(Math.random() * near.length)], 10 + Math.floor(Math.random() * 10), C.pulses.speed * 1.6, null);
      if (window.SinapAudio) [0, 1, 2, 3, 4].forEach((n, k) => setTimeout(() => window.SinapAudio.play('connect', n), k * 130));
      const toast = document.createElement('p');
      toast.className = 'egg-toast';
      toast.textContent = 'encontraste la flor · el color se contagia';
      toast.style.left = egg.flowerPx[0] + 'px'; toast.style.top = egg.flowerPx[1] + 'px';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4200);
      requestRender();
    }
    function updateBloom(dt) {
      if (egg.t < 0) return;
      if (reduced) { // sin animación: florece de golpe y vuelve a los 7 s
        if (egg.t > 0) return;
        egg.t = 1;
        uniforms.uOpen.value = 1; uniforms.uBloomR.value = 4.2; uniforms.uBloomOn.value = 1;
        setTimeout(() => { egg.t = -1; uniforms.uBloomOn.value = 0; uniforms.uOpen.value = 0; requestRender(); }, 7000);
        return;
      }
      egg.t += dt;
      const t = egg.t, GROW = 2.6, HOLD = 6, FADE = 1.6;
      uniforms.uOpen.value = t < GROW + HOLD ? Math.min(1, t / 0.7) : Math.max(0, 1 - (t - GROW - HOLD) / FADE);
      uniforms.uBloomR.value = Math.min(1, t / GROW) ** 0.8 * 4.2;
      uniforms.uBloomOn.value = t < GROW + HOLD ? 1 : Math.max(0, 1 - (t - GROW - HOLD) / FADE);
      if (t > GROW + HOLD + FADE) { egg.t = -1; uniforms.uBloomOn.value = 0; uniforms.uOpen.value = 0; }
    }

    /* — Intro: semilla que cae → el árbol crece → cae un rayo — */
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    const SEED_TOP = 4.6, GROUND = -1.2;
    const seed = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, SEED_TOP, 0], 3)),
      new THREE.PointsMaterial({ color: 0xffd38a, size: 0.42, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    seed.visible = false; seed.frustumCulled = false; group.add(seed);
    const BOLT_N = 160;
    const boltGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(BOLT_N * 3), 3));
    const bolt = new THREE.Points(boltGeo, new THREE.PointsMaterial({ color: 0xfff1d6, size: 0.24, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const boltCore = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    bolt.visible = boltCore.visible = false; bolt.frustumCulled = boltCore.frustumCulled = false;
    group.add(bolt, boltCore);

    function shapeBolt() { // zigzag desde arriba del cuadro hasta la copa
      const a = [0.5 + (Math.random() - 0.5) * 1.2, 6, 0.3], b = [0.3, 0.95, 0.3], pos = boltGeo.attributes.position.array;
      const KN = 16, knots = [];
      for (let k = 0; k <= KN; k++) {
        const t = k / KN, j = Math.sin(t * Math.PI) * 0.5;
        knots.push([a[0] + (b[0] - a[0]) * t + (k && k < KN ? (Math.random() - 0.5) * 2 * j : 0), a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t + (Math.random() - 0.5) * j * 0.5]);
      }
      for (let i = 0; i < BOLT_N; i++) {
        const t = (i / (BOLT_N - 1)) * KN, k = Math.min(KN - 1, Math.floor(t)), f = t - k;
        for (let c = 0; c < 3; c++) pos[i * 3 + c] = knots[k][c] + (knots[k + 1][c] - knots[k][c]) * f;
      }
      boltGeo.attributes.position.needsUpdate = true;
    }
    function flash() {
      const el = document.createElement('div');
      el.className = 'zap-flash';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 700);
    }
    const intro = { t: reduced ? -1 : 0, landed: false, zapT: -1, fast: false };
    const fall = { state: 'idle', t: 0 };  // idle → shatter (rayo + estallido) → idle al volver al hero
    function lightning() {
      if (intro.zapT >= 0) return;
      intro.zapT = 0;
      shapeBolt(); flash();
      if (window.SinapAudio) { window.SinapAudio.play('impulse'); [3, 2, 1, 0].forEach((n, k) => setTimeout(() => window.SinapAudio.play('step', n), 180 + k * 200)); }
    }
    function waveAtLocal(x, y, z) { // onda de impacto en un punto del árbol
      const v = new THREE.Vector3(x, y, z).applyMatrix4(group.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      uniforms.uWave.value.set(v.x, v.y); uniforms.uWaveT.value = 0;
    }
    function updateIntro(dt) {
      const U = uniforms;
      if (intro.t >= 0) {
        intro.t += dt;
        const FALL = intro.fast ? 0 : 0.95, GROW = intro.fast ? 1.5 : 2.5, t = intro.t + (intro.fast ? 0 : 0);
        if (t < FALL) { // la semilla cae con gravedad
          seed.visible = morph < 0.1;
          const k = (t / FALL) ** 2;
          seed.geometry.attributes.position.array[1] = SEED_TOP + (GROUND - SEED_TOP) * k;
          seed.geometry.attributes.position.needsUpdate = true;
        } else {
          if (!intro.landed) {
            intro.landed = true; seed.visible = false; waveAtLocal(0, GROUND, 0);
            if (window.SinapAudio) window.SinapAudio.play('step', 0);
          }
          const g = Math.min(1, (t - FALL) / GROW);
          U.uGrow.value = (1 - Math.pow(1 - g, 2.2)) * 1.06;
          if (g >= 1) { U.uGrow.value = 2; intro.t = -1; intro.fast = false; }
        }
      }
      if (intro.zapT >= 0) {
        intro.zapT += dt;
        const z = intro.zapT;
        const on = z < 0.32 && morph < 0.6;
        bolt.visible = boltCore.visible = on;
        if (on) {
          const fl = 0.55 + 0.45 * Math.random();
          bolt.material.opacity = fl; boltCore.material.opacity = fl;
          if (Math.random() < 0.25) shapeBolt();
        }
        if (z > 0.08 && z < 0.12) waveAtLocal(0.3, 0.95, 0.3);
        const zz = Math.min(1, Math.max(0, (z - 0.1) / 1.05));
        U.uZap.value = 1.08 - zz * 1.16;
        U.uZapAmt.value = z < 1.15 ? 1 : 0;
        if (z >= 1.15 && z < 1.2) U.uRootGlow.value = 1;
        if (z > 3) intro.zapT = -1;
      }
      U.uRootGlow.value *= Math.exp(-dt * 1.3);
    }

    // Al empezar a bajar desde el hero: cae el rayo y el árbol estalla en fragmentos,
    // que siguen la mutación hacia el flujo. Al volver arriba, el árbol vuelve a crecer.
    function updateFall(dt, tm) {
      const U = uniforms;
      if (fall.state === 'idle') {
        if (U.uGrow.value > 1.02 && tm > 0.04) {
          fall.state = 'shatter'; fall.t = 0;
          intro.zapT = -1; lightning();
        }
        return;
      }
      fall.t += dt;
      const k = Math.max(0, (fall.t - 0.1) / 0.9);
      U.uShatter.value = 1 - Math.pow(1 - Math.min(1, k), 3);
      U.uShatterGlow.value = fall.t < 0.1 ? 0 : Math.exp(-(fall.t - 0.1) * 1.6);
      if (tm < 0.008 && morph < 0.02 && fall.t > 1.2) { // de vuelta en el hero: renace
        fall.state = 'idle';
        U.uShatter.value = 0; U.uShatterGlow.value = 0;
        U.uGrow.value = 0; intro.fast = true; intro.landed = true; intro.t = 0;
      }
    }

    window.SinapNeural = { flower: () => egg.flowerPx.slice(), bloom, lightning, grow: () => uniforms.uGrow.value, shatter: () => uniforms.uShatter.value, state: () => ({ t: egg.t, r: uniforms.uBloomR.value, on: uniforms.uBloomOn.value }) };

    function impulse(cx, cy) {
      const [x, y] = viewXY(cx, cy);
      uniforms.uWave.value.set(x, y);
      uniforms.uWaveT.value = 0;
      const s = pulseStage, ns = shapes[s].neurons;
      let best = -1, bd = Infinity;
      for (let k = 0; k < ns.length; k += 2) {
        const [sx, sy] = toScreen(s, ns[k]);
        const d = (sx - cx) ** 2 + (sy - cy) ** 2;
        if (d < bd) { bd = d; best = ns[k]; }
      }
      if (best >= 0 && bd < 260 * 260) {
        const nb = shapes[s].adj.get(best) || [];
        [best, ...nb].forEach((node) => { for (let r = 0; r < 4; r++) spawn(s, node, 7 + Math.floor(Math.random() * 9), C.pulses.speed * 1.8, null); });
      }
      if (window.SinapAudio) window.SinapAudio.play('impulse');
    }

    /* — Simulador de automatizaciones → estaciones del flujo — */
    window.addEventListener('sinap:flow', (e) => {
      const s = ORDER.indexOf('flow');
      if (reduced || pulseStage !== s) return;
      const st = shapes[s].stations, k = Math.max(0, Math.min(st.length - 1, e.detail.step));
      uniforms.uGlow.value.set(st[k][0], st[k][1], st[k][2]);
      uniforms.uGlowAmt.value = 1.5;
      if (k < st.length - 1) {
        const near = shapes[s].neurons.filter((i) => {
          const p = nodePos(s, i);
          return Math.abs(p[0] - st[k][0]) < 0.75 && Math.abs(p[1] - st[k][1]) < 0.5;
        });
        for (let r = 0; r < 9 && near.length; r++) spawn(s, near[Math.floor(Math.random() * near.length)], 26, C.pulses.speed * 2.4, [1, 0]);
      }
    });

    /* — Loop — */
    let morph = 0, raf = 0, last = performance.now(), t0 = last, needs = true;
    let fpsSamples = 0, fpsSum = 0, downgraded = false;
    const lay = { x: 0, y: 0, s: 1, rx: 0, ry: 0, rz: 0, op: 1, size: 1 };

    function requestRender() { needs = true; if (reduced && !raf) raf = requestAnimationFrame(frame); }

    function updatePulses(dt) {
      const s = pulseStage, mouseActive = uniforms.uMouseOn.value > 0.5 && window.SinapAudio && window.SinapAudio.isEnabled();
      let alive = 0;
      for (const p of pulses) {
        if (p.alive <= 0) continue;
        if (p.dying) { p.alive -= dt * 3; continue; }
        alive++;
        p.prog += (dt * p.speed) / p.len;
        if (p.prog >= 1) {
          p.hops--;
          if (mouseActive && Math.random() < 0.25) {
            const [sx, sy] = toScreen(s, p.b);
            if ((sx - mouse.x) ** 2 + (sy - mouse.y) ** 2 < 120 * 120) window.SinapAudio.play('connect');
          }
          const nx = p.hops > 0 ? nextNode(s, p.b, p.a, p.bias) : -1;
          if (nx < 0) { p.dying = true; p.prog = 1; continue; }
          const B = nodePos(s, nx), A = nodePos(s, p.b);
          p.a = p.b; p.b = nx; p.prog = 0;
          p.len = Math.max(0.06, Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]));
        }
      }
      const ambient = (mobile ? C.pulses.ambient.mobile : C.pulses.ambient.desktop) * (C.stages[ORDER[s]].pulseMul || 1);
      if (alive < ambient && Math.random() < 0.4) spawn(s, randomNeuron(s), 6 + Math.floor(Math.random() * 10), C.pulses.speed, null);

      // volcar a los atributos
      const sh = shapes[s];
      for (let q = 0; q < PM; q++) {
        const p = pulses[q];
        for (let t = 0; t < TRAIL; t++) {
          const v = q * TRAIL + t;
          pa.aAlive[v] = Math.max(0, p.alive);
          if (p.alive <= 0) continue;
          pa.aFrom[v * 3] = sh.pos[p.a * 3]; pa.aFrom[v * 3 + 1] = sh.pos[p.a * 3 + 1]; pa.aFrom[v * 3 + 2] = sh.pos[p.a * 3 + 2];
          pa.aTo[v * 3] = sh.pos[p.b * 3]; pa.aTo[v * 3 + 1] = sh.pos[p.b * 3 + 1]; pa.aTo[v * 3 + 2] = sh.pos[p.b * 3 + 2];
          for (let k = 0; k < 4; k++) { pa.aRF[v * 4 + k] = rand[p.a * 4 + k]; pa.aRT[v * 4 + k] = rand[p.b * 4 + k]; }
          pa.aProg[v] = p.prog;
        }
      }
      for (const k in pAttr) if (k !== 'aTrail') pAttr[k].needsUpdate = true;
    }

    function frame(now) {
      raf = 0;
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = Math.max(last, now);
      const time = Math.max(0, now - t0) / 1000;

      const { m: tm, rects, prog } = target();
      morph = reduced ? Math.round(tm) : morph + (tm - morph) * (1 - Math.exp(-dt * C.morphFollow));
      if (Math.abs(tm - morph) < 0.0005) morph = tm;
      morph = Math.max(0, Math.min(LAST, morph));

      // puntero suavizado (parallax) + presencia
      mouse.sx += (mouse.tx - mouse.sx) * (1 - Math.exp(-dt * 3));
      mouse.sy += (mouse.ty - mouse.sy) * (1 - Math.exp(-dt * 3));
      const mOn = !reduced && now - mouse.last < 2500 ? 1 : 0;
      uniforms.uMouseOn.value += (mOn - uniforms.uMouseOn.value) * (1 - Math.exp(-dt * 4));

      // transformar el grupo: mezcla entre los dos escenarios vecinos
      const a = Math.floor(morph), b = Math.min(LAST, a + 1), f = morph - a;
      const A = layoutFor(a, rects[a], time), B = layoutFor(b, rects[b], time);
      for (const k in lay) lay[k] = A[k] + (B[k] - A[k]) * f;
      group.position.set(lay.x, lay.y, 0);
      group.scale.setScalar(lay.s);
      group.rotation.set(lay.rx, lay.ry, lay.rz);

      uniforms.uTime.value = time;
      uniforms.uMorph.value = morph;
      uniforms.uOpacity.value = lay.op;
      points.material.uniforms.uSize.value = C.pointSize * lay.size;
      if (!reduced) uniforms.uIntro.value = Math.min(1, uniforms.uIntro.value + dt / C.introSeconds);
      uniforms.uWaveT.value += dt;
      uniforms.uGlowAmt.value *= Math.exp(-dt * 1.6);

      // pulsos: viven en la forma dominante
      const dom = Math.round(morph);
      if (dom !== pulseStage) { pulses.forEach((p) => { p.alive = 0; }); pulseStage = dom; }
      pulseUniforms.uPulseVis.value = (1 - Math.min(1, Math.max(0, (Math.abs(morph - dom) - 0.03) / 0.12))) * (uniforms.uIntro.value > 0.85 ? 1 : 0) * (dom === 0 && (uniforms.uGrow.value < 1.02 || uniforms.uShatter.value > 0) ? 0 : 1);
      if (!reduced) updatePulses(dt);

      group.updateMatrixWorld();
      updateFlowerScreen();
      updateBloom(dt);
      if (!reduced) { updateIntro(dt); updateFall(dt, prog); }
      renderer.render(scene, camera);
      needs = false;

      // si el equipo no da abasto, bajamos la resolución una vez
      if (!downgraded && time > 3 && fpsSamples < 90) {
        fpsSum += dt; fpsSamples++;
        if (fpsSamples === 90 && fpsSum / 90 > 1 / 32) {
          downgraded = true; pr = 1; renderer.setPixelRatio(1); uniforms.uPR.value = 1; resize();
        }
      }

      if (!reduced && !document.hidden) raf = requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    if (reduced) {
      window.addEventListener('scroll', requestRender, { passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    });

    resize();
    root.classList.add('neural-ready');
    raf = requestAnimationFrame(frame);
  }
})();
