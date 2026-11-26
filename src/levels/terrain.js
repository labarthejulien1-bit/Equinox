// Outils pour dessiner le relief d'un niveau.
//
// Le sol d'un niveau est un seul grand polygone. Pour qu'il reste lisible, on
// l'écrit comme une suite de TRONÇONS nommés, de la gauche vers la droite :
//
//   const relief = terrain([
//     { pts: [[-3000, 300], [40, 320]], rough: 1, snow: true },  // un versant enneigé
//     { pts: [[40, 320], [60, 300], [80, 330]], cave: true },    // le plafond d'une grotte
//     …
//   ]);
//
// Chaque tronçon commence là où le précédent finit. terrain() renvoie
// { ground, snow, caves } : ce qu'attend le jeu.
//
//   rough: n   casse les lignes droites pour faire un relief naturel
//              (n est un numéro au choix : il change le dessin des cassures)
//   snow       ce tronçon est couvert de neige
//   cave       ce tronçon borde une grotte (les tronçons « cave » qui se
//              suivent forment une seule grotte, dessinée derrière le sol)

const hash = (i) => {
  const v = Math.sin(i * 127.1 + 11.7) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * Rend une ligne moins rectiligne : on coupe chaque segment en deux en
 * décalant un peu son milieu, et on recommence (depth fois).
 */
export function rough(pts, seed = 1, amp = 0.05, depth = 2) {
  let out = pts;
  for (let d = 0; d < depth; d++) {
    const next = [];
    for (let i = 0; i < out.length - 1; i++) {
      const a = out[i];
      const b = out[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      next.push(a);
      if (len > 14 && len < 600) {
        const k = (hash(seed * 13.1 + i * 7.7 + d * 3.3) - 0.5) * 2 * amp * len;
        next.push([(a[0] + b[0]) / 2 - ((b[1] - a[1]) / len) * k, (a[1] + b[1]) / 2 + ((b[0] - a[0]) / len) * k]);
      }
    }
    next.push(out[out.length - 1]);
    out = next;
  }
  return out;
}

/** Assemble les tronçons en un polygone, et repère la neige et les grottes. */
export function terrain(parts) {
  const ground = [{ x: -3000, y: 3000 }];
  const snow = [];
  const caves = [];
  let cave = null;
  for (const part of parts) {
    const pts = part.rough ? rough(part.pts, part.rough, part.amp, part.depth) : part.pts;
    // Le premier point d'un tronçon est le dernier du précédent : on ne le répète pas.
    const last = ground[ground.length - 1];
    const skip = last.x === pts[0][0] && last.y === pts[0][1] ? 1 : 0;
    const from = ground.length - skip;
    for (const [x, y] of pts.slice(skip)) ground.push({ x, y });
    const to = ground.length - 1;
    if (part.snow) snow.push([from, to]);
    if (part.cave) {
      if (cave) cave[1] = to;
      else caves.push((cave = [from, to]));
    } else cave = null;
  }
  ground.push({ x: 3000, y: 3000 });
  return { ground, snow, caves };
}
