// Progression du joueur : la liste des niveaux terminés, gardée sur l'appareil.
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
