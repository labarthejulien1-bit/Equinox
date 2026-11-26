// Vérifie automatiquement que chaque niveau est juste :
//   npm run check
//
// Pour chaque niveau :
//  - aucun raccourci (le soleil seul ne peut pas allumer le temple, etc.) ;
//  - la solution prévue fonctionne de bout en bout.

import { levels } from '../src/levels/index.js';
import { createGame, update, computeLight, sunPosition } from '../src/game/game.js';
import { aimMirror } from '../src/engine/light.js';
import { rad } from '../src/engine/vec.js';

let failed = 0;
const check = (ok, label) => {
  console.log(`  ${ok ? '✔' : '✘'} ${label}`);
  if (!ok) failed++;
};

// ── Outils ────────────────────────────────────────────────────────────

const run = (g, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 30) update(g, 1 / 30);
};
const unit = (from, to) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const n = Math.hypot(dx, dy) || 1;
  return { x: dx / n, y: dy / n };
};
/** Oriente un miroir éclairé par le soleil vers une cible. */
const aimFromSun = (g, mirror, target) => {
  mirror.angle = aimMirror(mirror, unit(sunPosition(g), mirror), target);
};
/** Oriente un miroir éclairé par un autre miroir vers une cible. */
const aimFromMirror = (source, mirror, target) => {
  mirror.angle = aimMirror(mirror, unit(source, mirror), target);
};
/** Essaie toutes les positions du soleil (et du nuage) ; compte celles où test() est vrai. */
const sweepSky = (g, test) => {
  const L = g.level;
  let hits = 0;
  let total = 0;
  const clouds = [];
  if (L.cloud) for (let x = L.cloud.minX; x <= L.cloud.maxX; x += 8) clouds.push(x);
  else clouds.push(0);
  for (let a = L.sun.min; a <= L.sun.max; a += 1) {
    for (const x of clouds) {
      g.sunAngle = rad(a);
      g.cloudX = x;
      total++;
      if (test(computeLight(g), a, x)) hits++;
    }
  }
  return { hits, total };
};
/** Fait tourner un miroir sur un tour complet ; compte les angles où test() est vrai. */
const sweepMirror = (g, mirror, test) => {
  const base = mirror.angle;
  let hits = 0;
  for (let d = 0; d < 360; d += 0.5) {
    mirror.angle = rad(d);
    if (test(computeLight(g))) hits++;
  }
  mirror.angle = base;
  return hits;
};
/** De combien de degrés peut-on se tromper en visant ? */
const tolerance = (g, mirror, test) => {
  const base = mirror.angle;
  let ok = 0;
  for (let d = -15; d <= 15; d += 0.25) {
    mirror.angle = base + rad(d);
    if (test(computeLight(g))) ok += 0.25;
  }
  mirror.angle = base;
  return ok;
};
const mirrorOf = (g, id) => g.mirrors.find((m) => m.id === id);

// ── Niveau 1 ──────────────────────────────────────────────────────────

