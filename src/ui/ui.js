// Interface : écran titre, choix du chapitre et du niveau, menu de la partie
// (objectifs et médailles), réglages, indice en bas d'écran, carte « souvenir ».
// Tout est en HTML/CSS par-dessus le canvas (voir index.html et style.css).

const $ = (id) => document.getElementById(id);

const MEDAL_NAMES = { cuivre: 'Médaille de cuivre', argent: 'Médaille d’argent', or: 'Médaille d’or' };

/** Une pastille de médaille : pleine si elle est gagnée. */
function pip(medal, on) {
  const s = document.createElement('span');
  s.className = `pip ${medal}${on ? ' on' : ''}`;
  return s;
}

/** Les trois pastilles d'un niveau. goals : [{ medal, done }]. */
function pips(goals) {
  const box = document.createElement('span');
  box.className = 'pips';
  for (const g of goals) box.append(pip(g.medal, g.done));
  return box;
}

/** « 4/30 » précédé d'une pastille d'or : les médailles d'un chapitre. */
function medalCount(won, total) {
  const box = document.createElement('span');
  box.className = 'pips';
  box.append(pip('or', won > 0), `${won}/${total}`);
  return box;
}

/** Fabrique une ligne de liste : numéro, nom (et sous-titre), marque à droite. */
function row({ num, name, sub, mark, extra, done, disabled, onClick }) {
  const b = document.createElement('button');
  if (done) b.className = 'done';
  b.disabled = !!disabled;
  const n = document.createElement('span');
  n.className = 'num';
  n.textContent = num;
  const t = document.createElement('span');
  t.className = 'name';
  t.textContent = name;
  if (sub) {
    const s = document.createElement('small');
    s.textContent = sub;
    t.append(s);
  }
  const m = document.createElement('span');
  m.className = 'mark';
  if (extra) m.append(extra);
  m.append(mark);
  b.append(n, t, m);
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

/**
 * @param chapters   les chapitres du jeu (voir levels/index.js)
 * @param perChapter nombre de niveaux qu'aura chaque chapitre
 * @param isDone     (id) => vrai si ce niveau est terminé
 * @param goalsOf    (level) => ses objectifs [{ text, medal, done }]
 * @param settings   les réglages du joueur (modifiés ici, voir ui/settings.js)
 * @param sound      { muted, setMuted(v), setVolume(v) }
 * @param onSettings () => les réglages ont changé (à enregistrer)
 * @param onReset    () => effacer la progression
 * @param onSelect   (level) => lance ce niveau
 */
export function createUI({ chapters, perChapter, isDone, goalsOf, settings, sound, version, onSettings, onReset, onRestart, onSelect, onNext }) {
  const title = $('title');
  const hud = $('hud');
  const hint = $('hint');
  const toast = $('toast');
  const memory = $('memory');
  const chapterMenu = $('chapters');
  const levelMenu = $('levels');
  const pauseMenu = $('pause');
  const settingsMenu = $('settings');
  let currentHint = null;
  let memoryShown = false;
  let currentGame = null;
  let playing = false; // devient vrai quand un premier niveau a été lancé
  let settingsBack = null; // l'écran d'où l'on a ouvert les réglages
  let toastTimer = 0;
  let medalKey = '';

  const hide = (el) => el.classList.add('hidden');
  const show = (el) => el.classList.remove('hidden');
  const hideMenus = () => [chapterMenu, levelMenu, pauseMenu, settingsMenu].forEach(hide);

  /** À appeler quand un niveau démarre (ou redémarre). */
  function reset() {
    hide(memory);
    hideMenus();
    memoryShown = false;
    currentHint = null;
    hint.classList.remove('visible');
    toast.classList.remove('visible');
  }

  // ── Choix du chapitre ──

  function openChapters() {
    const list = $('chapter-list');
    list.textContent = '';
    let won = 0;
    let total = 0;
    for (const chapter of chapters) {
      const done = chapter.levels.filter((l) => isDone(l.id)).length;
      const open = chapter.levels.length > 0;
      const goals = chapter.levels.flatMap(goalsOf);
      const medals = goals.filter((g) => g.done).length;
      won += medals;
      total += goals.length;
      list.append(
        row({
          num: chapter.number,
          name: chapter.title,
          sub: chapter.place,
          mark: open ? `${done}/${perChapter}` : 'bientôt',
          extra: open && goals.length ? medalCount(medals, goals.length) : null,
          done: open && done === perChapter,
          disabled: !open,
          onClick: () => openLevels(chapter),
        }),
      );
    }
    $('chapters-medals').textContent = total ? `${won} médailles sur ${total}` : '';
    $('close-chapters').hidden = !playing; // au tout début, il faut choisir
    hideMenus();
    show(chapterMenu);
  }

  // ── Choix du niveau, dans un chapitre ──

  function openLevels(chapter) {
    $('levels-chapter').textContent = `Chapitre ${chapter.number} · ${chapter.title}`;
    $('levels-place').textContent = chapter.place;
    const list = $('level-list');
    list.textContent = '';
    for (const level of chapter.levels) {
      list.append(
        row({
          num: level.number,
          name: level.title,
          extra: pips(goalsOf(level)),
          mark: isDone(level.id) ? '✓' : '',
          done: isDone(level.id),
          onClick: () => {
            reset();
            hide(title);
            show(hud);
            playing = true;
            onSelect(level);
          },
        }),
      );
    }
    // Les niveaux déjà écrits mais pas encore construits
    chapter.soon.forEach((name, i) => {
      list.append(row({ num: String(chapter.levels.length + i + 1), name, mark: 'bientôt', disabled: true }));
    });
    $('close-levels').hidden = !playing;
    hideMenus();
    show(levelMenu);
  }

  const chapterOf = (level) => chapters.find((c) => c.levels.includes(level)) || chapters[0];

  // ── Le menu de la partie : les objectifs du niveau et leurs médailles ──

  function fillGoals() {
    const level = currentGame.level;
    const goals = currentGame.goals || [];
    $('pause-level').textContent = `${level.number} · ${level.title}`;
    const list = $('goal-list');
    list.textContent = '';
    for (const g of goals) {
      const line = document.createElement('div');
      line.className = `goal${g.done ? ' done' : ''}`;
      const text = document.createElement('span');
      text.className = 'goal-text';
      text.textContent = g.def.text;
      const small = document.createElement('small');
      small.textContent = g.done ? `${MEDAL_NAMES[g.medal]} gagnée` : MEDAL_NAMES[g.medal];
      text.append(small);
      line.append(pip(g.medal, g.done), text);
      list.append(line);
    }
    const left = goals.filter((g) => !g.done).length;
    $('goal-note').textContent = !goals.length
      ? ''
      : left
        ? 'Ces objectifs sont à côté de l’énigme : ils ne servent pas à rallumer le sanctuaire.'
        : 'Les trois médailles de ce niveau sont à toi.';
  }

  function openPause() {
    fillGoals();
    hideMenus();
    show(pauseMenu);
  }

  $('open-menu').addEventListener('click', openPause);
  $('level-medals').addEventListener('click', openPause);
  $('resume').addEventListener('click', () => hide(pauseMenu));
  $('pause-levels').addEventListener('click', () => openLevels(chapterOf(currentGame.level)));
  $('pause-restart').addEventListener('click', () => {
    reset();
    onRestart();
  });

  // ── Les réglages ──

  function openSettings(back) {
    settingsBack = back;
    $('set-sound').checked = !sound.muted;
    $('set-volume').value = Math.round(settings.volume * 100);
    $('set-volume').disabled = sound.muted;
    $('set-hints').checked = settings.hints;
    $('set-toasts').checked = settings.toasts;
    $('reset').textContent = 'Effacer';
    $('reset').classList.remove('armed');
    $('reset-note').textContent = 'niveaux terminés et médailles';
    $('version').textContent = version ? `Equinox · version ${version}` : '';
    hideMenus();
    show(settingsMenu);
  }

  $('pause-settings').addEventListener('click', () => openSettings(openPause));
  $('chapters-settings').addEventListener('click', () => openSettings(openChapters));
  $('close-settings').addEventListener('click', () => (settingsBack ? settingsBack() : hide(settingsMenu)));
  $('set-sound').addEventListener('change', (e) => {
    sound.setMuted(!e.target.checked);
    $('set-volume').disabled = sound.muted;
  });
  $('set-volume').addEventListener('input', (e) => {
    settings.volume = Number(e.target.value) / 100;
    sound.setVolume(settings.volume);
    onSettings();
  });
  $('set-hints').addEventListener('change', (e) => {
    settings.hints = e.target.checked;
    onSettings();
  });
  $('set-toasts').addEventListener('change', (e) => {
    settings.toasts = e.target.checked;
    onSettings();
  });
  // Effacer la progression : il faut toucher deux fois, pour ne pas le faire par mégarde.
  $('reset').addEventListener('click', (e) => {
    const b = e.target;
    if (!b.classList.contains('armed')) {
      b.classList.add('armed');
      b.textContent = 'Confirmer';
      $('reset-note').textContent = 'toucher encore pour tout effacer';
      return;
    }
    b.classList.remove('armed');
    b.textContent = 'Effacé';
    $('reset-note').textContent = 'la progression est remise à zéro';
    onReset();
  });

  $('start').addEventListener('click', () => {
    hide(title);
    openChapters();
  });
  $('back-chapters').addEventListener('click', openChapters);
  $('close-chapters').addEventListener('click', () => hide(chapterMenu));
  $('close-levels').addEventListener('click', () => hide(levelMenu));

  $('restart').addEventListener('click', () => {
    reset();
    onRestart();
  });
  $('replay').addEventListener('click', () => {
    reset();
    onRestart();
  });
  $('next').addEventListener('click', () => {
    reset();
    onNext();
  });
  $('contemplate').addEventListener('click', () => hide(memory));

  /** Les trois pastilles du haut de l'écran (redessinées seulement si elles changent). */
  function showLevelMedals(g) {
    const goals = g.goals || [];
    const key = goals.map((q) => (q.done ? 1 : 0)).join('') + '|' + g.level.id;
    if (key === medalKey) return;
    medalKey = key;
    const box = $('level-medals');
    box.textContent = '';
    for (const q of goals) box.append(pip(q.medal, q.done));
    box.hidden = !goals.length;
  }

  /** Annonce une médaille qui vient d'être gagnée. */
  function medal(goal) {
    if (!pauseMenu.classList.contains('hidden')) fillGoals();
    if (!settings.toasts) return;
    $('toast-pip').className = `pip ${goal.medal} on`;
    $('toast-medal').textContent = MEDAL_NAMES[goal.medal];
    $('toast-text').textContent = goal.def.title;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 4200);
  }

  /** Appelée à chaque image : met à jour l'indice et affiche le souvenir. */
  function update(g, hasNext) {
    // Nouveau niveau (ou niveau relancé) : on repart d'une interface propre.
    if (g !== currentGame) {
      const first = currentGame === null;
      currentGame = g;
      if (!first) reset();
    }
    $('level-name').textContent = `${g.level.number} · ${g.level.title}`;
    showLevelMedals(g);

    const text = g.started && settings.hints ? g.level.hint(g) : '';
    if (text !== currentHint) {
      currentHint = text;
      hint.classList.remove('visible');
      // Petit fondu : on change le texte une fois l'ancien disparu.
      setTimeout(() => {
        if (currentHint !== text) return;
        hint.textContent = text;
        if (text) hint.classList.add('visible');
      }, 350);
    }

    // La carte du souvenir attend que l'onde du réveil ait traversé l'écran.
    if (g.temple.lit && g.win.t > g.wave.end + 1.2 && !memoryShown) {
      memoryShown = true;
      const m = g.level.memory;
      $('memory-number').textContent = `Souvenir ${m.number}`;
      $('memory-title').textContent = m.title;
      $('memory-text').textContent = m.text;
      $('memory-tech').textContent = m.tech;
      $('next').hidden = !hasNext;
      $('replay').hidden = hasNext;
      $('memory-end').hidden = hasNext;
      // Les médailles du niveau, pour donner envie d'y revenir
      const goals = g.goals || [];
      const line = $('memory-medals');
      line.textContent = '';
      if (goals.length) {
        const won = goals.filter((q) => q.done).length;
        const label = document.createElement('span');
        label.textContent = won === goals.length ? 'Toutes les médailles' : `${won} médaille${won > 1 ? 's' : ''} sur ${goals.length}`;
        line.append(pips(goals), label);
      }
      show(memory);
    }
  }

  /**
   * Appelée à chaque appui sur le jeu. L'indice est écrit par-dessus les
   * bulles du bas de l'écran : si le doigt se pose dessus, il s'efface (il
   * reviendra quand il aura autre chose à dire).
   */
  function touch(x, y) {
    if (!hint.classList.contains('visible')) return;
    const r = hint.getBoundingClientRect();
    if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 12 && y <= r.bottom + 12) hint.classList.remove('visible');
  }

  return { update, touch, medal };
}
