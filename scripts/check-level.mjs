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

// ── Lancement ─────────────────────────────────────────────────────────

const checks = { 1: checkLevel1, 2: checkLevel2, 3: checkLevel3, 4: checkLevel4 };
for (const level of levels) {
  console.log(`\nNiveau ${level.id} — ${level.title}`);
  if (checks[level.id]) checks[level.id](level);
  else check(false, 'aucune vérification écrite pour ce niveau');
}

console.log(failed ? `\n${failed} vérification(s) en échec.` : '\nTous les niveaux sont bons.');
process.exit(failed ? 1 : 0);
