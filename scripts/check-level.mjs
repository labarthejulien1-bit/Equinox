// Vérifie automatiquement que chaque niveau est juste :
//   npm run check
//
// Pour chaque niveau :
//  - aucun raccourci (le soleil seul ne peut pas allumer le temple, etc.) ;
//  - la solution prévue fonctionne de bout en bout ;
//  - le décor est bien posé, et les trois objectifs secondaires sont atteignables.

import { levels } from '../src/levels/index.js';
import { createGame, update, computeLight, sunPosition, turnMirror } from '../src/game/game.js';
import { aimMirror } from '../src/engine/light.js';
import { rad, pointInPolygon, distToPolygon } from '../src/engine/vec.js';
import { createLife, updateLife, tapLife, beamAt } from '../src/game/life.js';
import { updateGoals, GOAL_TYPES } from '../src/game/goals.js';
import { RECIPES } from './goal-recipes.mjs';

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

// ── Niveau 8 ──────────────────────────────────────────────────────────

function checkLevel8(level) {
  const [low, high] = level.temple.crystals;
  const NIGHT = 186; // angle où le soleil est couché
  const memOf = (g, id) => g.memories.find((m) => m.def.id === id);
  {
    // Le soleil seul : ni les cristaux, ni le cristal-mémoire de l'autre rive, ni le socle.
    const g = createGame(level);
    for (const m of g.mirrors) m.free = false;
    mirrorOf(g, 'socle').free = true;
    let crystals = 0;
    let shore = 0;
    let socle = 0;
    let night = 0;
    for (let a = level.sun.min; a <= level.sun.max; a += 1) {
      g.sunAngle = rad(a);
      const l = computeLight(g);
      if (l.sunHidden) night++;
      if (g.crystals.some((c) => c.lit)) crystals++;
      if (memOf(g, 'rive').lit) shore++;
      if (sunLit(l, mirrorOf(g, 'socle'))) socle++;
    }
    check(crystals === 0, `le soleil direct n'atteint aucun cristal (${crystals} positions)`);
    check(shore === 0, `le soleil direct n'atteint jamais le cristal-mémoire de l'autre rive (${shore} positions)`);
    check(socle === 0, `le soleil direct n'atteint jamais le socle (${socle} positions)`);
    check(night >= 5, `le soleil peut se coucher (${night}° de nuit au bout de sa course)`);
  }
  {
    // De jour, même avec tout en place, le miroir du socle ne reçoit rien : il faut la nuit.
    const g = createGame(level);
    const placed = mirrorOf(g, 'socle');
    placed.free = true;
    for (const m of g.memories) m.charge = 1;
    let lit = 0;
    for (let a = level.sun.min; a <= 160; a += 2) {
      g.sunAngle = rad(a);
      computeLight(g);
      if (placed.lit) lit++;
    }
    check(lit === 0, 'de jour, les cristaux-mémoire ne rendent rien : le miroir du socle reste éteint');
  }
  {
    const g = createGame(level);
    const village = mirrorOf(g, 'village');
    const placed = mirrorOf(g, 'socle');
    const porter = g.walkers[0];
    const mVillage = memOf(g, 'village');
    const mShore = memOf(g, 'rive');
    run(g, 5);
    check(mVillage.charge >= 0.99 && mShore.charge === 0, 'de jour, le cristal-mémoire du village se charge seul ; pas celui de l’autre rive');
    check(!porter.done && !porter.moving && g.frosts[0].amount === 0, 'le porteur attend au bord du lac');
    aimFromSun(g, village, level.memories[1]);
    run(g, 4);
    check(mShore.charge >= 0.99, 'le reflet du village charge le cristal-mémoire de l’autre rive');
    g.sunAngle = rad(NIGHT);
    run(g, 5);
    check(g.light.sunHidden && g.frosts[0].amount >= 0.98, 'le soleil couché, le lac gèle');
    run(g, 9);
    check(porter.done && placed.free, 'le porteur a traversé et posé son miroir');
    check(mVillage.charge > 0.5 && mShore.charge > 0.5, `les deux lueurs tiennent encore (${mVillage.charge.toFixed(2)}, ${mShore.charge.toFixed(2)})`);
    check(placed.lit && village.lit, 'de nuit, chaque miroir reçoit la lueur de son cristal-mémoire');
    aimFrom(level.memories[1], placed, low);
    run(g, 2);
    check(g.crystals[0].lit && !g.temple.lit, 'un seul cristal éclairé : le sanctuaire attend');
    aimFrom(level.memories[0], village, high);
    run(g, 3);
    check(g.temple.lit, 'les deux cristaux ensemble, en pleine nuit : le sanctuaire s’allume');
    const t1 = tolerance(g, placed, () => g.crystals[0].lit);
    const t2 = tolerance(g, village, () => g.crystals[1].lit);
    check(t1 >= 3 && t2 >= 3, `la visée reste confortable (socle ${t1}°, village ${t2}°)`);
  }
  {
    // De nuit, tout en place : chaque cristal n'est atteignable que par son miroir.
    const g = createGame(level);
    for (const m of g.mirrors) m.free = true;
    const placed = mirrorOf(g, 'socle');
    placed.x = level.pedestals[0].x;
    placed.y = level.pedestals[0].topY - 2;
    g.walkers[0].done = true;
    for (const m of g.memories) m.charge = 1;
    g.sunAngle = rad(NIGHT);
    run(g, 0.5);
    const wrongLow = sweepMirror(g, mirrorOf(g, 'village'), () => g.crystals[0].lit);
    const wrongHigh = sweepMirror(g, placed, () => g.crystals[1].lit);
    check(wrongLow === 0, `le miroir du village n'atteint jamais le cristal du fond (${wrongLow / 2}°)`);
    check(wrongHigh === 0, `le miroir du socle n'atteint jamais le cristal de la voûte (${wrongHigh / 2}°)`);
  }
  {
    // Les lueurs s'éteignent, mais on peut toujours recommencer la journée.
    const g = createGame(level);
    const village = mirrorOf(g, 'village');
    run(g, 3);
    aimFromSun(g, village, level.memories[1]);
    run(g, 4);
    g.sunAngle = rad(NIGHT);
    run(g, 100);
    check(g.memories.every((m) => m.charge === 0) && g.walkers[0].done && !g.temple.lit, 'trop tard : les lueurs se sont éteintes, mais le miroir du porteur est en place');
    g.sunAngle = rad(70);
    run(g, 4);
    aimFromSun(g, village, level.memories[1]);
    run(g, 4);
    check(g.memories.every((m) => m.charge >= 0.99), 'un nouveau jour recharge les deux cristaux-mémoire');
  }
}

