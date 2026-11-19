// figuras.js — la gente. Cada figura es una sola malla con esqueleto dentro (rodillas, codos y cintura doblan),
// de formas gruesas y cabeza grande, con piezas facetadas y útiles contundentes. Todo sale de este código, sin modelos de fuera.
//
//   const f = crearFigura({ tipo: 'guardia', color: 0x3d5a80 });
//   escena.add(f.grupo);            // de pie en el origen, mirando a +z
//   f.estado.brazos = 'golpea';     // qué hace con el cuerpo (ver BRAZOS)
//   f.actualizar(t);                // cada cuadro; si el grupo se mueve, echa a andar sola
//
// Para las calles de las ciudades, donde hay cientos, hornear() saca el ciclo de andar como geometrías fijas
// que se dibujan instanciadas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
let nCara = 0; const ROSA = new THREE.Color(0xd9705a);

export const PIELES = [0xf4c7a1, 0xe9b48c, 0xd29a6f, 0xa9744d], PELOS = [0x2a1f18, 0x5a3a22, 0x9a6a2e, 0x1a1a1a, 0xd4cfc6, 0x8a3a1e];
const ORO = 0xf2bb3a, ACERO = 0xb4bdc9, ACERO2 = 0x7d8794, MALLA = 0x8d97a5, CUERO = 0x6e4526, CUERO2 = 0x4a2f20, MADERA = 0x9a6a3e, PAJA = 0xe2c56e, OJO = 0x2b1e1a, PI = Math.PI;
const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
// zancada: lo que avanza un ciclo completo de andar, en unidades de figura
export const ZANCADA = 1.25;

// Esqueleto en reposo (de pie, brazos caídos). D es la derecha de la figura (−x), I la izquierda (+x).
const ESQ = [['cadera', -1, 0, 0.8, 0], ['espina', 0, 0, 0.95, 0], ['pecho', 1, 0, 1.12, 0], ['cuello', 2, 0, 1.38, 0], ['cabeza', 3, 0, 1.44, 0],
  ['brazoD', 2, -0.285, 1.3, 0], ['anteD', 5, -0.3, 1.05, 0], ['manoD', 6, -0.31, 0.82, 0], ['brazoI', 2, 0.285, 1.3, 0], ['anteI', 8, 0.3, 1.05, 0], ['manoI', 9, 0.31, 0.82, 0],
  ['musloD', 0, -0.11, 0.78, 0], ['espiD', 11, -0.11, 0.45, 0], ['pieD', 12, -0.11, 0.09, 0], ['musloI', 0, 0.11, 0.78, 0], ['espiI', 14, 0.11, 0.45, 0], ['pieI', 15, 0.11, 0.09, 0], ['capa', 2, 0, 1.34, -0.14]];
const N = Object.fromEntries(ESQ.map((e, i) => [e[0], i]));
const esqueleto = () => {
  const huesos = ESQ.map(([nombre]) => { const b = new THREE.Bone(); b.name = nombre; return b; });
  ESQ.forEach(([, padre, x, y, z], i) => { if (padre < 0) huesos[i].position.set(x, y, z); else { const p = ESQ[padre]; huesos[i].position.set(x - p[2], y - p[3], z - p[4]); huesos[padre].add(huesos[i]); } });
  huesos[0].updateMatrixWorld(true); return huesos;
};

/* ---------- el taller ---------- */
const col = new THREE.Color();
// viva: sube un punto la saturación y la luz de un color de ropa, que este estilo pide colores limpios
export const viva = hex => { const h = {}; col.setHex(hex).getHSL(h); return col.setHSL(h.h, Math.min(1, h.s * 1.3 + 0.06), Math.min(0.72, h.l * 1.12 + 0.02)).getHex(); };
// Viste una geometría: color por cara (fijo, o función del centro de la cara), degradado de abajo arriba, pesos de hueso,
// y aristas duras o blandas. zona: 0 color fijo · 1 ropa · 2 pelo · 3 piel (al hornear, esas zonas van en blanco y se tiñen por persona).
// La función de color puede devolver un color (toma la zona de la pieza) o [color, zona].
function pieza(geo, color, pesos, { duro = true, grad = 0.22, cuadros = false, zona = 0, neutro = false } = {}) {
  let g = geo;
  if (duro) { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); } else { g.computeVertexNormals(); g = g.index ? g.toNonIndexed() : g; }
  g.deleteAttribute('uv');
  const p = g.attributes.position, n = p.count, C = new Float32Array(n * 3), SI = new Uint16Array(n * 4), SW = new Float32Array(n * 4), Z = new Float32Array(n);
  g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y;
  let previo = color;
  for (let i = 0; i < n; i += 3) {
    let c = color;
    if (typeof color === 'function') {
      if (cuadros && i % 6 === 3) c = previo;
      else { const m = cuadros && i + 5 < n ? 6 : 3; let sx = 0, sy = 0, sz = 0; for (let q = 0; q < m; q++) { sx += p.getX(i + q); sy += p.getY(i + q); sz += p.getZ(i + q); } c = color(sx / m, sy / m, sz / m); }
      previo = c;
    }
    const hex = Array.isArray(c) ? c[0] : c, zn = Array.isArray(c) ? c[1] : zona;
    for (let k = 0; k < 3; k++) {
      const y = p.getY(i + k), t = y1 > y0 + 1e-6 ? (y - y0) / (y1 - y0) : 1, luz = 1 - grad + grad * 1.3 * t;
      if (neutro && zn) col.setRGB(luz, luz, luz); else col.setHex(hex).multiplyScalar(luz);
      C.set([col.r, col.g, col.b], (i + k) * 3); Z[i + k] = zn;
      const w = typeof pesos === 'function' ? pesos(p.getX(i + k), y, p.getZ(i + k)) : pesos; let s = 0; for (const [, v] of w) s += v;
      w.forEach(([h, v], j) => { SI[(i + k) * 4 + j] = h; SW[(i + k) * 4 + j] = v / s; });
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4)); g.setAttribute('zona', new THREE.BufferAttribute(Z, 1));
  return g;
}
// tubo de anillos superelípticos (e < 1: más cuadrado, con las esquinas redondas). secs: [x, y, z, rx, rz]
function tubo(secs, { n = 10, e = 0.85, eje = 'y', tapas = true } = {}) {
  const P = [], I = [], se = v => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (const [x, y, z, rx, rz] of secs) for (let k = 0; k < n; k++) { const an = (k + 0.5) / n * 2 * PI, c = se(Math.cos(an)), s = se(Math.sin(an)); if (eje === 'y') P.push(x + rx * c, y, z + rz * s); else P.push(x + rx * c, y + rz * s, z); }
  const sube = eje === 'y' ? secs[1][1] > secs[0][1] : secs[1][2] < secs[0][2], cara = (a, b, c) => sube ? I.push(a, b, c) : I.push(a, c, b);
  for (let j = 0; j < secs.length - 1; j++) for (let k = 0; k < n; k++) { const a = j * n + k, b = j * n + (k + 1) % n, c = a + n, d = b + n; cara(a, c, b); cara(b, c, d); }
  if (tapas) { const m = secs.length; for (const [j, abajo] of [[0, true], [m - 1, false]]) { const S = secs[j], c = P.length / 3; P.push(S[0], S[1], S[2]); for (let k = 0; k < n; k++) { const a = j * n + k, b = j * n + (k + 1) % n; abajo ? cara(c, a, b) : cara(c, b, a); } } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); return g;
}
const en = (g, x, y, z) => g.translate(x, y, z);
const caja = (w, h, d) => new THREE.BoxGeometry(w, h, d), cil = (r1, r2, h, n = 8, abierto = false) => new THREE.CylinderGeometry(r1, r2, h, n, 1, abierto), esf = (r, a = 8, b = 6, ...resto) => new THREE.SphereGeometry(r, a, b, ...resto), octa = r => new THREE.OctahedronGeometry(r), cono = (r, h, n = 5) => new THREE.ConeGeometry(r, h, n);
const H = h => [[N[h], 1]], sua2 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const entre = (hArriba, hAbajo, yA, yB) => (x, y) => { const t = sua2(yB, yA, y); return [[N[hArriba], t], [N[hAbajo], 1 - t]]; };

