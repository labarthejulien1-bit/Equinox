// Progression du joueur : la liste des niveaux terminés et les médailles
// gagnées, gardées sur l'appareil.
// Le stockage peut être indisponible (navigation privée…) : le jeu doit
// fonctionner quand même, d'où les try/catch.

const KEY = 'equinox.done';

export function loadDone() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function markDone(id) {
  const done = loadDone();
  if (done.includes(id)) return;
  done.push(id);
  try {
    localStorage.setItem(KEY, JSON.stringify(done));
  } catch {
    // tant pis : la progression ne sera pas gardée cette fois
  }
}

// ── Les médailles : { idDuNiveau: [ids des objectifs atteints] } ──

const MEDALS_KEY = 'equinox.medals';

export function loadMedals() {
  try {
    const all = JSON.parse(localStorage.getItem(MEDALS_KEY) || '{}');
    return all && typeof all === 'object' && !Array.isArray(all) ? all : {};
  } catch {
    return {};
  }
}

/** Les objectifs déjà médaillés d'un niveau. */
export function medalsOf(levelId) {
  const list = loadMedals()[levelId];
  return Array.isArray(list) ? list : [];
}

export function markMedal(levelId, goalId) {
  const all = loadMedals();
  const list = Array.isArray(all[levelId]) ? all[levelId] : [];
  if (list.includes(goalId)) return;
  all[levelId] = [...list, goalId];
  try {
    localStorage.setItem(MEDALS_KEY, JSON.stringify(all));
  } catch {
    // tant pis : la médaille ne sera pas gardée cette fois
  }
}

/** Efface toute la progression (niveaux terminés et médailles). */
export function resetProgress() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(MEDALS_KEY);
  } catch {
    // rien à effacer
  }
}
