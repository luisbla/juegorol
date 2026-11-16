// utileria.js — animales, carros, toneles, puestos y demás enseres, en el mismo estilo que la gente:
// formas gruesas, cantos matados, facetas a la vista y color con un degradado de abajo arriba.
// Cada función devuelve una geometría con su color en los vértices, apoyada en el suelo (y = 0) y mirando a +z.
// Se dibujan todas con un solo material, matUtil.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const matUtil = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
export const MADERA = 0x9a6a3e, MADERA2 = 0x7a4e2a, MADERA3 = 0x5a3a22, CLARA = 0xc4935a, HIERRO = 0x4a4d57, ACERO = 0xb4bdc9, ORO = 0xf2bb3a, PAJA = 0xe2c56e, SACO = 0xc9a66a, PIEDRA = 0x9a968c;
const col = new THREE.Color(), PI = Math.PI;

// caja con los doce cantos matados: seis caras, doce chaflanes y ocho esquinas
export function cajaB(w, h, d, b = Math.min(0.06, Math.min(w, h, d) * 0.22)) {
  const X = w / 2, Y = h / 2, Z = d / 2, P = [], a = new THREE.Vector3(), c = new THREE.Vector3(), v = new THREE.Vector3();
  const tri = (p, q, r) => { a.set(q[0] - p[0], q[1] - p[1], q[2] - p[2]); c.set(r[0] - p[0], r[1] - p[1], r[2] - p[2]); a.cross(c); v.set(p[0] + q[0] + r[0], p[1] + q[1] + r[1], p[2] + q[2] + r[2]); if (a.dot(v) < 0) P.push(...p, ...r, ...q); else P.push(...p, ...q, ...r); };
  const quad = (p, q, r, s) => { tri(p, q, r); tri(p, r, s); };
  const px = (sx, sy, sz) => [sx * X, sy * (Y - b), sz * (Z - b)], py = (sx, sy, sz) => [sx * (X - b), sy * Y, sz * (Z - b)], pz = (sx, sy, sz) => [sx * (X - b), sy * (Y - b), sz * Z];
  for (const s of [-1, 1]) { quad(px(s, -1, -1), px(s, 1, -1), px(s, 1, 1), px(s, -1, 1)); quad(py(-1, s, -1), py(1, s, -1), py(1, s, 1), py(-1, s, 1)); quad(pz(-1, -1, s), pz(1, -1, s), pz(1, 1, s), pz(-1, 1, s)); }
  for (const s1 of [-1, 1]) for (const s2 of [-1, 1]) {
    quad(px(s1, s2, -1), px(s1, s2, 1), py(s1, s2, 1), py(s1, s2, -1)); quad(px(s1, -1, s2), px(s1, 1, s2), pz(s1, 1, s2), pz(s1, -1, s2)); quad(py(-1, s1, s2), py(1, s1, s2), pz(1, s1, s2), pz(-1, s1, s2));
    for (const s3 of [-1, 1]) tri(px(s1, s2, s3), py(s1, s2, s3), pz(s1, s2, s3));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); return g;
}
// Para las piezas sueltas de los interiores: la caja con el canto matado (si no lleva textura ni es un muro) y el
// degradado de abajo arriba sobre el color del propio material.
const _t = new THREE.Vector3();
export const cajaSala = (w, h, d, m) => m.map || Math.max(w, h, d) > 14 ? new THREE.BoxGeometry(w, h, d) : cajaB(w, h, d, Math.min(0.1, Math.min(w, h, d) * 0.22));
export function acabado(geo, m) {
  if (!geo.attributes.color) { geo.computeBoundingBox(); geo.boundingBox.getSize(_t); degradado(geo, 0xffffff, Math.max(_t.x, _t.y, _t.z) > 14 ? 0.08 : 0.2); }
  if (m.isMeshStandardMaterial && !m.vertexColors) { m.vertexColors = true; m.needsUpdate = true; }
  return geo;
}
// Cantería: reparte tonos por sillares sobre una geometría de piedra, para un material con vertexColors.
// En cajas y torres cada cara de la malla es un sillar; en columnas, cada tambor; en arcos, cada dovela. [alto, largo, verdín] solo
// lo usa quien trocea la geometría; aquí cuenta el verdín: la parte de sillares que salen verdosos.
let nCanto = 0;
export function cantear(geo0, [, , verdin = 0] = []) {
  const g = geo0.index ? geo0.toNonIndexed() : geo0.clone(), q = geo0.parameters || {}, tipo = geo0.type; g.computeBoundingBox();
  const bb = g.boundingBox, p = g.attributes.position, n = g.attributes.normal, C = new Float32Array(p.count * 3), alto = Math.max(1e-3, bb.max.y - bb.min.y), unico = ++nCanto;
  const azar = (a, b, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + 1.3) * 43758.5453; return s - Math.floor(s); };
  const paso = (v, min, max, segs) => Math.min(segs - 1, Math.floor((v - min) / Math.max(1e-6, (max - min) / segs)));
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const nx = Math.abs(n.getX(i) + n.getX(i + 1) + n.getX(i + 2)), ny = Math.abs(n.getY(i) + n.getY(i + 1) + n.getY(i + 2)), nz = Math.abs(n.getZ(i) + n.getZ(i + 1) + n.getZ(i + 2));
    let a = unico, b = 0, c = 0;
    if (tipo === 'BoxGeometry') { const ix = paso(cx, bb.min.x, bb.max.x, q.widthSegments), iy = paso(cy, bb.min.y, bb.max.y, q.heightSegments), iz = paso(cz, bb.min.z, bb.max.z, q.depthSegments); if (ny > nx && ny > nz) { a = ix; b = iz; c = 7; } else if (nx > nz) { a = iy; b = iz; c = 3; } else { a = iy; b = ix; c = 5; } c += unico; }
    else if (tipo === 'CylinderGeometry') { if (ny > nx + nz) { a = unico; b = 9; } else { a = paso(cy, bb.min.y, bb.max.y, q.heightSegments); b = Math.max(q.radiusTop, q.radiusBottom) < 1.7 ? 0 : Math.floor((Math.atan2(cx, cz) + PI) / (PI * 2 / q.radialSegments) + 1e-4); c = unico; } }
    else if (tipo === 'TorusGeometry') { let u = Math.atan2(cy, cx); if (u < -0.01) u += PI * 2; a = Math.floor(u / (q.arc / q.tubularSegments) + 1e-4); c = unico; }
    const r = azar(a, b, c), f = (0.78 + r * 0.3) * (alto > 3 ? 0.84 + 0.2 * (cy - bb.min.y) / alto : 1), verde = azar(b, a, c + 2) < verdin;
    for (let k = 0; k < 3; k++) { C[(i + k) * 3] = f * (verde ? 0.74 : 1); C[(i + k) * 3 + 1] = f * (verde ? 0.98 : 1); C[(i + k) * 3 + 2] = f * (verde ? 0.66 : 1); }
  }
  g.setAttribute('color', new THREE.BufferAttribute(C, 3)); g.deleteAttribute('uv'); return g;
}
// degradado: añade a una geometría un color de vértice que va de más oscuro abajo a más claro arriba
export function degradado(g, hex = 0xffffff, grad = 0.2) {
  const p = g.attributes.position, C = new Float32Array(p.count * 3); g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y;
  for (let i = 0; i < p.count; i++) { const t = y1 > y0 + 1e-6 ? (p.getY(i) - y0) / (y1 - y0) : 1; col.setHex(hex).multiplyScalar(1 - grad + grad * 1.3 * t); C[i * 3] = col.r; C[i * 3 + 1] = col.g; C[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(C, 3)); return g;
}
// u: facetas a la vista, color y degradado. El color puede ser una función del centro de cada cara.
const u = (geo, color, grad = 0.2) => {
  const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); g.deleteAttribute('uv');
  if (typeof color !== 'function') return degradado(g, color, grad);
  const p = g.attributes.position, C = new Float32Array(p.count * 3); g.computeBoundingBox(); const y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y;
  for (let i = 0; i < p.count; i += 3) { const hex = color((p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3);
    for (let k = 0; k < 3; k++) { const t = y1 > y0 + 1e-6 ? (p.getY(i + k) - y0) / (y1 - y0) : 1; col.setHex(hex).multiplyScalar(1 - grad + grad * 1.3 * t); C.set([col.r, col.g, col.b], (i + k) * 3); } }
  g.setAttribute('color', new THREE.BufferAttribute(C, 3)); return g;
};
const T = (g, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => { if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); return g.translate(x, y, z); };
// B: caja biselada centrada en (x, y, z); C: cilindro de pocas caras; E: bola de pocas caras
const B = (w, h, d, color, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, grad) => T(u(cajaB(w, h, d), color, grad), x, y, z, ry, rx, rz);
const C = (r1, r2, h, color, x = 0, y = 0, z = 0, n = 8, grad) => T(u(new THREE.CylinderGeometry(r1, r2, h, n), color, grad), x, y, z);
const E = (r, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, det = 0) => T(u(new THREE.IcosahedronGeometry(r, det).scale(sx, sy, sz), color), x, y, z);
const une = gs => mergeGeometries(gs.flat());
const mover = (gs, x, y, z, ry = 0, s = 1) => gs.flat().map(g => { if (s !== 1) g.scale(s, s, s); return T(g, x, y, z, ry); });
const oscuro = (hex, k = 0.7) => col.setHex(hex).multiplyScalar(k).getHex();

/* ---------- enseres ---------- */
export function gBarril(r = 0.45, h = 0.95) {
  const duelas = new THREE.LatheGeometry([new THREE.Vector2(r * 0.8, 0), new THREE.Vector2(r, h * 0.3), new THREE.Vector2(r, h * 0.7), new THREE.Vector2(r * 0.8, h)], 10);
  return une([u(duelas, (x, y, z) => Math.floor((Math.atan2(z, x) + PI) / (PI / 5) + 0.5) % 2 ? MADERA : 0x8a5c34, 0.25), C(r * 0.76, r * 0.76, 0.03, MADERA2, 0, h - 0.03, 0, 10), C(r * 0.76, r * 0.76, 0.03, MADERA2, 0, 0.02, 0, 10),
    T(u(new THREE.CylinderGeometry(r * 0.985, r * 0.94, h * 0.08, 10, 1, true), HIERRO), 0, h * 0.2, 0), T(u(new THREE.CylinderGeometry(r * 0.94, r * 0.985, h * 0.08, 10, 1, true), HIERRO), 0, h * 0.8, 0)]);
}
export const gTonel = (r = 0.6, largo = 1.3) => une([T(gBarril(r, largo), 0, 0, 0).rotateZ(PI / 2).translate(largo / 2, r + 0.12, 0), B(0.12, 0.3, r * 1.7, MADERA3, -largo * 0.3, 0.15, 0), B(0.12, 0.3, r * 1.7, MADERA3, largo * 0.3, 0.15, 0)]);
export function gCajon(s = 0.8) {
  const h = s * 0.85, P = [B(s, h, s, CLARA, 0, h / 2, 0, 0, 0, 0, 0.25)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(B(s * 0.11, h + 0.02, s * 0.11, MADERA2, sx * s * 0.46, h / 2, sz * s * 0.46));
  for (const sz of [-1, 1]) { P.push(B(s * 0.9, s * 0.1, 0.03, MADERA2, 0, h * 0.12, sz * s * 0.5), B(s * 0.9, s * 0.1, 0.03, MADERA2, 0, h * 0.88, sz * s * 0.5), B(s * 1.05, s * 0.09, 0.025, MADERA2, 0, h / 2, sz * s * 0.5, 0, 0, sz * 0.68)); }
  for (const sx of [-1, 1]) P.push(B(0.03, s * 0.1, s * 0.9, MADERA2, sx * s * 0.5, h * 0.12, 0), B(0.03, s * 0.1, s * 0.9, MADERA2, sx * s * 0.5, h * 0.88, 0));
  return une(P);
}
export const gSaco = (s = 0.6, color = SACO) => une([E(0.5, color, 0, s * 0.4, 0, s, s * 0.8, s * 0.85, 1), T(u(new THREE.ConeGeometry(s * 0.14, s * 0.22, 5), oscuro(color, 0.72)), s * 0.12, s * 0.82, 0, 0, 0, -0.5)]);
export const gFardo = () => une([B(1.3, 0.75, 0.9, PAJA, 0, 0.375, 0, 0, 0, 0, 0.3), B(0.05, 0.77, 0.92, 0x9a7a3a, -0.35, 0.375, 0), B(0.05, 0.77, 0.92, 0x9a7a3a, 0.35, 0.375, 0)]);
export function gLena() { const P = []; for (let f = 0; f < 3; f++) for (let i = 0; i < 4 - f; i++) P.push(T(u(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 6), f % 2 ? 0x8a5c34 : MADERA2), 0, 0.22 + f * 0.4, -0.72 + i * 0.48 + f * 0.24, 0, 0, PI / 2), C(0.16, 0.16, 0.02, 0xd8b98a, 0, 0, 0, 6).rotateZ(PI / 2).translate(0.81, 0.22 + f * 0.4, -0.72 + i * 0.48 + f * 0.24)); for (const s of [-1.05, 1.05]) P.push(B(0.14, 1.4, 0.14, MADERA3, 0, 0.7, s)); return une(P); }
// rueda de radios, de canto (gira sobre el eje x)
export function gRueda(r = 0.62, radios = 8) {
  const P = [T(u(new THREE.TorusGeometry(r - 0.06, 0.07, 4, 12), MADERA3), 0, 0, 0, PI / 2), T(u(new THREE.CylinderGeometry(0.13, 0.13, 0.2, 8), MADERA2), 0, 0, 0, 0, 0, PI / 2), T(u(new THREE.CylinderGeometry(0.07, 0.07, 0.24, 6), HIERRO), 0, 0, 0, 0, 0, PI / 2)];
  for (let i = 0; i < radios / 2; i++) P.push(B(0.06, (r - 0.08) * 2, 0.07, MADERA, 0, 0, 0, 0, i * PI / (radios / 2)));
  return une(P);
}
// carro de varas, parado: las varas miran a +z y descansan en un puntal. carga: 'sacos', 'pacas', 'cajas', 'barriles'
export function gCarro({ carga, puntal = true } = {}) {
  const P = [];
  for (let i = 0; i < 4; i++) P.push(B(0.42, 0.1, 2.8, i % 2 ? MADERA : 0x8a5c34, -0.63 + i * 0.42, 0.8, 0));
  for (const s of [-1, 1]) { P.push(B(0.06, 0.34, 2.8, CLARA, s * 0.86, 1.02, 0), B(0.1, 0.1, 2.9, MADERA2, s * 0.86, 1.24, 0)); for (const z of [-1.35, -0.45, 0.45, 1.35]) P.push(B(0.1, 0.56, 0.1, MADERA2, s * 0.86, 1.0, z)); P.push(T(gRueda(0.62), s * 1.02, 0.62, -0.15)); P.push(B(0.08, 0.08, 2.4, MADERA2, s * 0.5, 0.72, 2.55)); }
  P.push(B(1.7, 0.34, 0.06, CLARA, 0, 1.02, -1.4), B(1.7, 0.34, 0.06, CLARA, 0, 1.02, 1.4), B(0.12, 0.12, 2.1, MADERA3, 0, 0.62, -0.15, PI / 2), B(1.1, 0.08, 0.08, MADERA2, 0, 0.72, 3.7));
  if (puntal) P.push(B(0.07, 0.72, 0.07, MADERA3, 0, 0.36, 3.6));
  if (carga === 'sacos') for (const [x, y, z, ry] of [[-0.4, 0.85, -0.8, 0.3], [0.4, 0.85, -0.7, 1.2], [0, 0.85, 0.1, 2.0], [-0.35, 0.85, 0.9, 0.6], [0.1, 1.3, -0.6, 1.7]]) P.push(mover([gSaco(0.62)], x, y, z, ry));
  if (carga === 'pacas') { P.push(mover([gFardo()], 0, 0.85, -0.7, PI / 2), mover([gFardo()], 0, 0.85, 0.5, PI / 2), mover([gFardo()], 0, 1.6, -0.1, PI / 2)); }
  if (carga === 'cajas') for (const [x, y, z] of [[-0.4, 0.85, -0.9], [0.4, 0.85, -0.9], [-0.4, 0.85, 0], [0.35, 0.85, 0.9], [0, 1.53, -0.85]]) P.push(mover([gCajon(0.72)], x, y, z));
  if (carga === 'barriles') for (const [x, z] of [[-0.42, -0.85], [0.42, -0.85], [0, 0.1]]) P.push(mover([gBarril(0.4, 0.85)], x, 0.85, z));
  return une(P);
}
// puesto de mercado: mostrador, toldo a rayas con su faldón y género. El cliente se pone en +z.
export function gPuesto(color = 0xc9283c, genero = true) {
  const P = [B(3.3, 0.14, 1.3, CLARA, 0, 1.0, 0), B(3.2, 0.5, 0.05, oscuro(color, 0.8), 0, 0.72, 0.62), B(3.1, 0.08, 1.1, MADERA2, 0, 0.3, 0)];
  for (const sx of [-1.5, 1.5]) for (const sz of [-0.55, 0.55]) P.push(B(0.14, sz < 0 ? 2.88 : 2.5, 0.14, MADERA3, sx, (sz < 0 ? 2.88 : 2.5) / 2, sz));
  for (let i = 0; i < 6; i++) { const c = i % 2 ? 0xf4efe6 : color; P.push(B(0.6, 0.07, 1.75, c, -1.5 + i * 0.6, 2.72, 0.02, 0, 0.22), B(0.6, 0.26, 0.05, c, -1.5 + i * 0.6, 2.41, 0.87)); }
  if (genero) { P.push(mover([gCajon(0.5)], -1.1, 1.07, 0), mover([gCajon(0.5)], -0.45, 1.07, 0.05, 0.2)); for (let i = 0; i < 6; i++) P.push(E(0.09, i % 2 ? 0xc9283c : 0x7aa83a, -1.2 + (i % 3) * 0.14, 1.52, -0.08 + Math.floor(i / 3) * 0.16)); for (let i = 0; i < 5; i++) P.push(E(0.09, 0xe8a23a, -0.55 + (i % 3) * 0.13, 1.52, -0.02 + Math.floor(i / 3) * 0.15)); P.push(C(0.26, 0.26, 0.14, 0xe9c860, 0.5, 1.14, 0.05, 8), C(0.2, 0.2, 0.12, 0xe9c860, 1.1, 1.13, -0.1, 8), E(0.16, 0xc98a4a, 0.95, 1.16, 0.32, 1.5, 0.8, 1)); }
  else { for (let i = 0; i < 3; i++) P.push(mover([gSaco(0.42)], -1.1 + i * 0.55, 1.07, 0, i)); P.push(mover([gBarril(0.24, 0.5)], 0.75, 1.07, 0), C(0.07, 0.06, 0.16, 0xb9824a, 1.25, 1.15, 0.2, 8), C(0.07, 0.06, 0.16, 0xb9824a, 1.05, 1.15, 0.3, 8)); }
  return une(P);
}
export function gPozo() {
  const P = [T(u(new THREE.CylinderGeometry(1.05, 1.1, 1.0, 10, 2), (x, y, z) => [PIEDRA, 0x8a867c, 0xa8a49a][Math.abs(Math.floor(Math.atan2(z, x) * 3 + y * 5)) % 3], 0.25), 0, 0.5, 0), T(u(new THREE.CylinderGeometry(1.14, 1.14, 0.14, 10), 0xb0aca2), 0, 1.02, 0), C(0.84, 0.84, 0.04, 0x2f5f78, 0, 1.06, 0, 10, 0)];
  for (const s of [-1, 1]) P.push(B(0.18, 2.7, 0.18, MADERA3, s * 1.0, 1.35, 0), B(2.7, 0.08, 1.0, 0xb5503a, 0, 2.95, s * 0.42, 0, s * 0.55));
  P.push(B(2.4, 0.16, 0.16, MADERA3, 0, 2.62, 0), T(u(new THREE.CylinderGeometry(0.13, 0.13, 1.7, 6), MADERA), 0, 2.2, 0, 0, 0, PI / 2), B(0.05, 0.3, 0.05, HIERRO, 1.14, 2.2, 0), B(0.04, 0.9, 0.04, 0xd9c79a, 0, 1.7, 0, 0, 0, 0, 0), C(0.24, 0.18, 0.32, MADERA, 0, 1.25, 0, 8), T(u(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 8, 1, true), HIERRO), 0, 1.36, 0));
  return une(P);
}
export const gBanco = (w = 2.2) => une([B(w, 0.14, 0.52, MADERA, 0, 0.56, 0), B(0.16, 0.5, 0.46, MADERA3, -(w / 2 - 0.22), 0.25, 0), B(0.16, 0.5, 0.46, MADERA3, w / 2 - 0.22, 0.25, 0), B(w - 0.6, 0.08, 0.08, MADERA3, 0, 0.26, 0)]);
// mesa de tablones; k engorda las piezas para las salas, que van a otra escala
export function gMesa(w = 2.4, d = 1.1, alto = 0.95, k = 1, madera = CLARA) {
  if (d > w * 1.2) return gMesa(d, w, alto, k, madera).rotateY(PI / 2);   // las tablas, siempre a lo largo
  const n = Math.max(2, Math.round(d / (0.36 * k))), P = [], g = 0.14 * k, otra = oscuro(madera, 0.84), pata = oscuro(madera, 0.42), larguero = oscuro(madera, 0.6);
  for (let i = 0; i < n; i++) P.push(B(w, g, d / n, i % 2 ? madera : otra, 0, alto + g / 2, -d / 2 + (i + 0.5) * d / n));
  const xs = w > 4.6 * k ? [-1, 0, 1] : [-1, 1];   // las mesas largas llevan un tercer par de patas
  for (const sx of xs) { for (const sz of [-1, 1]) P.push(B(0.17 * k, alto, 0.17 * k, pata, sx * (w / 2 - 0.22 * k), alto / 2, sz * (d / 2 - 0.18 * k))); P.push(B(0.1 * k, 0.12 * k, d - 0.4 * k, larguero, sx * (w / 2 - 0.22 * k), alto - 0.1 * k, 0), B(0.1 * k, 0.12 * k, d - 0.4 * k, larguero, sx * (w / 2 - 0.22 * k), alto * 0.3, 0)); }
  P.push(B(w - 0.5 * k, 0.12 * k, 0.1 * k, larguero, 0, alto * 0.3, 0));
  return une(P);
}
export const gMesaRedonda = (r = 1.1, alto = 0.95, k = 1) => une([C(r, r, 0.13 * k, CLARA, 0, alto + 0.065 * k, 0, 10), T(u(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.07 * k, 10, 1, true), MADERA2), 0, alto + 0.04 * k, 0), C(0.16 * k, 0.2 * k, alto, MADERA3, 0, alto / 2, 0, 8), B(r * 1.1, 0.1 * k, 0.22 * k, MADERA3, 0, 0.05 * k, 0), B(0.22 * k, 0.1 * k, r * 1.1, MADERA3, 0, 0.05 * k, 0)]);
export function gTaburete(r = 0.28, alto = 0.5, k = 1) { const P = [C(r, r * 0.92, 0.1 * k, MADERA, 0, alto - 0.05 * k, 0, 8)]; for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; P.push(B(0.07 * k, alto - 0.06 * k, 0.07 * k, MADERA3, Math.cos(a) * r * 0.62, (alto - 0.08 * k) / 2, Math.sin(a) * r * 0.62)); } P.push(T(u(new THREE.CylinderGeometry(r * 0.66, r * 0.66, 0.05 * k, 8, 1, true), MADERA3), 0, alto * 0.35, 0)); return une(P); }
export const gSilla = (k = 1, asiento = 0.5) => une([B(0.58 * k, 0.08 * k, 0.54 * k, MADERA, 0, asiento - 0.04 * k, 0), ...[-1, 1].flatMap(s => [B(0.07 * k, asiento - 0.06 * k, 0.07 * k, MADERA3, s * 0.24 * k, (asiento - 0.08 * k) / 2, 0.21 * k), B(0.07 * k, asiento + 0.75 * k, 0.07 * k, MADERA3, s * 0.24 * k, (asiento + 0.75 * k) / 2, -0.24 * k)]), B(0.5 * k, 0.16 * k, 0.05 * k, MADERA, 0, asiento + 0.62 * k, -0.24 * k), B(0.5 * k, 0.1 * k, 0.05 * k, MADERA, 0, asiento + 0.32 * k, -0.24 * k)]);
export const gJarra = (k = 1) => une([C(0.055 * k, 0.05 * k, 0.14 * k, 0xb9824a, 0, 0.07 * k, 0, 8), C(0.05 * k, 0.05 * k, 0.02 * k, 0xf4efe6, 0, 0.145 * k, 0, 8, 0), B(0.02 * k, 0.07 * k, 0.07 * k, 0xb9824a, 0.065 * k, 0.07 * k, 0), T(u(new THREE.CylinderGeometry(0.058 * k, 0.058 * k, 0.025 * k, 8, 1, true), ACERO), 0, 0.04 * k, 0)]);
export const gCofre = (k = 1, madera = MADERA, herraje = HIERRO) => une([B(0.9 * k, 0.45 * k, 0.55 * k, madera, 0, 0.225 * k, 0), T(u(new THREE.CylinderGeometry(0.275 * k, 0.275 * k, 0.9 * k, 8, 1, false, 0, PI), oscuro(madera, 0.75)), 0, 0.45 * k, 0, 0, 0, PI / 2),
  ...[-0.3, 0.3].flatMap(x => [B(0.07 * k, 0.5 * k, 0.58 * k, herraje, x * k, 0.25 * k, 0), T(u(new THREE.CylinderGeometry(0.29 * k, 0.29 * k, 0.07 * k, 8, 1, false, 0, PI), herraje), x * k, 0.45 * k, 0, 0, 0, PI / 2)]), B(0.1 * k, 0.12 * k, 0.04 * k, ORO, 0, 0.42 * k, 0.29 * k)]);
