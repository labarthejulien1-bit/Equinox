// Moteur de lumière : c'est le cœur d'Equinox.
//
// Tout repose sur une seule idée : lancer des rayons contre des segments.
//  - Un « segment » est un morceau de bord d'un objet qui bloque la lumière :
//    { a: {x, y}, b: {x, y}, owner: <à qui appartient ce bord> }
//  - visibilityPolygon() calcule la zone éclairée par une source ponctuelle.
//  - traceBeams() calcule les faisceaux renvoyés par les miroirs.
//
// Ce fichier ne dessine rien et ne connaît pas le navigateur : on peut le
// tester avec Node (voir scripts/check-level.mjs).

/**
 * Intersection d'un rayon (origine o, direction d) avec un segment.
 * Renvoie la distance t le long du rayon (en multiples de d), ou Infinity.
 */
function raySegment(ox, oy, dx, dy, s) {
  const sx = s.b.x - s.a.x;
  const sy = s.b.y - s.a.y;
  const den = dx * sy - dy * sx;
  if (Math.abs(den) < 1e-12) return Infinity; // parallèles
  const t = ((s.a.x - ox) * sy - (s.a.y - oy) * sx) / den;
  const u = ((s.a.x - ox) * dy - (s.a.y - oy) * dx) / den;
  if (t > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9) return t;
  return Infinity;
}

/** Lance un rayon et renvoie le premier segment touché : { t, seg }. */
export function castRay(ox, oy, dx, dy, segs, ignoreOwner = null) {
  let best = Infinity;
  let hit = null;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.owner === ignoreOwner) continue;
    const t = raySegment(ox, oy, dx, dy, s);
    if (t < best) {
      best = t;
      hit = s;
    }
  }
  return { t: best, seg: hit };
}

/**
 * De combien la lumière « mord » dans l'objet touché.
 * Elle s'enfonce de depthOf(owner) au plus, sans jamais ressortir de l'objet.
 * C'est ce qui dessine le liseré éclairé sur la neige, la roche, les nuages.
 */
function bite(ox, oy, dx, dy, hit, segs, depthOf) {
  if (!depthOf || !hit.seg) return 0;
  const depth = depthOf(hit.seg.owner);
  if (!depth) return 0;
  let exit = Infinity;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.owner !== hit.seg.owner) continue;
    const t = raySegment(ox, oy, dx, dy, s);
    if (t > hit.t + 1e-4 && t < exit) exit = t;
  }
  return Math.min(depth, exit - hit.t);
}

/** Vrai si quelque chose bloque la ligne droite entre a et b. */
export function isBlocked(ax, ay, bx, by, segs, ignoreOwner = null) {
  const dx = bx - ax;
  const dy = by - ay;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.owner === ignoreOwner) continue;
    if (raySegment(ax, ay, dx, dy, s) < 1 - 1e-6) return true;
  }
  return false;
}

/** Transforme un polygone fermé en segments appartenant à `owner`. */
export function polygonSegments(points, owner, out = []) {
  for (let i = 0; i < points.length; i++) {
    out.push({ a: points[i], b: points[(i + 1) % points.length], owner });
  }
  return out;
}

/**
 * Zone visible (= éclairée) depuis un point.
 * Algorithme classique : on vise chaque extrémité de segment (et juste à côté),
 * on garde le premier obstacle touché, puis on relie les points dans l'ordre.
 * Renvoie { points, owners } — owners liste les objets touchés par la lumière.
 * Si depthOf est fourni, le polygone s'enfonce un peu dans les objets touchés.
 */