function checkLevel1(level) {
  for (const gone of [false, true]) {
    const g = createGame(level);
    g.ices[0].gone = gone;
    g.doors[0].open = 1; // cas le plus défavorable : porte ouverte
    const ice = sweepSky(g, (l) => l.sunPoly && !gone && g.ices[0].exposure > 0);
    const crystal = sweepSky(g, (l) => l.crystalLit);
    if (!gone) check(ice.hits === 0, `le soleil direct n'atteint jamais le glacier (${ice.hits}/${ice.total})`);
    check(crystal.hits === 0, `le soleil direct n'atteint jamais le cristal, glacier ${gone ? 'fondu' : 'présent'}`);
  }

  const g = createGame(level);
  const village = mirrorOf(g, 'village');
  const glacier = mirrorOf(g, 'glacier');
  const crystal = level.temple.crystal;
  run(g, 1);
  check(!village.lit, 'au départ, tout est dans l’ombre');
  g.sunAngle = rad(92);
  run(g, 0.5);
  check(!village.lit, 'soleil au zénith : le nuage garde le miroir du village dans l’ombre');
  g.cloudX = 60;
  run(g, 0.5);
  check(village.lit, 'nuage écarté : le miroir du village reçoit le soleil');
  aimFromSun(g, village, glacier);
  run(g, 1);
  check(g.ices[0].melt > 0 && !g.ices[0].gone, 'le faisceau fait fondre le glacier');
  run(g, 4);
  check(g.ices[0].gone && glacier.free, 'glacier fondu : le miroir ancien est libéré');
  run(g, 8);
  check(g.streams[0].head >= 1, 'l’eau a rejoint la vallée');
  check(g.doors[0].open >= 1, 'la roue a ouvert la porte du temple');
  check(glacier.lit, 'le miroir du glacier reçoit le faisceau du village');
  aimFromMirror(village, glacier, crystal);
  run(g, 3);
  check(g.temple.lit, 'le temple s’allume');
  run(g, 10);
  check(g.thaw > 0.9, 'le monde dégèle');
  const t1 = tolerance(g, village, () => glacier.lit);
  const t2 = tolerance(g, glacier, (l) => l.crystalLit);
  check(t1 >= 3 && t2 >= 3, `la visée reste confortable (village ${t1}°, glacier ${t2}°)`);
}

// ── Niveau 2 ──────────────────────────────────────────────────────────

function checkLevel2(level) {
  const crystal = level.temple.crystal;
  {
    // Cascade tarie : le soleil seul n'entre pas dans la grotte.
    const g = createGame(level);
    g.frosts[0].amount = 1;
    g.streams[0].head = 0;
    const r = sweepSky(g, (l) => l.crystalLit);
    check(r.hits === 0, `le soleil direct n'atteint jamais le cristal (${r.hits}/${r.total})`);
  }
  {
    // Cascade qui coule : aucun angle du miroir ne passe.
    const g = createGame(level);
    let through = 0;
    for (const a of [40, 70, 100, 130]) {
      g.sunAngle = rad(a);
      through += sweepMirror(g, g.mirrors[0], (l) => l.crystalLit);
    }
    check(through === 0, 'tant que la cascade coule, le faisceau ne passe pas');
  }
  {
    // Combien de réglages soleil/nuage gèlent la source tout en éclairant le miroir ?
    const g = createGame(level);
    let first = null;
    const r = sweepSky(g, (l, a, x) => {
      const ok = !g.frosts[0].lit && g.mirrors[0].lit;
      if (ok && !first && a >= 60 && a <= 110) first = { a, x };
      return ok;
    });
    check(r.hits > 20, `source à l'ombre + miroir au soleil : ${r.hits} réglages possibles sur ${r.total}`);

    const h = createGame(level);
    const mirror = h.mirrors[0];
    run(h, 1);
    check(h.streams[0].head >= 1 && h.frosts[0].amount === 0, 'au départ, la cascade coule');
    aimFromSun(h, mirror, crystal);
    run(h, 2);
    check(h.light.waterHits.length > 0 && h.temple.charge === 0, 'le faisceau se brise dans la cascade');
    h.sunAngle = rad(first.a);
    h.cloudX = first.x;
    run(h, 6);
    check(h.frosts[0].amount >= 1, 'à l’ombre du nuage, la source gèle');
    check(h.streams[0].head === 0, 'la cascade se tarit');
    aimFromSun(h, mirror, crystal);
    run(h, 3);
    check(h.temple.lit, 'le temple s’allume');
    const t = tolerance(h, mirror, (l) => l.crystalLit);
    check(t >= 3, `la visée reste confortable (${t}°)`);
    h.cloudX = level.cloud.minX;
    h.sunAngle = rad(100);
    run(h, 5);
    check(h.frosts[0].amount === 0 && h.streams[0].head >= 1, 'au soleil, la source dégèle et la cascade reprend');
  }
}

// ── Niveau 3 ──────────────────────────────────────────────────────────