// ── Niveau 9 ──────────────────────────────────────────────────────────

function checkLevel9(level) {
  const [deep, entry] = level.temple.crystals;
  /** Règle les jumeaux pour que le premier éclaire le second (la chaîne fait tourner l'autre). */
  const aimTwins = (g) => {
    const top = mirrorOf(g, 'haut');
    const twin = mirrorOf(g, 'bas');
    turnMirror(g, top, aimMirror(top, unit(sunPosition(g), top), twin) - top.angle);
  };
  {
    // Sans miroirs : le soleil n'atteint jamais le cristal du fond.
    const g = createGame(level);
    for (const m of g.mirrors) m.free = false;
    const r = sweepSky(g, () => g.crystals[0].lit);
    check(r.hits === 0, `le soleil direct n'atteint jamais le cristal de la grotte (${r.hits} positions)`);
  }
  {
    // Ni le premier jumeau seul, ni le miroir du village n'atteignent le cristal de la grotte.
    const g = createGame(level);
    g.ices[0].gone = true;
    const top = mirrorOf(g, 'haut');
    const twin = mirrorOf(g, 'bas');
    const village = mirrorOf(g, 'village');
    let through = 0;
    for (const a of [40, 60, 80, 100, 118, 123]) {
      g.sunAngle = rad(a);
      twin.free = false;
      through += sweepMirror(g, top, () => g.crystals[0].lit);
      twin.free = true;
      through += sweepMirror(g, village, () => g.crystals[0].lit);
    }
    check(through === 0, 'seul le second jumeau atteint le cristal de la grotte');
  }
  // Pour quelles positions du soleil la chaîne des jumeaux atteint-elle le cristal du fond ?
  const working = (melted) => {
    const g = createGame(level);
    g.ices[0].gone = melted;
    const out = [];
    for (let a = level.sun.min; a <= level.sun.max; a += 0.5) {
      g.sunAngle = rad(a);
      aimTwins(g);
      computeLight(g);
      if (g.crystals[0].lit) out.push(a);
    }
    return out;
  };
  const before = working(false);
  const after = working(true);
  check(before.length === 0, `tant que la glace est là, les jumeaux n'atteignent jamais le cristal de la grotte (${before.length} positions)`);
  check(after.length >= 8, `glace fondue : ils l'atteignent quand le soleil est entre ${after[0]}° et ${after[after.length - 1]}°`);
  {
    // À ces positions, ni le soleil ni les jumeaux n'éclairent l'autre cristal : il faut le miroir du village.
    const g = createGame(level);
    g.ices[0].gone = true;
    mirrorOf(g, 'village').free = false;
    let free = 0;
    for (const a of after) {
      g.sunAngle = rad(a);
      aimTwins(g);
      computeLight(g);
      if (g.crystals[1].lit) free++;
    }
    check(free === 0, 'là, le cristal du fond de la gorge reste éteint sans le miroir du village');
  }
  {
    const g = createGame(level);
    const top = mirrorOf(g, 'haut');
    const twin = mirrorOf(g, 'bas');
    const village = mirrorOf(g, 'village');
    const sum = top.angle + twin.angle;
    run(g, 3);
    check(g.ices[0].melt === 0 && !g.crystals.some((c) => c.lit), 'au départ, rien ne fond et aucun cristal n’est éclairé');
    const sun = after[Math.floor(after.length / 2)];
    g.sunAngle = rad(sun);
    run(g, 1);
    check(!top.lit, `soleil à ${sun}° : la glace met le premier miroir à l'ombre`);
    g.sunAngle = rad(45);
    turnMirror(g, top, aimMirror(top, unit(sunPosition(g), top), centerOf(level.ices[0].points)) - top.angle);
    run(g, 1);
    check(g.ices[0].heating, 'soleil ailleurs, premier miroir tourné vers la glace : elle fond');
    run(g, 5);
    check(g.ices[0].gone, 'la glace a fondu');
    g.sunAngle = rad(sun);
    aimTwins(g);
    run(g, 2);
    check(twin.lit && g.crystals[0].lit && !g.temple.lit, 'soleil revenu, jumeaux réglés : le second touche le cristal de la grotte');
    check(Math.abs(top.angle + twin.angle - sum) < 1e-9, 'la chaîne tient : la somme des angles des jumeaux n’a pas changé');
    aimFromSun(g, village, entry);
    run(g, 3);
    check(g.temple.lit, 'le miroir du village éclaire l’autre cristal : le sanctuaire s’allume');
    // Le cristal est loin, tout au fond : la visée est fine, mais l'aide à la
    // visée (settleMirror) rattrape jusqu'à 4° d'écart quand on lâche le miroir.
    const t = tolerance(g, village, () => g.crystals[1].lit);
    check(t >= 2, `la visée du village reste jouable (${t}°, plus l'aide à la visée)`);
  }
}