// armero: n astas de lanza o, si se pide, espadas
export function gArmero(n = 6, espadas = false) {
  const an = n * 0.5 + 0.6, P = [B(0.2, 2.4, 0.5, MADERA3, -an / 2 + 0.1, 1.2, 0), B(0.2, 2.4, 0.5, MADERA3, an / 2 - 0.1, 1.2, 0), B(an, 0.14, 0.4, MADERA2, 0, 2.2, 0), B(an, 0.14, 0.5, MADERA2, 0, 0.45, 0)];
  for (let i = 0; i < n; i++) { const x = -n * 0.25 + 0.25 + i * 0.5; if (espadas) P.push(B(0.12, 1.5, 0.04, ACERO, x, 1.3, 0.14), B(0.42, 0.08, 0.1, ORO, x, 2.08, 0.14), B(0.08, 0.34, 0.08, MADERA3, x, 2.28, 0.14)); else P.push(C(0.04, 0.04, 4.2, MADERA, x, 2.5, 0.1, 6), T(u(new THREE.OctahedronGeometry(0.16).scale(0.8, 2.4, 0.3), ACERO), x, 4.9, 0.1)); }
  return une(P);
}
export const gMuneco = () => une([B(0.25, 2.5, 0.25, MADERA2, 0, 1.25, 0), B(1.9, 0.2, 0.2, MADERA2, 0, 1.75, 0), C(0.42, 0.36, 1.1, SACO, 0, 1.5, 0.02, 8), E(0.3, SACO, 0, 2.35, 0, 1, 1, 1, 1), T(u(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 10), 0xb5283a), -0.75, 1.5, 0.2, 0, PI / 2), B(0.6, 0.12, 0.6, MADERA3, 0, 0.06, 0)]);
export const gYunque = (k = 1) => une([B(0.5 * k, 0.5 * k, 0.5 * k, MADERA3, 0, 0.25 * k, 0), B(0.3 * k, 0.16 * k, 0.26 * k, HIERRO, 0, 0.58 * k, 0), B(0.2 * k, 0.14 * k, 0.2 * k, HIERRO, 0, 0.72 * k, 0), B(0.62 * k, 0.14 * k, 0.26 * k, 0x5f6772, 0, 0.86 * k, 0), T(u(new THREE.ConeGeometry(0.1 * k, 0.3 * k, 6), 0x5f6772), 0.44 * k, 0.86 * k, 0, 0, 0, -PI / 2)]);