function checkLevel3(level) {
  const crystal = level.temple.crystal;
  for (const amount of [0, 1]) {
    const g = createGame(level);
    g.frosts[0].amount = amount;
    g.basins[0].level = amount ? level.basins[0].high : level.basins[0].low;
    g.mirrors[0].y = g.basins[0].level - 16;
    const r = sweepSky(g, (l) => l.crystalLit);
    check(r.hits === 0, `le soleil direct n'atteint jamais le cristal, digue ${amount ? 'haute' : 'absente'}`);
  }
  {
    // Radeau en bas : aucun angle du miroir n'atteint le temple.
    const g = createGame(level);
    let through = 0;
    for (const a of [30, 60, 90, 120]) {
      g.sunAngle = rad(a);
      run(g, 0.2);
      through += sweepMirror(g, g.mirrors[0], (l) => l.crystalLit);
    }
    check(through === 0, 'radeau au fond du bassin : le temple est hors d’atteinte');
  }
  {
    // Pour quelles positions du soleil la digue tient-elle ET le miroir, en haut, est-il éclairé ?
    const good = [];
    for (let a = level.sun.min; a <= level.sun.max; a += 2) {
      const g = createGame(level);
      g.sunAngle = rad(a);
      run(g, 14);
      if (g.frosts[0].amount >= 0.99 && g.mirrors[0].lit) good.push(a);
    }
    check(good.length >= 6, `positions du soleil qui marchent : ${good[0]}° à ${good[good.length - 1]}° (${good.length * 2}° d'arc)`);

    const g = createGame(level);
    const mirror = g.mirrors[0];
    run(g, 3);
    check(g.frosts[0].amount === 0 && g.streams[0].head >= 1, 'au départ, l’eau s’échappe par la gorge');
    g.sunAngle = rad(good[Math.floor(good.length / 2)]);
    run(g, 3);
    check(g.frosts[0].amount > 0.3 && g.basins[0].level < level.basins[0].low, 'à l’ombre de la falaise, la digue monte et l’eau aussi');
    run(g, 8);
    check(Math.abs(g.basins[0].level - level.basins[0].high) < 1, 'le bassin est plein, le radeau est en haut');
    check(mirror.lit, 'le miroir du radeau reçoit le soleil');
    aimFromSun(g, mirror, crystal);
    run(g, 3);
    check(g.temple.lit, 'le temple s’allume');
    const t = tolerance(g, mirror, (l) => l.crystalLit);
    check(t >= 3, `la visée reste confortable (${t}°)`);
    g.sunAngle = rad(105);
    run(g, 10);
    check(g.frosts[0].amount === 0 && g.basins[0].level >= level.basins[0].low - 1, 'au soleil, la digue fond et le bassin se vide');
  }
}

// ── Niveau 4 ──────────────────────────────────────────────────────────

