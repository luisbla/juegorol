// figuras.js — personas con esqueleto. Cada figura es una sola malla continua con huesos dentro:
// rodillas, codos y cintura doblan, y la ropa sigue al cuerpo. Todo sale de este código, sin modelos de fuera.
//
//   const f = crearFigura({ color: 0x7a3b2e, tocado: 'capucha', lleva: 'hacha' });
//   escena.add(f.grupo);            // de pie en el origen, mirando a +z
//   f.estado.brazos = 'golpea';     // qué hace con el cuerpo (ver BRAZOS)
//   f.actualizar(t);                // cada cuadro; si el grupo se mueve, echa a andar sola
//
// Para las calles de las ciudades, donde hay cientos, hornear() saca el ciclo de andar como geometrías fijas
// que se dibujan instanciadas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const PIELES = [0xf0cdb0, 0xe6bb96, 0xd0a27c, 0xa87a56], PELOS = [0x2a1f18, 0x5a3a22, 0x8a6a3a, 0x1a1a1a, 0xb8b0a4, 0x7a3a1e];
const CUERO = 0x2e2218, ACERO = 0x9aa0aa, PAJA = 0xd8bf7a, MADERA = 0x6a5039, OSCURO = 0x1a1410;
const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide });

// Esqueleto en reposo (de pie, brazos caídos). D es la derecha de la figura (−x), I la izquierda (+x).
const ESQ = [
  ['cadera', -1, 0, 0.96, 0], ['espina', 0, 0, 1.1, 0], ['pecho', 1, 0, 1.3, 0], ['cuello', 2, 0, 1.55, 0], ['cabeza', 3, 0, 1.62, 0],
  ['brazoD', 2, -0.236, 1.47, 0], ['anteD', 5, -0.252, 1.19, 0], ['manoD', 6, -0.266, 0.92, 0],
  ['brazoI', 2, 0.236, 1.47, 0], ['anteI', 8, 0.252, 1.19, 0], ['manoI', 9, 0.266, 0.92, 0],
  ['musloD', 0, -0.1, 0.94, 0], ['espiD', 11, -0.096, 0.5, 0], ['pieD', 12, -0.092, 0.08, 0],
  ['musloI', 0, 0.1, 0.94, 0], ['espiI', 14, 0.096, 0.5, 0], ['pieI', 15, 0.092, 0.08, 0],
  ['capa', 2, 0, 1.5, -0.1],
];
const N = Object.fromEntries(ESQ.map((e, i) => [e[0], i]));

/* ---------- el taller: junta vértices con color y pesos, y cose tubos, casquetes y paños ---------- */
function taller(rnd, neutro) {
  const P = [], C = [], SI = [], SW = [], Z = [], I = [], col = new THREE.Color(), a = new THREE.Vector3(), b = new THREE.Vector3(), n = new THREE.Vector3();
  let ruido = 0.07;
  // zona: 0 color fijo · 1 ropa · 2 pelo · 3 piel (en las figuras horneadas esas zonas van en blanco y se tiñen por persona)
  const v = (x, y, z, color, pesos, zona = 0) => {
    const k = 1 + (rnd() - 0.5) * ruido;
    if (neutro && zona) col.setRGB(k, k, k); else { col.setHex(color); col.multiplyScalar(k); }
    P.push(x, y, z); C.push(col.r, col.g, col.b); Z.push(zona);
    let suma = 0; for (let i = 0; i < 4; i++) suma += pesos[i]?.[1] ?? 0;
    for (let i = 0; i < 4; i++) { SI.push(pesos[i]?.[0] ?? 0); SW.push((pesos[i]?.[1] ?? 0) / suma); }
    return P.length / 3 - 1;
  };
  // triángulo que mira hacia fuera visto desde un punto de dentro
  const tri = (i, j, k, cx, cy, cz) => {
    a.set(P[j * 3] - P[i * 3], P[j * 3 + 1] - P[i * 3 + 1], P[j * 3 + 2] - P[i * 3 + 2]); b.set(P[k * 3] - P[i * 3], P[k * 3 + 1] - P[i * 3 + 1], P[k * 3 + 2] - P[i * 3 + 2]); n.crossVectors(a, b);
    const fx = (P[i * 3] + P[j * 3] + P[k * 3]) / 3 - cx, fy = (P[i * 3 + 1] + P[j * 3 + 1] + P[k * 3 + 1]) / 3 - cy, fz = (P[i * 3 + 2] + P[j * 3 + 2] + P[k * 3 + 2]) / 3 - cz;
    if (n.x * fx + n.y * fy + n.z * fz < 0) I.push(i, k, j); else I.push(i, j, k);
  };
  const pesosDe = (p, c, s) => typeof p === 'function' ? p(c, s) : p;
  // tubo: secciones [x, y, z, rx, rz, color, pesos, zona] con el anillo tumbado en XZ (o de pie en XY si eje es 'z')
  const tubo = (secs, { n: lados = 8, eje = 'y', tapas = true } = {}) => {
    const anillos = secs.map(([x, y, z, rx, rz, color, pesos, zona]) => { const r = []; for (let k = 0; k < lados; k++) { const an = k / lados * 6.2832, c = Math.cos(an), s = Math.sin(an); r.push(eje === 'y' ? v(x + rx * c, y, z + rz * s, color, pesosDe(pesos, c, s), zona) : v(x + rx * c, y + rz * s, z, color, pesosDe(pesos, c, s), zona)); } return r; });
    for (let j = 0; j < secs.length - 1; j++) { const A = secs[j], B = secs[j + 1], cx = (A[0] + B[0]) / 2, cy = (A[1] + B[1]) / 2, cz = (A[2] + B[2]) / 2; for (let k = 0; k < lados; k++) { const k2 = (k + 1) % lados; tri(anillos[j][k], anillos[j + 1][k], anillos[j][k2], cx, cy, cz); tri(anillos[j][k2], anillos[j + 1][k], anillos[j + 1][k2], cx, cy, cz); } }
    if (tapas) for (const [j, j2] of [[0, 1], [secs.length - 1, secs.length - 2]]) { const S = secs[j], T = secs[j2], c = v(S[0], S[1], S[2], S[5], pesosDe(S[6], 0, 0), S[7]); for (let k = 0; k < lados; k++) tri(c, anillos[j][k], anillos[j][(k + 1) % lados], T[0], T[1], T[2]); }
  };
  // casquete: trozo de esfera; hasta(φ) dice cuánto baja por cada lado y cae(φ) cuánto cuelga después (pelo largo, capucha)
  const casquete = (cx, cy, cz, rx, ry, rz, color, pesos, zona, hasta, { cae = () => 0, pesosCaida = pesos, lados = 10, filas = 4, colgantes = 2, vuelo = 0 } = {}) => {
    const g = [];
    for (let j = 0; j <= filas + colgantes; j++) { const fila = []; for (let i = 0; i < lados; i++) { const fi = i / lados * 6.2832, th = Math.min(j, filas) / filas * hasta(fi), k = j > filas ? (j - filas) / colgantes : 0, baja = k * cae(fi), abre = 1 + k * vuelo * (cae(fi) > 0 ? 1 : 0); fila.push(v(cx + rx * Math.sin(th) * Math.cos(fi) * abre, cy + ry * Math.cos(th) - baja, cz + rz * Math.sin(th) * Math.sin(fi) * abre, color, j > filas ? pesosCaida : pesos, zona)); } g.push(fila); }
    for (let j = 0; j < filas + colgantes; j++) for (let i = 0; i < lados; i++) { const i2 = (i + 1) % lados; tri(g[j][i], g[j + 1][i], g[j][i2], cx, cy, cz); tri(g[j][i2], g[j + 1][i], g[j + 1][i2], cx, cy, cz); }
  };
  // paño: rejilla de puntos f(i, j) → [x, y, z, pesos]; "dentro" es un punto del lado que no se ve
  const pano = (filas, cols, f, color, zona, dentro) => {
    const g = []; for (let j = 0; j <= filas; j++) { const fila = []; for (let i = 0; i <= cols; i++) { const [x, y, z, pesos] = f(i / cols, j / filas); fila.push(v(x, y, z, color, pesos, zona)); } g.push(fila); }
    for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) { tri(g[j][i], g[j + 1][i], g[j][i + 1], ...dentro); tri(g[j][i + 1], g[j + 1][i], g[j + 1][i + 1], ...dentro); }
  };
  const caja = (x, y, z, w, h, d, color, pesos, zona = 0) => {
    const q = []; for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) q.push(v(x + sx * w / 2, y + sy * h / 2, z + sz * d / 2, color, pesos, zona));
    for (const [i, j, k, l] of [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]]) { tri(q[i], q[j], q[k], x, y, z); tri(q[i], q[k], q[l], x, y, z); }
  };
  const geometria = () => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
    if (neutro) g.setAttribute('zona', new THREE.Float32BufferAttribute(Z, 1));
    g.setIndex(I); g.computeVertexNormals(); return g;
  };
  return { tubo, casquete, pano, caja, geometria, ruido: r => { ruido = r; } };
}