/* ---------- animales ---------- */
// Sin color (null), el cuerpo va en blanco para teñirlo por instancia; lo oscuro sigue oscuro.
const gris = (color, k) => color == null ? col.setScalar(k).getHex() : oscuro(color, k);
export function gGallina(color = 0xf0e8d8) {
  const c = color ?? 0xffffff;
  return une([E(0.22, c, 0, 0.32, 0, 0.9, 0.9, 1.2, 1), E(0.11, c, 0, 0.55, 0.2, 1, 1, 1, 1), B(0.03, 0.09, 0.12, 0xd93a2e, 0, 0.675, 0.2), T(u(new THREE.ConeGeometry(0.035, 0.1, 4), 0xf2a23a), 0, 0.54, 0.33, 0, PI / 2), B(0.03, 0.05, 0.03, 0xd93a2e, 0, 0.47, 0.29),
    B(0.02, 0.03, 0.02, 0x1a1410, -0.085, 0.58, 0.25), B(0.02, 0.03, 0.02, 0x1a1410, 0.085, 0.58, 0.25), B(0.04, 0.22, 0.2, gris(color, 0.8), 0, 0.5, -0.27, 0, -0.6), B(0.05, 0.16, 0.24, gris(color, 0.9), -0.19, 0.34, -0.02), B(0.05, 0.16, 0.24, gris(color, 0.9), 0.19, 0.34, -0.02),
    B(0.025, 0.16, 0.025, 0xf2a23a, -0.07, 0.08, 0), B(0.025, 0.16, 0.025, 0xf2a23a, 0.07, 0.08, 0), B(0.07, 0.02, 0.1, 0xf2a23a, -0.07, 0.01, 0.03), B(0.07, 0.02, 0.1, 0xf2a23a, 0.07, 0.01, 0.03)]);
}
export function gPerro(color = 0x8a5c34) {
  const c = color ?? 0xffffff, claro = color == null ? 0xffffff : col.setHex(color).lerp(new THREE.Color(0xf0e0c8), 0.5).getHex();
  return une([B(0.32, 0.32, 0.72, c, 0, 0.5, 0), B(0.28, 0.28, 0.3, c, 0, 0.74, 0.42), B(0.16, 0.14, 0.18, claro, 0, 0.68, 0.63), B(0.07, 0.06, 0.05, 0x1a1410, 0, 0.72, 0.73),
    B(0.04, 0.05, 0.03, 0x1a1410, -0.09, 0.8, 0.565), B(0.04, 0.05, 0.03, 0x1a1410, 0.09, 0.8, 0.565), B(0.09, 0.1, 0.05, gris(color, 0.7), -0.11, 0.9, 0.34, 0, 0, 0.3), B(0.09, 0.1, 0.05, gris(color, 0.7), 0.11, 0.9, 0.34, 0, 0, -0.3),
    ...[[-0.1, 0.25], [0.1, 0.25], [-0.1, -0.26], [0.1, -0.26]].flatMap(([x, z]) => [B(0.1, 0.36, 0.1, c, x, 0.2, z), B(0.11, 0.07, 0.12, claro, x, 0.035, z + 0.01)]), B(0.07, 0.32, 0.07, c, 0, 0.74, -0.42, 0, -0.7), B(0.2, 0.1, 0.4, claro, 0, 0.36, 0.05)]);
}
export function gOveja(color = 0xf4efe4) {
  const c = color ?? 0xffffff, cara = color == null ? 0x4d4d4d : 0x3a3028;
  return une([E(0.5, c, 0, 0.72, -0.02, 0.86, 0.78, 1.16, 1), E(0.26, c, 0, 0.98, 0.42, 1, 0.8, 1, 1), B(0.25, 0.27, 0.3, cara, 0, 0.84, 0.66), B(0.14, 0.07, 0.05, cara, -0.2, 0.9, 0.58, 0, 0, 0.4), B(0.14, 0.07, 0.05, cara, 0.2, 0.9, 0.58, 0, 0, -0.4),
    B(0.03, 0.04, 0.02, 0xf4efe4, -0.07, 0.9, 0.815), B(0.03, 0.04, 0.02, 0xf4efe4, 0.07, 0.9, 0.815), ...[[-0.2, 0.3], [0.2, 0.3], [-0.2, -0.32], [0.2, -0.32]].map(([x, z]) => B(0.1, 0.4, 0.1, cara, x, 0.2, z)), E(0.12, c, 0, 0.78, -0.6, 1, 1, 1, 0)]);
}
// vaca; con yugo si es buey de tiro
export function gVaca(color = 0x8a5a36, { yugo = false, manchas = true } = {}) {
  const c = color ?? 0xffffff, mancha = color == null ? 0x8c8c8c : col.setHex(color).lerp(new THREE.Color(color > 0xa00000 ? 0x4a3020 : 0xf0e6d6), 0.75).getHex(), pez = color == null ? 0x4d4d4d : 0x2a2018;
  const P = [B(0.8, 0.74, 1.55, c, 0, 1.05, 0, 0, 0, 0, 0.25), B(0.44, 0.46, 0.52, c, 0, 1.22, 1.0), B(0.36, 0.25, 0.2, 0xe8a9a0, 0, 1.08, 1.3), B(0.05, 0.05, 0.03, 0x5a3030, -0.09, 1.1, 1.41), B(0.05, 0.05, 0.03, 0x5a3030, 0.09, 1.1, 1.41),
    B(0.03, 0.08, 0.07, 0x1a1410, -0.225, 1.32, 1.14), B(0.03, 0.08, 0.07, 0x1a1410, 0.225, 1.32, 1.14), B(0.18, 0.09, 0.06, c, -0.31, 1.36, 0.9, 0, 0, 0.3), B(0.18, 0.09, 0.06, c, 0.31, 1.36, 0.9, 0, 0, -0.3),
    T(u(new THREE.ConeGeometry(0.05, 0.22, 5), 0xf0e8d8), -0.2, 1.52, 0.92, 0, 0, 0.5), T(u(new THREE.ConeGeometry(0.05, 0.22, 5), 0xf0e8d8), 0.2, 1.52, 0.92, 0, 0, -0.5),
    ...[[-0.25, 0.52], [0.25, 0.52], [-0.25, -0.54], [0.25, -0.54]].flatMap(([x, z]) => [B(0.19, 0.64, 0.19, c, x, 0.4, z), B(0.2, 0.12, 0.2, pez, x, 0.06, z)]), B(0.28, 0.14, 0.32, 0xe8a9a0, 0, 0.66, -0.36), B(0.06, 0.62, 0.06, c, 0, 1.0, -0.8, 0, 0.12), B(0.1, 0.16, 0.1, pez, 0, 0.66, -0.84)];
  if (manchas) P.push(B(0.03, 0.34, 0.5, mancha, -0.4, 1.12, 0.2), B(0.03, 0.3, 0.4, mancha, 0.4, 1.0, -0.3), B(0.46, 0.03, 0.56, mancha, 0.05, 1.42, -0.2), B(0.2, 0.2, 0.03, mancha, 0.08, 1.3, 1.26));
  if (yugo) P.push(B(1.1, 0.12, 0.14, MADERA2, 0, 1.5, 0.66));
  return une(P);
}
export function gCaballo(color = 0x8a5a36) {
  const c = color ?? 0xffffff, crin = color == null ? 0x4d4d4d : 0x2a1c14, casco = color == null ? 0x333333 : 0x1c1612;
  return une([B(0.62, 0.66, 1.5, c, 0, 1.5, 0, 0, 0, 0, 0.25), B(0.34, 0.9, 0.46, c, 0, 2.02, 0.78, 0, 0.6), B(0.28, 0.32, 0.66, c, 0, 2.36, 1.24, 0, 0.35), B(0.24, 0.2, 0.16, gris(color, 0.75), 0, 2.26, 1.56, 0, 0.35),
    B(0.03, 0.07, 0.07, 0x1a1410, -0.145, 2.44, 1.2), B(0.03, 0.07, 0.07, 0x1a1410, 0.145, 2.44, 1.2), T(u(new THREE.ConeGeometry(0.05, 0.16, 4), c), -0.1, 2.62, 1.02), T(u(new THREE.ConeGeometry(0.05, 0.16, 4), c), 0.1, 2.62, 1.02),
    B(0.1, 0.95, 0.16, crin, 0, 2.2, 0.56, 0, 0.6), B(0.12, 0.2, 0.14, crin, 0, 2.6, 1.08), B(0.13, 0.85, 0.13, crin, 0, 1.38, -0.86, 0, 0.25),
    ...[[-0.2, 0.56], [0.2, 0.56], [-0.2, -0.58], [0.2, -0.58]].flatMap(([x, z]) => [B(0.18, 0.66, 0.2, c, x, 0.9, z), B(0.13, 0.5, 0.14, c, x, 0.36, z), B(0.17, 0.12, 0.18, casco, x, 0.06, z)])]);
}
/* ---------- mobiliario de las salas (medidas en unidades de sala, algo más del doble que fuera) ---------- */
const G1 = 0xffffff, G2 = 0xdcdcdc, G3 = 0xc0c0c0;   // grises: el color lo pone el material de quien lo use
// Sitial de respaldo alto, sin color propio: armazón en grises para pintarlo con oro, piedra o madera. El asiento queda a 1.0.
export function gSitial(an = 2, alto = 4.6) {
  const P = [B(an, 1.0, 1.5, G2, 0, 0.5, -0.15), B(an - 0.5, 0.56, 0.08, G3, 0, 0.5, 0.6), B(an, alto, 0.4, G2, 0, alto / 2, -0.9), B(an - 0.6, alto - 2.2, 0.08, G3, 0, 1.5 + (alto - 2.2) / 2, -0.7), B(an + 0.36, 0.34, 0.52, G1, 0, alto + 0.1, -0.9)];
  for (const s of [-1, 1]) { const x = s * (an / 2 + 0.05);
    P.push(B(0.36, alto + 0.5, 0.5, G1, s * an / 2, (alto + 0.5) / 2, -0.9), T(u(new THREE.OctahedronGeometry(0.3), G1), s * an / 2, alto + 0.78, -0.9),
      B(0.3, 1.9, 1.5, G2, x, 0.95, -0.1), B(0.2, 1.1, 1.0, G3, x + s * 0.08, 1.1, -0.1), B(0.46, 0.26, 1.78, G1, x, 2.05, -0.06), B(0.4, 2.0, 0.34, G1, x, 1.0, 0.62), T(u(new THREE.OctahedronGeometry(0.27), G1), x, 2.3, 0.68)); }
  return une(P);
}
export const gCojin = (w = 1.7, d = 1.3, color = 0x8a2238, h = 0.25) => une([T(u(cajaB(w, h, d, h * 0.42), color, 0.3), 0, h / 2, 0), ...[-1, 1].flatMap(sx => [-1, 1].map(sz => E(h * 0.3, ORO, sx * (w / 2 - 0.05), h * 0.5, sz * (d / 2 - 0.05))))]);
// cama de posada: cabecero alto con tablero, pies bajos, colchón, colcha con el embozo vuelto y almohada (dos si es doble). Cabecero en -z.
export function gCama(an = 2.7, largo = 6.4, color = 0x7a3b2e) {
  const z0 = -largo / 2, P = [B(an - 0.2, 0.5, largo - 0.3, MADERA2, 0, 0.6, 0), B(an - 0.3, 0.5, largo - 0.5, 0xe6dcc6, 0, 1.1, 0, 0, 0, 0, 0.12), T(u(cajaB(an - 0.1, 0.34, largo * 0.62, 0.1), color, 0.25), 0, 1.42, largo * 0.16),
    B(an - 0.1, 0.2, 0.7, 0xf2ecdc, 0, 1.48, largo * 0.16 - largo * 0.31 - 0.2), B(an - 0.3, 1.7, 0.14, MADERA, 0, 1.55, z0 + 0.2), B(an + 0.1, 0.24, 0.42, MADERA3, 0, 2.52, z0 + 0.2), B(an - 0.3, 0.9, 0.14, MADERA, 0, 0.85, -z0 - 0.2)];
  for (const s of [-1, 1]) P.push(B(0.36, 2.9, 0.36, MADERA3, s * (an / 2 - 0.1), 1.45, z0 + 0.2), T(u(new THREE.OctahedronGeometry(0.24), MADERA2), s * (an / 2 - 0.1), 3.05, z0 + 0.2), B(0.34, 1.6, 0.34, MADERA3, s * (an / 2 - 0.1), 0.8, -z0 - 0.2), B(0.16, 0.4, largo - 0.6, MADERA3, s * (an / 2 - 0.1), 0.62, 0));
  for (const x of an > 3.6 ? [-an / 4 + 0.05, an / 4 - 0.05] : [0]) P.push(T(u(cajaB(an > 3.6 ? an / 2 - 0.5 : an - 0.9, 0.36, 1.05, 0.14), 0xf7f2e6, 0.1), x, 1.55, z0 + 1.05));
  return une(P);
}
// litera de cuartel: dos camas, manta doblada a los pies y escalerilla. Larga en x, cabecera en -x.
export function gLitera(manta = 0x6a6a52) {
  const P = [];
  for (const sx of [-2.9, 2.9]) { for (const sz of [-1.3, 1.3]) P.push(B(0.36, 6, 0.36, MADERA3, sx, 3, sz), B(0.44, 0.14, 0.44, MADERA2, sx, 6.05, sz)); for (const y of [1.2, 4.2]) P.push(B(0.14, 1.0, 2.5, MADERA2, sx, y + 0.75, 0)); }
  for (const y of [1.2, 4.2]) { P.push(B(6.0, 0.35, 0.2, MADERA, 0, y + 0.175, 1.3), B(6.0, 0.35, 0.2, MADERA, 0, y + 0.175, -1.3), B(5.6, 0.14, 2.5, MADERA2, 0, y + 0.1, 0), B(5.5, 0.38, 2.4, 0xd9cfb6, 0, y + 0.42, 0, 0, 0, 0, 0.12),
    T(u(cajaB(3.4, 0.18, 2.46, 0.07), manta, 0.2), 0.95, y + 0.66, 0), B(0.5, 0.1, 2.46, 0xe6dcc6, -0.9, y + 0.7, 0), T(u(cajaB(1.1, 0.32, 1.7, 0.12), 0xf2ecdc, 0.1), -2.05, y + 0.72, 0)); }
  for (const x of [1.5, 2.3]) P.push(B(0.12, 4.5, 0.12, MADERA2, x, 2.25, 1.5)); for (let i = 0; i < 5; i++) P.push(B(0.8, 0.1, 0.12, MADERA, 1.9, 0.6 + i * 0.85, 1.5));
  return une(P);
}
// catre de calabozo, largo en z: cuatro patas, tablas y un jergón de paja
export const gCatre = (w = 2.4, l = 5.4) => une([...[-1, 1].flatMap(sx => [-1, 1].map(sz => B(0.26, 0.8, 0.26, MADERA3, sx * (w / 2 - 0.15), 0.4, sz * (l / 2 - 0.15)))), B(w, 0.2, l, MADERA2, 0, 0.7, 0), B(w - 0.2, 0.3, l - 0.4, 0xb5a67c, 0, 0.95, 0, 0, 0, 0, 0.15), B(w - 0.3, 0.12, l * 0.4, 0x6a6456, 0, 1.14, l * 0.22)]);
// pila de temple: artesa de tablones con zunchos; el agua la pone quien la use
export function gPila(w = 4.6, h = 1.5, d = 2.2) {
  const tabla = (x, y, z) => Math.floor((Math.abs(x) > w / 2 - 0.25 ? z : x) / 0.62 + 40) % 2 ? MADERA : 0x8a5c34, P = [B(w - 0.2, 0.16, d - 0.2, MADERA3, 0, 0.1, 0)];
  for (const s of [-1, 1]) P.push(T(u(cajaB(w, h, 0.2), tabla), 0, h / 2, s * (d / 2 - 0.1)), T(u(cajaB(0.2, h, d - 0.4), tabla), s * (w / 2 - 0.1), h / 2, 0));
  for (const y of [h * 0.22, h * 0.78]) for (const s of [-1, 1]) P.push(B(w + 0.06, 0.12, 0.05, HIERRO, 0, y, s * d / 2), B(0.05, 0.12, d + 0.06, HIERRO, s * w / 2, y, 0));
  return une(P);
}
// brasero de trípode y pebetero de pie; las ascuas, que brillan, las pone quien los use
const cuenco = (r, y0, y1) => u(new THREE.LatheGeometry([new THREE.Vector2(r * 0.3, y0), new THREE.Vector2(r * 0.78, y0 + (y1 - y0) * 0.3), new THREE.Vector2(r, y0 + (y1 - y0) * 0.85), new THREE.Vector2(r * 1.04, y1), new THREE.Vector2(r * 0.9, y1)], 10), HIERRO, 0.3);
export const gBrasero = (r = 1.2, h = 1.4) => une([cuenco(r, h * 0.42, h), C(r * 0.9, r * 0.9, 0.06, 0x2a2a30, 0, h - 0.12, 0, 10), ...[0, 1, 2].map(i => B(0.16, h * 0.74, 0.16, 0x33353d, 0, h * 0.35, r * 0.62, 0, -0.28).rotateY(i * 2.094)), T(u(new THREE.TorusGeometry(r * 0.6, 0.05, 4, 10), 0x33353d), 0, h * 0.2, 0, 0, PI / 2)]);
export const gPebetero = (h = 2.2, r = 0.85) => une([C(0.5, 0.62, 0.16, 0x33353d, 0, 0.08, 0, 8), C(0.13, 0.2, h - 0.1, HIERRO, 0, h / 2, 0, 6), T(u(new THREE.OctahedronGeometry(0.26), 0x5f6772), 0, h * 0.55, 0), cuenco(r, h - 0.05, h + 0.5), C(r * 0.9, r * 0.9, 0.06, 0x2a2a30, 0, h + 0.38, 0, 10)]);
// rodela para colgar: de frente a +z, cuartelada con el color que se le dé
export const gRodela = (color = 0x7a2e2a, r = 1.3) => { const claro = col.setHex(color).lerp(new THREE.Color(0xf0e6d0), 0.55).getHex();
  return une([T(u(new THREE.CylinderGeometry(r, r, 0.16, 12), (x, y, z) => Math.abs(y) < 0.07 ? MADERA3 : x * z < 0 ? color : claro, 0.1), 0, 0, 0, 0, PI / 2), T(u(new THREE.TorusGeometry(r, 0.09, 4, 12), ACERO), 0, 0, 0.02), T(u(new THREE.SphereGeometry(r * 0.26, 8, 4, 0, PI * 2, 0, PI / 2), ACERO), 0, 0, 0.06, 0, PI / 2)]); };