// ── Niveau 10 ─────────────────────────────────────────────────────────

function checkLevel10(level) {
  const [top, middle, bottom] = level.temple.crystals;
  const iceOf = (g, id) => g.ices.find((i) => i.def.id === id);
  /** Une partie où le bloc a fondu (troisième miroir libre) ; dry = chute tarie. */
  const ready = (dry) => {
    const g = createGame(level);
    iceOf(g, 'bloc').gone = true;
    mirrorOf(g, 'tiers').free = true;
    if (dry) {
      g.frosts[0].amount = 1;
      g.streams[0].head = 0;
    }
    return g;
  };
  const places = [];
  for (let t = 0; t <= 1.0001; t += 0.1) places.push(t);
  {
    // Chute tarie, sans miroirs : le soleil n'atteint aucun cristal.
    const g = ready(true);
    for (const m of g.mirrors) m.free = false;
    const r = sweepSky(g, () => g.crystals.some((c) => c.lit));
    check(r.hits === 0, `le soleil direct n'atteint aucun cristal (${r.hits}/${r.total})`);
  }
  {
    // Tant que la chute coule, ni la fenêtre ni la grotte du bas ne sont atteignables.
    const g = ready(false);
    g.cloudX = level.cloud.minX;
    let through = 0;
    for (const a of [90, 110, 130]) {
      g.sunAngle = rad(a);
      for (const id of ['village', 'tiers']) through += sweepMirror(g, mirrorOf(g, id), () => g.crystals[1].lit || g.crystals[2].lit);
    }
    check(through === 0, 'tant que la chute coule, la fenêtre et la grotte du bas sont hors d’atteinte');
  }
  {
    // Un miroir, un cristal.
    const g = ready(true);
    g.cloudX = -500;
    let wrong = 0;
    const rail = mirrorOf(g, 'rail');
    rail.free = false; // (un miroir peut en éclairer un autre : on les essaie un par un)
    for (const a of [90, 110, 130]) {
      g.sunAngle = rad(a);
      wrong += sweepMirror(g, mirrorOf(g, 'tiers'), () => g.crystals[0].lit || g.crystals[1].lit);
      wrong += sweepMirror(g, mirrorOf(g, 'village'), () => g.crystals[0].lit);
    }
    rail.free = true;
    for (let a = level.sun.min; a <= level.sun.max; a += 2) {
      for (const t of places) {
        g.sunAngle = rad(a);
        rail.t = t;
        mirrorOf(g, 'village').free = false;
        mirrorOf(g, 'tiers').free = false;
        computeLight(g);
        if (g.crystals[1].lit || g.crystals[2].lit) wrong++;
        mirrorOf(g, 'village').free = true;
        mirrorOf(g, 'tiers').free = true;
      }
    }
    check(wrong === 0, 'chaque cristal n’est atteignable que par son miroir (rail en haut, village au milieu, troisième en bas)');
  }
  {
    // Le glacier fait parfois de l'ombre au lac tout seul, mais alors le village est à l'ombre lui aussi.
    const g = ready(true);
    g.cloudX = -500;
    let shortcut = 0;
    for (let a = level.sun.min; a <= level.sun.max; a += 1) {
      g.sunAngle = rad(a);
      const l = computeLight(g);
      if (!g.frosts[0].lit && sunLit(l, mirrorOf(g, 'village'))) shortcut++;
    }
    check(shortcut === 0, `sans le nuage, le lac ne gèle jamais pendant que le village est au soleil (${shortcut} positions)`);
  }
  // Un réglage complet : lac à l'ombre du nuage, trois miroirs au soleil, rail sur le cristal du haut.
  const setup = (() => {
    const g = ready(true);
    const rail = mirrorOf(g, 'rail');
    let found = null;
    let count = 0;
    for (let a = 84; a <= 140; a += 2) {
      for (let x = level.cloud.minX; x <= level.cloud.maxX; x += 8) {
        for (const t of places) {
          g.sunAngle = rad(a);
          g.cloudX = x;
          rail.t = t;
          const l = computeLight(g);
          const ok = !g.frosts[0].lit && g.crystals[0].lit && g.mirrors.every((m) => sunLit(l, m));
          if (ok) count++;
          if (ok && !found && t > 0.25 && t < 0.75) found = { a, x, t };
        }
      }
    }
    check(count >= 20, `lac à l'ombre + trois miroirs au soleil + rail sur le cristal du haut : ${count} réglages possibles`);
    return found;
  })();
  if (!setup) return;
  {
    const g = createGame(level);
    const village = mirrorOf(g, 'village');
    const rail = mirrorOf(g, 'rail');
    const third = mirrorOf(g, 'tiers');
    run(g, 4);
    check(iceOf(g, 'bloc').melt === 0 && !iceOf(g, 'glacier').gone && !g.crystals.some((c) => c.lit), 'au départ, rien ne fond et aucun cristal n’est éclairé');
    g.sunAngle = rad(100);
    g.cloudX = level.cloud.minX;
    run(g, 0.5);
    aimFromSun(g, village, centerOf(level.ices[1].points));
    run(g, 4);
    check(iceOf(g, 'bloc').gone && third.free, 'le reflet du village fait fondre le bloc : le troisième miroir est libre');
    g.sunAngle = rad(setup.a);
    g.cloudX = setup.x;
    rail.t = setup.t;
    run(g, 6);
    check(g.frosts[0].amount >= 1 && g.streams[0].head === 0, 'à l’ombre du nuage, le lac gèle et la chute se tarit');
    check(g.crystals[0].lit && !g.temple.lit, 'soleil et rail réglés : le cristal du haut brille, le sanctuaire attend');
    third.angle = rad(90); // (pour être sûr qu'il ne vise rien par hasard)
    aimFromSun(g, village, middle);
    run(g, 2);
    check(g.crystals[1].lit && !g.crystals[2].lit && !g.temple.lit, 'le miroir du village passe la fenêtre de pierre : deux cristaux sur trois');
    aimFromSun(g, third, bottom);
    run(g, 3);
    check(g.temple.lit, 'les trois cristaux ensemble : le sanctuaire s’allume');
    const t1 = tolerance(g, village, () => g.crystals[1].lit);
    const t2 = tolerance(g, third, () => g.crystals[2].lit);
    check(t1 >= 3 && t2 >= 3, `la visée reste confortable (village ${t1}°, troisième ${t2}°)`);
    run(g, 12);
    check(iceOf(g, 'glacier').gone && g.thaw > 0.9, 'le grand glacier fond : la source coule');
  }
}

