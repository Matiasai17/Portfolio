/* ============================================================
   SINAPSTUDIO v3 — audio.js
   Paisaje sonoro sintetizado en vivo (Web Audio API, sin archivos).
   Todo sale de la misma escala pentatónica, así que cualquier
   combinación suena consonante.

   A) AMBIENTE — una cama espacial muy suave y continua:
      - drone: dos osciladores desafinados + sub, con un filtro
        que respira lentamente (LFO) y un leve vaivén estéreo.
      - pads: cada 7–14 s aparece una nota larga de la escala,
        bañada en reverb y paneada al azar. Nunca se repite igual.

   B) EVENTOS — los mismos de siempre, pero modernizados:
      - "connect": campana FM corta cuando un pulso llega a un nodo
                   cerca del cursor.
      - "impulse": clic → sub grave + cola de aire con caída.
      - "step":    cada paso del simulador de automatizaciones.
      Todos pasan por un envío a reverb: suenan en un espacio, no secos.

   Arranca en silencio hasta el primer gesto del usuario (política de
   autoplay) y entra con un fundido largo. Se calla solo si la pestaña
   pierde el foco. Botón de silencio en el header; se recuerda.

   API: window.SinapAudio.play(tipo) · setEnabled(bool) · isEnabled()
   ============================================================ */