function checkLevel4(level) {
  const crystal = level.temple.crystal;
  {
    const g = createGame(level);
    const r = sweepSky(g, (l) => l.crystalLit);
    check(r.hits === 0, `le soleil direct n'atteint jamais le cristal (${r.hits}/${r.total})`);
  }
  {
    // Le miroir du village, seul, ne peut pas atteindre le temple.
    const g = createGame(level);
    let through = 0;
    for (const a of [40, 60, 80, 100]) {
      g.sunAngle = rad(a);
      through += sweepMirror(g, mirrorOf(g, 'village'), (l) => l.crystalLit);
    }
    check(through === 0, 'le miroir du village seul n’atteint pas le temple');
  }
  {
    // Le soleil n'éclaire jamais directement le socle.
    const g = createGame(level);
    const village = mirrorOf(g, 'village');
    const placed = mirrorOf(g, 'socle');
    village.free = false;
    placed.free = true;
    const r = sweepSky(g, () => placed.lit);
    check(r.hits === 0, `le soleil direct n'atteint jamais le socle (${r.hits}/${r.total})`);
  }
  {
    // Le relief seul ne gèle pas le torrent : il faut le nuage.
    const g = createGame(level);
    g.cloudX = level.cloud.minX;
    let shaded = 0;
    for (let a = level.sun.min; a <= level.sun.max; a += 1) {
      g.sunAngle = rad(a);
      g.cloudX = -500; // nuage hors du monde
      computeLight(g);
      if (!g.frosts[0].lit) shaded++;
    }
    check(shaded === 0, 'sans le nuage, le torrent reste toujours au soleil');
  }
  {
    const g = createGame(level);
    const village = mirrorOf(g, 'village');
    const placed = mirrorOf(g, 'socle');
    const porter = g.walkers[0];
    run(g, 5);
    check(!porter.done && !porter.moving && g.frosts[0].amount === 0, 'le porteur attend au bord du torrent');
    // On cherche une position du nuage qui met le torrent à l'ombre.
    let cloudX = null;
    for (let x = level.cloud.minX; x <= level.cloud.maxX && cloudX === null; x += 4) {
      g.cloudX = x;
      computeLight(g);
      if (!g.frosts[0].lit) cloudX = x;
    }
    check(cloudX !== null, `l'ombre du nuage peut couvrir le torrent (nuage à x=${cloudX})`);
    g.cloudX = cloudX;
    run(g, 4);
    check(g.frosts[0].amount >= 0.98, 'le torrent gèle');
    run(g, 0.5);
    g.cloudX = level.cloud.minX; // on retire l'ombre pendant la traversée
    run(g, 1);
    check(g.frosts[0].held && g.frosts[0].amount >= 0.98, 'la glace tient tant que le porteur est dessus');
    run(g, 8);
    check(porter.done && placed.free, 'le porteur a traversé et posé le miroir sur le socle');
    check(g.frosts[0].amount === 0, 'le pont a fondu derrière lui');
    check(village.lit && !placed.lit, 'le miroir du village est au soleil, pas celui du socle');
    aimFromSun(g, village, placed);
    run(g, 0.5);
    check(placed.lit, 'le miroir du socle reçoit le faisceau du village');
    aimFromMirror(village, placed, crystal);
    run(g, 3);
    check(g.temple.lit, 'le temple s’allume');
    const t1 = tolerance(g, village, () => placed.lit);
    const t2 = tolerance(g, placed, (l) => l.crystalLit);
    check(t1 >= 3 && t2 >= 3, `la visée reste confortable (village ${t1}°, socle ${t2}°)`);
  }
}

// ── Niveau 5 ──────────────────────────────────────────────────────────

function checkLevel5(level) {
  const places = [];
  for (let t = 0; t <= 1.0001; t += 0.05) places.push(t);
  {
    // Sans le miroir, le soleil n'entre jamais sous le surplomb.
    const g = createGame(level);
    g.mirrors[0].free = false;
    const r = sweepSky(g, (l) => l.crystalLit);
    check(r.hits === 0, `le soleil direct n'atteint jamais le cristal (${r.hits}/${r.total})`);
  }
  {
    // Bouger une seule des deux commandes ne suffit pas.
    const g = createGame(level);
    const mirror = g.mirrors[0];
    const start = mirror.t;
    const bySun = sweepSky(g, (l) => l.crystalLit);
    check(bySun.hits === 0, 'sans toucher au rail, aucune position du soleil ne marche');
    g.sunAngle = rad(level.sun.start);
    let byRail = 0;
    for (const t of places) {
      mirror.t = t;
      if (computeLight(g).crystalLit) byRail++;
    }
    mirror.t = start;
    check(byRail === 0, 'sans toucher au soleil, aucune place sur le rail ne marche');
  }
  {
    // Combien de paires (soleil, place) allument le temple ?
    const g = createGame(level);
    const mirror = g.mirrors[0];
    let pairs = 0;
    let shaded = 0;
    for (let a = level.sun.min; a <= level.sun.max; a += 1) {
      for (const t of places) {
        g.sunAngle = rad(a);
        mirror.t = t;
        const l = computeLight(g);
        if (l.crystalLit) pairs++;
        if (!l.sunHidden && !mirror.lit) shaded++;
      }
    }
    check(pairs >= 40, `paires (soleil, place) qui marchent : ${pairs}`);
    check(shaded >= 20, `l'aiguille met parfois le miroir à l'ombre (${shaded} cas)`);
  }
  {
    const g = createGame(level);
    const mirror = g.mirrors[0];
    run(g, 1);
    check(mirror.lit && g.temple.charge === 0, 'au départ, le miroir est au soleil mais son reflet se perd');
    g.sunAngle = rad(142);
    run(g, 2);
    check(!g.temple.lit, 'soleil bien placé, miroir mal placé : rien ne s’allume');
    mirror.t = 0.7;
    run(g, 3);
    check(g.temple.lit, 'soleil et rail réglés ensemble : le temple s’allume');
    // De combien peut-on se tromper sur le soleil et sur le rail ?
    let sunOk = 0;
    for (let d = -10; d <= 10; d += 0.5) {
      g.sunAngle = rad(142 + d);
      if (computeLight(g).crystalLit) sunOk += 0.5;
    }
    g.sunAngle = rad(142);
    let railOk = 0;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      mirror.t = t;
      if (computeLight(g).crystalLit) railOk += 2;
    }
    check(sunOk >= 4 && railOk >= 20, `le réglage reste confortable (soleil ${sunOk}°, rail ${railOk} % de sa longueur)`);
  }
}