// ── Le décor vivant et l'eau dans la roche (tous les niveaux) ─────────────
//
// Rien de tout cela ne change l'énigme, mais des coordonnées fausses se
// voient tout de suite à l'écran : un bouquetin qui flotte, une veine d'eau
// qui sort de la roche. On vérifie donc la géométrie, puis on fait tourner
// la vie du monde quelques secondes pour s'assurer que rien ne casse.

function checkScenery(level) {
  const G = level.ground;
  const pt = ([x, y]) => ({ x, y });
  const inRock = (p) => pointInPolygon(p, G);
  const edge = (p) => distToPolygon(p, G); // distance au bord de la roche
  const bad = [];

  // Les animaux et les plantes sont posés sur le sol.
  const onGround = (p, what) => {
    if (edge(p) > 2.5) bad.push(`${what} (${p.x}, ${p.y}) est à ${edge(p).toFixed(1)} du sol`);
  };
  for (const d of level.decor || []) {
    if (['ibex', 'marmots', 'hare', 'flowers', 'bush', 'cairn'].includes(d.type) && d.x > 0 && d.x < level.size.w) onGround(d, d.type);
    for (const q of d.path || []) onGround(pt(q), 'chemin du bouquetin');
    for (const q of d.range || []) onGround(pt(q), 'pente du lièvre');
    if (d.to) onGround(pt(d.to), 'second terrier');
  }
  // L'eau souterraine reste dans la roche : ses bouts touchent la surface, le reste est dedans.
  const inside = (points, what, margin = 0) => {
    points.forEach((q, i) => {
      const p = pt(q);
      const end = i === 0 || i === points.length - 1;
      if (end ? !inRock(p) && edge(p) > 3.5 : !inRock(p) || edge(p) < margin) bad.push(`${what} : le point (${p.x}, ${p.y}) sort de la roche`);
    });
  };
  for (const r of level.remnants || []) {
    if (r.after && !(level.ices || []).some((i) => i.id === r.after)) bad.push(`reste de glace : la glace « ${r.after} » n'existe pas`);
  }
  for (const v of level.veins || []) {
    inside(v.path, 'veine', 1.5);
    if (v.after && !(level.ices || []).some((i) => i.id === v.after)) bad.push(`veine : la glace « ${v.after} » n'existe pas`);
  }
  for (const a of level.aquifers || []) {
    if (!(level.streams || []).some((s) => s.id === a.stream)) bad.push(`nappe : le cours d'eau « ${a.stream} » n'existe pas`);
    inside(a.inlet, 'arrivée de la nappe', 1.5);
    if (a.outlet) inside(a.outlet, 'sortie de la nappe', 1.5);
    for (const q of a.cavern || []) if (!inRock(pt(q)) || edge(pt(q)) < 4) bad.push(`nappe : la grotte sort de la roche en (${q})`);
  }
  check(bad.length === 0, bad.length ? `décor mal posé : ${bad.join(' ; ')}` : 'les animaux sont sur le sol, l’eau souterraine reste dans la roche');

  // La vie du monde tourne sans erreur : une journée entière, soleil et nuage en mouvement.
  let error = null;
  try {
    const g = createGame(level);
    createLife(g);
    g.started = true;
    const { min, max } = level.sun;
    for (let i = 0; i < 1500; i++) {
      g.sunAngle = rad(min + ((max - min) * (i % 500)) / 500);
      if (level.cloud) g.cloudX = level.cloud.minX + ((level.cloud.maxX - level.cloud.minX) * ((i * 3) % 500)) / 500;
      update(g, 1 / 30);
      updateLife(g, 1 / 30);
      g.events.length = 0;
      for (const k of g.life.critters) if (!Number.isFinite(k.x) || !Number.isFinite(k.y)) throw new Error(`${k.type} s'est perdu`);
    }
  } catch (e) {
    error = e;
  }
  check(!error, error ? `la vie du monde casse : ${error.message}` : 'la vie du monde tourne sans erreur');
}