(() => {
  'use strict';

  /* ── CONTROLES ─────────────────────────────────────────────── */
  const AUDIO_CONFIG = {
    volume: 0.09,          // volumen general
    minGap: 70,            // ms mínimos entre dos sonidos de evento
    maxPerSecond: 5,
    reverb: { seconds: 4.2, decay: 2.6, damp: 2600, wet: 0.5 },
    fadeIn: 3.5,           // segundos de entrada del ambiente

    // A) cama ambiental
    ambient: {
      gain: 0.45,          // relativo al volumen general (bajo: es cama de fondo)
      root: 220,           // La3: raíz del drone (registro que sí sale
                           // por parlantes de notebook; el sub va debajo)
      detune: 7,           // cents de desafinación entre las dos capas
      cutoff: [500, 1900], // recorrido del filtro que respira
      breath: 26,          // segundos del ciclo de respiración
      drift: 48,           // segundos del vaivén estéreo
      pad: {
        notes: [329.6, 392.0, 440.0, 523.3, 587.3, 659.3, 784.0, 880.0],
        every: [7, 14],    // segundos entre notas (mín, máx)
        duration: [6, 11], // duración de cada nota (mín, máx)
        gain: 0.34,
      },
    },

    // B) sonidos de evento
    // brillo al pasar por un nodo: entra suave (attack largo) y con poco
    // índice de FM, así suena a destello y no a campanita
    connect: { kind: 'bell', notes: [880.0, 1046.5, 1174.7, 1318.5, 1568.0], duration: 0.85, ratio: 2.0, index: 0.7, gain: 0.2, send: 0.5, attack: 0.045 },
    impulse: { kind: 'sub',  notes: [110.0, 130.8, 146.8], duration: 1.6, sweep: 0.45, gain: 1.1, air: 0.35, send: 0.8 },
    step:    { kind: 'bell', notes: [523.3, 587.3, 659.3, 784.0], duration: 0.7, ratio: 3.0, index: 1.1, gain: 0.45, send: 0.45 },
  };
  /* ─────────────────────────────────────────────────────────── */

  const STORAGE_KEY = 'sinap-sound';
  const A = AUDIO_CONFIG.ambient;
  const rnd = (a, b) => a + Math.random() * (b - a);

  let ctx = null, master = null, wet = null, dry = null;
  let ambientGain = null, ambientNodes = [], padTimer = 0;
  let lastPlay = 0, recent = [];
  let enabled = true;
  try { enabled = localStorage.getItem(STORAGE_KEY) !== 'off'; } catch (e) { /* almacenamiento bloqueado */ }

  /* ── Reverb: respuesta al impulso generada, sin archivos ──── */
  function buildReverb() {
    const { seconds, decay, damp } = AUDIO_CONFIG.reverb;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // ruido con caída exponencial, suavizado para que la cola sea oscura
        lp += ((Math.random() * 2 - 1) - lp) * 0.22;
        data[i] = lp * Math.pow(1 - t, decay);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = damp;
    const amt = ctx.createGain();
    amt.gain.value = AUDIO_CONFIG.reverb.wet;
    conv.connect(tone); tone.connect(amt); amt.connect(master);
    return conv;
  }

  /* ── Arranque ──────────────────────────────────────────────── */
  function arm() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);
    master.gain.exponentialRampToValueAtTime(AUDIO_CONFIG.volume, ctx.currentTime + AUDIO_CONFIG.fadeIn * 0.35);

    wet = buildReverb();
    dry = ctx.createGain();
    dry.gain.value = 1;
    dry.connect(master);

    startAmbient();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, arm, { once: true, passive: true, capture: true }));

  /* ── A) Cama ambiental ─────────────────────────────────────── */
  function startAmbient() {
    if (ambientGain) return;
    const t0 = ctx.currentTime;

    ambientGain = ctx.createGain();
    ambientGain.gain.setValueAtTime(0.0001, t0);
    ambientGain.gain.exponentialRampToValueAtTime(A.gain, t0 + AUDIO_CONFIG.fadeIn);
    ambientGain.connect(dry);

    // una parte del drone va a la reverb: le da profundidad de sala
    const send = ctx.createGain();
    send.gain.value = 0.7;
    ambientGain.connect(send); send.connect(wet);

    // filtro que respira
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2.2;
    filter.frequency.value = A.cutoff[0];
    filter.connect(ambientGain);

    const lfo = ctx.createOscillator(), lfoAmt = ctx.createGain();
    lfo.frequency.value = 1 / A.breath;
    lfoAmt.gain.value = (A.cutoff[1] - A.cutoff[0]) / 2;
    filter.frequency.value = (A.cutoff[0] + A.cutoff[1]) / 2;
    lfo.connect(lfoAmt); lfoAmt.connect(filter.frequency);
    lfo.start(t0);

    // vaivén estéreo lentísimo
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) {
      pan.connect(filter);
      const pLfo = ctx.createOscillator(), pAmt = ctx.createGain();
      pLfo.frequency.value = 1 / A.drift;
      pAmt.gain.value = 0.55;
      pLfo.connect(pAmt); pAmt.connect(pan.pan);
      pLfo.start(t0);
      ambientNodes.push(pLfo);
    }
    const head = pan || filter;

    // capas desafinadas entre sí (raíz, quinta, octava) + sub por debajo
    [
      { f: A.root, type: 'triangle', det: -A.detune, g: 0.5 },
      { f: A.root, type: 'sine', det: A.detune, g: 0.45 },
      { f: A.root * 1.5, type: 'sine', det: A.detune * 1.6, g: 0.3 },
      { f: A.root * 2, type: 'sine', det: -A.detune * 2, g: 0.18 },
      { f: A.root / 2, type: 'sine', det: 0, g: 0.45 },
    ].forEach((v) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = v.type;
      osc.frequency.value = v.f;
      osc.detune.value = v.det;
      g.gain.value = v.g;
      osc.connect(g); g.connect(head);
      osc.start(t0);
      ambientNodes.push(osc);
    });

    ambientNodes.push(lfo);
    // una primera nota enseguida, para que el ambiente se note al entrar
    setTimeout(() => { if (ambientGain && enabled && ctx.state === 'running') padNote(); }, 1200);
    schedulePad();
  }

  // notas largas que aparecen y se van, siempre distintas
  function schedulePad() {
    clearTimeout(padTimer);
    padTimer = setTimeout(() => {
      if (enabled && ctx && ctx.state === 'running') padNote();
      schedulePad();
    }, rnd(A.pad.every[0], A.pad.every[1]) * 1000);
  }

  function padNote() {
    const cfg = A.pad;
    const t0 = ctx.currentTime;
    const dur = rnd(cfg.duration[0], cfg.duration[1]);
    const freq = cfg.notes[Math.floor(Math.random() * cfg.notes.length)];

    const osc = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = rnd(-6, 6);
    lp.type = 'lowpass';
    lp.frequency.value = freq * 3.5;

    // entrada y salida largas: la nota nunca "empieza", aparece
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(cfg.gain, t0 + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const out = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (out.pan) out.pan.value = rnd(-0.7, 0.7);

    osc.connect(lp); lp.connect(g); g.connect(out);
    out.connect(dry); out.connect(wet);
    osc.start(t0);
    osc.stop(t0 + dur + 0.1);
  }

  function stopAmbient() {
    clearTimeout(padTimer);
    if (!ambientGain) return;
    const t0 = ctx.currentTime;
    ambientGain.gain.cancelScheduledValues(t0);
    ambientGain.gain.setValueAtTime(Math.max(ambientGain.gain.value, 0.0001), t0);
    ambientGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
    const nodes = ambientNodes, g = ambientGain;
    ambientNodes = []; ambientGain = null;
    setTimeout(() => {
      nodes.forEach((n) => { try { n.stop(); } catch (e) { /* ya detenido */ } });
      try { g.disconnect(); } catch (e) { /* noop */ }
    }, 1400);
  }

  /* ── B) Sonidos de evento ──────────────────────────────────── */

  // salida común: una parte seca y otra a la reverb, con paneo
  function outputFor(send) {
    const node = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (node.pan) node.pan.value = rnd(-0.6, 0.6);
    const toWet = ctx.createGain();
    toWet.gain.value = send;
    node.connect(dry);
    node.connect(toWet); toWet.connect(wet);
    return node;
  }

  // campana FM: carrier + modulador. Más limpia y metálica que un
  // oscilador pelado, y se apaga sola con una cola larga.
  function bell(cfg, freq, t0, gainMul) {
    const car = ctx.createOscillator(), env = ctx.createGain();
    const mod = ctx.createOscillator(), modAmt = ctx.createGain();

    car.type = 'sine';
    car.frequency.value = freq;
    mod.type = 'sine';
    mod.frequency.value = freq * cfg.ratio;
    modAmt.gain.setValueAtTime(freq * cfg.index, t0);
    modAmt.gain.exponentialRampToValueAtTime(freq * 0.01, t0 + cfg.duration * 0.5);
    mod.connect(modAmt); modAmt.connect(car.frequency);

    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(cfg.gain * gainMul, t0 + (cfg.attack || 0.012));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + cfg.duration);

    const out = outputFor(cfg.send);
    car.connect(env); env.connect(out);
    car.start(t0); mod.start(t0);
    car.stop(t0 + cfg.duration + 0.05);
    mod.stop(t0 + cfg.duration + 0.05);
  }

  // clic: un sub que cae + un soplo de aire filtrado encima
  function sub(cfg, freq, t0, gainMul) {
    const out = outputFor(cfg.send);

    const osc = ctx.createOscillator(), env = ctx.createGain(), lp = ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * cfg.sweep, t0 + cfg.duration);
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(cfg.gain * gainMul, t0 + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + cfg.duration);
    osc.connect(lp); lp.connect(env); env.connect(out);
    osc.start(t0); osc.stop(t0 + cfg.duration + 0.05);

    // quinta justa apenas audible: le da cuerpo sin ensuciar
    const fifth = ctx.createOscillator(), fEnv = ctx.createGain();
    fifth.type = 'sine';
    fifth.frequency.setValueAtTime(freq * 1.5, t0 + 0.02);
    fEnv.gain.setValueAtTime(0.0001, t0 + 0.02);
    fEnv.gain.exponentialRampToValueAtTime(cfg.gain * gainMul * 0.3, t0 + 0.05);
    fEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + cfg.duration * 0.7);
    fifth.connect(fEnv); fEnv.connect(out);
    fifth.start(t0 + 0.02); fifth.stop(t0 + cfg.duration);

    // aire: ruido breve que barre hacia abajo, el "swoosh" del impulso
    if (cfg.air) {
      const len = Math.floor(ctx.sampleRate * 0.5);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), nEnv = ctx.createGain();
      src.buffer = buf;
      bp.type = 'bandpass';
      bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(2600, t0);
      bp.frequency.exponentialRampToValueAtTime(500, t0 + 0.5);
      nEnv.gain.setValueAtTime(cfg.air * gainMul, t0);
      nEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      src.connect(bp); bp.connect(nEnv); nEnv.connect(out);
      src.start(t0);
    }
  }

  function play(kind, noteIndex) {
    if (!enabled || !ctx || ctx.state !== 'running') return;
    const cfg = AUDIO_CONFIG[kind];
    if (!cfg) return;
    const now = performance.now();
    if (now - lastPlay < AUDIO_CONFIG.minGap) return;
    recent = recent.filter((t) => now - t < 1000);
    if (recent.length >= AUDIO_CONFIG.maxPerSecond) return;
    lastPlay = now; recent.push(now);

    const n = cfg.notes;
    const freq = typeof noteIndex === 'number' ? n[noteIndex % n.length] : n[Math.floor(Math.random() * n.length)];
    const t0 = ctx.currentTime;
    if (cfg.kind === 'sub') sub(cfg, freq, t0, 1);
    else bell(cfg, freq, t0, 1);
  }

  function setEnabled(v) {
    enabled = !!v;
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch (e) { /* noop */ }
    if (enabled) { arm(); if (ctx) startAmbient(); }
    else stopAmbient();
  }

  // si la pestaña queda en segundo plano, el ambiente se calla
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) stopAmbient();
    else if (enabled && ctx.state === 'running') startAmbient();
  });

  window.SinapAudio = { play, setEnabled, isEnabled: () => enabled };
})();