/* ---------- utensilios: piezas rígidas que cuelgan de un hueso ---------- */
const pintada = (g, color) => { const c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; };
const barra = (r, largo, color, eje = 'z', lados = 6) => { const g = new THREE.CylinderGeometry(r, r, largo, lados); if (eje === 'z') g.rotateX(Math.PI / 2); return pintada(g, color); };
const bloque = (w, h, d, color) => pintada(new THREE.BoxGeometry(w, h, d), color);
// En la mano: el origen es la muñeca; la palma queda en y = −0.07. Con el brazo caído, +z es hacia delante;
// con el antebrazo horizontal, +z es hacia arriba. Los mangos van por z; las astas, por y.
const UTENSILIOS = {
  martillo: () => [barra(0.013, 0.34, MADERA).translate(0, -0.07, 0.1), bloque(0.06, 0.07, 0.12, 0x55585e).translate(0, -0.07, 0.27)],
  hacha: () => [barra(0.014, 0.62, MADERA).translate(0, -0.07, 0.24), bloque(0.02, 0.2, 0.13, ACERO).translate(0, -0.15, 0.5)],
  pico: () => [barra(0.015, 0.72, MADERA).translate(0, -0.07, 0.28), bloque(0.035, 0.44, 0.04, 0x4a4d54).translate(0, -0.07, 0.63)],
  azada: () => [barra(0.014, 0.9, MADERA).translate(0, -0.07, 0.36), bloque(0.13, 0.16, 0.02, 0x4a4d54).translate(0, -0.15, 0.8)],
  lanza: () => [barra(0.013, 2.05, MADERA, 'y').translate(0, 0.17, 0.035), pintada(new THREE.ConeGeometry(0.03, 0.2, 5), ACERO).translate(0, 1.29, 0.035)],
  cayado: () => [barra(0.016, 1.55, MADERA, 'y').translate(0, -0.08, 0.035)],
  percha: () => [barra(0.016, 3.6, MADERA, 'y').translate(0, -0.9, 0).rotateX(1.25).translate(0, -0.07, 0.03)],
  escoba: () => [barra(0.013, 1.25, MADERA, 'y').translate(0, -0.35, 0.035), pintada(new THREE.CylinderGeometry(0.03, 0.1, 0.26, 6), PAJA).translate(0, -1.08, 0.035)],
  jarra: () => [pintada(new THREE.CylinderGeometry(0.036, 0.032, 0.1, 8).rotateX(Math.PI / 2), 0xc9b06a).translate(0, -0.075, 0.06), bloque(0.012, 0.05, 0.05, 0xc9b06a).translate(0.04, -0.075, 0.06)],
  pluma: () => [barra(0.006, 0.16, 0xe8e4d8).translate(0, -0.08, 0.07)],
  cubo: () => [pintada(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 8), MADERA).translate(0, -0.3, 0), barra(0.006, 0.16, CUERO, 'y').translate(0, -0.16, 0)],
  farol: () => [bloque(0.08, 0.12, 0.08, 0xd9a23a).translate(0, -0.26, 0), barra(0.006, 0.14, CUERO, 'y').translate(0, -0.14, 0)],
  cesta: () => [pintada(new THREE.CylinderGeometry(0.14, 0.1, 0.14, 8), 0xa88a52).translate(0, -0.26, 0.02), barra(0.008, 0.16, 0xa88a52, 'y').translate(0, -0.14, 0.02)],
  espada: () => [bloque(0.012, 0.05, 0.62, ACERO).translate(0, -0.07, 0.38), bloque(0.02, 0.14, 0.025, 0x8a7a48).translate(0, -0.07, 0.07), barra(0.014, 0.12, CUERO).translate(0, -0.07, 0)],
};
// Lo que no va en la mano: [hueso, piezas]
const CARGAS = {
  saco: () => ['pecho', [pintada(new THREE.SphereGeometry(0.19, 8, 6).scale(1, 0.8, 1.35), 0xb89a62).translate(-0.22, 0.34, -0.03)]],
  escudo: () => ['anteI', [pintada(new THREE.CylinderGeometry(0.21, 0.21, 0.025, 12).rotateZ(Math.PI / 2), 0x6a5039).translate(0.07, -0.12, 0), pintada(new THREE.SphereGeometry(0.05, 6, 4), ACERO).translate(0.09, -0.12, 0)]],
  vaina: () => ['cadera', [bloque(0.03, 0.56, 0.05, CUERO).rotateX(-0.35).translate(0.2, -0.2, -0.06), bloque(0.02, 0.1, 0.02, 0x8a7a48).translate(0.2, 0.09, 0.05)]],
  carcaj: () => ['pecho', [pintada(new THREE.CylinderGeometry(0.045, 0.04, 0.42, 6).rotateZ(0.3), CUERO).translate(0.05, 0.1, -0.16)]],
  zurron: () => ['cadera', [bloque(0.06, 0.15, 0.17, 0x7a6038).translate(-0.215, 0.0, 0.0)]],
};
const cuelga = (hueso, geos) => { const m = new THREE.Mesh(mergeGeometries(geos), material); m.castShadow = true; hueso.add(m); return m; };

