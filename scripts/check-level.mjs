// Vérifie automatiquement que le niveau 1 est juste :
//   npm run check
//
//  1. aucun raccourci : le soleil seul ne peut ni faire fondre le glacier,
//     ni allumer le temple, quelle que soit sa position ou celle du nuage ;
//  2. la solution prévue fonctionne de bout en bout.

import level from '../src/levels/level1.js';
import { createGame, update, computeLight, sunPosition } from '../src/game/game.js';
import { aimMirror } from '../src/engine/light.js';
import { rad } from '../src/engine/vec.js';

let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? '✔' : '✘'} ${label}`);
  if (!ok) failed++;
};

// ── 1. Pas de raccourci ───────────────────────────────────────────────
{
  let iceBySun = 0;
  let crystalBySun = 0;
  let hiddenCount = 0;
  let total = 0;
  for (const gone of [false, true]) {
    const g = createGame(level);
    g.ice.gone = gone;
    g.door.open = 1; // cas le plus défavorable : porte ouverte
    for (let a = level.sun.min; a <= level.sun.max; a += 1) {
      for (let x = level.cloud.minX; x <= level.cloud.maxX; x += 8) {
        g.sunAngle = rad(a);
        g.cloudX = x;
        const light = computeLight(g);
        total++;
        if (light.sunHidden) hiddenCount++;
        if (light.sunPoly && !gone && light.iceExposure > 0) iceBySun++;
        if (light.crystalLit) crystalBySun++;
      }
    }
  }
  check(iceBySun === 0, `le soleil direct n'atteint jamais le glacier (${iceBySun}/${total})`);
  check(crystalBySun === 0, `le soleil direct n'atteint jamais le cristal (${crystalBySun}/${total})`);
  check(hiddenCount > 0 && hiddenCount < total, 'le soleil peut se cacher derrière la montagne');
}

// ── 2. La solution prévue ─────────────────────────────────────────────
{
  const g = createGame(level);
  const run = (seconds) => {
    for (let t = 0; t < seconds; t += 1 / 30) update(g, 1 / 30);
  };
  const village = g.mirrors.find((m) => m.id === 'village');
  const glacier = g.mirrors.find((m) => m.id === 'glacier');
  const crystal = level.temple.crystal;

  run(1);
  check(!village.lit, 'au départ, tout est dans l’ombre');

  // Étape 1 : sortir le soleil. Le nuage fait encore de l'ombre au village.
  g.sunAngle = rad(92);
  run(0.5);
  check(!village.lit, 'soleil au zénith : le nuage garde le miroir du village dans l’ombre');
  g.cloudX = 60;
  run(0.5);
  check(village.lit, 'nuage écarté : le miroir du village reçoit le soleil');

  // Étape 2 : viser le glacier avec le miroir du village.
  const sun = sunPosition(g);
  const dSun = { x: village.x - sun.x, y: village.y - sun.y };
  const n = Math.hypot(dSun.x, dSun.y);
  dSun.x /= n;
  dSun.y /= n;
  village.angle = aimMirror(village, dSun, glacier);
  run(1);
  check(g.ice.melt > 0 && !g.ice.gone, 'le faisceau fait fondre le glacier');
  check(g.temple.charge === 0, 'le temple reste éteint pendant la fonte');
  run(4);
  check(g.ice.gone && glacier.free, 'glacier fondu : le miroir ancien est libéré');
  run(8);
  check(g.water.river >= 1, 'l’eau a rejoint la vallée');
  check(g.door.open >= 1, 'la roue a ouvert la porte du temple');
  check(glacier.lit, 'le miroir du glacier reçoit le faisceau du village');

  // Étape 3 : viser le temple avec le miroir du glacier.
  const dIn = { x: glacier.x - village.x, y: glacier.y - village.y };
  const k = Math.hypot(dIn.x, dIn.y);
  dIn.x /= k;
  dIn.y /= k;
  glacier.angle = aimMirror(glacier, dIn, crystal);
  run(3);
  check(g.temple.lit, 'le temple s’allume');
  run(10);
  check(g.thaw > 0.9, 'le monde dégèle');

  // Tolérance de visée : de combien de degrés peut-on se tromper ?
  const tol = (mirror, test) => {
    const base = mirror.angle;
    let ok = 0;
    for (let d = -15; d <= 15; d += 0.25) {
      mirror.angle = base + rad(d);
      if (test(computeLight(g))) ok += 0.25;
    }
    mirror.angle = base;
    return ok;
  };
  const t1 = tol(village, () => glacier.lit);
  const t2 = tol(glacier, (l) => l.crystalLit);
  console.log(`  tolérance de visée : village ${t1}°, glacier ${t2}°`);
  check(t1 >= 3 && t2 >= 3, 'la visée reste confortable au doigt (≥ 3°)');
}

console.log(failed ? `\n${failed} vérification(s) en échec.` : '\nNiveau 1 : tout est bon.');
process.exit(failed ? 1 : 0);