// espada colgada punta abajo y lanza de pie
export const gEspada = (l = 3.6) => une([B(0.28, l * 0.72, 0.07, ACERO, 0, l * 0.44, 0), T(u(new THREE.OctahedronGeometry(0.14).scale(1, 2, 0.26), ACERO), 0, l * 0.08, 0), B(0.05, l * 0.6, 0.09, 0x8d97a6, 0, l * 0.46, 0), B(0.95, 0.14, 0.18, ORO, 0, l * 0.81, 0), B(0.14, l * 0.14, 0.14, MADERA3, 0, l * 0.89, 0), T(u(new THREE.OctahedronGeometry(0.13), ORO), 0, l * 0.98, 0)]);
export const gLanza = (h = 8.8) => une([C(0.08, 0.09, h - 0.9, MADERA, 0, (h - 0.9) / 2, 0, 6), C(0.12, 0.1, 0.3, HIERRO, 0, h - 1.0, 0, 6), T(u(new THREE.OctahedronGeometry(0.2).scale(1, 2.6, 0.4), ACERO), 0, h - 0.42, 0)]);

/* ---------- la herrería ---------- */
// muela de afilar: bastidor con artesa de agua y manivela; la piedra va aparte para que gire (eje en x)
export const gMuela = () => une([B(2.4, 0.2, 1.5, MADERA3, 0, 0.1, 0), B(2.0, 0.7, 1.0, MADERA2, 0, 0.55, 0), B(1.7, 0.06, 0.7, 0x2f5f78, 0, 0.9, 0), ...[-1, 1].flatMap(s => [B(0.24, 2.3, 0.3, MADERA3, s * 0.72, 1.15, 0), B(0.2, 0.2, 1.5, MADERA2, s * 0.72, 0.3, 0)]),
  T(u(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 6), HIERRO), 0.2, 2.0, 0, 0, 0, PI / 2), B(0.08, 0.6, 0.08, HIERRO, 1.34, 1.74, 0), T(u(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6), MADERA), 1.52, 1.46, 0, 0, 0, PI / 2)]);