/* ---------- el cuerpo ---------- */
function cuerpo(o, rnd, neutro = false) {
  const T = taller(rnd, neutro), k = o.ancho, piel = o.piel, tela = o.color, manga = o.manga ?? o.color, pelo = o.pelo;
  const H = h => [[N[h], 1]], mez = (h1, w1, h2) => [[N[h1], w1], [N[h2], 1 - w1]];
  // la falda del sayo sigue a los muslos (y, si es larga, algo a las espinillas)
  const falda = (peso, espi = 0) => (c, s) => c > 0.3 ? [[N.cadera, 1 - peso], [N.musloI, peso - espi], [N.espiI, espi]] : c < -0.3 ? [[N.cadera, 1 - peso], [N.musloD, peso - espi], [N.espiD, espi]]
    : s < -0.1 ? [[N.cadera, 1 - peso * 0.3], [N.musloI, peso * 0.15], [N.musloD, peso * 0.15]] : [[N.cadera, 1 - peso], [N.musloI, (peso - espi) / 2], [N.musloD, (peso - espi) / 2], [N.espiI, espi]];
  const bajo = 0.94 - o.largo, larga = o.largo > 0.5;
  // tronco: del bajo del sayo al cuello
  T.tubo([
    ...(larga ? [[0, bajo, 0, 0.2 + 0.03 * k + o.largo * 0.07, 0.18 + o.largo * 0.06, tela, falda(0.96, 0.6), 1], [0, 0.5, 0, 0.19 + 0.03 * k, 0.17, tela, falda(0.97, 0.25), 1], [0, 0.74, 0, 0.185 + 0.03 * k, 0.152, tela, falda(0.94), 1]] : [[0, bajo, 0, 0.186 + 0.03 * k + o.largo * 0.1, 0.14 + o.largo * 0.1, tela, falda(0.85), 1]]),
    [0, 0.94, 0, 0.176 + 0.03 * k, 0.132, tela, falda(0.12), 1], [0, 1.07, 0, 0.152 * k, 0.108 + o.barriga, tela, mez('cadera', 0.5, 'espina'), 1], [0, 1.2, 0.006, 0.168 * k, 0.118 + o.barriga * 0.6, tela, mez('espina', 0.6, 'pecho'), 1],
    [0, 1.34, 0.01, 0.205 * k, 0.13, tela, H('pecho'), 1], [0, 1.44, 0, 0.236 * k, 0.118, tela, H('pecho'), 1], [0, 1.492, 0, 0.2 * k, 0.1, tela, H('pecho'), 1], [0, 1.528, 0, 0.11 * k, 0.082, tela, H('pecho'), 1], [0, 1.552, 0, 0.07, 0.072, tela, H('pecho'), 1],
    [0, 1.552, 0, 0.06, 0.064, piel, H('pecho'), 3], [0, 1.61, 0.006, 0.058, 0.062, piel, mez('cuello', 0.5, 'cabeza'), 3],
  ], { n: 10 });
  if (o.cinto) { T.tubo([[0, 1.04, 0, 0.16 * k, 0.116 + o.barriga, CUERO, mez('cadera', 0.5, 'espina')], [0, 1.1, 0, 0.16 * k, 0.116 + o.barriga, CUERO, mez('cadera', 0.5, 'espina')]], { n: 10, tapas: false }); T.caja(0, 1.07, 0.122 + o.barriga, 0.05, 0.05, 0.015, 0x8a7a48, mez('cadera', 0.5, 'espina')); }
  // piernas y pies
  for (const [s, L] of [[-1, 'D'], [1, 'I']]) {
    const M = 'muslo' + L, E = 'espi' + L, F = 'pie' + L, x = y => s * (0.096 - (0.94 - y) * 0.008), bota = o.botas, alta = o.botaAlta ? 0.36 : 0.2;
    T.tubo([
      [x(0.97), 0.97, 0, 0.05, 0.05, o.calzas, H(M)], [x(0.9), 0.9, 0, 0.082, 0.09, o.calzas, H(M)], [x(0.74), 0.74, 0.004, 0.078, 0.084, o.calzas, H(M)], [x(0.6), 0.6, 0.006, 0.068, 0.07, o.calzas, mez(M, 0.78, E)],
      [x(0.5), 0.5, 0.008, 0.063, 0.066, o.calzas, mez(M, 0.5, E)], [x(0.42), 0.42, 0, 0.064, 0.068, o.calzas, mez(M, 0.22, E)], [x(alta), alta, -0.008, alta > 0.3 ? 0.066 : 0.052, alta > 0.3 ? 0.07 : 0.056, o.calzas, H(E)],
      [x(alta), alta, -0.008, alta > 0.3 ? 0.072 : 0.058, alta > 0.3 ? 0.076 : 0.062, bota, H(E)], [x(0.12), 0.12, -0.004, 0.05, 0.054, bota, mez(E, 0.6, F)], [x(0.05), 0.05, 0, 0.05, 0.056, bota, H(F)],
    ], { n: 7 });
    T.tubo([[x(0), 0.052, -0.07, 0.04, 0.046, bota, H(F)], [x(0), 0.052, 0, 0.05, 0.05, bota, H(F)], [x(0), 0.042, 0.1, 0.053, 0.04, bota, H(F)], [x(0), 0.03, 0.175, 0.04, 0.028, bota, H(F)]], { n: 7, eje: 'z' });
  }
  // brazos y manos
  for (const [s, L] of [[-1, 'D'], [1, 'I']]) {
    const B = 'brazo' + L, A = 'ante' + L, M = 'mano' + L, x = y => s * (0.236 + (1.47 - y) * 0.054) * (0.94 + 0.06 * k);
    T.tubo([
      [x(1.52), 1.52, 0, 0.026, 0.03, manga, H(B), 1], [x(1.5), 1.5, 0, 0.05, 0.056, manga, H(B), 1], [x(1.45), 1.45, 0, 0.063, 0.066, manga, H(B), 1], [x(1.35), 1.35, 0, 0.059, 0.06, manga, H(B), 1],
      [x(1.25), 1.25, 0, 0.052, 0.052, manga, mez(B, 0.75, A), 1], [x(1.19), 1.19, -0.004, 0.05, 0.05, manga, mez(B, 0.5, A), 1], [x(1.13), 1.13, 0, 0.05, 0.05, manga, mez(B, 0.25, A), 1], [x(1.02), 1.02, 0, 0.045, 0.045, manga, H(A), 1], [x(0.95), 0.95, 0, 0.04, 0.04, manga, H(A), 1],
      [x(0.95), 0.95, 0, 0.031, 0.031, piel, H(A), 3], [x(0.92), 0.92, 0, 0.028, 0.03, piel, mez(A, 0.5, M), 3], [x(0.885), 0.885, 0.004, 0.024, 0.04, piel, H(M), 3], [x(0.84), 0.84, 0.008, 0.024, 0.04, piel, H(M), 3], [x(0.795), 0.795, 0.01, 0.018, 0.028, piel, H(M), 3],
    ], { n: 7 });
  }
  // cabeza: un poco grande, como piden las figuras pequeñas; nariz y ojos apenas apuntados
  const c = o.cabezon, hy = y => 1.6 + (y - 1.6) * c, cab = H('cabeza');
  T.ruido(0.03);
  T.tubo([[0, hy(1.585), 0.024, 0.05 * c, 0.05 * c, piel, cab, 3], [0, hy(1.61), 0.018, 0.079 * c, 0.084 * c, piel, cab, 3], [0, hy(1.66), 0.014, 0.096 * c, 0.102 * c, piel, cab, 3], [0, hy(1.71), 0.012, 0.1 * c, 0.108 * c, piel, cab, 3],
    [0, hy(1.77), 0.01, 0.102 * c, 0.11 * c, piel, cab, 3], [0, hy(1.83), 0.006, 0.094 * c, 0.102 * c, piel, cab, 3], [0, hy(1.875), 0.004, 0.066 * c, 0.074 * c, piel, cab, 3], [0, hy(1.9), 0.004, 0.03 * c, 0.034 * c, piel, cab, 3]], { n: 10 });
  T.caja(0, hy(1.712), 0.123 * c, 0.026 * c, 0.042 * c, 0.03 * c, piel, cab, 3);
  for (const s of [-1, 1]) T.caja(s * 0.04 * c, hy(1.752), 0.108 * c, 0.022 * c, 0.014 * c, 0.012, OSCURO, cab);
  T.ruido(0.1);
  // pelo, barba y tocados
  const cy = hy(1.757), frente = fi => (1 - Math.sin(fi)) / 2, suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const cubre = (delante, detras) => fi => delante + (detras - delante) * suave(0.02, 0.42, frente(fi));
  const tapado = ['capucha', 'toca', 'casco'].includes(o.tocado);
  if (!tapado && o.peinado !== 'calvo') {
    const largo = o.peinado === 'largo' || o.peinado === 'mono' && false;
    T.casquete(0, cy, -0.004, 0.119 * c, 0.164 * c, 0.133 * c, pelo, cab, 2, cubre(0.8, o.peinado === 'tonsura' ? 1.25 : 1.78), { cae: fi => largo && frente(fi) > 0.42 ? 0.2 : 0, vuelo: 0.12 });
    if (o.peinado === 'mono') T.casquete(0, cy + 0.03, -0.125 * c, 0.055, 0.055, 0.055, pelo, cab, 2, () => 3.0, { colgantes: 0, lados: 6 });
  } else if (o.peinado === 'calvo' && !tapado) T.casquete(0, cy - 0.02, -0.004, 0.109 * c, 0.1 * c, 0.119 * c, pelo, cab, 2, fi => frente(fi) > 0.3 ? 1.9 : 0.01, { filas: 2, colgantes: 0 });
  if (o.barba) T.casquete(0, hy(1.668), 0.03, 0.088 * c, -(0.07 + o.barba * 0.07) * c, 0.094 * c, pelo, cab, 2, fi => frente(fi) < 0.12 ? 1.2 : frente(fi) < 0.5 ? 1.2 + suave(0.12, 0.45, frente(fi)) * 0.75 : 0.02, { colgantes: 0 });
  const tc = o.colorTocado ?? tela;
  T.ruido(0.05);
  if (o.tocado === 'capucha' || o.tocado === 'toca') {
    const cap = o.tocado === 'capucha', zona = o.colorTocado ? 0 : 1;
    T.casquete(0, cy - 0.004, -0.008, (cap ? 0.127 : 0.118) * c, (cap ? 0.172 : 0.162) * c, (cap ? 0.14 : 0.128) * c, tc, cab, zona, cubre(cap ? 0.86 : 0.8, 1.95), { cae: fi => frente(fi) > 0.3 ? (cap ? 0.15 : 0.19) : 0.06, pesosCaida: mez('cabeza', 0.35, 'pecho'), vuelo: cap ? 0.55 : 0.2 });
    if (cap) T.tubo([[0, 1.4, 0, 0.275 * k, 0.165, tc, H('pecho'), zona], [0, 1.5, 0, 0.215 * k, 0.135, tc, H('pecho'), zona], [0, 1.565, 0, 0.09, 0.085, tc, H('pecho'), zona]], { n: 10, tapas: false });
  } else if (o.tocado === 'casco') {
    T.ruido(0.04); T.casquete(0, cy - 0.004, -0.002, 0.118 * c, 0.166 * c, 0.128 * c, ACERO, cab, 0, cubre(1.2, 1.62), { colgantes: 0 }); T.caja(0, hy(1.76), 0.126 * c, 0.022, 0.1, 0.014, ACERO, cab); T.ruido(0.1);
  } else if (o.tocado === 'sombrero') {
    T.tubo([[0, hy(1.84), 0, (o.ala ?? 0.25), (o.ala ?? 0.25) * 1.04, tc, cab], [0, hy(1.856), 0, 0.116 * c, 0.122 * c, tc, cab], [0, hy(1.93), 0, 0.1 * c, 0.105 * c, tc, cab], [0, hy(1.95), 0, 0.05, 0.05, tc, cab]], { n: 10 });
  } else if (o.tocado === 'gorro') {
    T.tubo([[0, hy(1.8), -0.004, 0.115 * c, 0.124 * c, tc, cab], [0, hy(1.87), -0.004, 0.12 * c, 0.128 * c, tc, cab], [0, hy(1.925), -0.004, 0.09 * c, 0.096 * c, tc, cab]], { n: 10 });
  } else if (o.tocado === 'corona') {
    T.ruido(0.03); T.tubo([[0, hy(1.845), 0, 0.108 * c, 0.115 * c, 0xd9b23a, cab], [0, hy(1.885), 0, 0.11 * c, 0.117 * c, 0xd9b23a, cab]], { n: 10, tapas: false });
    for (let i = 0; i < 6; i++) { const an = i / 6 * 6.2832; T.caja(Math.cos(an) * 0.108 * c, hy(1.9), Math.sin(an) * 0.114 * c, 0.03, 0.04, 0.03, 0xd9b23a, cab); } T.ruido(0.1);
  }
  // manto de piel sobre los hombros, capa a la espalda, delantal
  if (o.manto) { T.ruido(0.3); T.tubo([[0, 1.37, 0, 0.285 * k, 0.175, o.manto, H('pecho')], [0, 1.47, 0, 0.29 * k, 0.17, o.manto, H('pecho')], [0, 1.545, 0, 0.16, 0.12, o.manto, H('pecho')], [0, 1.575, 0, 0.085, 0.085, o.manto, H('pecho')]], { n: 10, tapas: false }); T.ruido(0.1); }
  if (o.capa) {
    if (!o.manto && o.tocado !== 'capucha') T.tubo([[0, 1.47, 0, 0.25 * k, 0.142, o.capa, H('pecho')], [0, 1.535, 0, 0.15, 0.105, o.capa, H('pecho')], [0, 1.57, 0, 0.08, 0.08, o.capa, H('pecho')]], { n: 10, tapas: false });
    const fin = o.capaLarga ? 0.2 : 0.52;
    if (!o.sinPano) T.pano(5, 4, (u, w) => [(u - 0.5) * (0.46 + w * 0.16) * k, 1.5 - w * (1.5 - fin), -(0.118 + Math.sin(u * Math.PI) * 0.035 + w * 0.05), w === 0 ? H('pecho') : [[N.pecho, Math.max(0, 1 - w * 2.2)], [N.capa, Math.min(1, w * 2.2)]]], o.capa, 0, [0, 1.1, 0.1]);
  }
  if (o.delantal) T.pano(3, 2, (u, w) => { const y = 1.07 - w * (1.07 - bajo - 0.04), rz = y > 0.94 ? 0.118 + o.barriga : 0.134 + (0.94 - y) * 0.11; return [(u - 0.5) * 0.24, y, rz + 0.012, y > 1 ? mez('cadera', 0.5, 'espina') : falda(Math.min(0.96, (0.94 - y) * 4.2 + 0.12), y < 0.4 ? 0.45 : 0)(u - 0.5, 1)]; }, o.delantal, 0, [0, 0.9, 0]);
  return T.geometria();
}