// ── Pas de victoire immédiate ─────────────────────────────────────────
// Le défaut trouvé au niveau 8 : dès le début, un seul miroir allumait tout
// le sanctuaire. Pour chaque niveau, on part donc de l'état de départ (rien
// n'a fondu, rien n'a gelé, personne n'a bougé) et l'on essaie le soleil, le
// nuage et chaque miroir libre dans toutes les directions : jamais tous les
// cristaux ne doivent s'allumer ensemble.

// (Au niveau 5, c'est l'énigme elle-même : trouver la bonne hauteur du soleil
// et la bonne place du miroir sur son rail. Il n'y a rien d'autre à faire.)
const SOLVED_BY_AIMING = new Set([5]);

function checkNoInstantWin(level) {
  if (SOLVED_BY_AIMING.has(level.id)) return;
  const g = createGame(level);
  const clouds = level.cloud ? [level.cloud.minX, (level.cloud.minX + level.cloud.maxX) / 2, level.cloud.maxX] : [0];
  const free = g.mirrors.filter((m) => m.free);
  let wins = 0;
  let how = '';
  for (let a = level.sun.min; a <= level.sun.max && !wins; a += 6) {
    for (const x of clouds) {
      g.sunAngle = rad(a);
      g.cloudX = x;
      // (les miroirs sur rail ne tournent pas : on les promène)
      for (const m of free) {
        const base = m.rail ? m.t : m.angle;
        for (let i = 0; i < (m.rail ? 21 : 360); i++) {
          if (m.rail) m.t = i / 20;
          else m.angle = rad(i);
          if (m.rail) update(g, 0); // (replace le miroir sur son rail)
          computeLight(g);
          if (g.crystals.every((c) => c.lit)) {
            wins++;
            how = `soleil ${a}°, miroir « ${m.id} »`;
          }
        }
        if (m.rail) m.t = base;
        else m.angle = base;
      }
    }
  }
  check(wins === 0, wins ? `raccourci : le sanctuaire s'allume dès le départ (${how})` : 'au départ, aucun miroir ne peut allumer le sanctuaire à lui seul');
}