export const gMuelaPiedra = () => une([T(u(new THREE.CylinderGeometry(0.95, 0.95, 0.34, 14), (x, y, z) => Math.abs(y) > 0.16 ? 0xb0aca2 : 0x8a867c, 0.12), 0, 0, 0, 0, 0, PI / 2), T(u(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 6), MADERA3), 0, 0, 0, 0, 0, PI / 2)]);
// arnés en su percha: peto, faldar, hombreras y yelmo con cimera del color que se pida
export const gYelmo = (k = 1, cimera = 0xb5283a) => une([E(0.42 * k, ACERO, 0, 0.36 * k, 0, 1, 1.05, 1.05, 1), C(0.45 * k, 0.47 * k, 0.1 * k, 0x8d97a6, 0, 0.1 * k, 0, 10), B(0.1 * k, 0.4 * k, 0.08 * k, 0x8d97a6, 0, 0.3 * k, 0.42 * k), B(0.52 * k, 0.07 * k, 0.06 * k, 0x1a1c22, 0, 0.42 * k, 0.4 * k), B(0.08 * k, 0.22 * k, 0.7 * k, cimera, 0, 0.84 * k, -0.04 * k)]);
export const gArnes = (cimera = 0xb5283a) => une([B(1.3, 0.14, 0.22, MADERA3, 0, 0.07, 0), B(0.22, 0.14, 1.3, MADERA3, 0, 0.07, 0), C(0.09, 0.11, 3.1, MADERA2, 0, 1.55, 0, 6), B(1.5, 0.14, 0.14, MADERA2, 0, 3.0, 0),
  T(u(new THREE.CylinderGeometry(0.66, 0.5, 1.3, 8).scale(1, 1, 0.72), ACERO, 0.3), 0, 2.45, 0), B(0.12, 1.1, 0.06, 0x8d97a6, 0, 2.45, 0.44), T(u(new THREE.CylinderGeometry(0.56, 0.74, 0.5, 8, 1, true).scale(1, 1, 0.72), 0x8d97a6), 0, 1.6, 0), B(1.06, 0.14, 0.8, MADERA3, 0, 1.84, 0),
  ...[-1, 1].map(s => E(0.34, ACERO, s * 0.78, 3.05, 0, 1.1, 0.8, 1, 1)), ...mover([gYelmo(1, cimera)], 0, 3.22, 0)]);
