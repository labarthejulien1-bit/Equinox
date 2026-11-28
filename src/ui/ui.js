// Interface : l'accueil, « Le voyage » (chapitres, histoire et niveaux), les
// volets de pause et de fin de niveau, les réglages, l'indice en bas d'écran,
// les encarts du film. Tout est en HTML/CSS par-dessus le canvas (voir
// index.html et style.css).
//
// L'idée qui guide ces écrans : le joueur doit pouvoir jouer en un toucher.
// L'accueil lui propose toujours la prochaine chose à faire ; le reste est à
// portée de pouce, en bas de l'écran.

const $ = (id) => document.getElementById(id);

const MEDAL_NAMES = { cuivre: 'Médaille de cuivre', argent: 'Médaille d’argent', or: 'Médaille d’or' };

// Trois petits dessins pour les vignettes et les bannières
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 L10 17.5 L19 7"/></svg>';
const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5 L19 12 L8 19z" fill="currentColor"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

/** Fabrique un élément : el('span', 'num', '4'). */
function el(tag, className = '', text = '') {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** Une pastille de médaille : pleine si elle est gagnée. */
function pip(medal, on) {
  return el('span', `pip ${medal}${on ? ' on' : ''}`);
}

/** Les trois pastilles d'un niveau. goals : [{ medal, done }]. */
function pips(goals) {
  const box = el('span', 'pips');
  for (const g of goals) box.append(pip(g.medal, g.done));
  return box;
}

/** « 1 niveau », « 3 niveaux », « 2 médailles ». */
const plural = (n, word) => `${n} ${word}${n > 1 ? (word.endsWith('au') ? 'x' : 's') : ''}`;

/**
 * @param chapters   les chapitres du jeu (voir levels/index.js)
 * @param perChapter nombre de niveaux qu'aura chaque chapitre
 * @param isDone     (id) => vrai si ce niveau est terminé
 * @param goalsOf    (level) => ses objectifs [{ def, medal, done }]
 * @param storySeen  (id) => vrai si cette histoire a été vue en entier
 * @param thumbs     les vignettes (voir ui/thumbs.js)
 * @param settings   les réglages du joueur (modifiés ici, voir ui/settings.js)
 * @param sound      { muted, setMuted(v), setVolume(v) }
 * @param onSettings () => les réglages ont changé (à enregistrer)
 * @param onReset    () => effacer la progression
 * @param onRestart  () => relancer le niveau en cours
 * @param onSelect   (level) => lance ce niveau
 * @param onNext     () => lance le niveau suivant
 * @param onStory    (chapter) => lance le film de son histoire
 */
export function createUI({ chapters, perChapter, isDone, goalsOf, storySeen, thumbs, settings, sound, version, onSettings, onReset, onRestart, onSelect, onNext, onStory }) {
  const title = $('title');
  const hud = $('hud');
  const hint = $('hint');
  const toast = $('toast');
  const memory = $('memory');
  const voyage = $('voyage');
  const pauseMenu = $('pause');
  const settingsMenu = $('settings');
  const veil = $('film-veil'); // posé sur le dessin pendant un film : aucun toucher ne passe
  let filmCaption = null;
  let currentHint = null;
  let memoryShown = false;
  let currentGame = null;
  let playing = false; // devient vrai quand un premier niveau a été lancé
  let settingsBack = null; // l'écran d'où l'on a ouvert les réglages
  let toastTimer = 0;
  let medalKey = '';
  let tab = null; // le chapitre montré dans « Le voyage »
  let homeAction = () => {}; // ce que fait le grand bouton de l'accueil

  const hide = (e) => e.classList.add('hidden');
  const show = (e) => e.classList.remove('hidden');
  const hideMenus = () => [voyage, pauseMenu, settingsMenu].forEach(hide);

  /** À appeler quand un niveau démarre (ou redémarre). */
  function reset() {
    hide(memory);
    hideMenus();
    memoryShown = false;
    currentHint = null;
    hint.classList.remove('visible');
    toast.classList.remove('visible');
  }

  /** Lance un niveau depuis un menu. */
  function start(level) {
    reset();
    hide(title);
    show(hud);
    playing = true;
    onSelect(level);
  }

  // ── Où en est le joueur ──

  const built = chapters.filter((c) => c.levels.length);
  /** Le chapitre en cours : le premier qui n'est pas terminé (ou le dernier construit). */
  const currentChapter = () => built.find((c) => c.levels.some((l) => !isDone(l.id))) || built[built.length - 1];
  /** Vrai s'il faut encore regarder l'histoire de ce chapitre pour ouvrir ses niveaux. */
  const locked = (chapter) => !!chapter.story && !storySeen(chapter.story.id);
  /** Le prochain niveau à jouer dans ce chapitre (rien s'ils sont tous terminés). */
  const nextLevel = (chapter) => chapter.levels.find((l) => !isDone(l.id)) || null;
  const chapterOf = (level) => chapters.find((c) => c.levels.includes(level)) || built[0];
  const medalsWon = (chapter) => chapter.levels.flatMap(goalsOf).filter((g) => g.done).length;

  /** Lance le film de l'histoire d'un chapitre. */
  function watch(chapter) {
    reset();
    hide(title);
    hide(hud);
    show(veil);
    tab = chapter;
    onStory(chapter);
  }

  // ── L'accueil : la prochaine chose à faire, en un seul grand bouton ──

  function showHome() {
    const chapter = currentChapter();
    const next = nextLevel(chapter);
    const done = chapter.levels.filter((l) => isDone(l.id)).length;
    const line = $('home-line');
    line.textContent = '';
    $('home-chapter').textContent = `Chapitre ${chapter.number} · ${chapter.title}`;
    if (locked(chapter)) {
      // D'abord l'histoire du chapitre
      $('home-title').textContent = chapter.story.title;
      line.append(`L’histoire · ${chapter.story.seconds} secondes`);
      $('start').textContent = '▶  Regarder l’histoire';
      homeAction = () => watch(chapter);
    } else if (next) {
      $('home-title').textContent = `${next.number} · ${next.title}`;
      line.append(pips(goalsOf(next)), `${plural(done, 'niveau')} sur ${perChapter} · ${plural(medalsWon(chapter), 'médaille')}`);
      $('start').textContent = done ? 'Continuer' : 'Commencer';
      homeAction = () => start(next);
    } else {
      // Tout ce qui existe est terminé
      $('home-title').textContent = 'La suite du voyage arrive bientôt';
      line.append(`${plural(medalsWon(chapter), 'médaille')} sur ${chapter.levels.flatMap(goalsOf).length}`);
      $('start').textContent = 'Le voyage';
      homeAction = () => openVoyage();
    }
    hideMenus();
    show(title);
  }

  $('start').addEventListener('click', () => homeAction());
  $('home-voyage').addEventListener('click', () => openVoyage());
  $('home-settings').addEventListener('click', () => openSettings(showHome));

  // ── Le voyage : les chapitres en haut, puis une page par chapitre (son
  // histoire, ses dix niveaux). On passe d'une page à l'autre en glissant le
  // doigt, ou en touchant le rond d'un chapitre. ──

  const pages = $('voyage-pages');
  const isBuilt = (chapter) => chapter.levels.length > 0; // (les autres chapitres restent à construire)

  /** La bannière de l'histoire d'un chapitre. */
  function storyBanner(chapter) {
    const b = el('button', 'story');
    const text = el('span', 'story-text');
    const disc = el('span', 'disc');
    disc.innerHTML = ICON_PLAY;
    b.append(text, disc);
    text.append(el('small', '', 'L’histoire'));
    if (!chapter.story) {
      // Pas encore écrite : la bannière garde sa place, grisée
      b.classList.add('soon');
      b.disabled = true;
      text.append(el('b', '', 'Bientôt'), el('span', '', 'Cette histoire reste à écrire'));
      return b;
    }
    const todo = locked(chapter);
    b.classList.toggle('todo', todo);
    text.append(el('b', '', chapter.story.title), el('span', '', todo ? 'À regarder pour ouvrir le chapitre' : 'Vue · toucher pour la revoir'));
    b.addEventListener('click', () => watch(chapter));
    thumbs.story(b, chapter.story);
    return b;
  }

  /** La vignette d'un niveau. fresh : il vient de s'ouvrir, il se fait remarquer. */
  function levelTile(chapter, level, fresh) {
    const isLocked = locked(chapter);
    const finished = isDone(level.id);
    const next = !isLocked && level === nextLevel(chapter);
    const b = el('button', `tile${finished ? ' done' : ''}${next ? ' next' : ''}${next && fresh ? ' fresh' : ''}`);
    b.disabled = isLocked;
    const foot = el('span', 'foot');
    foot.append(el('span', 'name', level.title), pips(isLocked ? goalsOf(level).map((g) => ({ ...g, done: false })) : goalsOf(level)));
    b.append(el('span', 'num', level.number), foot);
    if (finished || isLocked) {
      const badge = el('span', 'badge');
      badge.innerHTML = isLocked ? ICON_LOCK : ICON_CHECK;
      b.append(badge);
    }
    b.addEventListener('click', () => start(level));
    thumbs.level(b, level);
    return b;
  }

  /** Une vignette grisée, pour un niveau qui reste à construire. */
  function soonTile(number) {
    const b = el('button', 'tile soon');
    b.disabled = true;
    const foot = el('span', 'foot');
    foot.append(el('span', 'name', 'Bientôt'), pips(['cuivre', 'argent', 'or'].map((medal) => ({ medal, done: false }))));
    b.append(el('span', 'num', String(number)), foot);
    return b;
  }

  /** Le titre et la ligne du chapitre montré, et son rond allumé. */
  function showChapter(chapter) {
    tab = chapter;
    [...$('chapter-tabs').children].forEach((b, i) => b.classList.toggle('on', chapters[i] === chapter));
    $('voyage-title').textContent = chapter.title;
    const done = chapter.levels.filter((l) => isDone(l.id)).length;
    $('voyage-sub').textContent = !isBuilt(chapter)
      ? `${chapter.place} · bientôt`
      : locked(chapter)
        ? `${chapter.place} · ${plural(chapter.levels.length, 'niveau')}`
        : `${chapter.place} · ${done}/${perChapter} · ${plural(medalsWon(chapter), 'médaille')} sur ${chapter.levels.flatMap(goalsOf).length}`;
  }

  /** Amène la page d'un chapitre à l'écran (smooth : en glissant, sinon d'un coup). */
  function goToChapter(chapter, smooth) {
    pages.scrollTo({ left: chapters.indexOf(chapter) * pages.clientWidth, behavior: smooth ? 'smooth' : 'instant' });
    if (!smooth) showChapter(chapter);
  }

  // Le doigt fait glisser les pages : le titre et les ronds suivent celle qui est à l'écran.
  pages.addEventListener('scroll', () => {
    const chapter = chapters[Math.round(pages.scrollLeft / Math.max(1, pages.clientWidth))];
    if (chapter && chapter !== tab) showChapter(chapter);
  });

  // Le navigateur ne change de page que si le doigt a traversé la moitié de
  // l'écran. C'est trop demander : un geste court et franc doit suffire. On
  // regarde donc où le doigt se pose et où il se relève.
  const SWIPE = 36; // pixels : en dessous, ce n'est pas un glissement
  let swipeFrom = null;
  pages.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      swipeFrom = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, page: Math.round(pages.scrollLeft / Math.max(1, pages.clientWidth)) } : null;
    },
    { passive: true },
  );
  pages.addEventListener(
    'touchend',
    (e) => {
      if (!swipeFrom) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - swipeFrom.x;
      const dy = t.clientY - swipeFrom.y;
      const from = swipeFrom.page;
      swipeFrom = null;
      // (un geste surtout vertical fait défiler la page : on ne s'en mêle pas)
      if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const target = chapters[from + (dx < 0 ? 1 : -1)];
      if (target) goToChapter(target, true);
    },
    { passive: true },
  );

  /** fresh : l'histoire vient d'être vue, le premier niveau à jouer se fait remarquer. */
  function openVoyage(chapter = null, fresh = false) {
    const first = chapter || (currentGame && playing ? chapterOf(currentGame.level) : currentChapter());

    // Les ronds des chapitres (en pointillés : ceux qui restent à construire)
    const tabs = $('chapter-tabs');
    tabs.textContent = '';
    for (const c of chapters) {
      const b = el('button', isBuilt(c) ? '' : 'soon', c.number);
      b.setAttribute('aria-label', `Chapitre ${c.number} : ${c.title}`);
      b.addEventListener('click', () => goToChapter(c, true));
      tabs.append(b);
    }

    // Une page par chapitre
    pages.textContent = '';
    for (const c of chapters) {
      const body = el('div', 'page-body');
      const grid = el('div', 'grid');
      if (isBuilt(c)) for (const level of c.levels) grid.append(levelTile(c, level, fresh && c === first));
      else for (let n = 1; n <= perChapter; n++) grid.append(soonTile(n));
      body.append(storyBanner(c), grid);
      const page = el('section', 'page');
      page.append(body);
      pages.append(page);
    }

    hide(title);
    hideMenus();
    show(voyage);
    goToChapter(first, false);
  }

  // « Retour » : au jeu si une partie est en cours, sinon à l'accueil
  $('close-voyage').addEventListener('click', () => (playing ? hide(voyage) : showHome()));

  // ── Le film d'une histoire ──

  /** À chaque image du film : l'encart de texte et la barre d'avancement (p : filmState). */
  function film(p) {
    if (p.caption !== filmCaption && p.caption) {
      // Une phrase nouvelle : on la pose à sa place sur l'image.
      const text = $('film-text');
      text.textContent = p.caption;
      text.style.left = `${p.captionAt[0]}%`;
      text.style.top = `${p.captionAt[1]}%`;
    }
    filmCaption = p.caption;
    $('film-text').style.opacity = p.captionAlpha.toFixed(2);
    $('film-progress').style.width = `${(p.progress * 100).toFixed(2)}%`;
  }

  /** Le film vient de finir : on revient au voyage, les niveaux du chapitre sont ouverts. */
  function storyEnded() {
    hide(veil);
    if (playing) show(hud);
    openVoyage(tab, true);
  }

  // ── La pause : les objectifs du niveau et leurs médailles, puis cinq actions ──

  function fillGoals() {
    const level = currentGame.level;
    const goals = currentGame.goals || [];
    $('pause-level').textContent = `${level.number} · ${level.title}`;
    const list = $('goal-list');
    list.textContent = '';
    for (const g of goals) {
      const line = el('div', `goal${g.done ? ' done' : ''}`);
      const text = el('span', 'goal-text', g.def.text);
      text.append(el('small', '', g.done ? `${MEDAL_NAMES[g.medal]} gagnée` : MEDAL_NAMES[g.medal]));
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

  function showSound() {
    $('pause-sound').classList.toggle('off', sound.muted);
    $('pause-sound-label').textContent = sound.muted ? 'Muet' : 'Son';
  }

  function openPause() {
    fillGoals();
    showSound();
    hideMenus();
    show(pauseMenu);
  }

  $('open-menu').addEventListener('click', openPause);
  $('level-medals').addEventListener('click', openPause);
  $('resume').addEventListener('click', () => hide(pauseMenu));
  // (un toucher à côté du volet le referme aussi)
  pauseMenu.addEventListener('click', (e) => {
    if (e.target === pauseMenu) hide(pauseMenu);
  });
  $('pause-levels').addEventListener('click', () => openVoyage());
  $('pause-restart').addEventListener('click', () => {
    reset();
    onRestart();
  });
  $('pause-sound').addEventListener('click', () => {
    sound.setMuted(!sound.muted);
    showSound();
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
    $('reset-note').textContent = 'histoires vues, niveaux terminés et médailles';
    $('version').textContent = version ? `Equinox · version ${version}` : '';
    hide(title);
    hideMenus();
    show(settingsMenu);
  }

  $('pause-settings').addEventListener('click', () => openSettings(openPause));
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

  // ── La fin d'un niveau : le souvenir, et le niveau suivant déjà prêt ──

  $('replay').addEventListener('click', () => {
    reset();
    onRestart();
  });
  $('next').addEventListener('click', () => {
    reset();
    onNext();
  });
  $('contemplate').addEventListener('click', () => hide(memory));
  $('memory-voyage').addEventListener('click', () => {
    hide(memory);
    openVoyage();
  });

  function showMemory(g, next) {
    const m = g.level.memory;
    $('memory-number').textContent = `Souvenir ${m.number}`;
    $('memory-title').textContent = m.title;
    $('memory-text').textContent = m.text;
    $('memory-tech').textContent = m.tech;
    // Les médailles du niveau, pour donner envie d'y revenir
    const goals = g.goals || [];
    const line = $('memory-medals');
    line.textContent = '';
    if (goals.length) {
      const won = goals.filter((q) => q.done).length;
      line.append(pips(goals), el('span', '', won === goals.length ? 'Toutes les médailles' : `${plural(won, 'médaille')} sur ${goals.length}`));
    }
    // Le niveau suivant, avec son image
    $('next').hidden = !next;
    $('memory-end').hidden = !!next;
    $('memory-voyage').hidden = !!next;
    if (next) {
      $('next-title').textContent = `${next.number} · ${next.title}`;
      thumbs.level($('next-thumb'), next);
    }
    show(memory);
  }

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

  /**
   * Appelée à chaque image : met à jour l'indice et affiche le souvenir.
   * next : le niveau qui suit celui-ci (rien si c'est le dernier).
   */
  function update(g, next) {
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

    // Le souvenir attend que l'onde du réveil ait traversé l'écran.
    if (g.temple.lit && g.win.t > g.wave.end + 1.2 && !memoryShown) {
      memoryShown = true;
      showMemory(g, next);
    }
  }

  /**
   * Le joueur vient de poser le doigt en (x, y), en pixels de la page. L'indice
   * du bas de l'écran recouvre parfois ce qu'il veut attraper, à commencer par les
   * bulles du bas de l'écran : si le doigt se pose dessus, il s'efface (il
   * reviendra quand il aura autre chose à dire).
   */
  function touch(x, y) {
    if (!hint.classList.contains('visible')) return;
    const r = hint.getBoundingClientRect();
    if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 12 && y <= r.bottom + 12) hint.classList.remove('visible');
  }

  showHome();

  return { update, touch, medal, film, storyEnded, showHome };
}