// ── Outils pour les sanctuaires à plusieurs cristaux ──────────────────

/** Vrai si un miroir reçoit le soleil lui-même (et pas seulement une lampe). */
const sunLit = (l, mirror) => l.beams.some((b) => b.mirror === mirror && !b.fromLamp && b.depth === 0);
/** Oriente un miroir éclairé depuis un point (lampe, cristal-mémoire…) vers une cible. */
const aimFrom = (from, mirror, target) => {
  mirror.angle = aimMirror(mirror, unit(from, mirror), target);
};
/** Le milieu d'un polygone (pour viser une glace, par exemple). */
const centerOf = (pts) => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });
/** Fait tourner un miroir sur un tour complet ; vrai si test() l'est au moins une fois. */
const everByTurning = (g, mirror, test) => sweepMirror(g, mirror, test) > 0;

// ── Niveau 6 ──────────────────────────────────────────────────────────

function checkLevel6(level) {
  const [entry, back] = level.temple.crystals;
  const dry = () => {
    const g = createGame(level);
    g.frosts[0].amount = 1;
    g.streams[0].head = 0;
    return g;
  };
  {
    // Chute tarie, sans miroirs : le soleil n'atteint aucun cristal.
    const g = dry();
    for (const m of g.mirrors) m.free = false;
    const r = sweepSky(g, () => g.crystals.some((c) => c.lit));
    check(r.hits === 0, `le soleil direct n'atteint aucun cristal (${r.hits}/${r.total})`);
  }
  {
    // Le hameau est sous son rocher : le soleil n'y atteint jamais le miroir.
    const g = dry();
    const hamlet = mirrorOf(g, 'hameau');
    g.cloudX = -500; // nuage hors du monde
    let lit = 0;
    for (let a = level.sun.min; a <= level.sun.max; a += 1) {
      g.sunAngle = rad(a);
      if (sunLit(computeLight(g), hamlet)) lit++;
    }
    check(lit === 0, `le soleil n'atteint jamais le miroir du hameau (${lit} positions)`);
  }
  {
    // Tant que la chute coule, aucun miroir ne passe.
    const g = createGame(level);
    let through = 0;
    for (const a of [40, 70, 100, 130]) {
      g.sunAngle = rad(a);
      for (const m of g.mirrors) through += sweepMirror(g, m, () => g.crystals.some((c) => c.lit));
    }
    check(through === 0, 'tant que la chute coule, aucun reflet ne passe');
  }
  // Un réglage du ciel où le lac est à l'ombre, la borne et la crête au soleil.
  const sky = (() => {
    const g = dry();
    const crete = mirrorOf(g, 'crete');
    let found = null;
    const r = sweepSky(g, (l, a, x) => {
      const ok = !g.frosts[0].lit && g.eyes[0].lit && sunLit(l, crete);
      if (ok && !found && a >= 60 && a <= 110) found = { a, x };
      return ok;
    });
    check(r.hits > 20, `lac à l'ombre + borne et crête au soleil : ${r.hits} réglages possibles sur ${r.total}`);
    return found;
  })();
  if (!sky) return;
  {
    // Un miroir, un cristal.
    const g = dry();
    g.sunAngle = rad(sky.a);
    g.cloudX = sky.x;
    const hamlet = mirrorOf(g, 'hameau');
    const crete = mirrorOf(g, 'crete');
    check(!everByTurning(g, hamlet, () => g.crystals[0].lit), 'le miroir du hameau n’atteint jamais le cristal de l’entrée');
    check(!everByTurning(g, crete, () => g.crystals[1].lit), 'le miroir de la crête n’atteint jamais le cristal du fond');
  }
  {
    const g = createGame(level);
    const hamlet = mirrorOf(g, 'hameau');
    const crete = mirrorOf(g, 'crete');
    run(g, 1);
    check(g.streams[0].head >= 1 && !g.temple.lit, 'au départ, la chute coule');
    g.sunAngle = rad(sky.a);
    g.cloudX = sky.x;
    run(g, 6);
    check(g.frosts[0].amount >= 1 && g.streams[0].head === 0, 'à l’ombre du nuage, le lac gèle et la chute se tarit');
    check(g.eyes[0].lit && hamlet.lit, 'la borne de la crête éclaire le miroir du hameau, sous son rocher');
    aimFrom(level.eyes[0].out, hamlet, back);
    run(g, 2);
    check(g.crystals[1].lit && !g.temple.lit, 'un seul cristal éclairé : le sanctuaire attend');
    aimFromSun(g, crete, entry);
    run(g, 3);
    check(g.temple.lit, 'les deux cristaux ensemble : le sanctuaire s’allume');
    const t1 = tolerance(g, hamlet, () => g.crystals[1].lit);
    const t2 = tolerance(g, crete, () => g.crystals[0].lit);
    check(t1 >= 3 && t2 >= 3, `la visée reste confortable (hameau ${t1}°, crête ${t2}°)`);
  }
}