/* ---------- vestuario: qué lleva cada oficio ---------- */
const TIERRA = [0x6a5a2f, 0x7a3b2e, 0x5a6b3a, 0x8a7a55, 0x4a5a6a, 0x8a6a48, 0x6a2f3a, 0x3f5a5a], de = (rnd, l) => l[Math.floor(rnd() * l.length)];
export function vestir(tipo = 'aldeano', rnd = Math.random, color) {
  const o = { color: color ?? de(rnd, TIERRA), piel: de(rnd, PIELES), pelo: de(rnd, PELOS), ancho: 0.92 + rnd() * 0.2, barriga: rnd() < 0.25 ? 0.02 + rnd() * 0.03 : 0, largo: 0.26 + rnd() * 0.1, cinto: true,
    calzas: de(rnd, [0x3a3028, 0x4a4238, 0x2a2a30, 0x5a4a3a]), botas: de(rnd, [0x2a2018, 0x3a2a1c, 0x1f1a16]), botaAlta: rnd() < 0.4, peinado: de(rnd, ['corto', 'corto', 'corto', 'largo', 'calvo', 'tonsura']), barba: rnd() < 0.4 ? 0.2 + rnd() * 0.8 : 0, cabezon: 1.06, tipo };
  const r = rnd(), mas = extra => Object.assign(o, extra);
  if (tipo === 'aldeano') mas(r < 0.22 ? { tocado: 'capucha' } : r < 0.4 ? { tocado: 'sombrero', colorTocado: PAJA } : r < 0.5 ? { tocado: 'gorro', colorTocado: 0x5a4a3a } : {});
  else if (tipo === 'aldeana') mas({ largo: 0.8, ancho: 0.84 + rnd() * 0.1, barba: 0, barriga: 0, peinado: r < 0.5 ? 'largo' : 'mono', ...(r < 0.45 ? { tocado: 'toca', colorTocado: 0xe6dcc4 } : {}), ...(rnd() < 0.5 ? { delantal: 0xe0d6bc } : {}), manga: rnd() < 0.5 ? 0xe0d6bc : undefined });
  else if (tipo === 'crio') mas({ cabezon: 1.3, barba: 0, barriga: 0, largo: 0.3, peinado: 'corto', cinto: false });
  else if (tipo === 'guardia') mas({ tocado: 'casco', largo: 0.36, botaAlta: true, barriga: 0, ancho: 1.06, lleva: 'lanza', carga: rnd() < 0.5 ? ['vaina'] : ['vaina', 'escudo'], capa: rnd() < 0.4 ? o.color : undefined });
  else if (tipo === 'noble') mas({ largo: 0.8, capa: de(rnd, [0x5a1f2a, 0x2f3f5a, 0x3a4a2f]), capaLarga: true, peinado: r < 0.5 ? 'largo' : 'corto', botaAlta: true });
  else if (tipo === 'clan') mas({ manto: de(rnd, [0x6a5a48, 0x8a8478, 0x4a4038, 0xb0a898]), barba: 0.5 + rnd() * 0.5, peinado: r < 0.6 ? 'largo' : 'calvo', botaAlta: true, ancho: 1.08 + rnd() * 0.1, largo: 0.4, ...(r < 0.3 ? { tocado: 'gorro', colorTocado: 0x8a8478 } : {}) });
  else if (tipo === 'mercader') mas({ largo: 0.74, tocado: r < 0.6 ? 'gorro' : 'sombrero', colorTocado: de(rnd, [0x6a2f3a, 0x2f4f6f, 0x3a3a4a]), ala: 0.2, barriga: 0.04 + rnd() * 0.03, carga: ['zurron'] });
  else if (tipo === 'minero') mas({ tocado: r < 0.6 ? 'capucha' : 'gorro', colorTocado: 0x4a4038, largo: 0.3, botaAlta: true });
  else if (tipo === 'escriba') mas({ largo: 0.84, peinado: r < 0.5 ? 'tonsura' : 'corto', barba: 0, cinto: false });
  else if (tipo === 'marino') mas({ tocado: r < 0.5 ? 'gorro' : undefined, colorTocado: de(rnd, [0x7a3b2e, 0x2f4f6f, 0x3a3a4a]), largo: 0.22, manga: 0xd8ceb4, botaAlta: false });
  else if (tipo === 'monje') mas({ largo: 0.84, tocado: 'capucha', barba: 0, cinto: true });
  return o;
}

