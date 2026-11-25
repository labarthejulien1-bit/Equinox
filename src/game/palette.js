// Les couleurs du jeu.
//
// Chaque élément a DEUX couleurs : une dans la lumière (lit) et une dans
// l'ombre (shadow). C'est ce qui crée la frontière nette ombre / lumière.
// Chaque palette existe en version « ère glaciaire » (ICE) et « monde dégelé »
// (THAW) ; le jeu glisse de l'une à l'autre quand un temple se rallume.

const ICE = {
  lit: {
    skyTop: '#86bbe3',
    skyMid: '#cde6f2',
    skyBot: '#fff0d6',
    far1: '#dcebf5',
    far2: '#c3daeb',
    far3: '#a9c7df',
    rock: '#b58a70',
    rockRim: '#e6c298',
    snow: '#fffdf6',
    ice: '#d9f7ff',
    iceLine: '#ffffff',
    cloud: '#ffffff',
    water: '#8fe3f7',
    riverIce: '#cfeefa',
    caveBack: '#9a785c',
    wood: '#b9773f',
    wall: '#dba36c',
    roof: '#a2523a',
    cloak: '#f0694a',
    face: '#ffe3c2',
    eye: '#3a2a35',
    stone: '#eedcae',
    stoneDark: '#c9b384',
    bronze: '#d9aa52',
    pine: '#4d8f7c',
    pineSnow: '#fffdf6',
  },
  shadow: {
    skyTop: '#0f1733',
    skyMid: '#1c2a52',
    skyBot: '#324578',
    far1: '#394c7f',
    far2: '#2e406f',
    far3: '#253560',
    rock: '#161e39',
    rockRim: '#1d2848',
    snow: '#5a77b0',
    ice: '#4a88c6',
    iceLine: '#86bbea',
    cloud: '#7b91be',
    water: '#2f60a8',
    riverIce: '#4669a6',
    caveBack: '#0c1226',
    wood: '#2a2338',
    wall: '#372d46',
    roof: '#231b30',
    cloak: '#6b3450',
    face: '#9a8097',
    eye: '#f3e9ff',
    stone: '#353f66',
    stoneDark: '#2a3357',
    bronze: '#5c5148',
    pine: '#1a3046',
    pineSnow: '#5a77b0',
  },
};

const THAW = {
  lit: {
    skyTop: '#74bdea',
    skyMid: '#d6efe2',
    skyBot: '#ffe7b0',
    far1: '#d3ebd6',
    far2: '#b3d8b6',
    far3: '#92c498',
    snow: '#b7dd6c',
    riverIce: '#8fe3f7',
    pine: '#5aa85e',
    pineSnow: '#8fcf6a',
    rockRim: '#ecc88c',
  },
  shadow: {
    far1: '#34557a',
    far2: '#2a4a68',
    far3: '#213f57',
    snow: '#3a6b60',
    riverIce: '#2f60a8',
    pine: '#1c3c38',
    pineSnow: '#2f5d50',
  },
};

// Teintes d'aube et de crépuscule : la lumière est rose et dorée quand le
// soleil est bas, puis blanchit en montant. Seule la palette de lumière change.
const DAWN = {
  skyTop: '#7f93d8',
  skyMid: '#f5bfb2',
  skyBot: '#ffcb8a',
  far1: '#f5d2cf',
  far2: '#e4b8c6',
  far3: '#c99fbf',
  rock: '#b87f6a',
  rockRim: '#f3b48a',
  snow: '#ffe3cf',
  ice: '#f1e3f3',
  cloud: '#ffdfd4',
  water: '#b7cbf0',
  riverIce: '#ecd8ec',
  caveBack: '#a8755a',
  stone: '#f7d7a4',
  pineSnow: '#ffe3cf',
};
// Ces couleurs changent avec le dégel (neige → herbe…) : on les teinte moins
// à l'aube une fois le monde dégelé, pour ne pas reblanchir l'herbe.
const THAWED = ['snow', 'pineSnow', 'far1', 'far2', 'far3', 'riverIce'];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mélange deux couleurs '#rrggbb' (t = 0 → a, t = 1 → b). */
export function mix(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

let cacheKey = '';
let cache = null;

/**
 * Renvoie { lit, shadow } pour un degré de dégel (thaw) et une teinte d'aube
 * (dawn), tous deux entre 0 et 1.
 */
export function getPalettes(thaw, dawn = 0) {
  const t = Math.round(thaw * 200) / 200;
  const d = Math.round(dawn * 50) / 50;
  const key = t + '|' + d;
  if (key === cacheKey) return cache;
  const build = (mode) => {
    const out = {};
    for (const name in ICE[mode]) {
      const to = THAW[mode][name];
      let color = to ? mix(ICE[mode][name], to, t) : ICE[mode][name];
      if (mode === 'lit' && DAWN[name]) {
        const k = THAWED.includes(name) ? d * (1 - 0.65 * t) : d;
        color = mix(color, DAWN[name], k * 0.85);
      }
      out[name] = color;
    }
    return out;
  };
  cacheKey = key;
  cache = { lit: build('lit'), shadow: build('shadow') };
  return cache;
}