// ── Niveau 7 ──────────────────────────────────────────────────────────

function checkLevel7(level) {
  const [chimney, niche] = level.temple.crystals;
  const iceOf = (g, id) => g.ices.find((i) => i.def.id === id);
  const noCloud = (g) => {
    g.cloudX = -500;
  };
  {
    // Le soleil seul : ni les cristaux, ni la corniche du bas, ni le socle.
    const g = createGame(level);
    for (const m of g.mirrors) m.free = false;
    mirrorOf(g, 'socle').free = true;
    iceOf(g, 'cornicheHaut').gone = true; // cas le plus défavorable : rebord dégagé
    let crystals = 0;
    let low = 0;
    let socle = 0;
    for (let a = level.sun.min; a <= level.sun.max; a += 1) {
      g.sunAngle = rad(a);
      noCloud(g);
      const l = computeLight(g);
      if (g.crystals.some((c) => c.lit)) crystals++;
      if (iceOf(g, 'cornicheBas').exposure > 0) low++;
      if (sunLit(l, mirrorOf(g, 'socle'))) socle++;
    }
    check(crystals === 0, `le soleil direct n'atteint aucun cristal (${crystals} positions)`);
    check(low === 0, `le soleil direct n'atteint jamais la corniche du bas (${low} positions)`);
    check(socle === 0, `le soleil direct n'atteint jamais le socle (${socle} positions)`);
  }
  {
    // Ni le miroir du village ni le miroir ancien n'atteignent le cristal de la cheminée.
    const g = createGame(level);
    noCloud(g);
    iceOf(g, 'cornicheHaut').gone = true;
    iceOf(g, 'cornicheBas').gone = true;
    mirrorOf(g, 'ancien').free = true;
    let through = 0;
    for (const a of [40, 60, 80, 100, 120]) {
      g.sunAngle = rad(a);
      for (const id of ['village', 'ancien']) through += sweepMirror(g, mirrorOf(g, id), () => g.crystals[0].lit);
    }
    check(through === 0, 'seul le miroir du socle atteint le cristal de la cheminée');
  }
  {
    // Mauvais ordre : la corniche du haut tombe d'abord. On n'est pas bloqué pour autant.
    const g = createGame(level);
    const porter = g.walkers[0];
    noCloud(g);
    run(g, 9);
    const heap = iceOf(g, 'tas');
    check(iceOf(g, 'cornicheHaut').gone && heap.active, 'sans nuage, la corniche du haut tombe et laisse un tas de neige');
    aimFromSun(g, mirrorOf(g, 'village'), centerOf(level.ices[0].points));
    run(g, 2);
    check(!heap.gone && !porter.moving && Math.abs(porter.d - porter.geo.cum[1]) < 1, 'le tas barre le chemin du porteur (et arrête aussi le reflet du village)');
    run(g, 40);
    check(heap.gone && iceOf(g, 'cornicheBas').gone && porter.done, 'le tas finit par fondre : le porteur passe, rien n’est perdu');
  }
  {
    const g = createGame(level);
    const village = mirrorOf(g, 'village');
    const placed = mirrorOf(g, 'socle');
    const ancient = mirrorOf(g, 'ancien');
    const porter = g.walkers[0];
    run(g, 6);
    check(iceOf(g, 'cornicheHaut').melt === 0 && !porter.moving && !porter.done, 'au départ, le nuage protège la corniche du haut et le porteur attend');
    check(village.lit, 'le miroir du village est au soleil');
    aimFromSun(g, village, centerOf(level.ices[0].points));
    run(g, 1);
    check(iceOf(g, 'cornicheBas').heating, 'le reflet du village chauffe la corniche du bas');
    run(g, 9);
    check(iceOf(g, 'cornicheBas').gone && porter.done && placed.free, 'la crevasse est comblée, le porteur a posé son miroir');
    check(!iceOf(g, 'cornicheHaut').gone && !ancient.free, 'la corniche du haut tient toujours');
    g.cloudX = level.cloud.maxX;
    run(g, 8);
    check(iceOf(g, 'cornicheHaut').gone && ancient.free, 'nuage écarté : la corniche du haut tombe et libère le miroir ancien');
    aimFromSun(g, village, placed);
    run(g, 0.5);
    check(placed.lit, 'le miroir du socle reçoit le reflet du village');
    aimFromMirror(village, placed, chimney);
    run(g, 2);
    check(g.crystals[0].lit && !g.temple.lit, 'un seul cristal éclairé : le sanctuaire attend');
    aimFromSun(g, ancient, niche);
    run(g, 3);
    check(g.temple.lit, 'les deux cristaux ensemble : le sanctuaire s’allume');
    const t1 = tolerance(g, village, () => placed.lit);
    const t2 = tolerance(g, placed, () => g.crystals[0].lit);
    const t3 = tolerance(g, ancient, () => g.crystals[1].lit);
    check(t1 >= 3 && t2 >= 3 && t3 >= 3, `la visée reste confortable (village ${t1}°, socle ${t2}°, ancien ${t3}°)`);
  }
}

// ── Lancement ─────────────────────────────────────────────────────────

const checks = { 1: checkLevel1, 2: checkLevel2, 3: checkLevel3, 4: checkLevel4, 5: checkLevel5, 6: checkLevel6, 7: checkLevel7 };
// `npm run check -- 6` ne vérifie que le niveau 6 (pratique pendant qu'on le construit).
const only = process.argv[2] ? Number(process.argv[2]) : null;
for (const level of levels) {
  if (only && level.id !== only) continue;
  console.log(`\nNiveau ${level.id} — ${level.title}`);
  if (checks[level.id]) checks[level.id](level);
  else check(false, 'aucune vérification écrite pour ce niveau');
}

console.log(failed ? `\n${failed} vérification(s) en échec.` : '\nTous les niveaux sont bons.');
process.exit(failed ? 1 : 0);