export function visibilityPolygon(ox, oy, segs, depthOf = null) {
  const angles = [];
  const E = 1e-4;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const a1 = Math.atan2(s.a.y - oy, s.a.x - ox);
    const a2 = Math.atan2(s.b.y - oy, s.b.x - ox);
    angles.push(a1 - E, a1, a1 + E, a2 - E, a2, a2 + E);
  }
  for (let i = 0; i < angles.length; i++) {
    if (angles[i] < -Math.PI) angles[i] += Math.PI * 2;
    else if (angles[i] > Math.PI) angles[i] -= Math.PI * 2;
  }
  angles.sort((a, b) => a - b);

  const points = [];
  const owners = new Set();
  for (let i = 0; i < angles.length; i++) {
    const dx = Math.cos(angles[i]);
    const dy = Math.sin(angles[i]);
    const h = castRay(ox, oy, dx, dy, segs);
    if (!h.seg) continue;
    const t = h.t + bite(ox, oy, dx, dy, h, segs, depthOf);
    points.push({ x: ox + dx * t, y: oy + dy * t });
    owners.add(h.seg.owner);
  }
  return { points, owners };
}

/** Extrémités et vecteurs utiles d'un miroir { x, y, angle, len }. */
export function mirrorGeometry(m) {
  const ux = Math.cos(m.angle);
  const uy = Math.sin(m.angle);
  const h = m.len / 2;
  return {
    a: { x: m.x - ux * h, y: m.y - uy * h },
    b: { x: m.x + ux * h, y: m.y + uy * h },
    u: { x: ux, y: uy }, // direction du miroir
    n: { x: -uy, y: ux }, // normale (perpendiculaire)
  };
}

/**
 * Calcule tous les faisceaux renvoyés par les miroirs.
 *
 * Chaque miroir est découpé en `slices` tranches. Une tranche éclairée renvoie
 * un rayon ; cela permet des faisceaux partiellement coupés par une ombre.
 *
 * @param sun     position du soleil {x, y}, ou null s'il est caché
 * @param mirrors miroirs actifs (libres de glace)
 * @param segs    tous les segments qui bloquent la lumière (miroirs inclus,
 *                avec owner === l'objet miroir)
 * @param lamps   petites sources proches [{ x, y, range, owner }] : elles
 *                n'éclairent que les miroirs à moins de `range` d'elles
 *                (owner = l'objet qui porte la lampe, s'il bloque la lumière)
 * @returns liste de faisceaux { mirror, dir, slices: [{lit, t, reach, owner, p}], geo, fromLamp }
 */