/* ---------- posturas ---------- */
const sua = x => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
// Qué hacen tronco y brazos. Los ángulos: x negativo adelanta un miembro o dobla el codo; x positivo inclina el tronco hacia delante.
const BRAZOS = {
  reposo(h, t, e) { const s = Math.sin(t * 0.9 + e.fase) * 0.03; h.brazoD.rotation.set(0.03 + s, 0, -0.07); h.brazoI.rotation.set(0.03 - s, 0, 0.07); h.anteD.rotation.x = h.anteI.rotation.x = -0.2; },
  jarras(h) { h.brazoD.rotation.set(0.25, 0, -0.62); h.anteD.rotation.set(-0.35, 0, 1.75); h.brazoI.rotation.set(0.25, 0, 0.62); h.anteI.rotation.set(-0.35, 0, -1.75); },
  habla(h, t, e) { const g = Math.sin(t * 2.1 * e.ritmo + e.fase); h.brazoD.rotation.set(-0.5 - g * 0.12, 0, -0.16); h.anteD.rotation.set(-1.25 + g * 0.4, 0, Math.sin(t * 1.3 + e.fase) * 0.25); h.manoD.rotation.x = g * 0.3;
    h.brazoI.rotation.set(0.2, 0, 0.5); h.anteI.rotation.set(-0.35, 0, -1.6); h.cabeza.rotation.x += Math.sin(t * 2.1 * e.ritmo + e.fase + 1) * 0.05; h.pecho.rotation.y += Math.sin(t * 0.5 + e.fase) * 0.12; },
  escucha(h, t, e) { BRAZOS.reposo(h, t, e); h.cabeza.rotation.x += 0.04 + Math.max(0, Math.sin(t * 0.7 + e.fase) - 0.8) * 0.5; h.anteI.rotation.x = -0.5; },
  golpea(h, t, e) { const k = (t * e.ritmo * 0.9 + e.fase) % 1, alza = k < 0.62 ? sua(k / 0.62) : 1 - Math.pow((k - 0.62) / 0.38, 2);
    h.brazoD.rotation.set(-0.4 - alza * 2.0, 0, e.dosManos ? 0.22 : -0.1); h.anteD.rotation.x = -0.5 - alza * 1.05; h.espina.rotation.x += 0.34 - alza * 0.32; h.pecho.rotation.y -= alza * 0.25; h.cabeza.rotation.x -= 0.2 - alza * 0.15;
    if (e.dosManos) { h.brazoI.rotation.set(-0.45 - alza * 1.9, 0, -0.42); h.anteI.rotation.x = -0.6 - alza * 0.9; } else { h.brazoI.rotation.set(-0.3, 0, 0.12); h.anteI.rotation.x = -0.7; } },
  remueve(h, t, e) { const p = t * 2.6 * e.ritmo + e.fase; h.espina.rotation.x += 0.16; h.brazoD.rotation.set(-0.62 + Math.cos(p) * 0.12, 0, -0.05 + Math.sin(p) * 0.12); h.anteD.rotation.x = -0.95 + Math.sin(p) * 0.15; h.brazoI.rotation.set(-0.5, 0, 0.08); h.anteI.rotation.x = -1.0; h.cabeza.rotation.x += 0.18; },
  percha(h, t, e) { const p = Math.sin(t * 1.1 * e.ritmo + e.fase); h.espina.rotation.x += 0.16 + p * 0.14; h.brazoD.rotation.set(-1.0 - p * 0.45, 0, 0.2); h.anteD.rotation.x = -0.55 + p * 0.25; h.brazoI.rotation.set(-0.55 - p * 0.4, 0, -0.3); h.anteI.rotation.x = -0.9 + p * 0.2; },
  senala(h, t, e) { h.espina.rotation.x += 0.14; h.brazoD.rotation.set(-1.05 + Math.sin(t * 0.6 + e.fase) * 0.16, 0, 0.1); h.anteD.rotation.x = -0.25; h.brazoI.rotation.set(0.2, 0, 0.5); h.anteI.rotation.set(-0.35, 0, -1.6); h.cabeza.rotation.x += 0.2; },
  escribe(h, t, e) { h.espina.rotation.x += 0.14; h.cabeza.rotation.x += 0.3; h.brazoD.rotation.set(-0.62, 0, 0.12); h.anteD.rotation.set(-1.05, 0, Math.sin(t * 5 + e.fase) * 0.07); h.manoD.rotation.x = Math.sin(t * 7 + e.fase) * 0.15; h.brazoI.rotation.set(-0.5, 0, -0.1); h.anteI.rotation.x = -1.15; },
  bebe(h, t, e) { const trago = sua((Math.sin(t * 0.5 + e.fase) - 0.55) * 2.6); h.brazoD.rotation.set(-0.42 - trago * 0.75, 0, 0.1 + trago * 0.15); h.anteD.rotation.x = -1.12 - trago * 0.95; h.cabeza.rotation.x -= trago * 0.3; h.brazoI.rotation.set(-0.42, 0, -0.1); h.anteI.rotation.x = -1.12; h.espina.rotation.x += 0.08; },
  come(h, t, e) { const p = sua(Math.sin(t * 1.4 + e.fase) * 1.5); h.espina.rotation.x += 0.12; h.brazoD.rotation.set(-0.45 - p * 0.5, 0, 0.12); h.anteD.rotation.x = -1.1 - p * 0.8; h.brazoI.rotation.set(-0.42, 0, -0.1); h.anteI.rotation.x = -1.12; h.cabeza.rotation.x += 0.12 + p * 0.1; },
  acodado(h, t, e) { h.espina.rotation.x += 0.3; h.pecho.rotation.x += 0.12; h.brazoD.rotation.set(-0.95, 0, 0.12); h.anteD.rotation.x = -1.3; h.brazoI.rotation.set(-0.95, 0, -0.12); h.anteI.rotation.x = -1.3; h.cabeza.rotation.x -= 0.25; h.cabeza.rotation.y += Math.sin(t * 0.4 + e.fase) * 0.4; },
  guardia(h, t, e) { h.brazoD.rotation.set(-0.16, 0, -0.14); h.anteD.rotation.x = -0.12; h.brazoI.rotation.set(0.04, 0, 0.08); h.anteI.rotation.x = -0.2; h.cabeza.rotation.y += Math.sin(t * 0.22 + e.fase) * 0.45; },
  carga(h, t, e) { h.brazoD.rotation.set(-2.5, 0, 0.1); h.anteD.rotation.x = -1.7; h.espina.rotation.x += 0.12; h.espina.rotation.z += 0.06; h.brazoI.rotation.set(0.03 + Math.sin(t * 0.9 + e.fase) * 0.03, 0, 0.07); h.anteI.rotation.x = -0.2; },
  empuja(h) { h.espina.rotation.x += 0.42; h.cabeza.rotation.x -= 0.3; h.brazoD.rotation.set(-1.15, 0, 0.06); h.brazoI.rotation.set(-1.15, 0, -0.06); h.anteD.rotation.x = h.anteI.rotation.x = -0.35; },
  fuelle(h, t, e) { const k = 0.5 + 0.5 * Math.sin(t * 1.8 * e.ritmo); h.espina.rotation.x += 0.1 + k * 0.16; h.brazoD.rotation.set(-0.5 - k * 0.8, 0, 0.05); h.anteD.rotation.x = -0.9 + k * 0.5; h.brazoI.rotation.set(-0.5 - k * 0.8, 0, -0.05); h.anteI.rotation.x = -0.9 + k * 0.5; },
  reza(h, t, e) { h.cabeza.rotation.x += 0.32; h.espina.rotation.x += 0.08 + Math.sin(t * 0.5 + e.fase) * 0.03; h.brazoD.rotation.set(-0.5, 0, 0.3); h.anteD.rotation.set(-1.85, 0, 0.35); h.brazoI.rotation.set(-0.5, 0, -0.3); h.anteI.rotation.set(-1.85, 0, -0.35); },
  preside(h, t, e) { h.brazoD.rotation.set(-0.3, 0, -0.24); h.anteD.rotation.x = -1.15; h.brazoI.rotation.set(-0.3, 0, 0.24); h.anteI.rotation.x = -1.15; h.cabeza.rotation.y += Math.sin(t * 0.3 + e.fase) * 0.3; },
  arenga(h, t, e) { const g = Math.sin(t * 1.4 * e.ritmo + e.fase); h.brazoD.rotation.set(-2.1 + g * 0.5, 0, -0.55); h.anteD.rotation.x = -0.45 - g * 0.3; h.brazoI.rotation.set(-0.5 - g * 0.2, 0, 0.3); h.anteI.rotation.x = -0.9; h.pecho.rotation.y += g * 0.15; h.cabeza.rotation.x -= 0.1; },
  barre(h, t, e) { const p = Math.sin(t * 1.7 * e.ritmo + e.fase); h.espina.rotation.x += 0.2; h.pecho.rotation.y += p * 0.3; h.brazoD.rotation.set(-0.4 - p * 0.15, 0, 0.3); h.anteD.rotation.x = -0.45; h.brazoI.rotation.set(-0.85 - p * 0.15, 0, -0.35); h.anteI.rotation.x = -0.8; h.cabeza.rotation.x += 0.2; },
  fuego(h, t, e) { h.espina.rotation.x += 0.1; h.brazoD.rotation.set(-0.9, 0, 0.12); h.brazoI.rotation.set(-0.9, 0, -0.12); h.anteD.rotation.x = h.anteI.rotation.x = -0.5 + Math.sin(t * 0.8 + e.fase) * 0.08; h.cabeza.rotation.x += 0.15; },
};
export const POSTURAS = Object.keys(BRAZOS);

