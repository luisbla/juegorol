// barco.js — un velero hecho a mano: casco con forma (no un cilindro), castillos, palos, vergas, jarcia y velas.
// Proa hacia +x, línea de flotación en y = 0. Todo sale proporcional a la eslora y se funde en media docena de mallas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const mats = {
  casco: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
  madera: new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 0.9 }),
  cubierta: new THREE.MeshStandardMaterial({ color: 0x9a7a55, roughness: 1, side: THREE.DoubleSide }),
  jarcia: new THREE.MeshStandardMaterial({ color: 0x2a211a, roughness: 1 }),
  hierro: new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.6, metalness: 0.4 }),
  luz: new THREE.MeshStandardMaterial({ color: 0x6a5a30, emissive: 0xffc060, emissiveIntensity: 1.1 }),
};
const telas = new Map();
const tela = color => { if (!telas.has(color)) telas.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide })); return telas.get(color); };

export function crearBarcoModelo({ eslora: L = 10, palos = 2, velas = 'dadas', color = 0x5a3f2b, franja = 0xb08a4a, lona = 0xefe7d4, gallardete = 0xb23a2e } = {}) {
  const B = L * 0.26, F = L * 0.085, D = L * 0.06, lotes = new Map(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  const mete = (clave, geo) => { const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv'); if (!lotes.has(clave)) lotes.set(clave, []); lotes.get(clave).push(g); };
  const pon = (clave, geo, x, y, z, rx = 0, ry = 0, rz = 0) => mete(clave, geo.applyMatrix4(M.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz, 'YXZ')), S.set(1, 1, 1))));
  const caja = (clave, w, h, d, x, y, z, ry = 0, rz = 0) => pon(clave, new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, 0, ry, rz);
  const cil = (clave, r0, r1, h, x, y, z, rx = 0, rz = 0) => pon(clave, new THREE.CylinderGeometry(r0, r1, h, 7), x, y, z, rx, 0, rz);
  // un palo o cabo tendido entre dos puntos
  const entre = (clave, a, b, r) => { const d = new THREE.Vector3().subVectors(b, a), g = new THREE.CylinderGeometry(r, r, d.length(), 5); g.applyQuaternion(Q.setFromUnitVectors(V.set(0, 1, 0), d.clone().normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); mete(clave, g); };
  const P = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ---------- casco: cuadernas a lo largo de la eslora ---------- */
  const manga = t => B / 2 * (t > 0 ? Math.pow(Math.max(0, 1 - Math.pow(2 * t, 2.2)), 0.75) : 1 - 0.42 * Math.pow(-2 * t, 3));   // afilada a proa, espejo a popa
  const arrufo = t => F + L * 0.05 * 4 * t * t + (t < 0 ? L * 0.035 * 4 * t * t : 0);                                           // la borda sube hacia los extremos
  const quilla = t => -D * (1 - Math.pow(Math.max(0, (2 * t - 0.55) / 0.45), 2));
  const N = 16, cTint = new THREE.Color(), brea = new THREE.Color(0x231a14), tabla = new THREE.Color(color), cinta = new THREE.Color(franja);
  const cuaderna = t => { const b = manga(t), k = quilla(t), a = arrufo(t); return [[0, k], [b * 0.55, k * 0.8], [b * 0.96, -L * 0.004], [b * 1.03, a * 0.55], [b, a]]; };
  const COL = [brea, brea, brea, tabla, cinta];
  const pos = [], col = [];
  const tri = (a, b, c) => { for (const [p, k] of [a, b, c]) { pos.push(p[0], p[1], p[2]); cTint.copy(COL[k]); col.push(cTint.r, cTint.g, cTint.b); } };
  for (let i = 0; i < N; i++) {
    const t0 = -0.5 + i / N, t1 = -0.5 + (i + 1) / N, c0 = cuaderna(t0), c1 = cuaderna(t1);
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) {
      const a = [t0 * L, c0[k][1], s * c0[k][0]], b = [t1 * L, c1[k][1], s * c1[k][0]], c = [t1 * L, c1[k + 1][1], s * c1[k + 1][0]], d = [t0 * L, c0[k + 1][1], s * c0[k + 1][0]];
      tri([a, k], [b, k], [c, k + 1]); tri([a, k], [c, k + 1], [d, k + 1]);
    }
  }
  { const c0 = cuaderna(-0.5); for (let k = 0; k < 4; k++) { const a = [-L / 2, c0[k][1], -c0[k][0]], b = [-L / 2, c0[k][1], c0[k][0]], c = [-L / 2, c0[k + 1][1], c0[k + 1][0]], d = [-L / 2, c0[k + 1][1], -c0[k + 1][0]]; tri([a, k], [b, k], [c, k + 1]); tri([a, k], [c, k + 1], [d, k + 1]); } }   // espejo de popa
  const gCasco = new THREE.BufferGeometry(); gCasco.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gCasco.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gCasco.computeVertexNormals();
  // cubierta, algo por debajo de la borda
  const cub = []; const yCub = t => arrufo(t) - L * 0.022;
  for (let i = 0; i < N; i++) { const t0 = -0.5 + i / N, t1 = -0.5 + (i + 1) / N, b0 = manga(t0) * 0.97, b1 = manga(t1) * 0.97; cub.push(t0 * L, yCub(t0), -b0, t1 * L, yCub(t1), -b1, t1 * L, yCub(t1), b1, t0 * L, yCub(t0), -b0, t1 * L, yCub(t1), b1, t0 * L, yCub(t0), b0); }
  const gCub = new THREE.BufferGeometry(); gCub.setAttribute('position', new THREE.Float32BufferAttribute(cub, 3)); gCub.computeVertexNormals(); mete('cubierta', gCub);
  // tapa de regala a lo largo de la borda y quilla
  for (let i = 0; i < N; i++) for (const s of [-1, 1]) { const t0 = -0.5 + i / N, t1 = -0.5 + (i + 1) / N; entre('madera', P(t0 * L, arrufo(t0), s * manga(t0)), P(t1 * L, arrufo(t1), s * manga(t1)), L * 0.006); }
  entre('madera', P(-L / 2, -D, 0), P(L * 0.3, -D, 0), L * 0.008);
  caja('madera', L * 0.012, D + F * 0.9, L * 0.05, -L / 2 - L * 0.006, -D, 0);   // timón

  /* ---------- castillos, barandillas y farol ---------- */
  const grande = palos >= 2, yP = yCub(-0.38), baranda = (x0, x1, y, z, n) => { for (let i = 0; i <= n; i++) caja('madera', L * 0.006, L * 0.03, L * 0.006, x0 + (x1 - x0) * i / n, y, z); entre('madera', P(x0, y + L * 0.03, z), P(x1, y + L * 0.03, z), L * 0.004); };
  if (grande) {
    const alto = L * 0.06, bw = manga(-0.36) * 1.8;
    caja('madera', L * 0.25, alto, bw, -L * 0.37, yP, 0); caja('cubierta', L * 0.26, L * 0.008, bw * 1.02, -L * 0.37, yP + alto, 0);
    for (const s of [-1, 1]) baranda(-L * 0.49, -L * 0.25, yP + alto, s * bw * 0.5, 6);
    for (let i = 0; i <= 4; i++) caja('madera', L * 0.006, L * 0.03, L * 0.006, -L * 0.495, yP + alto, -bw / 2 + bw * i / 4); entre('madera', P(-L * 0.495, yP + alto + L * 0.03, -bw / 2), P(-L * 0.495, yP + alto + L * 0.03, bw / 2), L * 0.004);
    for (const s of [-1, 0, 1]) caja('luz', L * 0.004, L * 0.022, L * 0.03, -L * 0.498, yP + alto * 0.3, s * bw * 0.28);                       // ventanas de la cámara
    for (const s of [-1, 1]) caja('luz', L * 0.03, L * 0.02, L * 0.004, -L * 0.34, yP + alto * 0.35, s * bw * 0.505);
    caja('madera', L * 0.008, L * 0.07, L * 0.008, -L * 0.5, yP + alto, 0); caja('hierro', L * 0.022, L * 0.006, L * 0.022, -L * 0.5, yP + alto + L * 0.07, 0); caja('luz', L * 0.016, L * 0.024, L * 0.016, -L * 0.5, yP + alto + L * 0.076, 0);   // farol de popa
    for (let i = 0; i < 3; i++) caja('madera', L * 0.012, alto * (1 - i / 3), L * 0.05, -L * 0.235 + i * L * 0.012, yP, bw * 0.3);                 // escala al alcázar
    const yF = yCub(0.34), fw = manga(0.34) * 1.7;
    caja('madera', L * 0.12, L * 0.035, fw, L * 0.35, yF, 0); caja('cubierta', L * 0.125, L * 0.006, fw * 1.02, L * 0.35, yF + L * 0.035, 0); for (const s of [-1, 1]) baranda(L * 0.29, L * 0.41, yF + L * 0.035, s * fw * 0.5, 3);
  }
  entre('madera', P(L * 0.4, yCub(0.4) + L * 0.02, 0), P(L * 0.68, yCub(0.4) + L * 0.12, 0), L * 0.011);                                        // bauprés
  pon('madera', new THREE.ConeGeometry(L * 0.018, L * 0.06, 6), L * 0.515, arrufo(0.5) + L * 0.01, 0, 0, 0, -1.1);                               // mascarón
  // escotilla, cabrestante y algo de carga
  caja('madera', L * 0.09, L * 0.012, L * 0.07, -L * 0.02, yCub(0), 0); cil('madera', L * 0.014, L * 0.018, L * 0.035, L * 0.24, yCub(0.24) + L * 0.018, 0);
  for (const [x, z, s] of [[-0.12, 0.05, 1], [-0.14, -0.045, 0.8], [0.2, 0.04, 0.8]]) caja('cubierta', L * 0.03 * s, L * 0.026 * s, L * 0.03 * s, x * L, yCub(x), z * L, 0.3);
  for (const [x, z] of [[0.05, -0.05], [0.075, -0.05], [0.06, 0.06]]) cil('madera', L * 0.011, L * 0.011, L * 0.028, x * L, yCub(x) + L * 0.014, z * L);
  for (const s of [-1, 1]) { entre('hierro', P(L * 0.42, arrufo(0.42) - L * 0.01, s * manga(0.42) * 1.15), P(L * 0.42, arrufo(0.42) - L * 0.05, s * manga(0.42) * 1.15), L * 0.004); caja('hierro', L * 0.03, L * 0.005, L * 0.005, L * 0.42, arrufo(0.42) - L * 0.055, s * manga(0.42) * 1.15); }   // anclas

  /* ---------- arboladura ---------- */
  const PALOS = palos >= 3 ? [[0.22, 0.72], [-0.02, 0.9], [-0.32, 0.56]] : palos === 2 ? [[0.14, 0.82], [-0.2, 0.62]] : [[0.04, 0.8]];
  const vela = (x, y, ancho, alto) => {   // vela cuadra hinchada por el viento de popa
    const g = new THREE.PlaneGeometry(ancho, alto, 6, 4).rotateY(Math.PI / 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setX(i, Math.sin((p.getZ(i) / ancho + 0.5) * Math.PI) * Math.sin((p.getY(i) / alto + 0.5) * Math.PI) * ancho * 0.16);
    g.computeVertexNormals(); g.translate(x + L * 0.012, y, 0); mete('lona', g);
  };
  PALOS.forEach(([t, k], i) => {
    const x = t * L, y0 = yCub(t) + (grande && t < -0.24 ? L * 0.06 : 0), h = k * L, mayor = k === Math.max(...PALOS.map(q => q[1])), mesana = palos >= 2 && i === PALOS.length - 1;
    cil('madera', L * 0.007, L * 0.012, h, x, y0 + h / 2, 0);
    if (mesana && velas !== 'ninguna') {   // latina a popa
      const a = P(x + L * 0.1, y0 + h * 0.3, 0), b = P(x - L * 0.13, y0 + h * 0.92, 0); entre('madera', a, b, L * 0.006);
      if (velas === 'dadas') { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([a.x, a.y, 0, b.x, b.y, 0, x - L * 0.14, y0 + h * 0.2, L * 0.05], 3)); g.computeVertexNormals(); mete('lona', g); }
      else entre('lona', a.clone().lerp(b, 0.08), a.clone().lerp(b, 0.92), L * 0.011);
    } else {
      const niveles = grande ? [[0.42, 0.44, 0.34], [0.8, 0.32, 0.22]] : [[0.62, 0.42, 0.5]];   // [altura de la verga, ancho, alto de la vela] en proporción
      for (const [f, an, al] of niveles) {
        const yv = y0 + h * f + h * al * 0.5, ancho = L * an * (mayor ? 1 : 0.85);
        entre('madera', P(x, yv, -ancho / 2), P(x, yv, ancho / 2), L * 0.006);
        if (velas === 'dadas') vela(x, yv - h * al * 0.5, ancho * 0.94, h * al);
        else if (velas === 'recogidas') entre('lona', P(x + L * 0.006, yv - L * 0.012, -ancho * 0.45), P(x + L * 0.006, yv - L * 0.012, ancho * 0.45), L * 0.012);
      }
    }
    if (mayor && grande) { cil('madera', L * 0.03, L * 0.022, L * 0.022, x, y0 + h * 0.72, 0); }   // cofa
    for (const s of [-1, 1]) for (const dx of [-0.02, -0.05]) entre('jarcia', P(x, y0 + h * 0.7, 0), P(x + dx * L, arrufo(t + dx), s * manga(t + dx)), L * 0.0022);   // obenques
    if (mayor) { const tope = P(x, y0 + h, 0); entre('jarcia', tope, P(L * 0.66, yCub(0.4) + L * 0.11, 0), L * 0.002); entre('jarcia', tope, P(-L * 0.49, yCub(-0.49) + (grande ? L * 0.09 : 0.02), 0), L * 0.002);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([x, y0 + h, 0, x, y0 + h - L * 0.035, 0, x - L * 0.11, y0 + h - L * 0.02, L * 0.01], 3)); g.computeVertexNormals(); mete('gallardete', g); }
  });

  const g = new THREE.Group();
  const casco = new THREE.Mesh(gCasco, mats.casco); casco.castShadow = true; g.add(casco);
  for (const [clave, geos] of lotes) { const m = new THREE.Mesh(mergeGeometries(geos), clave === 'lona' ? tela(lona) : clave === 'gallardete' ? tela(gallardete) : mats[clave]); m.castShadow = clave !== 'jarcia'; g.add(m); }
  return g;
}
