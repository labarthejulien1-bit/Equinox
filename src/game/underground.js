// L'eau dans la roche, dessinée « en coupe » : d'où elle vient, où elle repart.
//
// Règle du jeu d'Equinox : l'eau a toujours une origine et une sortie
// visibles. Ce fichier dessine ces deux bouts, à l'intérieur de la roche :
//
//   veins     une veine d'amont : une fissure prise par la glace, qui se met
//             à couler quand la glace qu'elle nourrit a fondu
//             { after: 'id de la glace', path: [[x, y]…], width, pocket: [[x, y]…] }
//             (pocket : une poche de glace d'où part la fissure, si l'on veut ;
//             width 3 donne un filet fin, 5 ou 6 une vraie fissure)
//             Sans `after`, la veine coule toujours.
//
//   aquifers  une nappe d'aval : l'eau d'un cours d'eau s'infiltre (inlet),
//             remplit une grotte (cavern, du niveau low au niveau high), puis
//             le trop-plein repart par un filet (outlet). Sans grotte, c'est
//             un simple boyau : l'eau s'y enfonce et sort de l'écran.
//             Si le cours d'eau quitte la surface au pied d'une falaise
//             (`drain` sans `floor`), commencer `inlet` à cet endroit, à
//             l'horizontale, puis le courber : le boyau prolonge le torrent.
//             { stream: 'id du cours d'eau', inlet, cavern, low, high, fillTime,
//               outlet, stalactites: [[x, y, longueur]…] }
//
// Tout cela est du décor : rien ici ne bloque la lumière ni ne change
// l'énigme. Où en est l'eau (remplissage, filets) est tenu par life.js.

const P2 = ([x, y]) => ({ x, y });
const STREAM_WIDTH = 4.6; // la largeur d'un torrent en surface (voir drawRun dans render.js)

function line(c, pts) {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
}

function poly(c, pts) {
  line(c, pts);
  c.closePath();
}

const lengthOf = (pts) => pts.reduce((sum, p, i) => (i ? sum + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

/**
 * Un boyau creusé dans la roche, le long de pts.
 * state : 'dry' (vide), 'ice' (pris par la glace) ou 'water'.
 * front : jusqu'où l'eau est arrivée, de 0 à 1.
 * waterWidth : la largeur du filet d'eau, s'il doit remplir le boyau.
 */
function gallery(c, P, g, pts, width, state, front = 1, waterWidth = 0) {
  // (un boyau qui prolonge un torrent s'ouvre à ras de la falaise : bouts droits)
  c.lineCap = waterWidth ? 'butt' : 'round';
  c.lineJoin = 'round';
  c.strokeStyle = P.caveBack;
  c.lineWidth = width;
  line(c, pts);
  c.stroke();
  if (state === 'ice') {
    c.strokeStyle = P.ice;
    c.lineWidth = Math.max(1.4, width - 2.5);
    c.stroke();
    // (un filet fin n'a pas la place pour des reflets)
    if (width > 4) {
      c.strokeStyle = P.iceLine;
      c.lineWidth = 0.7;
      c.setLineDash([3, 7]);
      c.lineDashOffset = 0;
      c.stroke();
      c.setLineDash([]);
    }
  } else if (state === 'water' && front > 0) {
    // Le filet d'eau, dessiné seulement jusqu'à son front
    const reach = lengthOf(pts) * front;
    c.strokeStyle = P.water;
    c.lineWidth = waterWidth || Math.max(1.3, width - 3.5);
    c.lineDashOffset = 0;
    c.setLineDash([reach, 99999]);
    c.stroke();
    // Reflets qui filent (une fois le boyau plein)
    if (front >= 1) {
      c.strokeStyle = P.iceLine;
      c.globalAlpha = 0.7;
      c.lineWidth = 0.8;
      c.setLineDash([4, 9]);
      c.lineDashOffset = -g.time * 26;
      c.stroke();
      c.globalAlpha = 1;
    }
    c.setLineDash([]);
    c.lineDashOffset = 0;
  }
}

/** À dessiner juste après la roche du sol (c'est une coupe : on voit à l'intérieur). */
export function drawUnderground(c, P, g) {
  const L = g.level;

  // ── En amont : les veines ──
  for (const v of L.veins || []) {
    const ice = g.ices.find((i) => i.def.id === v.after);
    const melted = !ice || ice.gone;
    if (v.pocket) {
      const pts = v.pocket.map(P2);
      c.lineJoin = 'round';
      c.strokeStyle = P.caveBack;
      c.lineWidth = 2.5;
      poly(c, pts);
      c.stroke();
      c.fillStyle = melted ? P.water : P.ice;
      c.fill();
    }
    gallery(c, P, g, v.path.map(P2), v.width || 5.5, melted ? 'water' : 'ice');
  }

  // ── En aval : les nappes ──
  (L.aquifers || []).forEach((def, i) => {
    // (sans life.js, par exemple dans un test, la nappe reste vide)
    const a = (g.life && g.life.aquifers[i]) || { inlet: 0, fill: 0, outlet: 0 };
    if (!def.cavern) {
      // Pas de grotte : l'eau suit son boyau et quitte l'écran
      gallery(c, P, g, def.inlet.map(P2), 6, a.inlet > 0 ? 'water' : 'dry', a.inlet);
      return;
    }
    const cavern = def.cavern.map(P2);
    const xs = cavern.map((p) => p.x);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);

    // Le filet qui repart, puis la grotte, puis le filet qui arrive
    if (def.outlet) gallery(c, P, g, def.outlet.map(P2), 5, a.outlet > 0 ? 'water' : 'dry', a.outlet);
    c.fillStyle = P.caveBack;
    poly(c, cavern);
    c.fill();
    // Si le torrent entre par le pied d'une falaise (`drain` sans `floor`), le
    // boyau le prolonge : même diamètre partout, et l'eau garde sa largeur.
    const stream = (L.streams || []).find((st) => st.id === def.stream);
    const mouth = stream && stream.drain && !stream.drain.floor;
    gallery(c, P, g, def.inlet.map(P2), mouth ? 6.6 : 6, a.inlet > 0 ? 'water' : 'dry', a.inlet, mouth ? STREAM_WIDTH : 0);

    // L'eau de la nappe : elle monte de low à high
    if (a.fill > 0) {
      const level = def.low + (def.high - def.low) * a.fill;
      c.save();
      poly(c, cavern);
      c.clip();
      c.fillStyle = P.water;
      c.fillRect(x0 - 2, level, x1 - x0 + 4, def.low - level + 30);
      // reflets en surface
      c.fillStyle = P.iceLine;
      c.globalAlpha = 0.6;
      for (let k = 0; k < 5; k++) {
        const x = x0 + 4 + ((k * 37 + Math.sin(g.time * 0.8 + k) * 6 + 400) % Math.max(1, x1 - x0 - 14));
        c.fillRect(x, level + 1.5 + (k % 3) * 3, 5 + (k % 2) * 3, 0.9);
      }
      c.restore();
      c.globalAlpha = 1;
    }

    // Stalactites, et le bord de la grotte
    c.fillStyle = P.rock;
    for (const [x, y, h] of def.stalactites || []) {
      poly(c, [
        { x: x - 2.4, y },
        { x: x + 2.4, y },
        { x, y: y + h },
      ]);
      c.fill();
    }
    c.strokeStyle = P.rockRim;
    c.lineWidth = 1.2;
    c.lineJoin = 'round';
    poly(c, cavern);
    c.stroke();
  });
}