function posar(f, t, dt) {
  const h = f.h, e = f.estado, m = f.marcha;
  for (const b of f.huesos) b.rotation.set(0, 0, 0);
  let alto = 0.96, lean = 0;
  // respiración y una mirada que va y viene: nadie está del todo quieto
  h.pecho.rotation.x = Math.sin(t * 1.2 + e.fase) * 0.014; h.cabeza.rotation.y = Math.sin(t * 0.31 + e.fase * 2) * 0.16 * (1 - m); h.cabeza.rotation.x = Math.sin(t * 0.23 + e.fase) * 0.03;
  if (e.piernas === 'sentado') {
    alto = e.asiento; const abre = e.abre ?? 0.14, bal = e.cuelga ? Math.sin(t * 1.6 + e.fase) * 0.25 : 0;
    h.musloD.rotation.set(-1.46, 0, -abre); h.musloI.rotation.set(-1.46, 0, abre); h.espiD.rotation.x = 1.42 + bal; h.espiI.rotation.x = 1.42 - bal; h.pieD.rotation.x = h.pieI.rotation.x = 0.04; h.espina.rotation.x = -0.03;
  } else if (e.piernas === 'rodillas') {
    alto = 0.52; h.musloD.rotation.set(0.12, 0, -0.06); h.musloI.rotation.set(0.12, 0, 0.06); h.espiD.rotation.x = h.espiI.rotation.x = 1.45; h.pieD.rotation.x = h.pieI.rotation.x = 0.7;
  } else if (e.piernas === 'suelo') {   // sentado en el suelo, piernas recogidas
    alto = 0.16; h.musloD.rotation.set(-1.9, 0, -0.3); h.musloI.rotation.set(-1.9, 0, 0.3); h.espiD.rotation.x = h.espiI.rotation.x = 2.3; h.espina.rotation.x = 0.25;
  } else {
    // de pie: el peso pasa de una pierna a otra; andando, el paso lo lleva la distancia recorrida
    const peso = Math.sin(t * 0.37 + e.fase) * 0.035 * (1 - m), abre = (e.abre ?? 0.035) * (1 - m * 0.6), A = 0.47 * e.brio * m, fi = f.paso;
    h.cadera.rotation.z = peso; h.espina.rotation.z = -peso * 1.3;
    for (const [L, s, p] of [['I', 1, fi], ['D', -1, fi + Math.PI]]) {
      const sw = Math.sin(p), vuelo = Math.max(0, Math.cos(p - 0.35)), muslo = -A * sw - 0.05 * m, rodilla = 0.06 + m * (0.1 + 1.05 * e.brio * vuelo * vuelo) + (e.flexion ?? 0);
      h['muslo' + L].rotation.set(muslo - (e.flexion ?? 0) * 0.5, 0, s * abre - peso); h['espi' + L].rotation.x = rodilla;
      h['pie' + L].rotation.x = -(muslo + rodilla - (e.flexion ?? 0) * 0.5) * (1 - vuelo * m) + 0.3 * vuelo * m;
    }
    const sw = Math.sin(fi);
    alto -= 0.86 * (1 - Math.cos(A * sw)) + (e.flexion ?? 0) * 0.06; lean = 0.05 * m * e.brio;
    h.cadera.rotation.y = -0.1 * sw * m; h.espina.rotation.y = 0.2 * sw * m; h.cabeza.rotation.y += -0.1 * sw * m; h.espina.rotation.x = lean;
    h.capa.rotation.x = m * (0.16 + 0.07 * Math.sin(fi * 2));
  }
  h.cadera.position.y = alto;
  // brazos: la postura pedida; andando sin nada que hacer, braceo
  (BRAZOS[e.brazos] ?? BRAZOS.reposo)(h, t, e);
  if (m > 0.01 && e.piernas === 'pie' && (e.brazos === 'reposo' || !BRAZOS[e.brazos])) {
    const sw = Math.sin(f.paso), A = 0.62 * e.brio * m;
    h.brazoI.rotation.x += A * sw * 0.6; h.brazoD.rotation.x -= A * sw * 0.6; h.anteI.rotation.x -= m * (0.12 + 0.3 * Math.max(0, -sw)); h.anteD.rotation.x -= m * (0.12 + 0.3 * Math.max(0, sw));
  }
  h.capa.rotation.x += Math.sin(t * 1.1 + e.fase) * 0.03 + 0.03;
}

