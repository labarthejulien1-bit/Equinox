// Les réglages du joueur, gardés sur l'appareil.
// (Le son coupé ou non est retenu à part, par engine/audio.js.)

const KEY = 'equinox.settings';

const DEFAULTS = {
  volume: 1, // de 0 à 1
  hints: true, // les phrases d'aide en bas de l'écran
  toasts: true, // l'annonce d'une médaille gagnée
};

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // tant pis : les réglages ne seront pas gardés cette fois
  }
}