// panel de herramientas para la pared: martillos, tenazas y limas colgados de su listón. De frente a +z.
export function gPanelHerramientas(w = 7) {
  const P = [B(w, 2.8, 0.12, MADERA2, 0, 0, 0), B(w + 0.3, 0.2, 0.2, MADERA3, 0, 1.3, 0.06), B(w + 0.3, 0.2, 0.2, MADERA3, 0, -1.4, 0.06)], n = Math.floor(w / 0.9);
  for (let i = 0; i < n; i++) { const x = -w / 2 + 0.6 + i * (w - 1.2) / (n - 1), z = 0.16;
    if (i % 3 === 0) P.push(B(0.11, 1.5, 0.11, MADERA, x, 0.2, z), B(0.52, 0.34 + (i % 2) * 0.1, 0.3, HIERRO, x, 0.9, z));   // martillo, cabeza arriba
    else if (i % 3 === 1) P.push(B(0.07, 1.9, 0.06, 0x33353d, x - 0.08, 0.05, z, 0, 0, 0.08), B(0.07, 1.9, 0.06, 0x33353d, x + 0.08, 0.05, z, 0, 0, -0.08), B(0.1, 0.1, 0.1, 0x5f6772, x, 0.55, z + 0.02));   // tenazas
    else P.push(B(0.12, 1.3, 0.05, 0x8d97a6, x, 0.3, z), B(0.14, 0.5, 0.12, MADERA3, x, -0.6, z));   // lima
    P.push(B(0.06, 0.06, 0.26, HIERRO, x, 1.16, z)); }
  return une(P);
}
export const gHerradura = (k = 1) => T(u(new THREE.TorusGeometry(0.34 * k, 0.07 * k, 4, 9, PI * 1.45), 0x5f6772), 0, 0, 0, 0, 0, -PI * 0.225);   // con la abertura hacia abajo
export const gHachaPared = (l = 3.2) => une([B(0.13, l, 0.13, MADERA, 0, l / 2, 0), T(u(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 8, 1, false, 0, PI).scale(1, 1, 1.25), ACERO), 0.05, l * 0.2, 0, 0, PI / 2), B(0.3, 0.36, 0.16, 0x5f6772, 0.02, l * 0.2, 0)]);
// carbonera de tablones abierta por delante (+z), pala y un haz de barras de hierro
export const gCarbonera = (w = 5.4, d = 5.6, h = 1.7) => une([B(w, h, 0.2, MADERA2, 0, h / 2, -d / 2), ...[-1, 1].flatMap(s => [B(0.2, h, d, MADERA2, s * w / 2, h / 2, 0), B(0.3, h + 0.2, 0.3, MADERA3, s * w / 2, (h + 0.2) / 2, d / 2), B(0.3, h + 0.2, 0.3, MADERA3, s * w / 2, (h + 0.2) / 2, -d / 2)]), B(w, 0.5, 0.2, MADERA2, 0, 0.25, d / 2)]);
export const gPala = () => une([C(0.06, 0.06, 3.0, MADERA, 0, 2.1, 0, 6), B(0.4, 0.1, 0.1, MADERA3, 0, 3.6, 0), B(0.62, 0.78, 0.06, 0x5f6772, 0, 0.4, 0), B(0.1, 0.3, 0.1, HIERRO, 0, 0.74, 0)]);
export const gBarras = (l = 5) => une([...[[-0.22, 0.09], [0, 0.09], [0.22, 0.09], [-0.11, 0.27], [0.11, 0.27], [0, 0.45]].map(([x, y], i) => B(0.18, 0.16, l - (i % 3) * 0.4, i % 2 ? 0x5f6772 : HIERRO, x, y, (i % 2 - 0.5) * 0.3)), ...[-1, 1].map(s => B(0.74, 0.07, 0.12, MADERA3, 0, 0.02, s * l * 0.3))]);
// farol de pared o de mesa: la llama, que brilla, la pone quien lo use
export const gFarol = (k = 1) => une([B(0.4 * k, 0.06 * k, 0.4 * k, HIERRO, 0, 0.03 * k, 0), ...[-1, 1].flatMap(sx => [-1, 1].map(sz => B(0.05 * k, 0.6 * k, 0.05 * k, HIERRO, sx * 0.17 * k, 0.36 * k, sz * 0.17 * k))), T(u(new THREE.ConeGeometry(0.34 * k, 0.26 * k, 4), HIERRO), 0, 0.79 * k, 0, PI / 4), T(u(new THREE.TorusGeometry(0.1 * k, 0.025 * k, 4, 8), HIERRO), 0, 0.98 * k, 0)]);

// carro de bueyes en marcha, con su boyero sentado: para los caminos del mapa
export const gCarroDeBueyes = (boyero = []) => une([gCarro({ carga: 'sacos', puntal: false }).scale(0.72, 0.72, 0.72).translate(0, 0, -1.2), gVaca(0x8a6a48, { yugo: true, manchas: false }).scale(0.72, 0.72, 0.72).translate(0, 0, 1.1), ...boyero]);