// ── Les objectifs secondaires ─────────────────────────────────────────
// Chaque niveau a trois objectifs (une médaille chacun). On vérifie qu'aucun
// ne se gagne tout seul, et que chacun est atteignable : sa « recette »
// (scripts/goal-recipes.mjs) est rejouée comme le ferait un joueur.

/** Où toucher pour déranger tel animal (ou chaque villageois visible). */
function tapPoints(g, what) {
  if (what === 'night') return [...tapPoints(g, 'owl'), ...tapPoints(g, 'eyes')];
  if (what === 'lake') return g.life.waters.map((w) => ({ x: (w.b.def.x0 + w.b.def.x1) / 2, y: w.b.level + 3 }));
  if (what === 'folk') return g.life.folk.filter((f) => f.vis > 0.6).map((f) => ({ x: f.x, y: f.y - 8 * f.p.s }));
  const k = g.life.critters.find((c) => c.type === what);
  if (!k) return [];
  return [what === 'raptor' ? { x: k.x, y: k.y } : { x: k.x, y: k.y - 8 * k.s }];
}

/**
 * Rejoue une recette depuis le début du niveau. Vrai si l'objectif est atteint.
 * Une recette : { sun, cloud, rail: { id: t }, settle, aim: [miroir, x, y] ou [miroir, 'raptor'],
 * taps: 'owl' | 'eyes' | 'raptor' | 'folk' | 'lake' | 'night', wait, then: [{ … , wait }] }
 * — on place le soleil, le nuage et le rail, on attend `settle`, on vise, on
 * attend `wait` (en touchant `taps` de temps en temps), puis on enchaîne `then`.
 */
