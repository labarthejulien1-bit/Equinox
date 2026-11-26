// Le son d'Equinox.
//
// Tout est fabriqué par le navigateur (Web Audio) : il n'y a aucun fichier
// son. Deux sortes de sons :
//   - les nappes, qui durent et suivent l'état du monde (vent, eau qui coule,
//     accord de fond, grondement de la porte) : voir update() ;
//   - les sons brefs, déclenchés par un événement du jeu (la glace cède, une
//     marmotte siffle, le sanctuaire s'allume…) : voir event().
//
// Un navigateur n'a le droit de faire du bruit qu'après un geste du joueur :
// unlock() est appelée au premier appui.

const MUTE_KEY = 'equinox-muted';
const VOLUME = 1.6; // volume général (les sons eux-mêmes sont réglés bas, pour rester doux)

export function createAudio() {
  let ctx = null;
  let master = null;
  let analyser = null;
  let noise = null; // deux secondes de souffle, la matière du vent et de l'eau
  let beds = null; // les nappes
  let muted = false;
  try {
    muted = localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    // stockage indisponible : le son reste allumé
  }
  const last = {}; // dernière fois qu'un son bref a été joué (pour ne pas les empiler)
  const seen = { mirrors: new Map(), crystals: new Map(), wheels: new Map(), doors: 0, game: null, melt: 0, bloom: 0 };

  // ───────────────────────────── Mise en route ─────────────────────────────

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    // Un limiteur doux : plusieurs sons en même temps ne saturent pas.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 5;
    analyser = ctx.createAnalyser();
    master.connect(comp);
    comp.connect(ctx.destination);
    comp.connect(analyser);

    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Une nappe de souffle filtré, qui tourne en boucle ; on règle son volume plus tard.
    const hiss = (type, freq, q) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(0, Math.random() * 1.5);
      return { filter, gain };
    };
    // Une nappe de notes tenues.
    const chord = (freqs, type = 'sine') => {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1100;
      filter.connect(gain);
      gain.connect(master);
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.detune.value = (i % 2 ? 1 : -1) * 4; // très légèrement faux : le son respire
        const g = ctx.createGain();
        g.gain.value = 1 / freqs.length;
        o.connect(g);
        g.connect(filter);
        o.start();
      });
      return { gain };
    };
    beds = {
      wind: hiss('bandpass', 420, 0.7),
      water: hiss('bandpass', 1500, 0.6),
      rumble: hiss('lowpass', 110, 0.8),
      night: chord([110, 164.81, 220]), // la – mi – la : l'accord de l'ombre
      day: chord([277.18, 329.63, 440]), // do♯ – mi – la : il s'ajoute avec le jour
      thaw: chord([554.37, 659.25, 880], 'triangle'), // l'octave au-dessus : le monde dégelé
      shimmer: chord([1318.5, 1975.5]), // le cristal qui se charge
    };

    // Quand le jeu passe à l'arrière-plan, le son se tait.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    });
  }

  function setMuted(value) {
    muted = value;
    try {
      localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    } catch {
      // tant pis
    }
    if (ctx) master.gain.setTargetAtTime(value ? 0 : VOLUME, ctx.currentTime, 0.05);
  }

  // ───────────────────────────── Briques sonores ─────────────────────────────

  /** Une note : fréquence f0 (qui peut glisser vers f1), durée, volume. */
  function tone({ f0, f1 = f0, dur, gain, at = 0, attack = 0.012, type = 'sine', band = 0 }) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (band) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = band;
      f.Q.value = 3;
      g.connect(f);
      f.connect(master);
    } else g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Un souffle bref : un bruit filtré autour de `freq`. */
  function puff({ freq, dur, gain, at = 0, type = 'bandpass', q = 1 }) {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  /** Un tintement de cristal : une note et deux harmoniques qui s'éteignent vite. */
  function bell(freq, gain = 0.06, at = 0, dur = 1.6) {
    tone({ f0: freq, dur, gain, at, attack: 0.004 });
    tone({ f0: freq * 2.76, dur: dur * 0.55, gain: gain * 0.35, at, attack: 0.004 });
    tone({ f0: freq * 5.4, dur: dur * 0.3, gain: gain * 0.15, at, attack: 0.004 });
  }

  /** Vrai si ce son n'a pas été joué depuis `gap` secondes (et note qu'il l'est maintenant). */
  function fresh(name, gap) {
    const t = ctx.currentTime;
    if (last[name] !== undefined && t - last[name] < gap) return false;
    last[name] = t;
    return true;
  }

  // La gamme du jeu (la majeur, cinq notes) : tout ce qui tinte reste accordé.
  const SCALE = [440, 493.88, 554.37, 659.25, 739.99, 880, 987.77, 1108.73];

  const SOUNDS = {
    // ── le monde ──
    'ice-gone'() {
      puff({ freq: 1200, dur: 0.32, gain: 0.22, q: 0.8 });
      bell(2093, 0.035, 0.05, 0.9);
      bell(1568, 0.035, 0.16, 1);
      bell(1318.5, 0.03, 0.3, 1.2);
    },
    'door-open'() {
      tone({ f0: 72, f1: 40, dur: 0.6, gain: 0.3 });
      puff({ freq: 220, dur: 0.3, gain: 0.1, type: 'lowpass' });
    },
    'mirror-placed'() {
      bell(880, 0.06);
    },
    'temple-lit'() {
      // Un arpège qui monte, sur une basse qui s'ouvre.
      [440, 554.37, 659.25, 880, 1108.73, 1318.5].forEach((f, i) => bell(f, 0.065, i * 0.17, 2.6));
      tone({ f0: 110, dur: 4, gain: 0.09, attack: 0.6 });
      tone({ f0: 220, dur: 4, gain: 0.05, attack: 0.9 });
    },
    bloom() {
      if (!fresh('bloom', 0.08)) return;
      tone({ f0: SCALE[seen.bloom++ % SCALE.length], dur: 0.4, gain: 0.03, type: 'triangle', attack: 0.004 });
    },
    // ── les animaux ──
    whistle() {
      tone({ f0: 2500, f1: 3300, dur: 0.13, gain: 0.06 });
      tone({ f0: 2500, f1: 3300, dur: 0.13, gain: 0.05, at: 0.21 });
    },
    hop() {
      if (!fresh('hop', 0.12)) return;
      tone({ f0: 170, f1: 60, dur: 0.09, gain: 0.07 });
      puff({ freq: 700, dur: 0.05, gain: 0.02, type: 'lowpass' });
    },
    owl() {
      tone({ f0: 392, dur: 0.3, gain: 0.07, attack: 0.05 });
      tone({ f0: 350, f1: 330, dur: 0.65, gain: 0.08, at: 0.38, attack: 0.07 });
    },
    raptor() {
      if (!fresh('raptor', 1.2)) return;
      tone({ f0: 2400, f1: 1500, dur: 0.55, gain: 0.06, type: 'sawtooth', band: 2000, attack: 0.03 });
    },
    snort() {
      if (!fresh('snort', 0.5)) return;
      puff({ freq: 650, dur: 0.16, gain: 0.07, q: 1.3 });
      puff({ freq: 520, dur: 0.14, gain: 0.05, q: 1.3, at: 0.2 });
    },
    plop() {
      tone({ f0: 620, f1: 180, dur: 0.12, gain: 0.06 });
      tone({ f0: 1300, f1: 650, dur: 0.05, gain: 0.02, at: 0.03 });
    },
    step() {
      if (!fresh('step', 0.15)) return;
      puff({ freq: 900, dur: 0.05, gain: 0.02, q: 0.7 });
    },
  };

  /** Joue le son d'un événement du jeu (voir g.events). */
  function event(name) {
    if (!ctx || ctx.state !== 'running') return;
    // Un villageois qu'on touche fait tinter sa note : 'chime0' à 'chime4'.
    if (name.startsWith('chime')) return bell([523.25, 587.33, 659.25, 783.99, 880][Number(name.slice(5)) || 0], 0.06, 0, 1.2);
    if (SOUNDS[name]) SOUNDS[name]();
  }

  // ───────────────────────────── Les nappes ─────────────────────────────

  /** À appeler à chaque image : accorde les nappes sur l'état du monde. */
  function update(g, dt) {
    if (!ctx || ctx.state !== 'running' || !g.light) return;
    const t = ctx.currentTime;
    const set = (param, value, lag = 0.3) => param.setTargetAtTime(value, t, lag);
    const life = g.life;
    const night = life ? life.night : 0;
    if (g !== seen.game) {
      // Nouveau niveau : on oublie ce qu'on avait remarqué dans l'ancien.
      seen.game = g;
      seen.mirrors.clear();
      seen.crystals.clear();
      seen.wheels.clear();
      seen.doors = 0;
      seen.bloom = 0;
    }

    // Le vent : toujours un fond, et la rafale qui passe.
    const gust = life ? life.wind.level : 0;
    set(beds.wind.gain.gain, (0.022 + 0.13 * gust) * (1 - 0.25 * night));
    set(beds.wind.filter.frequency, 380 + 560 * gust);

    // L'eau : plus il y en a qui coule, plus on l'entend (les cascades surtout).
    let flow = 0;
    for (const s of g.streams) {
      const wet = s.head - s.tail;
      if (wet > 0.01) flow += wet * (s.def.parts.some((p) => p.fall) ? 1 : 0.5);
    }
    set(beds.water.gain.gain, 0.06 * Math.min(1.4, flow), 0.5);

    // La porte de pierre gronde tant qu'elle bouge.
    const doors = g.doors.reduce((sum, d) => sum + d.open, 0);
    set(beds.rumble.gain.gain, Math.abs(doors - seen.doors) > 1e-5 ? 0.5 : 0, 0.15);
    seen.doors = doors;

    // L'accord de fond : sombre dans l'ombre, il s'éclaire avec le jour, puis avec le dégel.
    set(beds.night.gain.gain, g.started ? 0.05 : 0.035, 1);
    set(beds.day.gain.gain, 0.03 * g.light.intensity, 1.2);
    set(beds.thaw.gain.gain, 0.022 * g.temple.glow, 1.5);
    set(beds.shimmer.gain.gain, g.temple.lit ? 0 : 0.03 * g.temple.charge, 0.1);

    // La glace qui fond craque et goutte.
    if (g.ices.some((ice) => ice.heating && !ice.def.thaws)) {
      seen.melt += dt * 7;
      while (seen.melt > 1) {
        seen.melt -= 1 + Math.random();
        puff({ freq: 3600, dur: 0.03, gain: 0.012 + Math.random() * 0.03, type: 'highpass' });
        if (Math.random() < 0.3) tone({ f0: 1900, f1: 950, dur: 0.06, gain: 0.014 });
      }
    }
    // La roue à eau : un petit coup de bois à chaque quart de tour.
    for (const w of g.wheels) {
      const turn = Math.floor(w.angle / (Math.PI / 2));
      if (seen.wheels.has(w) && seen.wheels.get(w) !== turn && w.speed > 0.4) tone({ f0: 190, f1: 120, dur: 0.07, gain: 0.03, type: 'triangle' });
      seen.wheels.set(w, turn);
    }
    // Un miroir qui attrape la lumière, un cristal qui s'éveille : un tintement.
    for (const m of g.mirrors) {
      if (m.free && m.lit && seen.mirrors.get(m) === false && fresh('ting', 0.4)) bell(1760, 0.028, 0, 0.8);
      seen.mirrors.set(m, m.free && m.lit);
    }
    for (const c of g.crystals) {
      if (c.lit && seen.crystals.get(c) === false && !g.temple.lit && fresh('gem', 0.4)) bell(1318.5, 0.045);
      seen.crystals.set(c, c.lit);
    }
  }

  /** Volume en sortie, entre 0 et 1 (sert aux essais automatiques). */
  function level() {
    if (!analyser) return 0;
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    return data.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  }

  return {
    unlock,
    update,
    event,
    setMuted,
    level,
    get muted() {
      return muted;
    },
    get running() {
      return !!ctx && ctx.state === 'running';
    },
  };
}