/* ---------- la figura ---------- */
export function crearFigura(opciones = {}) {
  const rnd = opciones.rnd ?? Math.random;
  const o = { ...vestir(opciones.tipo, rnd, opciones.color), ...Object.fromEntries(Object.entries(opciones).filter(([, v]) => v !== undefined)) };
  const talla = opciones.talla ?? 1;
  const huesos = ESQ.map(([nombre, , x, y, z]) => { const b = new THREE.Bone(); b.name = nombre; b.userData.p = [x, y, z]; return b; });
  ESQ.forEach(([, padre, x, y, z], i) => { if (padre < 0) huesos[i].position.set(x, y, z); else { const p = ESQ[padre]; huesos[i].position.set(x - p[2], y - p[3], z - p[4]); huesos[padre].add(huesos[i]); } });
  huesos[0].updateMatrixWorld(true);
  const malla = new THREE.SkinnedMesh(cuerpo(o, rnd), material), esqueleto = new THREE.Skeleton(huesos);
  malla.add(huesos[0]); malla.bind(esqueleto); malla.castShadow = malla.receiveShadow = true; malla.frustumCulled = false;
  const grupo = new THREE.Group(), cuerpoG = new THREE.Group(); cuerpoG.scale.setScalar(1.2 * talla); cuerpoG.add(malla); grupo.add(cuerpoG);
  const h = Object.fromEntries(huesos.map(b => [b.name, b]));
  const poner = (cosa, mano = 'D') => { if (UTENSILIOS[cosa]) return cuelga(h['mano' + mano], UTENSILIOS[cosa]()); if (CARGAS[cosa]) { const [hueso, geos] = CARGAS[cosa](); return cuelga(h[hueso], geos); } return null; };
  if (o.lleva) poner(o.lleva); if (o.llevaI) poner(o.llevaI, 'I'); for (const c of o.carga ?? []) poner(c);
  const f = {
    grupo, malla, huesos, h, poner, opciones: o, marcha: 0, paso: rnd() * 6.28,
    estado: { piernas: 'pie', brazos: o.lleva === 'lanza' || o.lleva === 'cayado' ? 'guardia' : 'reposo', fase: rnd() * 6.28, ritmo: 1, brio: 1, asiento: 0.52, camina: 0, dosManos: false },
    actualizar(t) {
      const dt = Math.min(0.1, Math.max(0.001, t - ut)); ut = t;
      const p = grupo.position, d = primero ? 0 : Math.hypot(p.x - ux, p.z - uz); ux = p.x; uz = p.z; primero = false;
      const zancada = 1.52 * cuerpoG.scale.x * grupo.scale.x, vel = f.estado.camina || (d < 3 ? d / dt : 0), va = f.estado.piernas === 'pie' && vel > 0.12 * zancada ? 1 : 0;
      f.marcha += (va - f.marcha) * Math.min(1, dt * 7); f.paso += (f.estado.camina ? f.estado.camina * dt : Math.min(d, 3)) / zancada * 6.2832;
      f.estado.brio = Math.min(1.5, 0.75 + vel / zancada * 0.35);
      posar(f, t, dt);
    },
  };
  let ut = 0, ux = 0, uz = 0, primero = true;
  posar(f, 0, 0.016);
  return f;
}