export function traceBeams(sun, mirrors, segs, slices = 12, depthOf = null, lamps = []) {
  const beams = [];
  const done = new Set(); // évite qu'un même miroir soit rallumé en boucle

  function emit(mirror, dIn, isLit, depth, fromLamp = false) {
    const geo = mirrorGeometry(mirror);
    const dn = dIn.x * geo.n.x + dIn.y * geo.n.y;
    if (Math.abs(dn) < 0.03) return; // lumière rasante : pas de reflet
    // Loi de la réflexion : d' = d − 2 (d·n) n
    const dir = { x: dIn.x - 2 * dn * geo.n.x, y: dIn.y - 2 * dn * geo.n.y };

    const beam = { mirror, dir, geo, slices: [], depth, fromLamp };
    let any = false;
    for (let i = 0; i < slices; i++) {
      const k = ((i + 0.5) / slices) * mirror.len;
      const p = { x: geo.a.x + geo.u.x * k, y: geo.a.y + geo.u.y * k };
      const lit = isLit(p);
      let t = 0; // distance jusqu'à l'obstacle
      let reach = 0; // idem + la profondeur où la lumière mord dedans
      let owner = null;
      if (lit) {
        const h = castRay(p.x, p.y, dir.x, dir.y, segs, mirror);
        t = h.t;
        owner = h.seg ? h.seg.owner : null;
        reach = t + bite(p.x, p.y, dir.x, dir.y, h, segs, depthOf);
        any = true;
      }
      beam.slices.push({ lit, t, reach, owner, p });
    }
    if (!any) return;
    beams.push(beam);

    // Ce faisceau touche-t-il d'autres miroirs ? Si oui, ils renvoient à leur tour.
    if (depth >= 6) return;
    for (const other of mirrors) {
      if (other === mirror) continue;
      if (!beam.slices.some((s) => s.lit && s.owner === other)) continue;
      const key = mirrors.indexOf(mirror) + '>' + mirrors.indexOf(other) + (fromLamp ? 'L' : '');
      if (done.has(key)) continue;
      done.add(key);
      // Une tranche du miroir suivant est éclairée si, en remontant le rayon,
      // on retombe sur une tranche éclairée du miroir précédent.
      const litByBeam = (q) => {
        const h = castRay(q.x, q.y, -dir.x, -dir.y, segs, other);
        if (!h.seg || h.seg.owner !== mirror) return false;
        const hx = q.x - dir.x * h.t;
        const hy = q.y - dir.y * h.t;
        const k = ((hx - geo.a.x) * geo.u.x + (hy - geo.a.y) * geo.u.y) / mirror.len;
        const idx = Math.max(0, Math.min(slices - 1, Math.floor(k * slices)));
        return beam.slices[idx].lit;
      };
      emit(other, dir, litByBeam, depth + 1, fromLamp);
    }
  }

  if (sun) {
    for (const m of mirrors) {
      const dx = m.x - sun.x;
      const dy = m.y - sun.y;
      const d = Math.hypot(dx, dy) || 1;
      const litBySun = (p) => !isBlocked(sun.x, sun.y, p.x, p.y, segs, m);
      emit(m, { x: dx / d, y: dy / d }, litBySun, 0);
    }
  }
  // Les lampes : comme le soleil, mais de près seulement.
  for (const lamp of lamps) {
    const others = lamp.owner ? segs.filter((s) => s.owner !== lamp.owner) : segs;
    for (const m of mirrors) {
      const dx = m.x - lamp.x;
      const dy = m.y - lamp.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > lamp.range) continue;
      const litByLamp = (p) => !isBlocked(lamp.x, lamp.y, p.x, p.y, others, m);
      emit(m, { x: dx / d, y: dy / d }, litByLamp, 0, true);
    }
  }
  return beams;
}

/**
 * Transforme un faisceau en polygones à dessiner (un par groupe de tranches
 * éclairées voisines).
 */
export function beamPolygons(beam) {
  const polys = [];
  const n = beam.slices.length;
  const w = beam.mirror.len / n;
  const { a, u } = beam.geo;
  const d = beam.dir;
  let i = 0;
  while (i < n) {
    if (!beam.slices[i].lit) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && beam.slices[j + 1].lit) j++;
    const pts = [];
    pts.push({ x: a.x + u.x * w * i, y: a.y + u.y * w * i });
    pts.push({ x: a.x + u.x * w * (j + 1), y: a.y + u.y * w * (j + 1) });
    for (let k = j; k >= i; k--) {
      const t = Math.min(beam.slices[k].reach, 5000);
      const x1 = a.x + u.x * w * (k + 1);
      const y1 = a.y + u.y * w * (k + 1);
      const x0 = a.x + u.x * w * k;
      const y0 = a.y + u.y * w * k;
      pts.push({ x: x1 + d.x * t, y: y1 + d.y * t });
      pts.push({ x: x0 + d.x * t, y: y0 + d.y * t });
    }
    polys.push(pts);
    i = j + 1;
  }
  return polys;
}

/** Angle à donner à un miroir pour renvoyer une lumière venant de `from` vers `to`. */
export function aimMirror(mirror, dIn, to) {
  const ox = to.x - mirror.x;
  const oy = to.y - mirror.y;
  const o = Math.hypot(ox, oy) || 1;
  // La normale du miroir est la bissectrice entre le rayon sortant et −entrant.
  const nx = ox / o - dIn.x;
  const ny = oy / o - dIn.y;
  return Math.atan2(ny, nx) + Math.PI / 2;
}