function playRecipe(level, def, recipe) {
  const DT = 1 / 20;
  const g = createGame(level);
  createLife(g);
  g.started = true;
  g.goals = [{ def, done: false, held: 0, memo: {} }];
  let tapIn = 0.3;
  let n = 0;
  const apply = (r) => {
    if (r.sun != null) g.sunAngle = rad(r.sun);
    if (r.cloud != null && level.cloud) g.cloudX = r.cloud;
    for (const [id, t] of Object.entries(r.rail || {})) mirrorOf(g, id).t = t;
    if (r.aim) {
      let [id, x, y] = r.aim;
      const m = mirrorOf(g, id);
      // (viser un animal : aim: ['village', 'raptor'] le vise là où il est)
      if (typeof x === 'string') ({ x, y } = g.life.critters.find((k) => k.type === x));
      update(g, DT);
      // (on ne vise qu'avec un miroir que le joueur peut tourner et que le soleil éclaire)
      if (!m || !m.free || !m.lit || m.rail) return false;
      aimFromSun(g, m, { x, y });
      g.touched.mirror = true; // (comme quand le joueur tourne un miroir)
    }
    return true;
  };
  const wait = (seconds, taps) => {
    for (let t = 0; t < seconds; t += DT) {
      update(g, DT);
      if (taps && (tapIn -= DT) <= 0) {
        tapIn = 0.6;
        const pts = tapPoints(g, taps);
        if (pts.length) tapLife(g, pts[n++ % pts.length]);
      }
      updateLife(g, DT);
      if (updateGoals(g, DT).length) return true;
      g.events.length = 0;
    }
    return false;
  };
  if (!apply({ ...recipe, aim: null })) return false;
  if (wait(recipe.settle ?? 0.6, null)) return true;
  if (recipe.aim && !apply({ aim: recipe.aim })) return false;
  if (wait(recipe.wait ?? 6, recipe.taps)) return true;
  for (const then of [].concat(recipe.then || [])) {
    if (!apply(then)) return false;
    if (wait(then.wait ?? 5, recipe.taps)) return true;
  }
  return false;
}

function checkGoals(level) {
  const goals = level.goals || [];
  const recipes = RECIPES[level.id] || {};
  const ids = new Set(goals.map((q) => q.id));
  const wellFormed = goals.length === 3 && ids.size === 3 && goals.every((q) => q.id && q.title && q.text && GOAL_TYPES.includes(q.type));
  check(wellFormed, wellFormed ? 'trois objectifs secondaires, bien écrits' : 'il faut trois objectifs (id, type connu, title, text), aux ids différents');
  if (!wellFormed) return;
  for (const def of goals) {
    const free = playRecipe(level, def, { wait: 14 });
    const recipe = recipes[def.id];
    const reached = !!recipe && playRecipe(level, def, recipe);
    check(!free && reached, `médaille « ${def.title} » : ${free ? 'elle se gagne sans rien faire' : !recipe ? 'pas de recette dans goal-recipes.mjs' : reached ? 'atteignable, et pas donnée' : 'la recette ne l’atteint pas'}`);
  }
}

// ── Lancement ─────────────────────────────────────────────────────────

const checks = { 1: checkLevel1, 2: checkLevel2, 3: checkLevel3, 4: checkLevel4, 5: checkLevel5, 6: checkLevel6, 7: checkLevel7, 8: checkLevel8, 9: checkLevel9, 10: checkLevel10 };
// `npm run check -- 6` ne vérifie que le niveau 6 (pratique pendant qu'on le construit).
const only = process.argv[2] ? Number(process.argv[2]) : null;
for (const level of levels) {
  if (only && level.id !== only) continue;
  console.log(`\nNiveau ${level.id} — ${level.title}`);
  // (`npm run check -- 6 goals` ne vérifie que les objectifs du niveau 6)
  if (process.argv[3] !== 'goals') {
    if (checks[level.id]) checks[level.id](level);
    else check(false, 'aucune vérification écrite pour ce niveau');
    checkNoInstantWin(level);
    checkScenery(level);
  }
  checkGoals(level);
}

console.log(failed ? `\n${failed} vérification(s) en échec.` : '\nTous les niveaux sont bons.');
process.exit(failed ? 1 : 0);