/* ---------- para las multitudes: el ciclo de andar horneado en geometrías fijas ---------- */
// Devuelve { andar: [geometría × cuadros], quieto: geometría }. Las zonas de ropa, pelo y piel van en blanco
// y llevan el atributo "zona" para teñirlas por persona con materialMultitud().
export function hornear(opciones, cuadros = 12) {
  const rnd = opciones.rnd ?? Math.random, o = { ...vestir(opciones.tipo, rnd, opciones.color), ...opciones };
  const huesos = ESQ.map(([nombre]) => { const b = new THREE.Bone(); b.name = nombre; return b; });
  ESQ.forEach(([, padre, x, y, z], i) => { if (padre < 0) huesos[i].position.set(x, y, z); else { const p = ESQ[padre]; huesos[i].position.set(x - p[2], y - p[3], z - p[4]); huesos[padre].add(huesos[i]); } });
  huesos[0].updateMatrixWorld(true);
  const base = cuerpo(o, rnd, true), malla = new THREE.SkinnedMesh(base, material), esqueleto = new THREE.Skeleton(huesos); malla.add(huesos[0]); malla.bind(esqueleto);
  const h = Object.fromEntries(huesos.map(b => [b.name, b])), f = { h, huesos, marcha: 1, paso: 0, estado: { piernas: 'pie', brazos: opciones.brazos ?? (o.lleva === 'lanza' ? 'guardia' : 'reposo'), fase: opciones.fase ?? 0, ritmo: 1, brio: 1, asiento: 0.52 } };
  const v = new THREE.Vector3(), extra = [...(o.lleva ? UTENSILIOS[o.lleva]().map(q => ['manoD', q]) : []), ...(o.llevaI ? UTENSILIOS[o.llevaI]().map(q => ['manoI', q]) : []), ...(o.carga ?? []).flatMap(c => { const [hueso, geos] = CARGAS[c](); return geos.map(q => [hueso, q]); })];
  const foto = () => {
    malla.updateMatrixWorld(true); esqueleto.update();
    const g = base.clone(), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(base.attributes.position, i); malla.applyBoneTransform(i, v); p.setXYZ(i, v.x, v.y, v.z); }
    g.deleteAttribute('skinIndex'); g.deleteAttribute('skinWeight'); g.computeVertexNormals();
    if (!extra.length) return g;
    // lo que lleva en la mano se suma ya colocado, como parte fija
    const piezas = extra.map(([hueso, q]) => { const c = q.clone().applyMatrix4(h[hueso].matrixWorld); c.setAttribute('zona', new THREE.Float32BufferAttribute(new Float32Array(c.attributes.position.count), 1)); return c; });
    return mergeGeometries([g.toNonIndexed(), ...piezas]);
  };
  const andar = []; for (let i = 0; i < cuadros; i++) { f.paso = i / cuadros * 6.2832; posar(f, 0, 0.016); andar.push(foto()); }
  f.marcha = 0; posar(f, 0, 0.016); const quieto = foto();
  return { andar, quieto };
}
// Material para esas geometrías: cada persona trae sus colores de ropa, pelo y piel (atributos iRopa, iPelo, iPiel).
export function materialMultitud() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide });
  m.onBeforeCompile = s => { s.vertexShader = 'attribute float zona; attribute vec3 iRopa; attribute vec3 iPelo; attribute vec3 iPiel;\n' + s.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n vColor.rgb *= zona < 0.5 ? vec3(1.0) : zona < 1.5 ? iRopa : zona < 2.5 ? iPelo : iPiel;'); };
  return m;
}