/* ---------- útiles y armas: piezas rígidas que cuelgan de un hueso ---------- */
// u: geometría facetada con su color y un degradado suave
const u = (geo, color, grad = 0.2) => { const g = (geo.index ? geo.toNonIndexed() : geo); g.computeVertexNormals(); g.deleteAttribute('uv'); const p = g.attributes.position, C = new Float32Array(p.count * 3); g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y;
  for (let i = 0; i < p.count; i++) { const t = y1 > y0 + 1e-6 ? (p.getY(i) - y0) / (y1 - y0) : 1; col.setHex(color).multiplyScalar(1 - grad + grad * 1.3 * t); C.set([col.r, col.g, col.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(C, 3)); return g; };
const mango = (largo, r = 0.022, color = MADERA) => u(cil(r, r * 1.15, largo, 6).rotateX(PI / 2), color, 0.1);
// En la mano: el origen es la muñeca y la palma queda en y = −0.08. Con el brazo caído, +z es hacia delante;
// con el antebrazo horizontal, +z es hacia arriba. Los mangos van por z; las astas, por y.
const PY = -0.08, PZ = 0.01;
const UTENSILIOS = {
  martillo: () => [mango(0.52).translate(0, PY, 0.19), u(cil(0.03, 0.03, 0.1, 6).rotateX(PI / 2), CUERO2).translate(0, PY, -0.03), u(caja(0.14, 0.26, 0.15), 0x5f6772, 0.3).translate(0, PY, 0.45), u(caja(0.165, 0.05, 0.175), ACERO).translate(0, PY + 0.14, 0.45), u(caja(0.165, 0.05, 0.175), ACERO).translate(0, PY - 0.14, 0.45)],
  hacha: () => [mango(0.7).translate(0, PY, 0.28), u(new THREE.CylinderGeometry(0.19, 0.19, 0.04, 8, 1, false, 0, PI).rotateZ(PI / 2).rotateX(PI), ACERO, 0.3).translate(0, PY - 0.02, 0.56), u(caja(0.06, 0.12, 0.1), ACERO2).translate(0, PY, 0.56)],
  pico: () => [mango(0.78).translate(0, PY, 0.32), u(cono(0.04, 0.3, 5), ACERO2, 0.3).translate(0, PY + 0.17, 0.68), u(cono(0.04, 0.3, 5).rotateX(PI), ACERO2, 0.3).translate(0, PY - 0.17, 0.68), u(caja(0.07, 0.08, 0.08), 0x5f6772).translate(0, PY, 0.68)],
  azada: () => [mango(0.95).translate(0, PY, 0.4), u(caja(0.17, 0.2, 0.03).rotateX(0.25), ACERO2).translate(0, PY - 0.1, 0.87)],
  lanza: () => [u(cil(0.019, 0.019, 2.1, 6).rotateX(PI / 2), MADERA, 0.12).translate(0, PY, 0.03), u(octa(0.075).scale(0.9, 2.5, 0.3).rotateX(PI / 2), ACERO, 0.3).translate(0, PY, 1.24), u(cil(0.034, 0.026, 0.07, 6).rotateX(PI / 2), ACERO2).translate(0, PY, 1.06), u(cil(0.026, 0.012, 0.07, 6).rotateX(PI / 2), ACERO2).translate(0, PY, -0.985)],
  cayado: () => [u(cil(0.022, 0.026, 1.74, 6).rotateX(PI / 2), MADERA, 0.12).translate(0, PY, -0.15), u(esf(0.05, 6, 4), 0x7a4e2a).translate(0, PY, 0.74)],
  percha: () => [u(cil(0.02, 0.022, 3.6, 6), MADERA, 0.1).translate(0, -0.9, 0).rotateX(1.25).translate(0, PY, 0.03)],
  escoba: () => [u(cil(0.018, 0.018, 1.25, 6), MADERA, 0.1).translate(0, -0.35, PZ), u(cil(0.04, 0.13, 0.3, 6), PAJA, 0.3).translate(0, -1.08, PZ), u(cil(0.045, 0.045, 0.04, 6), CUERO2).translate(0, -0.93, PZ)],
  jarra: () => [u(cil(0.055, 0.05, 0.14, 8).rotateX(PI / 2), 0xb9824a, 0.15).translate(0, PY, 0.08), u(cil(0.058, 0.058, 0.025, 8).rotateX(PI / 2), ACERO2).translate(0, PY, 0.05), u(cil(0.05, 0.05, 0.02, 8).rotateX(PI / 2), 0xf4efe6, 0).translate(0, PY, 0.155), u(caja(0.02, 0.07, 0.08), 0xb9824a).translate(0.065, PY, 0.08)],
  pluma: () => [u(cono(0.016, 0.24, 4).rotateX(PI / 2), 0xf4efe6, 0.1).translate(0, PY, 0.12)],
  cubo: () => [u(cil(0.13, 0.1, 0.19, 8), MADERA, 0.2).translate(0, -0.37, 0), u(cil(0.134, 0.134, 0.03, 8, true), ACERO2).translate(0, -0.3, 0), u(cil(0.008, 0.008, 0.2, 5), CUERO2).translate(0, -0.19, 0)],
  farol: () => [u(caja(0.1, 0.13, 0.1), 0xffd36a, 0).translate(0, -0.32, 0), u(cono(0.09, 0.07, 4).rotateY(PI / 4), CUERO2).translate(0, -0.22, 0), u(caja(0.12, 0.025, 0.12), CUERO2).translate(0, -0.395, 0), u(cil(0.008, 0.008, 0.12, 5), CUERO2).translate(0, -0.14, 0)],
  cesta: () => [u(cil(0.17, 0.12, 0.16, 8), 0xc79a52, 0.25).translate(0, -0.33, 0.03), u(cil(0.175, 0.175, 0.03, 8, true), 0x9a7238).translate(0, -0.255, 0.03), u(cil(0.01, 0.01, 0.17, 5), 0x9a7238).translate(0, -0.17, 0.03)],
  espada: () => { const hoja = new THREE.Shape(); hoja.moveTo(-0.05, 0); hoja.lineTo(-0.058, 0.56); hoja.lineTo(0, 0.78); hoja.lineTo(0.058, 0.56); hoja.lineTo(0.05, 0); hoja.closePath();
    return [u(new THREE.ExtrudeGeometry(hoja, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 1 }).translate(0, 0, -0.006).rotateY(PI / 2).rotateX(PI / 2), ACERO, 0.3).translate(0, PY, 0.12), u(caja(0.05, 0.26, 0.05), ORO).translate(0, PY, 0.1), u(cil(0.022, 0.022, 0.16, 6).rotateX(PI / 2), CUERO2).translate(0, PY, 0), u(octa(0.04), ORO).translate(0, PY, -0.1)]; },
  maza: () => [mango(0.5).translate(0, PY, 0.18), u(esf(0.085, 6, 5), ACERO2, 0.3).translate(0, PY, 0.46), u(octa(0.11).scale(1, 0.35, 1), ACERO).translate(0, PY, 0.46), u(octa(0.11).scale(0.35, 1, 1), ACERO).translate(0, PY, 0.46)],
  daga: () => { const hoja = new THREE.Shape(); hoja.moveTo(-0.026, 0); hoja.lineTo(-0.032, 0.2); hoja.lineTo(0, 0.33); hoja.lineTo(0.032, 0.2); hoja.lineTo(0.026, 0); hoja.closePath();
    return [u(new THREE.ExtrudeGeometry(hoja, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 1 }).translate(0, 0, -0.005).rotateY(PI / 2).rotateX(PI / 2), ACERO, 0.3).translate(0, PY, 0.06), u(caja(0.035, 0.13, 0.03), ORO).translate(0, PY, 0.055), u(cil(0.02, 0.02, 0.11, 6).rotateX(PI / 2), CUERO2).translate(0, PY, -0.01), u(octa(0.028), ORO).translate(0, PY, -0.075)]; },
  hachon: () => [mango(1.05, 0.026).translate(0, PY, 0.36), u(new THREE.CylinderGeometry(0.27, 0.27, 0.045, 8, 1, false, 0, PI).rotateZ(PI / 2).rotateX(PI), ACERO, 0.3).translate(0, PY - 0.02, 0.78), u(new THREE.CylinderGeometry(0.2, 0.2, 0.045, 8, 1, false, 0, PI).rotateZ(PI / 2), ACERO2, 0.3).translate(0, PY + 0.02, 0.78), u(cono(0.04, 0.16, 5).rotateX(PI / 2), ACERO).translate(0, PY, 0.96)],
  baston: () => [u(cil(0.022, 0.028, 1.9, 6).rotateX(PI / 2), 0x5a3f2a, 0.12).translate(0, PY, -0.07), u(octa(0.085), 0x6fd0ff, 0.35).translate(0, PY, 0.97), u(cil(0.05, 0.03, 0.08, 6).rotateX(PI / 2), ORO).translate(0, PY, 0.87)],
  rama: () => [u(cil(0.022, 0.03, 1.84, 6).rotateX(PI / 2), 0x6a4a2e, 0.12).translate(0, PY, -0.1), u(octa(0.09).scale(1, 1, 0.7), 0x5f8f3a).translate(0.05, PY, 0.86), u(octa(0.075).scale(1, 1, 0.7), 0x7aa648).translate(-0.06, PY + 0.03, 0.78), u(octa(0.06).scale(1, 1, 0.7), 0x4a7a32).translate(0, PY - 0.03, 0.96)],
  arco: () => { const R = 0.62, A = 2.2, yc = R - R * Math.cos(A / 2), zt = R * Math.sin(A / 2); return [u(new THREE.TorusGeometry(R, 0.017, 4, 14, A).rotateZ(-A / 2).rotateX(PI / 2).rotateZ(-PI / 2), MADERA, 0.1).translate(0, PY + R, 0), u(cil(0.004, 0.004, zt * 2, 4).rotateX(PI / 2), 0xe8e0d0, 0).translate(0, PY + yc, 0), u(cil(0.027, 0.027, 0.13, 6).rotateX(PI / 2), CUERO2).translate(0, PY, 0)]; },

  orbe: o => [u(esf(0.085, 8, 6), o.brillo ?? 0x9fd8ff, 0.4).translate(0, PY + 0.02, 0.13), u(esf(0.045, 6, 4), 0xffffff, 0).translate(0.02, PY + 0.045, 0.16)],
  cetro: () => [u(cil(0.017, 0.02, 0.7, 6).rotateX(PI / 2), ORO).translate(0, PY, 0.22), u(cil(0.05, 0.022, 0.07, 6).rotateX(PI / 2), ORO).translate(0, PY, 0.59), u(octa(0.062), 0xc9283c, 0.35).translate(0, PY, 0.67), u(esf(0.03, 6, 4), ORO).translate(0, PY, -0.14)],
};
// Lo que no va en la mano: [hueso, piezas], en coordenadas de ese hueso
const CARGAS = {
  saco: () => ['pecho', [u(esf(0.2, 7, 5).scale(1, 0.85, 1.35), 0xc9a66a, 0.25).translate(-0.27, 0.4, -0.05), u(cono(0.06, 0.1, 5).rotateX(-PI / 2), 0xa8854e).translate(-0.27, 0.42, 0.25)]],
  escudo: o => { const c1 = viva(o.color ?? 0x3d5a80), g = cil(0.27, 0.27, 0.045, 14).rotateZ(PI / 2).toNonIndexed(); g.computeVertexNormals(); g.deleteAttribute('uv'); const p = g.attributes.position, C = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i += 3) { const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3; col.setHex(cx > 0.01 ? (cy * cz > 0 ? c1 : 0xe9e4d8) : MADERA); for (let k = 0; k < 3; k++) C.set([col.r, col.g, col.b], (i + k) * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    return ['anteI', [g.translate(0.1, -0.09, 0), u(cil(0.29, 0.29, 0.06, 14, true).rotateZ(PI / 2), ACERO2).translate(0.1, -0.09, 0), u(esf(0.07, 8, 5).scale(0.6, 1, 1), ACERO).translate(0.13, -0.09, 0)]]; },
  vaina: () => ['cadera', [u(caja(0.05, 0.56, 0.035).rotateX(-0.3), CUERO2).translate(0.25, -0.14, -0.08), u(caja(0.045, 0.045, 0.2), ORO).translate(0.25, 0.14, 0), u(cil(0.02, 0.02, 0.13, 6).rotateX(-0.3), CUERO).translate(0.25, 0.21, 0.02), u(octa(0.035), ORO).translate(0.25, 0.285, 0.045)]],
  carcaj: () => ['pecho', [u(cil(0.06, 0.05, 0.46, 6).rotateZ(0.35), CUERO).translate(0.06, 0.08, -0.22), u(cil(0.05, 0.05, 0.08, 5).rotateZ(0.35), 0xf4efe6, 0).translate(-0.03, 0.33, -0.22)]],
  laud: () => { const a = -0.92, dx = Math.sin(-a), dy = Math.cos(a), cx = -0.08, cy = -0.16, cz = 0.255; return ['pecho', [u(esf(0.15, 7, 5).scale(1, 1.25, 0.5), 0xb9824a, 0.25).rotateZ(a).translate(cx, cy, cz), u(cil(0.045, 0.045, 0.012, 8).rotateX(PI / 2), 0x3a2a20, 0).translate(cx, cy, cz + 0.076), u(caja(0.036, 0.44, 0.03), CUERO2).rotateZ(a).translate(cx + dx * 0.37, cy + dy * 0.37, cz), u(caja(0.07, 0.08, 0.035), 0xb9824a).rotateZ(a).translate(cx + dx * 0.62, cy + dy * 0.62, cz)]]; },
  tomo: o => ['cadera', [u(caja(0.07, 0.22, 0.17), o.tomo ?? 0x5a2f4a, 0.2).translate(-0.275, -0.05, 0.02), u(caja(0.06, 0.19, 0.15), 0xf0e8d4, 0).translate(-0.283, -0.05, 0.032), u(caja(0.075, 0.03, 0.03), ORO, 0).translate(-0.275, -0.05, 0.11)]],
  zurron: () => ['cadera', [u(caja(0.08, 0.16, 0.18), 0x9a6a3e).translate(-0.26, -0.02, 0.02), u(caja(0.09, 0.07, 0.19), CUERO).translate(-0.262, 0.04, 0.02), u(caja(0.03, 0.03, 0.03), ORO, 0).translate(-0.31, 0.0, 0.02)]],
};
const cuelga = (hueso, geos) => { const m = new THREE.Mesh(mergeGeometries(geos), material); m.castShadow = true; hueso.add(m); return m; };

/* ---------- el cuerpo ---------- */
function cuerpo(o, rnd, neutro = false) {
  const k = o.ancho, P = [], PC = [], piel = o.piel, tela = viva(o.color), larga = o.largo > 0.5, c = o.cabezon ?? 1;
  const pz = (geo, color, pesos, op) => pieza(geo, color, pesos, { ...op, neutro });
  const ROPA = { zona: 1 }, PELO = { zona: 2 }, PIEL = { zona: 3 };
  const bajo = larga ? 0.1 : 0.78 - o.largo * 0.6, cuello = [[N.cadera, 0.5], [N.espina, 0.5]];
  // --- tronco y falda: del bajo al cuello. La falda sigue a los muslos y, si es larga, a las espinillas
  const falda = (x, y) => { const w = Math.min(0.92, (0.8 - y) / 0.17), e = larga ? sua2(0.5, 0.2, y) * 0.6 : 0; return Math.abs(x) > 0.06 ? [[N.cadera, 1 - w], [N[x > 0 ? 'musloI' : 'musloD'], w * (1 - e)], [N[x > 0 ? 'espiI' : 'espiD'], w * e + 1e-6]] : [[N.cadera, 1 - w * 0.6], [N.musloI, w * 0.3], [N.musloD, w * 0.3]]; };
  const tronco = (x, y) => y > 1.12 ? H('pecho') : y > 0.95 ? entre('pecho', 'espina', 1.12, 0.95)(x, y) : y > 0.79 ? entre('espina', 'cadera', 0.95, 0.79)(x, y) : falda(x, y);
  const peto = o.delantal && !larga;
  const pinta = (cx, cy, cz) => {
    if (o.ribete && cy < bajo + 0.07) return [o.ribete, 0];
    if (o.franja && Math.abs(cx) < 0.05 && cz > 0 && cy < 1.3) return [ORO, 0];
    if (o.delantal && cz > 0.03 && Math.abs(cx) < 0.17 * k && (peto ? cy < 1.25 : cy < 0.96 && cy > bajo + 0.07)) return [o.delantal, 0];
    return tela;
  };
  const b = o.barriga * 1.6;
  const kc = Math.max(k, 1.02);
  P.push(pz(tubo([...(larga ? [[0, bajo, 0, 0.3 * kc, 0.27], [0, 0.17, 0, 0.295 * kc, 0.262], [0, 0.45, 0, 0.26 * kc, 0.22 + b * 0.5], [0, 0.64, 0, 0.24 * kc, 0.195 + b * 0.8]] : [[0, bajo, 0, 0.245 * kc, 0.2 + b * 0.6], [0, bajo + 0.07, 0, 0.24 * kc, 0.195 + b * 0.6]]),
    [0, 0.78, 0, 0.222 * kc, 0.175 + b], [0, 0.98, 0.004 + b * 0.5, 0.196 * k, 0.15 + b], [0, 1.18, 0.005, 0.24 * k, 0.172 + b * 0.3], [0, 1.255, 0.003, 0.25 * k, 0.166], [0, 1.31, 0, 0.255 * k, 0.158], [0, 1.375, 0, 0.13, 0.11]], { n: 16, tapas: false }), pinta, tronco, { duro: false, grad: 0.3, cuadros: true, ...ROPA }));
  P.push(pz(en(cil(0.2, 0.2, 0.02, 12).scale(kc * 1.15, 1, 0.9), 0, bajo + 0.01, 0), 0x2a2024, falda, { grad: 0 }));
  if (peto) { for (const s of [-1, 1]) P.push(pz(en(caja(0.035, 0.22, 0.02).rotateZ(s * 0.5).rotateX(-0.35), s * 0.115, 1.3, 0.13), o.delantal, H('pecho'), { grad: 0 })); P.push(pz(en(caja(0.4 * k, 0.24, 0.022), 0, bajo - 0.1, 0.2 + b * 0.6), o.delantal, [[N.cadera, 0.6], [N.musloI, 0.2], [N.musloD, 0.2]], { grad: 0.2 })); }
  if (o.cola) P.push(larga ? pz(en(cono(0.055, 0.62, 5).rotateX(-1.72), 0, 0.2, -0.52), o.cola, H('cadera'), { grad: 0.2 }) : pz(en(cono(0.065, 0.66, 5).rotateX(-2.0), 0, 0.6, -0.4), o.cola, H('cadera'), { grad: 0.2 }));
  // --- cuello y cabeza; todo lo de la cabeza se guarda aparte para poder agrandarla
  const cab = H('cabeza');
  P.push(pz(tubo([[0, 1.35, 0, 0.082, 0.078], [0, 1.45, 0, 0.078, 0.074]], { n: 8, e: 1 }), piel, entre('cabeza', 'pecho', 1.44, 1.36), { duro: false, grad: 0, ...PIEL }));
  PC.push(pz(tubo([[0, 1.425, 0.01, 0.09, 0.09], [0, 1.46, 0.01, 0.16, 0.15], [0, 1.53, 0.01, 0.188, 0.172], [0, 1.64, 0.01, 0.196, 0.18], [0, 1.75, 0.01, 0.19, 0.176], [0, 1.825, 0.01, 0.158, 0.148], [0, 1.865, 0.01, 0.09, 0.085]], { n: 12, e: 0.8 }), piel, cab, { duro: false, grad: 0.1, ...PIEL }));
  const hc = n => { const v = Math.sin((nCara + 1) * 91.17 + n * 37.7) * 43758.5453; return v - Math.floor(v); }, C = { ceno: -0.1 + hc(1) * 0.3, ojo: 1.08 + hc(2) * 0.42, sep: 0.071 + hc(3) * 0.012, nariz: 0.025 + hc(4) * 0.013, boca: 0.8 + hc(5) * 0.45, gesto: hc(6), mejilla: hc(7) > 0.68, bigote: hc(8) > 0.78, rasgado: 0, ancho: 1, ceja: 1, iris: null, quijada: false, ...(o.cara || {}) }; nCara++;
  for (const s of [-1, 1]) {
    PC.push(pz(en(esf(0.045, 6, 5).scale(0.5, 1, 0.8), s * 0.196, 1.6, 0), piel, cab, { duro: false, grad: 0, ...PIEL }));
    if (o.troll) PC.push(pz(en(caja(0.075, 0.05, 0.02), s * 0.085, 1.652, 0.176), 0x15181c, cab, { grad: 0 }), pz(en(caja(0.04, 0.014, 0.012).rotateZ(s * 0.3), s * 0.08, 1.648, 0.188), 0xa8dcff, cab, { grad: 0 }));
    else PC.push(pz(en(esf(0.035, 8, 6).scale(C.ancho, C.ojo, 0.4).rotateZ(s * C.rasgado), s * C.sep, 1.625, 0.182), C.iris ?? OJO, cab, { duro: false, grad: 0 }), pz(en(esf(C.iris ? 0.008 : 0.011, 5, 4), s * C.sep + (C.iris ? 0 : 0.012), 1.625 + (C.iris ? 0 : 0.016 * C.ojo), 0.197), C.iris ? 0x14100c : 0xffffff, cab, { duro: false, grad: 0 }));
    if (!o.troll) PC.push(pz(en(caja(0.09, (o.mujer ? 0.018 : 0.028) * C.ceja, 0.03 * Math.min(1.5, C.ceja)).rotateZ(-s * (o.ceno ?? C.ceno)), s * (C.sep + 0.003), 1.672 + 0.027 * C.ojo, 0.178), o.pelo, cab, { grad: 0, ...PELO }));
    if (!o.troll && !o.hocico && C.mejilla) PC.push(pz(en(esf(0.03, 6, 4).scale(1, 0.7, 0.3), s * 0.118, 1.555, 0.158), new THREE.Color(piel).lerp(ROSA, 0.4).getHex(), cab, { duro: false, grad: 0 }));
    if (!o.troll && !o.hocico && !o.barba && C.gesto > 0.55) PC.push(pz(en(caja(0.016, 0.014, 0.012), s * (o.mujer ? 0.03 : 0.038) * C.boca, 1.503, 0.176), o.mujer ? 0xb5483f : 0x9a5040, cab, { grad: 0 }));   // comisuras: sonríe
  }
  PC.push(pz(en(esf(C.nariz, 6, 4), 0, 1.562, 0.19), piel, cab, { duro: false, grad: 0.5, ...PIEL }));
  if (C.quijada && !o.troll && !o.hocico) PC.push(pz(en(caja(0.17, 0.05, 0.05), 0, 1.462, 0.15), piel, cab, { duro: false, grad: 0, ...PIEL }));   // mandíbula adelantada
  if (!o.barba && !o.troll && !o.hocico) PC.push(pz(en(caja((o.mujer ? 0.055 : 0.07) * C.boca, C.gesto < 0.14 ? 0.026 : 0.014, 0.012), 0, 1.495, 0.176), C.gesto < 0.14 ? 0x3a1c1a : o.mujer ? 0xb5483f : 0x9a5040, cab, { grad: 0 }));
  if (!o.barba && !o.troll && !o.hocico && !o.mujer && (o.talla ?? 1) > 0.7 && C.bigote) PC.push(pz(en(caja(0.1, 0.022, 0.016), 0, 1.525, 0.182), o.pelo, cab, { grad: 0, ...PELO }));
  // --- troll de escarcha: quijada, colmillos, orejas de punta, ceño de piedra y el collar de hierro con su esquirla azul
  if (o.troll) {
    PC.push(pz(en(caja(0.31, 0.12, 0.15), 0, 1.485, 0.125), piel, cab, { grad: 0, ...PIEL }), pz(en(esf(0.05, 6, 4).scale(1.3, 0.8, 0.9), 0, 1.585, 0.2), piel, cab, { duro: false, grad: 0.4, ...PIEL }), pz(en(caja(0.17, 0.016, 0.012), 0, 1.528, 0.202), 0x1c1416, cab, { grad: 0 }));
    for (const s of [-1, 1]) PC.push(pz(en(caja(0.17, 0.075, 0.1).rotateZ(s * 0.38), s * 0.085, 1.7, 0.165), piel, cab, { grad: 0, ...PIEL }), pz(en(caja(0.05, 0.016, 0.012).rotateZ(-s * 0.5), s * 0.105, 1.518, 0.202), 0x1c1416, cab, { grad: 0 }));
    for (const s of [-1, 1]) PC.push(pz(en(cono(0.03, 0.17, 5), s * 0.115, 1.6, 0.185), 0xf2ead8, cab, { grad: 0 }), pz(en(cono(0.045, 0.2, 4).rotateZ(-s * 1.15), s * 0.28, 1.66, -0.02), piel, cab, { grad: 0, ...PIEL }));
    P.push(pz(tubo([[0, 1.365, 0, 0.105, 0.1], [0, 1.415, 0, 0.105, 0.1]], { n: 8, e: 1 }), 0x3a3d46, entre('cabeza', 'pecho', 1.44, 1.36), { grad: 0 }), pz(en(octa(0.04), 0, 1.39, 0.105), 0x6fd0ff, entre('cabeza', 'pecho', 1.44, 1.36), { grad: 0 }));
  }
  // --- otras gentes: orejas de punta, colmillos, cuernos, hocico con cresta y marcas en la piel
  if (o.orejas) for (const s of [-1, 1]) PC.push(pz(en(cono(0.034, o.orejas === 'larga' ? 0.21 : 0.13, 4).rotateZ(-s * 1.0), s * (o.orejas === 'larga' ? 0.27 : 0.235), 1.66, -0.01), piel, cab, { grad: 0, ...PIEL }));
  if (o.colmillos) for (const s of [-1, 1]) PC.push(pz(en(cono(0.02, 0.08, 5), s * 0.062, 1.535, 0.186), 0xf2ead8, cab, { grad: 0 }));
  if (o.cuernos) for (const s of [-1, 1]) PC.push(pz(en(cono(0.045, 0.26, 5).rotateX(-0.75).rotateZ(-s * 0.45), s * 0.135, 1.885, -0.05), o.cuernos, cab, { grad: 0.3 }));
  if (o.hocico) {
    PC.push(pz(en(caja(0.2, 0.115, 0.17), 0, 1.565, 0.21), piel, cab, { grad: 0.2, ...PIEL }), pz(en(caja(0.17, 0.014, 0.012), 0, 1.535, 0.297), 0x2a1c18, cab, { grad: 0 }));
    for (const s of [-1, 1]) PC.push(pz(en(caja(0.02, 0.02, 0.012), s * 0.045, 1.6, 0.297), 0x2a1c18, cab, { grad: 0 }));
    if (!o.tocado) for (let i = 0; i < 4; i++) PC.push(pz(en(cono(0.036, 0.12 - i * 0.012, 4).rotateX(-0.45 - i * 0.38), 0, 1.885 - i * i * 0.022, 0.06 - i * 0.09), o.hocico, cab, { grad: 0.2 }));
  }
  if (o.marcas) for (const [mx, my, mz, w] of [[0, 1.845, 0.1, 0.16], [0.13, 1.8, 0.03, 0.07], [-0.13, 1.8, 0.03, 0.07], [0, 1.5, 0.186, 0.05]]) PC.push(pz(en(caja(w, 0.02, 0.03), mx, my, mz), o.marcas, cab, { grad: 0 }));
  // --- pelo y barba, a golpes de faceta
  const tapado = ['capucha', 'toca', 'casco'].includes(o.tocado), pe = o.peinado;
  if (!tapado && pe !== 'calvo') {
    if (pe !== 'tonsura') PC.push(pz(en(esf(0.226, 8, 5, 0, 2 * PI, 0, 0.95), 0, 1.69, -0.005), o.pelo, cab, PELO));
    PC.push(pz(en(esf(0.226, 8, 6, PI / 2 + 1.05, 2 * PI - 2.1, pe === 'tonsura' ? 1.0 : 0.6, pe === 'tonsura' ? 1.1 : 1.5).scale(1, 1.1, 1), 0, 1.68, -0.005), o.pelo, cab, PELO));
    if (pe === 'mono') PC.push(pz(en(esf(0.085, 6, 5), 0, 1.83, -0.21), o.pelo, cab, PELO));
    // melena: una cortina por detrás, hasta los hombros
    if (pe === 'largo') { const g = pz(en(cil(0.222, 0.25, 0.4, 8, true), 0, 1.5, -0.005), o.pelo, cab, { grad: 0.2, ...PELO }), p = g.attributes.position, guarda = []; for (let i = 0; i < p.count; i += 3) if ((p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3 < 0.02) guarda.push(i, i + 1, i + 2); g.setIndex(guarda); PC.push(g.toNonIndexed()); }
  }
  if (o.barba) {
    PC.push(pz(en(esf(0.165, 7, 5, 0, 2 * PI, 1.25, PI - 1.25).scale(1.08, 0.75 + 0.5 * o.barba, 0.82), 0, 1.475, 0.07), o.pelo, cab, { grad: 0.15, ...PELO }));
    for (const s of [-1, 1]) PC.push(pz(en(caja(0.085, 0.035, 0.035).rotateZ(-s * 0.3), s * 0.045, 1.528, 0.2), o.pelo, cab, { grad: 0, ...PELO }));
  }
  // --- tocados
  const tc = o.colorTocado ?? tela, zt = o.colorTocado ? {} : ROPA;
  if (o.tocado === 'capucha' || o.tocado === 'toca') {
    const cap = o.tocado === 'capucha', r = cap ? 0.245 : 0.232, cy = cap ? 1.66 : 1.685;
    PC.push(pz(en(esf(r, 8, 5, 0, 2 * PI, 0, 0.9), 0, cy, -0.01), tc, cab, zt), pz(en(esf(r, 8, 6, PI / 2 + (cap ? 0.8 : 0.95), 2 * PI - (cap ? 1.6 : 1.9), 0.6, cap ? 1.75 : 1.3).scale(1, cap ? 1.2 : 1, 1.03), 0, cap ? 1.68 : cy, -0.01), tc, cab, zt));
    if (!cap) { const g = pz(en(cil(0.225, 0.25, 0.34, 8, true), 0, 1.5, -0.01), tc, cab, { grad: 0.15, ...zt }), q = g.attributes.position, guarda = []; for (let i = 0; i < q.count; i += 3) if ((q.getZ(i) + q.getZ(i + 1) + q.getZ(i + 2)) / 3 < 0.03) guarda.push(i, i + 1, i + 2); g.setIndex(guarda); PC.push(g.toNonIndexed()); }
    if (cap) { PC.push(pz(en(cono(0.085, 0.2, 5).rotateX(-2.1), 0, 1.86, -0.23), tc, cab, zt)); P.push(pz(tubo([[0, 1.27, 0, 0.3 * k, 0.215], [0, 1.34, 0, 0.29 * k, 0.2], [0, 1.4, 0, 0.17, 0.14], [0, 1.44, 0, 0.11, 0.105]], { n: 10, e: 0.9, tapas: false }), tc, H('pecho'), { grad: 0.15, ...zt })); }
  } else if (o.tocado === 'casco') {
    PC.push(pz(en(esf(0.245, 10, 5, 0, 2 * PI, 0, PI * 0.5).scale(1, 1.02, 1), 0, 1.655, 0.005), ACERO, cab, { grad: 0.25 }), pz(en(cil(0.256, 0.256, 0.05, 10, true), 0, 1.665, 0.005), ACERO2, cab), pz(en(caja(0.045, 0.17, 0.035), 0, 1.6, 0.225), ACERO2, cab));
    if (o.cresta) PC.push(pz(en(caja(0.04, 0.07, 0.36), 0, 1.915, 0), o.cresta, cab));
    // almófar: una falda de malla que deja la cara libre
    { const g = pz(en(cil(0.235, 0.275, 0.3, 10, true), 0, 1.5, -0.005), MALLA, cab, { grad: 0.2 }), p = g.attributes.position, guarda = []; for (let i = 0; i < p.count; i += 3) if ((p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3 < 0.1) guarda.push(i, i + 1, i + 2); g.setIndex(guarda); PC.push(g.toNonIndexed()); }
  } else if (o.tocado === 'sombrero') {
    const ala = (o.ala ?? 0.25) * 1.4;
    PC.push(pz(en(cil(ala, ala * 1.04, 0.03, 10), 0, 1.8, 0), tc, cab, { grad: 0.1 }), pz(en(cil(0.17, 0.2, 0.14, 8), 0, 1.875, 0), tc, cab, { grad: 0.2 }), pz(en(cil(0.204, 0.204, 0.035, 8, true), 0, 1.83, 0), CUERO2, cab));
    if (o.plumaTocado) PC.push(pz(en(cono(0.035, 0.34, 4).rotateX(-0.35).rotateZ(-0.35), 0.17, 2.0, -0.06), o.plumaTocado, cab, { grad: 0.2 }));
  } else if (o.tocado === 'pico') {
    PC.push(pz(en(cil(0.37, 0.385, 0.028, 10), 0, 1.8, 0), tc, cab, { grad: 0.1 }), pz(en(cono(0.205, 0.5, 8).rotateX(-0.12), 0, 2.05, -0.03), tc, cab, { grad: 0.25 }), pz(en(cil(0.208, 0.208, 0.045, 8, true), 0, 1.835, 0), ORO, cab));
  } else if (o.tocado === 'gorro') {
    PC.push(pz(en(cil(0.2, 0.218, 0.11, 8), 0, 1.835, -0.005), tc, cab, { grad: 0.2 }), pz(en(esf(0.2, 8, 3, 0, 2 * PI, 0, PI / 2).scale(1, 0.45, 1), 0, 1.89, -0.005), tc, cab, { grad: 0.1 }), pz(en(cil(0.224, 0.224, 0.045, 8, true), 0, 1.795, -0.005), o.manto ?? CUERO2, cab));
  } else if (o.tocado === 'corona') {
    PC.push(pz(en(cil(0.172, 0.164, 0.075, 10, true), 0, 1.85, 0.005), ORO, cab, { grad: 0.1 }));
    for (let i = 0; i < 10; i++) { const an = (i + 0.5) / 10 * 2 * PI; PC.push(pz(en(cono(0.036, i % 2 ? 0.07 : 0.11, 4).rotateY(-an), Math.cos(an) * 0.166, 1.888 + (i % 2 ? 0.035 : 0.055), Math.sin(an) * 0.166 + 0.005), ORO, cab)); }
    for (const [an, cg] of [[PI / 2, 0xc9283c], [PI / 2 - 0.9, 0x2f6fb5], [PI / 2 + 0.9, 0x2f6fb5]]) PC.push(pz(en(octa(0.024), Math.cos(an) * 0.176, 1.85, Math.sin(an) * 0.176 + 0.005), cg, cab, { grad: 0.3 }));
  }
  for (const g of PC) { if (c !== 1) g.translate(0, -1.44, 0).scale(c, c, c).translate(0, 1.44, 0); P.push(g); }
  // --- brazos, puños y manos
  const manga = o.manga ?? tela, zm = o.manga ? 0 : 1;
  for (const [s, L] of [[-1, 'D'], [1, 'I']]) {
    const B = 'brazo' + L, A = 'ante' + L, M = 'mano' + L, x = y => s * (0.285 + (1.3 - y) * 0.05) * (0.9 + 0.1 * k), g = k > 1.1 ? 1.12 : k < 0.92 ? 0.9 : 1;
    const wB = (px, y) => y > 1.11 ? H(B) : y > 0.99 ? entre(B, A, 1.11, 0.99)(px, y) : H(A);
    P.push(pz(tubo([[x(1.375), 1.375, 0, 0.05, 0.05], [x(1.34), 1.34, 0, 0.088 * g, 0.088 * g], [x(1.25), 1.25, 0, 0.084 * g, 0.084 * g], [x(1.1), 1.1, 0, 0.075 * g, 0.075 * g], [x(1.05), 1.05, 0, 0.073 * g, 0.073 * g], [x(1.0), 1.0, 0, 0.074 * g, 0.074 * g], [x(0.88), 0.88, 0, 0.07 * g, 0.07 * g], [x(0.83), 0.83, 0, 0.064, 0.064]], { n: 8, e: 1 }),
      (cx, cy) => o.mangaCorta && cy < 1.15 ? [piel, 3] : [manga, zm], wB, { duro: false, grad: 0.18 }));
    if (o.mangaCorta) P.push(pz(en(cil(0.098 * g, 0.094 * g, 0.05, 8), x(1.16), 1.16, 0), manga, H(B), { zona: zm }));
    if (o.punos) P.push(pz(en(cil(0.086, 0.078, 0.13, 8), x(0.9), 0.9, 0), o.punos, H(A)));
    if (o.hombreras) P.push(pz(en(esf(0.125, 6, 4, 0, 2 * PI, 0, PI / 2).scale(1.05, 0.85, 1.1), x(1.335), 1.335, 0), ACERO, H(B), { grad: 0.25 }), pz(en(cil(0.132, 0.132, 0.03, 6, true).scale(1.05, 1, 1.1), x(1.335), 1.335, 0), ACERO2, H(B)));
    const zg = o.guante ? {} : PIEL;
    P.push(pz(tubo([[x(0.84), 0.845, 0.005, 0.05, 0.05], [x(0.8), 0.8, 0.008, 0.074, 0.07], [x(0.73), 0.73, 0.01, 0.084, 0.078], [x(0.675), 0.675, 0.01, 0.07, 0.064], [x(0.648), 0.648, 0.01, 0.04, 0.036]], { n: 8, e: 0.8 }), o.guante ?? piel, H(M), { duro: false, grad: 0.12, ...zg }),
      pz(en(esf(0.034, 6, 4), x(0.76) - s * 0.03, 0.765, 0.075), o.guante ?? piel, H(M), { duro: false, grad: 0, ...zg }));
  }
  // --- piernas y botas
  for (const [s, L] of [[-1, 'D'], [1, 'I']]) {
    const Mu = 'muslo' + L, E = 'espi' + L, F = 'pie' + L, x = s * 0.11;
    P.push(pz(tubo([[x, 0.82, 0, 0.06, 0.06], [x, 0.76, 0, 0.105, 0.105], [x, 0.6, 0, 0.098, 0.1], [x, 0.48, 0.004, 0.09, 0.092], [x, 0.45, 0.004, 0.088, 0.09], [x, 0.42, 0, 0.088, 0.09], [x, 0.33, 0, 0.086, 0.088]], { n: 8, e: 1 }), o.calzas, (px, y) => y > 0.51 ? H(Mu) : y > 0.39 ? entre(Mu, E, 0.51, 0.39)(px, y) : H(E), { duro: false, grad: 0.2 }));
    P.push(pz(en(cil(0.112, 0.104, 0.07, 8), x, 0.36, 0), o.botas, H(E)), pz(tubo([[x, 0.37, 0, 0.1, 0.1], [x, 0.2, 0, 0.092, 0.094], [x, 0.09, 0, 0.09, 0.1], [x, 0.0, 0, 0.09, 0.1]], { n: 8, e: 0.8 }), o.botas, (px, y) => y > 0.16 ? H(E) : entre(E, F, 0.16, 0.06)(px, y), { duro: false, grad: 0.25 }));
    P.push(pz(tubo([[x, 0.058, 0.24, 0.07, 0.044], [x, 0.066, 0.14, 0.098, 0.064], [x, 0.07, 0, 0.094, 0.07], [x, 0.06, -0.1, 0.078, 0.058]], { n: 8, e: 0.75, eje: 'z' }), o.botas, H(F), { duro: false, grad: 0.3 }));
  }
  // --- cinto (o cuerda, para los monjes) y hebilla
  if (o.cinto) { P.push(pz(tubo([[0, 0.935, 0.004 + b * 0.5, 0.222 * k, 0.176 + b], [0, 1.015, 0.004 + b * 0.5, 0.222 * k, 0.176 + b]], { n: 16 }), o.cuerda ? 0xd9c79a : CUERO2, cuello, { grad: 0.1 }));
    if (o.cuerda) P.push(pz(en(caja(0.03, 0.26, 0.03), 0.07, 0.84, 0.185 + b), 0xd9c79a, H('cadera'), { grad: 0 })); else P.push(pz(en(caja(0.09, 0.09, 0.03), 0, 0.975, 0.182 + b * 1.5), ORO, cuello), pz(en(caja(0.042, 0.042, 0.034), 0, 0.975, 0.184 + b * 1.5), CUERO2, cuello, { grad: 0 })); }
  if (o.emblema) P.push(pz(en(octa(0.075).scale(0.85, 1.25, 0.12), 0, 1.17, 0.176), ORO, H('pecho'), { grad: 0.1 }));
  // --- sobre los hombros: piel de abrigo o armiño; a la espalda, la capa
  if (o.manto || o.armino) {
    const cm = o.armino ? 0xf6f1e8 : o.manto;
    P.push(pz(tubo([[0, 1.19, 0, 0.325 * k, 0.24], [0, 1.3, 0, 0.33 * k, 0.225], [0, 1.37, 0, 0.2, 0.155], [0, 1.41, 0, 0.108, 0.102]], { n: 12, e: 0.9, tapas: false }), o.armino ? cm : (cx, cy, cz) => { col.setHex(cm).multiplyScalar(0.86 + (Math.abs(Math.sin(cx * 91 + cz * 57 + cy * 33)) * 0.3)); return [col.getHex(), 0]; }, H('pecho'), { grad: 0.12 }));
    if (o.armino) for (let i = 0; i < 10; i++) { const an = i / 10 * 2 * PI + 0.3, y = i % 2 ? 1.235 : 1.275; P.push(pz(en(caja(0.028, 0.045, 0.028).rotateY(-an), Math.cos(an) * 0.332 * k, y, Math.sin(an) * 0.236), 0x2a2530, H('pecho'), { grad: 0 })); }
  }
  if (o.capa) {
    if (!o.manto && !o.armino && o.tocado !== 'capucha') P.push(pz(tubo([[0, 1.28, 0, 0.285 * k, 0.2], [0, 1.35, 0, 0.2, 0.15], [0, 1.4, 0, 0.11, 0.104]], { n: 10, e: 0.9, tapas: false }), o.capa, H('pecho'), { grad: 0.1 }));
    if (!o.sinPano) { const fin = o.capaLarga ? 0.14 : 0.5, g = new THREE.PlaneGeometry(1, 1, 4, 6), cp = g.attributes.position;
      for (let i = 0; i < cp.count; i++) { const ux = cp.getX(i), w = 0.5 - cp.getY(i); cp.setXYZ(i, ux * (0.5 + w * 0.22) * k, 1.3 - w * (1.3 - fin), -(0.2 + Math.cos(ux * PI) * 0.05 + w * 0.1)); }
      P.push(pz(g, (cx, cy) => o.armino && cy < fin + 0.08 ? 0xf6f1e8 : o.capa, (x, y) => { const t = sua2(1.3, 0.7, y); return [[N.pecho, 1 - t + 1e-6], [N.capa, t]]; }, { duro: false, grad: 0.25, cuadros: true })); }
  }
  return mergeGeometries(P);
}

/* ---------- vestuario: qué lleva cada oficio ---------- */
const TIERRA = [0x6a5a2f, 0x7a3b2e, 0x5a6b3a, 0x8a7a55, 0x4a5a6a, 0x8a6a48, 0x6a2f3a, 0x3f5a5a], de = (rnd, l) => l[Math.floor(rnd() * l.length)];
export function vestir(tipo = 'aldeano', rnd = Math.random, color) {
  const o = { color: color ?? de(rnd, TIERRA), piel: de(rnd, PIELES), pelo: de(rnd, PELOS), ancho: 0.94 + rnd() * 0.16, barriga: rnd() < 0.25 ? 0.02 + rnd() * 0.03 : 0, largo: 0.26 + rnd() * 0.1, cinto: true,
    calzas: de(rnd, [0x4a4038, 0x5a5248, 0x3a3a48, 0x6a5a4a]), botas: de(rnd, [0x4a3324, 0x5a3a26, 0x3a2a20]), botaAlta: rnd() < 0.4, peinado: de(rnd, ['corto', 'corto', 'corto', 'largo', 'corto', 'calvo']), barba: rnd() < 0.4 ? 0.2 + rnd() * 0.8 : 0, cabezon: 1, tipo };
  const r = rnd(), mas = extra => Object.assign(o, extra);
  if (tipo === 'aldeano') mas(r < 0.22 ? { tocado: 'capucha' } : r < 0.4 ? { tocado: 'sombrero', colorTocado: PAJA } : r < 0.5 ? { tocado: 'gorro', colorTocado: 0x7a5a3a } : {});
  else if (tipo === 'aldeana') mas({ mujer: true, largo: 0.8, ancho: 0.86 + rnd() * 0.08, barba: 0, barriga: 0, peinado: r < 0.5 ? 'largo' : 'mono', ...(r < 0.45 ? { tocado: 'toca', colorTocado: 0xf0e8d4 } : {}), ...(rnd() < 0.5 ? { delantal: 0xf0e8d4 } : {}), manga: rnd() < 0.5 ? 0xf0e8d4 : undefined });
  else if (tipo === 'crio') mas({ cabezon: 1.14, pelo: PELOS[Math.floor(r * 4)], barba: 0, barriga: 0, largo: 0.3, peinado: 'corto', ancho: 0.94 });
  else if (tipo === 'guardia') mas({ tocado: 'casco', largo: 0.34, barriga: 0, ancho: 1.06, barba: 0, manga: MALLA, calzas: MALLA, hombreras: true, emblema: true, ribete: ORO, punos: CUERO, guante: 0x5a3a26, lleva: 'lanza', carga: rnd() < 0.5 ? ['vaina'] : ['vaina', 'escudo'], capa: rnd() < 0.4 ? viva(o.color) : undefined });
  else if (tipo === 'noble') mas({ largo: 0.8, ribete: ORO, franja: true, punos: ORO, capa: de(rnd, [0x8a1c2c, 0x2f4f8a, 0x3a6a3a]), capaLarga: true, peinado: r < 0.5 ? 'largo' : 'corto', barriga: 0 });
  else if (tipo === 'clan') mas({ manto: de(rnd, [0x8a7458, 0xa39c8e, 0x5a4a3c, 0xc4bcaa]), barba: 0.6 + rnd() * 0.6, ceno: 0.22, peinado: r < 0.6 ? 'largo' : 'calvo', punos: CUERO, ancho: 1.1 + rnd() * 0.1, largo: 0.4, ...(r < 0.3 ? { tocado: 'gorro', colorTocado: 0x6a5a4a } : {}) });
  else if (tipo === 'mercader') mas({ largo: 0.74, ribete: 0xe2c56e, tocado: r < 0.6 ? 'gorro' : 'sombrero', colorTocado: de(rnd, [0x8a2f4a, 0x2f5f8f, 0x4a4a6a]), ala: 0.2, barriga: 0.04 + rnd() * 0.03, carga: ['zurron'] });
  else if (tipo === 'minero') mas({ tocado: r < 0.6 ? 'capucha' : 'gorro', colorTocado: 0x5a5046, largo: 0.3, guante: 0x6a4a30 });
  else if (tipo === 'escriba') mas({ largo: 0.84, peinado: r < 0.5 ? 'tonsura' : 'corto', barba: 0, cinto: false });
  else if (tipo === 'marino') mas({ tocado: r < 0.5 ? 'gorro' : undefined, colorTocado: de(rnd, [0x9a3b2e, 0x2f5f8f, 0x4a4a6a]), largo: 0.24, manga: 0xe8dec4, mangaCorta: r > 0.6 });
  else if (tipo === 'monje') mas({ largo: 0.84, tocado: 'capucha', barba: 0, cuerda: true });
  else if (tipo === 'troll') { const p = de(rnd, [0x8fa3b5, 0x7f96a8, 0x9aaab4]); mas({ troll: true, piel: p, pelo: 0x56606c, color: color ?? 0x6a5646, ancho: 1.42 + rnd() * 0.1, barriga: 0.09, largo: 0.34, peinado: 'calvo', barba: 0, ceno: 0.32, mangaCorta: true, calzas: p, botas: col.setHex(p).multiplyScalar(0.7).getHex(), botaAlta: false, cabezon: 0.9, tocado: undefined, cuerda: true, cinto: false }); }
  return o;
}

/* ---------- clases y especies: recetas que se suman a un vestuario base ---------- */
const CLASE = {
  'Bárbaro': r => ({ color: 0x6a4a30, largo: 0.3, mangaCorta: true, manto: de(r, [0x8a7458, 0xa39c8e, 0x5a4a3c]), peinado: 'largo', barba: 0.9, ceno: 0.24, ancho: 1.14, punos: CUERO, botaAlta: true, lleva: 'hachon' }),
  'Bardo': r => ({ color: de(r, [0x8a2f6a, 0x2f6f8a, 0xa8402e]), largo: 0.42, ribete: ORO, tocado: 'sombrero', colorTocado: 0x2f3f6a, ala: 0.2, plumaTocado: 0xd9482e, punos: ORO, carga: ['laud'], brazos: 'toca', botaAlta: true }),
  'Brujo': r => ({ color: 0x3a2a4a, largo: 0.84, tocado: 'capucha', ribete: 0x8a5ac8, punos: 0x8a5ac8, cinto: true, lleva: 'orbe', brillo: 0xb58cff, carga: ['tomo'], tomo: 0x2a1c2e }),
  'Clérigo': r => ({ color: 0xe8e0cc, largo: 0.62, franja: true, ribete: ORO, manga: MALLA, calzas: MALLA, punos: CUERO, emblema: true, lleva: 'maza', carga: ['escudo'] }),
  'Druida': r => ({ color: 0x4f6a3a, largo: 0.82, manto: 0x6a5a3c, peinado: 'largo', cuerda: true, cinto: false, ribete: 0x8a6a3a, lleva: 'rama', carga: ['zurron'] }),
  'Explorador': r => ({ color: 0x4a5a34, largo: 0.34, tocado: 'capucha', capa: 0x3a452a, guante: CUERO, punos: CUERO, botaAlta: true, llevaI: 'arco', brazos: 'arco', carga: ['carcaj', 'vaina'] }),
  'Guerrero': r => ({ color: de(r, [0x7a2e2a, 0x2f4f8a, 0x3a6a3a]), largo: 0.34, tocado: 'casco', cresta: 0x9a2a2a, manga: MALLA, calzas: MALLA, hombreras: true, emblema: true, ribete: ORO, punos: CUERO, guante: 0x5a3a26, ancho: 1.08, barriga: 0, lleva: 'espada', carga: ['escudo', 'vaina'] }),
  'Hechicero': r => ({ color: 0xb23a2e, largo: 0.72, ribete: ORO, franja: true, punos: ORO, peinado: 'largo', capa: 0x5a1c24, lleva: 'orbe', brillo: 0xffb04a }),
  'Mago': r => ({ color: 0x2f4f8a, largo: 0.86, tocado: 'pico', colorTocado: 0x2f4f8a, ribete: 0xd9c27a, punos: 0xd9c27a, barba: 1.1, pelo: 0xd4cfc6, lleva: 'baston', carga: ['tomo'], tomo: 0x7a2f2a }),
  'Monje': r => ({ color: 0xc27a2a, largo: 0.5, mangaCorta: true, cuerda: true, cinto: false, peinado: 'calvo', barba: 0, calzas: 0x8a5a2a, botaAlta: false, ribete: 0x8a3a1e }),
  'Paladín': r => ({ color: 0xe6e0d0, largo: 0.5, franja: true, ribete: ORO, manga: ACERO, calzas: ACERO2, hombreras: true, emblema: true, punos: ORO, guante: ACERO2, capa: de(r, [0x2f4f8a, 0x8a1c2c]), capaLarga: true, ancho: 1.1, barriga: 0, lleva: 'espada', carga: ['escudo'] }),
  'Pícaro': r => ({ color: 0x33333c, largo: 0.3, tocado: 'capucha', capa: 0x25252c, guante: 0x2a2024, punos: 0x2a2024, botaAlta: true, botas: 0x2a2024, calzas: 0x3a3a44, barriga: 0, lleva: 'daga', llevaI: 'daga', carga: ['zurron'] }),
};
const ESPECIE = {
  'Humano': () => ({}),
  'Elfo': (r, o) => ({ cara: { rasgado: 0.32, ancho: 1.12, ojo: 1.0, ceno: -0.06, ceja: 0.7, nariz: 0.023, bigote: false, mejilla: false }, talla: 0.98, ancho: o.ancho * 0.9, orejas: 'larga', barba: 0, barriga: 0, peinado: o.peinado === 'calvo' ? 'calvo' : 'largo', pelo: de(r, [0xe6dcc0, 0xd4cfc6, 0x2a1f18, 0x9a6a2e]) }),
  'Enano': (r, o) => ({ cara: { nariz: 0.043, ceja: 1.5, ceno: 0.16, ojo: 1.05, mejilla: true, boca: 1.15 }, talla: 0.74, ancho: o.ancho * 1.26, cabezon: 1.18, barba: o.mujer ? 0 : Math.max(1.3, o.barba), peinado: o.peinado === 'calvo' ? 'calvo' : 'largo', pelo: de(r, [0x8a3a1e, 0x5a3a22, 0xd4cfc6, 0x2a1f18]) }),
  'Gnomo': (r, o) => ({ cara: { nariz: 0.04, ojo: 1.6, ancho: 1.15, sep: 0.08, ceno: -0.12, mejilla: true, gesto: 0.8, bigote: false }, talla: 0.6, ancho: o.ancho * 0.96, cabezon: 1.32, orejas: 'punta', barba: o.barba ? 0.5 : 0, pelo: de(r, [0xd4cfc6, 0xe6dcc0, 0x9a6a2e, 0xc86a3a]) }),
  'Mediano': (r, o) => ({ cara: { ojo: 1.5, ancho: 1.08, nariz: 0.03, ceno: -0.1, mejilla: true, gesto: 0.9, bigote: false }, talla: 0.62, ancho: o.ancho * 1.0, cabezon: 1.2, barba: 0, botas: o.piel, botaAlta: false, peinado: o.peinado === 'calvo' ? 'calvo' : 'corto', pelo: de(r, [0x5a3a22, 0x9a6a2e, 0x8a3a1e]) }),
  'Goliat': (r, o) => ({ cara: { ojo: 0.95, ancho: 0.9, ceja: 1.6, nariz: 0.036, boca: 1.2, quijada: true, mejilla: false, bigote: false, gesto: 0.4 }, talla: 1.28, ancho: o.ancho * 1.16, cabezon: 0.9, piel: de(r, [0xb9bec4, 0xa9b0b8, 0xc8c4bc]), marcas: 0x4a5560, peinado: 'calvo', barba: 0, ceno: 0.2 }),
  'Orco': (r, o) => ({ cara: { ojo: 0.9, ancho: 0.95, ceja: 1.7, nariz: 0.04, boca: 1.3, quijada: true, mejilla: false, bigote: false, gesto: 0.4, iris: 0xd8b03a }, talla: 1.08, ancho: o.ancho * 1.16, piel: de(r, [0x7f9a6a, 0x8a9a7a, 0x6f8a70]), colmillos: true, orejas: 'punta', ceno: 0.26, barba: 0, pelo: 0x1a1a1a }),
  'Tiefling': (r, o) => { const p = de(r, [0xb8443c, 0x8a5ab0, 0xc86a5a, 0x5a6ab0]); return { cara: { rasgado: 0.26, ancho: 1.1, ojo: 1.05, ceno: 0.2, ceja: 0.8, iris: de(r, [0xf2c84a, 0xe8e2d0, 0xe0603a]), mejilla: false, bigote: false }, piel: p, cuernos: 0x2a2024, cola: p, orejas: 'punta', barba: 0, pelo: de(r, [0x1a1a1a, 0x3a1c2c, 0xd4cfc6]) }; },
  'Dracónido': (r, o) => { const [p, c] = de(r, [[0xc79a3a, 0x8a6a1e], [0xa8402e, 0x6a1c14], [0x3f7aa8, 0x24486a], [0x4a8a4a, 0x2a5a2a], [0xb8b8c0, 0x7a7a88]]); return { talla: 1.08, ancho: o.ancho * 1.1, piel: p, hocico: c, cola: p, peinado: 'calvo', barba: 0, botas: c, botaAlta: false, manga: o.manga === undefined ? undefined : o.manga }; },
};
export const CLASES = Object.keys(CLASE), ESPECIES = Object.keys(ESPECIE);
// Opciones para crearFigura: un aldeano de base, la ropa y el equipo de la clase encima y, lo último, el cuerpo de la especie.
export function personaje(clase, especie, rnd = Math.random) {
  const o = vestir('aldeano', rnd); delete o.tocado; delete o.colorTocado;
  o.mujer = rnd() < 0.5; if (o.mujer) { o.barba = 0; o.ancho *= 0.93; o.barriga = 0; if (o.peinado === 'calvo') o.peinado = 'largo'; }
  Object.assign(o, CLASE[clase]?.(rnd) ?? {}); if (o.mujer) o.barba = 0;
  Object.assign(o, ESPECIE[especie]?.(rnd, o) ?? {});
  return { rnd, talla: 1, ...o, tocado: o.tocado ?? null, colorTocado: o.colorTocado ?? null, tipo: 'aldeano' };
}

/* ---------- posturas ---------- */
const sua = x => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
// Qué hacen tronco y brazos. Los ángulos: x negativo adelanta un miembro o dobla el codo; x positivo inclina el tronco hacia delante.
const BRAZOS = {
  reposo(h, t, e) { const s = Math.sin(t * 0.9 + e.fase) * 0.03; h.brazoD.rotation.set(0.03 + s, 0, -0.1); h.brazoI.rotation.set(0.03 - s, 0, 0.1); h.anteD.rotation.x = h.anteI.rotation.x = -0.2; },
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
  guardia(h, t, e) { const s = Math.sin(t * 0.8 + e.fase) * 0.03; h.brazoD.rotation.set(-0.28 + s, 0, -0.34); h.anteD.rotation.x = -1.3 - s; h.manoD.rotation.y = -0.42; h.brazoI.rotation.set(0.04 - s, 0, 0.08); h.anteI.rotation.x = -0.2; h.cabeza.rotation.y += Math.sin(t * 0.22 + e.fase) * 0.45; },
  baston(h, t, e) { BRAZOS.guardia(h, t, e); h.cabeza.rotation.y -= Math.sin(t * 0.22 + e.fase) * 0.2; },
  toca(h, t, e) { const r = Math.sin(t * 6.5 * e.ritmo + e.fase), g = Math.sin(t * 0.9 + e.fase); h.brazoD.rotation.set(-0.25, 0, 0.1); h.anteD.rotation.set(-1.35 + r * 0.1, 0, 0.75); h.manoD.rotation.x = r * 0.25; h.brazoI.rotation.set(-0.6, 0, -0.1); h.anteI.rotation.set(-1.45, 0, -0.3 + g * 0.05); h.pecho.rotation.y += g * 0.1; h.cabeza.rotation.z += g * 0.08; h.cabeza.rotation.x += 0.06; },
  arco(h, t, e) { const s = Math.sin(t * 0.8 + e.fase) * 0.03; h.brazoI.rotation.set(-0.6 - s, 0, 0.28); h.anteI.rotation.x = -0.85 + s; h.manoI.rotation.y = 0.34; h.brazoD.rotation.set(0.03 + s, 0, -0.1); h.anteD.rotation.x = -0.25; h.cabeza.rotation.y += Math.sin(t * 0.25 + e.fase) * 0.3; },
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
  let alto = 0.8, lean = 0;
  // respiración y una mirada que va y viene: nadie está del todo quieto
  h.pecho.rotation.x = Math.sin(t * 1.2 + e.fase) * 0.014; h.cabeza.rotation.y = Math.sin(t * 0.31 + e.fase * 2) * 0.16 * (1 - m); h.cabeza.rotation.x = Math.sin(t * 0.23 + e.fase) * 0.03;
  if (e.piernas === 'sentado') {
    alto = e.asiento; const abre = e.abre ?? 0.16, bal = e.cuelga ? Math.sin(t * 1.6 + e.fase) * 0.25 : 0;
    h.musloD.rotation.set(-1.46, 0, -abre); h.musloI.rotation.set(-1.46, 0, abre); h.espiD.rotation.x = 1.42 + bal; h.espiI.rotation.x = 1.42 - bal; h.pieD.rotation.x = h.pieI.rotation.x = 0.04; h.espina.rotation.x = -0.03;
  } else if (e.piernas === 'rodillas') {
    alto = 0.45; h.musloD.rotation.set(0.12, 0, -0.06); h.musloI.rotation.set(0.12, 0, 0.06); h.espiD.rotation.x = h.espiI.rotation.x = 1.45; h.pieD.rotation.x = h.pieI.rotation.x = 0.7;
  } else if (e.piernas === 'suelo') {   // sentado en el suelo, piernas recogidas
    alto = 0.15; h.musloD.rotation.set(-1.9, 0, -0.3); h.musloI.rotation.set(-1.9, 0, 0.3); h.espiD.rotation.x = h.espiI.rotation.x = 2.3; h.espina.rotation.x = 0.25;
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
    alto -= 0.69 * (1 - Math.cos(A * sw)) + (e.flexion ?? 0) * 0.05; lean = 0.05 * m * e.brio;
    h.cadera.rotation.y = -0.1 * sw * m; h.espina.rotation.y = 0.2 * sw * m; h.cabeza.rotation.y += -0.1 * sw * m; h.espina.rotation.x = lean;
    h.capa.rotation.x = m * (0.16 + 0.07 * Math.sin(fi * 2));
  }
  h.cadera.position.y = alto;
  // brazos: la postura pedida; andando sin nada que hacer, braceo
  (BRAZOS[e.brazos] ?? BRAZOS.reposo)(h, t, e);
  // Al andar, la lanza o el bastón se apoyan: la contera se queda clavada mientras el cuerpo pasa (4/5 de la zancada) y vuelve por el aire.
  // De la mano a la contera hay 1,02; para que llegue al suelo inclinada, la mano baja lo que pide el triángulo.
  if (m > 0.01 && e.piernas === 'pie' && (e.brazos === 'guardia' || e.brazos === 'baston')) {
    const L = 1.02, k = ((f.paso / 6.2832) % 1 + 1) % 1, va = k < 0.8 ? 1 - 2 * k / 0.8 : -1 + 2 * (k - 0.8) / 0.2, alza = k < 0.8 ? 0 : Math.sin(PI * (k - 0.8) / 0.2);
    const d = 0.5 * va, inclina = Math.asin(d / L) - 0.16,   // 0,16: lo que ya va vencido en la postura de parado
       cae = Math.asin(Math.max(-0.5, Math.min(0.9, (L - Math.sqrt(L * L - d * d) - 0.02) / 0.27))) + (va < 0 ? 0.25 : 0.1) * va * va - 0.45 * alza;   // el resto, a ojo y medido: detrás hace falta bajar más que delante
    h.anteD.rotation.x += m * cae; h.manoD.rotation.x -= m * (inclina + cae);
  }
  if (m > 0.01 && e.piernas === 'pie' && (e.brazos === 'reposo' || !BRAZOS[e.brazos])) {
    const sw = Math.sin(f.paso), A = 0.62 * e.brio * m;
    h.brazoI.rotation.x += A * sw * 0.6; h.brazoD.rotation.x -= A * sw * 0.6; h.anteI.rotation.x -= m * (0.12 + 0.3 * Math.max(0, -sw)); h.anteD.rotation.x -= m * (0.12 + 0.3 * Math.max(0, sw));
  }
  h.capa.rotation.x += Math.sin(t * 1.1 + e.fase) * 0.03 + 0.03;
}

/* ---------- la figura ---------- */
const opcionesDe = opciones => { const rnd = opciones.rnd ?? Math.random; return { ...vestir(opciones.tipo, rnd, opciones.color), ...Object.fromEntries(Object.entries(opciones).filter(([, v]) => v !== undefined)) }; };
const POSTURA_DE = { lanza: 'guardia', cayado: 'guardia', baston: 'baston', rama: 'baston' };
export function crearFigura(opciones = {}) {
  const rnd = opciones.rnd ?? Math.random, o = opcionesDe(opciones), talla = opciones.talla ?? 1, huesos = esqueleto();
  const malla = new THREE.SkinnedMesh(cuerpo(o, rnd), material);
  malla.add(huesos[0]); malla.bind(new THREE.Skeleton(huesos)); malla.castShadow = malla.receiveShadow = true; malla.frustumCulled = false;
  const grupo = new THREE.Group(), cuerpoG = new THREE.Group(); cuerpoG.scale.setScalar(1.2 * talla); cuerpoG.add(malla); grupo.add(cuerpoG);
  const h = Object.fromEntries(huesos.map(b => [b.name, b]));
  const poner = (cosa, mano = 'D') => { if (UTENSILIOS[cosa]) return cuelga(h['mano' + mano], UTENSILIOS[cosa](o)); if (CARGAS[cosa]) { const [hueso, geos] = CARGAS[cosa](o); return cuelga(h[hueso], geos); } return null; };
  if (o.lleva) poner(o.lleva); if (o.llevaI) poner(o.llevaI, 'I'); for (const c of o.carga ?? []) poner(c);
  const f = {
    grupo, malla, huesos, h, poner, opciones: o, marcha: 0, paso: rnd() * 6.28,
    estado: { piernas: 'pie', brazos: o.brazos ?? POSTURA_DE[o.lleva] ?? 'reposo', fase: rnd() * 6.28, ritmo: 1, brio: 1, asiento: 0.47, camina: 0, dosManos: false },
    actualizar(t) {
      const dt = Math.min(0.1, Math.max(0.001, t - ut)); ut = t;
      const p = grupo.position, d = primero ? 0 : Math.hypot(p.x - ux, p.z - uz); ux = p.x; uz = p.z; primero = false;
      const zancada = ZANCADA * cuerpoG.scale.x * grupo.scale.x, vel = f.estado.camina || (d < 3 ? d / dt : 0), va = f.estado.piernas === 'pie' && vel > 0.12 * zancada ? 1 : 0;
      f.marcha += (va - f.marcha) * Math.min(1, dt * 7); f.paso += (f.estado.camina ? f.estado.camina * dt : Math.min(d, 3)) / zancada * 6.2832;
      f.estado.brio = Math.min(1.4, 0.75 + vel / zancada * 0.3);
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
  const rnd = opciones.rnd ?? Math.random, o = opcionesDe(opciones), huesos = esqueleto();
  const base = cuerpo(o, rnd, true), malla = new THREE.SkinnedMesh(base, material), esq = new THREE.Skeleton(huesos); malla.add(huesos[0]); malla.bind(esq);
  const h = Object.fromEntries(huesos.map(b => [b.name, b])), f = { h, huesos, marcha: 1, paso: 0, estado: { piernas: opciones.piernas ?? 'pie', brazos: opciones.brazos ?? POSTURA_DE[o.lleva] ?? 'reposo', fase: opciones.fase ?? 0, ritmo: 1, brio: 1, asiento: 0.47 } };
  const v = new THREE.Vector3(), w = new THREE.Vector3(), extra = [...(o.lleva ? UTENSILIOS[o.lleva](o).map(q => ['manoD', q]) : []), ...(o.llevaI ? UTENSILIOS[o.llevaI](o).map(q => ['manoI', q]) : []), ...(o.carga ?? []).flatMap(c => { const [hueso, geos] = CARGAS[c](o); return geos.map(q => [hueso, q]); })];
  const foto = () => {
    malla.updateMatrixWorld(true); esq.update();
    const g = new THREE.BufferGeometry(), p0 = base.attributes.position, n0 = base.attributes.normal, P = new Float32Array(p0.count * 3), Nn = new Float32Array(p0.count * 3);
    // cada vértice, con su normal, pasa por los huesos tal como están en este cuadro
    for (let i = 0; i < p0.count; i++) { v.fromBufferAttribute(p0, i); w.fromBufferAttribute(n0, i).multiplyScalar(0.02).add(v); malla.applyBoneTransform(i, v); malla.applyBoneTransform(i, w); w.sub(v).normalize(); P.set([v.x, v.y, v.z], i * 3); Nn.set([w.x, w.y, w.z], i * 3); }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); g.setAttribute('color', base.attributes.color.clone()); g.setAttribute('zona', base.attributes.zona.clone());
    if (!extra.length) return g;
    // lo que lleva encima se suma ya colocado, como parte fija
    const piezas = extra.map(([hueso, q]) => { const c = q.clone().applyMatrix4(h[hueso].matrixWorld); c.setAttribute('zona', new THREE.BufferAttribute(new Float32Array(c.attributes.position.count), 1)); return c; });
    return mergeGeometries([g, ...piezas]);
  };
  const andar = []; for (let i = 0; i < cuadros; i++) { f.paso = i / cuadros * 6.2832; posar(f, 0, 0.016); andar.push(foto()); }
  f.marcha = 0; posar(f, 0, 0.016); const quieto = foto();
  return { andar, quieto };
}
// Material para esas geometrías: cada persona trae sus colores de ropa, pelo y piel (atributos iRopa, iPelo, iPiel).
export function materialMultitud() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
  m.onBeforeCompile = s => { s.vertexShader = 'attribute float zona; attribute vec3 iRopa; attribute vec3 iPelo; attribute vec3 iPiel;\n' + s.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n vColor.rgb *= zona < 0.5 ? vec3(1.0) : zona < 1.5 ? iRopa : zona < 2.5 ? iPelo : iPiel;'); };
  return m;
}
