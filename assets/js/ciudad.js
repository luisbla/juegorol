// ciudad.js — interior de una capital. Escena 3D propia, generada con semilla a partir del lugar:
// las puertas de la muralla salen de los caminos reales que llegan a la ciudad en mundo.json.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kit } from './lugares.js';
import { azarDe } from './ruido.js';

const { matPared, matPiedra, matTejado, matLiso, gCaja, gCil, gCono, gRoca, gDosAguas, ESTILOS } = kit;

const PERFIL = {
  valcoria: { sede: 'Castillo real', fuera: '#5f8244', dentro: '#a39472', calle: '#c2b494', teja2: 0x7d4a36, arbol: 'hoja' },
  griselda: { sede: 'Torre del homenaje', fuera: '#dde3e9', dentro: '#8b8e95', calle: '#a9acb2', teja2: 0x444a58, arbol: 'pino' },
  solterra: { sede: 'Casa del señor', fuera: '#c6a14c', dentro: '#b39a6c', calle: '#d3c198', teja2: 0x8a5a30, arbol: 'hoja' },
  astravan: { sede: 'Casa del Consejo', fuera: '#56824c', dentro: '#a79f8e', calle: '#cdc6b6', teja2: 0x7a4a52, arbol: 'hoja' },
};
const RUMBOS = ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'];
const difAng = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

const sinIndice = new Map();
const plana = g => { if (!sinIndice.has(g)) sinIndice.set(g, g.index ? g.toNonIndexed() : g); return sinIndice.get(g); };

export function crearCiudad(l, mundo, { movil = false } = {}) {
  const rnd = azarDe('ciudad-' + l.id), e = ESTILOS[l.id] || ESTILOS.valcoria, perfil = PERFIL[l.id] || PERFIL.valcoria;
  const tam = l.tamano || 1, R = 62 * tam + 26, L = R + 135;
  const escena = new THREE.Scene(), etiquetas = [];

  /* ---------- puertas: una por cada camino que llega a la ciudad ---------- */
  let puertas = [];
  for (const c of mundo.caminos) {
    if (c.tipo === 'barca' || (c.de !== l.id && c.a !== l.id)) continue;
    const pts = c.de === l.id ? c.trazo : [...c.trazo].reverse(), p = pts[Math.min(pts.length - 1, 7)];
    const ang = Math.atan2(p[1] - l.y, p[0] - l.x), destino = mundo.lugares.find(x => x.id === (c.de === l.id ? c.a : c.de));
    const rumbo = RUMBOS[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    puertas.push({ ang, nombre: destino ? `Hacia ${destino.nombre}` : `Camino del ${rumbo}`, principal: c.tipo === 'camino' });
  }
  puertas.sort((a, b) => b.principal - a.principal);
  puertas = puertas.filter((p, i) => !puertas.slice(0, i).some(q => difAng(p.ang, q.ang) < 0.5));
  const cercaAvenida = (a, r, ancho) => puertas.some(p => difAng(a, p.ang) * r < ancho);

  // la sede se pone en el sector más alejado de las puertas
  let angSede = 0, mejor = -1;
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, d = Math.min(...puertas.map(p => difAng(a, p.ang)), 3); if (d > mejor) { mejor = d; angSede = a; } }
  const rSede = 15 + 7 * tam, sede = { x: Math.cos(angSede) * R * 0.5, z: Math.sin(angSede) * R * 0.5 };
  const enSede = (x, z, margen = 5) => Math.hypot(x - sede.x, z - sede.z) < rSede + margen;

  // Astravan: el lago grande queda donde está en el mapa
  let lago = null;
  if (l.id === 'astravan' && mundo.lagos?.length) {
    const g = mundo.lagos[0], ang = Math.atan2(g.y - l.y, g.x - l.x);
    lago = { ang, r: 190, x: Math.cos(ang) * (R + 34 + 190), z: Math.sin(ang) * (R + 34 + 190) };
    if (!puertas.some(p => difAng(p.ang, ang) < 0.5)) puertas.push({ ang, nombre: 'Muelles del lago', principal: true, lago: true });
  }
  const enLago = (x, z, margen = 0) => lago && Math.hypot(x - lago.x, z - lago.z) < lago.r + margen;

  /* ---------- lotes: todo lo fijo se funde por material (un puñado de mallas para cientos de casas) ---------- */
  const lotes = new Map(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
  let marco = null;   // transformación del conjunto que se está construyendo
  function poner(geo, material, x, y, z, sx, sy, sz, ry = 0, rz = 0, rx = 0) {
    E.set(rx, ry, rz, 'YXZ'); M.compose(P.set(x, y, z), Q.setFromEuler(E), S.set(sx, sy, sz));
    if (marco) M.premultiply(marco);
    const g = plana(geo).clone().applyMatrix4(M);
    if (!lotes.has(material)) lotes.set(material, []);
    lotes.get(material).push(g);
  }
  const conMarco = (x, z, ry, fn) => { marco = new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z); fn(); marco = null; };
  const caja = (m, w, h, d, x, y, z, ry = 0) => poner(gCaja, m, x, y + h / 2, z, w, h, d, ry);
  const cil = (m, r, h, x, y, z) => poner(gCil, m, x, y + h / 2, z, r, h, r);
  const cono = (m, r, h, x, y, z) => poner(gCono, m, x, y + h / 2, z, r, h, r);
  function casa(x, z, w, d, alto, pared, teja, ry, chimenea) {
    caja(pared, w, alto, d, x, 0, z, ry);
    poner(gDosAguas, teja, x, alto, z, w * 1.14, alto * 0.7, d * 1.22, ry);
    if (chimenea) { const ox = w * 0.26, oz = d * 0.1; caja(piedraClara, 0.7, alto * 0.8, 0.7, x + ox * Math.cos(ry) + oz * Math.sin(ry), alto * 0.95, z - ox * Math.sin(ry) + oz * Math.cos(ry), ry); }
  }
  function torre(x, z, r, alto, piedra, teja, almenas) {
    cil(piedra, r, alto, x, 0, z);
    if (almenas) { cil(piedra, r * 1.14, 1.0, x, alto, z); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; caja(piedra, r * 0.45, 1.1, r * 0.3, x + Math.cos(a) * r * 1.05, alto + 1, z + Math.sin(a) * r * 1.05, -a + Math.PI / 2); } }
    else cono(teja, r * 1.3, r * 2.4, x, alto, z);
  }

  const piedra = matPiedra(e.muro), piedraClara = matPiedra(0x8d8676, 1), madera = matLiso(0x6b5440);
  const paredes = [matPared(e.pared, { entramado: e.entramado, piedra: e.fortaleza }), matPared(new THREE.Color(e.pared).multiplyScalar(0.82).getHex(), { entramado: e.entramado, piedra: e.fortaleza })];
  const tejas = [matTejado(e.teja), matTejado(e.teja), matTejado(perfil.teja2)];
  const banderas = [], humos = [];

  /* ---------- caserío en anillos ---------- */
  // las calles no son círculos perfectos: cada anillo ondula, más cuanto más lejos de la plaza, y lo cortan callejones
  const paso = 13, anillos = [], f1 = rnd() * 6.28, f2 = rnd() * 6.28;
  const onda = (a, r) => (Math.sin(a * 3 + f1) * 3.0 + Math.sin(a * 7 + f2) * 1.6) * Math.min(1, (r - 20) / 40) * Math.min(1, (R - 6 - r) / 14);
  for (let r = 27; r <= R - 11; r += paso) anillos.push(r);
  for (const r0 of anillos) {
    const n = Math.floor(2 * Math.PI * r0 / 6.7), giro = rnd() * 6.28, callejon = 5 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + giro, r = r0 + onda(a, r0) + (rnd() - 0.5) * 1.6, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (cercaAvenida(a, r, 6.5) || enSede(x, z) || i % callejon === 0) continue;
      const alto = 3.0 + rnd() * 1.6 + (1 - r / R) * 1.6 + (rnd() > 0.85 ? 1.8 : 0);
      casa(x, z, 4.6 + rnd() * 1.5, 4.3 + rnd() * 1.2, alto, paredes[rnd() > 0.5 ? 0 : 1], tejas[Math.floor(rnd() * 3)], -(a + Math.PI / 2) + (rnd() - 0.5) * 0.12, rnd() > 0.55);
      if (rnd() > 0.9 && humos.length < 14) humos.push(new THREE.Vector3(x, alto * 1.8, z));
    }
  }

  /* ---------- muralla, torres y puertas ---------- */
  const N = Math.round(2 * Math.PI * R / 9), tramo = 2 * Math.PI * R / N;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    if (cercaAvenida(a, R, 7.5)) continue;
    const x = Math.cos(a) * R, z = Math.sin(a) * R, ry = -(a + Math.PI / 2);
    caja(piedra, tramo * 1.05, 7, 2.2, x, 0, z, ry);
    for (const s of [-0.28, 0.28]) caja(piedra, tramo * 0.26, 1.1, 2.3, x + Math.cos(a + Math.PI / 2) * tramo * s, 7, z + Math.sin(a + Math.PI / 2) * tramo * s, ry);
    if (i % 5 === 0) torre(Math.cos(a) * (R + 0.6), Math.sin(a) * (R + 0.6), 2.9, 10.5, piedra, tejas[0], e.fortaleza || i % 10 === 0);
  }
  for (const p of puertas) {
    const tx = Math.cos(p.ang + Math.PI / 2), tz = Math.sin(p.ang + Math.PI / 2), x = Math.cos(p.ang) * R, z = Math.sin(p.ang) * R;
    for (const s of [-1, 1]) torre(x + tx * 7.2 * s, z + tz * 7.2 * s, 3.3, 13, piedra, tejas[0], true);
    caja(piedra, 12, 4.2, 3.2, x, 6.8, z, -(p.ang + Math.PI / 2));
    for (const s of [-0.3, 0, 0.3]) caja(piedra, 2.0, 1.1, 3.3, x + tx * 12 * s, 11, z + tz * 12 * s, -(p.ang + Math.PI / 2));
    etiquetas.push({ nombre: p.nombre, pos: new THREE.Vector3(x, 19, z), clase: 'puerta' });
  }

  /* ---------- plaza del mercado ---------- */
  cil(piedraClara, 3.4, 0.9, 0, 0, 0); cil(piedraClara, 0.9, 2.8, 0, 0.9, 0); cil(matLiso(0x3f7f93, { roughness: 0.2, metalness: 0.2 }), 3.0, 0.12, 0, 0.85, 0);
  const TOLDOS = [0xb23a2e, 0x2f6aa0, 0xd9a23a, 0x3f8a54, 0x8a4a8e];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + 0.2, r = 9.5 + (i % 2) * 3.2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (cercaAvenida(a, r, 3.2)) continue;
    caja(madera, 2.4, 1.0, 1.5, x, 0, z, -a);
    poner(gDosAguas, matLiso(TOLDOS[i % 5], { side: THREE.DoubleSide }), x, 2.5, z, 3.0, 0.8, 2.3, -a);
    for (const s of [-1.1, 1.1]) caja(madera, 0.14, 2.5, 0.14, x + Math.cos(a + Math.PI / 2) * s, 0, z + Math.sin(a + Math.PI / 2) * s);
  }
  for (let i = 0; i < 18; i++) { const a = rnd() * 6.28, r = 5 + rnd() * 11; if (rnd() > 0.5) cil(matLiso(0x6a4a2e), 0.55, 1.1, Math.cos(a) * r, 0, Math.sin(a) * r); else caja(matLiso(0x8a6a48), 1.1, 0.9, 1.1, Math.cos(a) * r, 0, Math.sin(a) * r, rnd()); }
  etiquetas.push({ nombre: 'Plaza del mercado', pos: new THREE.Vector3(0, 9, 0), clase: 'ciudad' });

  /* ---------- sede del poder, distinta en cada capital ---------- */
  function bandera(x, y, z, color) {
    caja(matLiso(0x3a2c20), 0.22, 6, 0.22, x, y, z);
    const geo = new THREE.PlaneGeometry(5, 2.6, 8, 1); geo.translate(2.5, 0, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 }));
    m.position.set(x, y + 4.6, z); banderas.push(m);
  }
  const colorRegion = mundo.regiones.find(r => r.id === l.region)?.color ?? '#cccccc';
  const aMundo = (x, y, z) => new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -angSede - Math.PI / 2).add(new THREE.Vector3(sede.x, 0, sede.z));
  // el conjunto mira a la plaza: su eje +z local apunta al centro de la ciudad
  conMarco(sede.x, sede.z, -angSede - Math.PI / 2, () => {
    const muro = matPared(e.fortaleza ? 0x5d626e : e.muro, { piedra: true }), teja = tejas[0], k = rSede / 22;
    // recinto con torres en las esquinas y puerta hacia la plaza
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; if (difAng(a, -Math.PI / 2) < 0.25) continue; caja(piedra, rSede * 0.33, 5, 1.6, Math.cos(a) * rSede, 0, -Math.sin(a) * rSede, a + Math.PI / 2); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; torre(Math.cos(a) * rSede, Math.sin(a) * rSede, 2.4, 8.5, piedra, teja, e.fortaleza); }
    if (l.id === 'griselda') {
      caja(muro, 17 * k, 17, 21 * k, 0, 0, -2);
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; caja(piedra, 2.4, 1.6, 1.4, Math.cos(a) * 9 * k, 17, -2 + Math.sin(a) * 11 * k, -a); }
      torre(-9 * k, -12 * k, 3.6, 27, piedra, teja, true); torre(9 * k, -12 * k, 3.0, 22, piedra, teja, true); torre(9 * k, 8 * k, 2.6, 19, piedra, teja, true);
    } else if (l.id === 'astravan') {
      caja(muro, 26 * k, 10, 12 * k, 0, 0, -3);
      poner(gDosAguas, teja, 0, 10, -3, 28 * k, 5, 13.5 * k);
      for (let i = 0; i < 9; i++) cil(piedraClara, 0.5, 5, -11 * k + i * 2.75 * k, 0, 4.2 * k);   // soportal
      caja(piedraClara, 25 * k, 0.6, 2.4, 0, 5, 4.0 * k);
      cil(muro, 5 * k, 17, 0, 0, -8 * k); cono(teja, 5.6 * k, 7, 0, 17, -8 * k);                  // torre del reloj
      for (const s of [-1, 1]) casa(s * 12 * k, 7 * k, 7, 5, 5, paredes[0], tejas[2], Math.PI / 2, true);
    } else if (l.id === 'solterra') {
      casa(0, -3, 19 * k, 9 * k, 8, muro, teja, 0, true);
      casa(-9 * k, 5 * k, 7, 6, 5.5, paredes[0], teja, Math.PI / 2, false);
      torre(9 * k, 3 * k, 2.6, 13, piedra, teja, false);
    } else {
      caja(muro, 17 * k, 12, 14 * k, 0, 0, -2);
      poner(gDosAguas, teja, 0, 12, -2, 19 * k, 6.5, 16 * k);
      torre(-9.5 * k, -9.5 * k, 3.3, 22, piedra, teja, false); torre(9.5 * k, -9.5 * k, 2.8, 18, piedra, teja, false);
      torre(9.5 * k, 5.5 * k, 2.4, 15, piedra, teja, false); torre(-9.5 * k, 5.5 * k, 2.4, 15, piedra, teja, false);
      casa(0, 9 * k, 9, 5, 5, paredes[0], teja, 0, false);
    }
  });
  if (l.id === 'astravan') [-7, 0, 7].forEach((dx, i) => { const p = aMundo(dx, 10 + 5, -3); bandera(p.x, p.y, p.z, [0x2f6aa0, 0x3f8a54, 0xb08a2e][i]); });   // tres casas, tres pendones
  else {
    const k = rSede / 22, asta = { griselda: [-9 * k, 28.5, -12 * k], solterra: [9 * k, 18.5, 3 * k] }[l.id] || [-9.5 * k, 29, -9.5 * k];
    const p = aMundo(...asta); bandera(p.x, p.y, p.z, colorRegion);
  }
  etiquetas.push({ nombre: perfil.sede, pos: new THREE.Vector3(sede.x, 34, sede.z), clase: 'ciudad' });

  /* ---------- lo propio de cada ciudad ---------- */
  if (l.id === 'solterra') {
    // graneros junto a la muralla, en el sector opuesto a la sede
    const a = angSede + Math.PI, gx = Math.cos(a) * (R - 22), gz = Math.sin(a) * (R - 22);
    if (!cercaAvenida(a, R - 22, 14)) {
      for (let i = 0; i < 4; i++) { const b = a + Math.PI / 2, x = gx + Math.cos(b) * (i - 1.5) * 8, z = gz + Math.sin(b) * (i - 1.5) * 8; cil(piedraClara, 3.0, 10, x, 0, z); cono(tejas[2], 3.5, 3.6, x, 10, z); }
      etiquetas.push({ nombre: 'Graneros', pos: new THREE.Vector3(gx, 17, gz), clase: 'ciudad' });
    }
  }
  if (l.id === 'griselda') {
    // riscos nevados cerrando el valle
    const roca = matPiedra(0x70747c, 1), nieve = matLiso(0xeef2f6);
    for (let i = 0; i < 34; i++) {
      const a = i / 34 * Math.PI * 2 + rnd() * 0.15, r = R + 62 + rnd() * 60;
      if (cercaAvenida(a, r, 16)) continue;
      const alto = 34 + rnd() * 60, ancho = 16 + rnd() * 16, x = Math.cos(a) * r, z = Math.sin(a) * r;
      cono(roca, ancho, alto, x, -2, z); cono(nieve, ancho * 0.52, alto * 0.5, x, alto * 0.5 - 1.6, z);
    }
  }
  if (lago) {
    const p = puertas.find(q => q.lago) || puertas.reduce((m, q) => difAng(q.ang, lago.ang) < difAng(m.ang, lago.ang) ? q : m);
    const ux = Math.cos(lago.ang), uz = Math.sin(lago.ang), tx = -uz, tz = ux, orilla = R + 34;
    for (const s of [-28, -12, 6, 22]) {   // espigones con barcazas
      const largo = 26 + Math.abs(s) * 0.4, bx = ux * (orilla + largo / 2 - 4) + tx * s, bz = uz * (orilla + largo / 2 - 4) + tz * s;
      caja(madera, largo, 0.5, 2.6, bx, 1.0, bz, -lago.ang);
      for (let d = 2; d < largo; d += 5) caja(matLiso(0x4a3a2a), 0.5, 3.4, 0.5, ux * (orilla + d - 4) + tx * (s + 1.2), -1.4, uz * (orilla + d - 4) + tz * (s + 1.2));
      poner(gCil, matLiso(0x5a3f2b), ux * (orilla + largo * 0.7) + tx * (s - 3.4), 0.5, uz * (orilla + largo * 0.7) + tz * (s - 3.4), 1.5, 9, 1.0, -lago.ang, Math.PI / 2);
    }
    for (let i = 0; i < 7; i++) { const s = -36 + i * 11; casa(ux * (orilla - 9) + tx * s, uz * (orilla - 9) + tz * s, 8, 5.5, 4.5 + (i % 2), matPared(i % 2 ? 0x9a7a55 : 0x8a6a48), matTejado(0x5c3a2a), -lago.ang + Math.PI / 2, false); }
    if (!p.lago) etiquetas.push({ nombre: 'Muelles del lago', pos: new THREE.Vector3(ux * (orilla + 6), 12, uz * (orilla + 6)), clase: 'ciudad' });
  }

  /* ---------- arbolado ---------- */
  const verdes = [matLiso(0x3f6a2e), matLiso(0x4d7a36), matLiso(0x35582a)], nevado = matLiso(0x5f7a6a), troncoM = matLiso(0x5a4330);
  const arbol = (x, z, s) => {
    cil(troncoM, 0.45 * s, 3 * s, x, 0, z);
    if (perfil.arbol === 'pino') { cono(nevado, 2.6 * s, 5 * s, x, 2 * s, z); cono(nevado, 1.9 * s, 4.2 * s, x, 4.6 * s, z); }
    else { const m = verdes[Math.floor(rnd() * 3)]; poner(gRoca, m, x, 5.2 * s, z, 3.2 * s, 2.9 * s, 3.2 * s, rnd() * 6); poner(gRoca, m, x + 1.6 * s, 4.2 * s, z + 0.8 * s, 2.2 * s, 2 * s, 2.2 * s, rnd() * 6); }
  };
  for (let i = 0; i < (movil ? 150 : 300); i++) {
    const a = rnd() * 6.28, r = R + 10 + Math.pow(rnd(), 0.7) * (L - R - 14), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (cercaAvenida(a, r, 9) || enLago(x, z, 6) || (l.id === 'solterra' && rnd() > 0.25)) continue;
    arbol(x, z, 0.8 + rnd() * 0.7);
  }
  if (l.id === 'valcoria') for (let i = 0; i < 40; i++) {   // robles viejos dentro de la muralla
    const a = rnd() * 6.28, r = 20 + rnd() * (R - 30), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!cercaAvenida(a, r, 5) && !enSede(x, z, 2) && anillos.every(q => Math.abs(q - r) > 4.5)) arbol(x, z, 0.7 + rnd() * 0.4);
  }

  /* ---------- suelo: plano pintado con calles, plaza y caminos ---------- */
  const lienzo = document.createElement('canvas'); lienzo.width = lienzo.height = movil ? 1024 : 2048;
  {
    const x = lienzo.getContext('2d'), T = lienzo.width, k = T / (2 * L), px = v => (v + L) * k;
    x.fillStyle = perfil.fuera; x.fillRect(0, 0, T, T);
    if (l.id === 'solterra') for (let i = 0; i < 260; i++) {   // parcelas alrededor
      const fx = rnd() * T, fz = rnd() * T; x.save(); x.translate(fx, fz); x.rotate(0.42 + (rnd() - 0.5) * 0.2);
      x.fillStyle = ['#d2ac55', '#bd9a48', '#dcbc6a', '#9aa052', '#c79340'][Math.floor(rnd() * 5)]; x.fillRect(-40 * k, -26 * k, 80 * k, 52 * k);
      x.strokeStyle = 'rgba(70,50,20,0.35)'; x.lineWidth = 1; for (let s = -24; s < 26; s += 4) { x.beginPath(); x.moveTo(-40 * k, s * k); x.lineTo(40 * k, s * k); x.stroke(); }
      x.restore();
    }
    for (let i = 0; i < 5000; i++) { x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${rnd() * 0.07})` : `rgba(0,0,0,${rnd() * 0.09})`; const s = 2 + rnd() * 14; x.fillRect(rnd() * T, rnd() * T, s, s); }
    if (lago) { x.fillStyle = '#b9a67c'; x.beginPath(); x.arc(px(lago.x), px(lago.z), (lago.r + 7) * k, 0, 6.283); x.fill(); x.fillStyle = '#2a5d78'; x.beginPath(); x.arc(px(lago.x), px(lago.z), lago.r * k, 0, 6.283); x.fill(); }
    x.lineCap = 'round';
    for (const p of puertas) {   // caminos de fuera
      if (p.lago) continue;
      x.strokeStyle = '#b9a47a'; x.lineWidth = 9 * k; x.beginPath(); x.moveTo(px(Math.cos(p.ang) * (R - 2)), px(Math.sin(p.ang) * (R - 2))); x.lineTo(px(Math.cos(p.ang) * L * 1.5), px(Math.sin(p.ang) * L * 1.5)); x.stroke();
    }
    x.fillStyle = perfil.dentro; x.beginPath(); x.arc(px(0), px(0), (R + 1) * k, 0, 6.283); x.fill();
    x.strokeStyle = perfil.calle;
    for (const r0 of anillos) {
      x.lineWidth = 5.2 * k; x.beginPath();
      for (let i = 0; i <= 180; i++) { const a = i / 180 * 6.2832, r = r0 + paso / 2 + onda(a, r0 + paso / 2); x.lineTo(px(Math.cos(a) * r), px(Math.sin(a) * r)); }
      x.stroke();
    }
    x.lineWidth = 2.6 * k;   // callejones entre anillos
    for (let i = 0; i < 46 * tam; i++) { const a = rnd() * 6.283, r = 24 + rnd() * (R - 36); x.beginPath(); x.moveTo(px(Math.cos(a) * r), px(Math.sin(a) * r)); x.lineTo(px(Math.cos(a) * (r + paso)), px(Math.sin(a) * (r + paso))); x.stroke(); }
    for (const p of puertas) { x.lineWidth = 8.5 * k; x.beginPath(); x.moveTo(px(0), px(0)); x.lineTo(px(Math.cos(p.ang) * (R + 2)), px(Math.sin(p.ang) * (R + 2))); x.stroke(); }
    x.fillStyle = perfil.calle; x.beginPath(); x.arc(px(0), px(0), 21 * k, 0, 6.283); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 1.2; for (let r = 4; r < 21; r += 2.4) { x.beginPath(); x.arc(px(0), px(0), r * k, 0, 6.283); x.stroke(); }   // empedrado
    x.fillStyle = perfil.calle; x.beginPath(); x.arc(px(sede.x), px(sede.z), (rSede + 1) * k, 0, 6.283); x.fill();
    for (let i = 0; i < 9000; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * R, s = 1 + rnd() * 5; x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${rnd() * 0.08})` : `rgba(0,0,0,${rnd() * 0.1})`; x.fillRect(px(Math.cos(a) * r), px(Math.sin(a) * r), s, s); }
  }
  const texSuelo = new THREE.CanvasTexture(lienzo); texSuelo.colorSpace = THREE.SRGBColorSpace; texSuelo.anisotropy = 8;
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(2 * L, 2 * L), new THREE.MeshStandardMaterial({ map: texSuelo, roughness: 1 }));
  suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; escena.add(suelo);
  let agua = null;
  if (lago) {
    agua = new THREE.Mesh(new THREE.CircleGeometry(lago.r, 64), new THREE.MeshStandardMaterial({ color: 0x1f5878, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.9 }));
    agua.rotation.x = -Math.PI / 2; agua.position.set(lago.x, 0.25, lago.z); escena.add(agua);
  }

  for (const [material, geos] of lotes) {
    const m = new THREE.Mesh(mergeGeometries(geos), material);
    m.castShadow = true; m.receiveShadow = true; escena.add(m);
  }
  for (const b of banderas) { b.castShadow = true; escena.add(b); }

  /* ---------- vida: gente por las calles, humo de chimeneas, antorchas ---------- */
  const nGente = movil ? 45 : 110, andares = [];
  // figuras: túnica (cono truncado) teñida por persona y cabeza aparte, con las mismas posiciones
  const gCuerpo = new THREE.CylinderGeometry(0.22, 0.42, 1.45, 7); gCuerpo.translate(0, -0.2, 0);
  const gCabeza = new THREE.SphereGeometry(0.25, 8, 6); gCabeza.translate(0, 0.78, 0);
  const gente = new THREE.InstancedMesh(gCuerpo, new THREE.MeshStandardMaterial({ roughness: 1 }), nGente);
  const cabezas = new THREE.InstancedMesh(gCabeza, new THREE.MeshStandardMaterial({ color: 0xd9b08c, roughness: 1 }), nGente);
  const ROPA = [0x7a3b2e, 0x2f4f6f, 0x5a6b3a, 0x8a7a55, 0x4a3a5a, 0xb09a6a, 0x6a2f3a];
  const colorTmp = new THREE.Color();
  for (let i = 0; i < nGente; i++) {
    const enAvenida = rnd() < 0.55 && puertas.length;
    andares.push(enAvenida
      ? { tipo: 'avenida', ang: puertas[Math.floor(rnd() * puertas.length)].ang, lado: (rnd() - 0.5) * 5, f: rnd() * 6.28, v: 0.03 + rnd() * 0.03 }
      : { tipo: 'anillo', r: (rnd() < 0.3 ? 8 + rnd() * 10 : anillos[Math.floor(rnd() * anillos.length)] + paso / 2 + (rnd() - 0.5) * 3), f: rnd() * 6.28, v: (rnd() > 0.5 ? 1 : -1) * (2.2 + rnd() * 1.6) });
    gente.setColorAt(i, colorTmp.setHex(ROPA[Math.floor(rnd() * ROPA.length)]));
  }
  gente.castShadow = true; gente.frustumCulled = false; cabezas.frustumCulled = false; escena.add(gente, cabezas);

  const blanda = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const bocanadas = [];
  for (const origen of humos) for (let k = 0; k < 5; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blanda, transparent: true, depthWrite: false, color: 0xd9d4cc })); s.userData = { origen, fase: k / 5 + rnd() }; bocanadas.push(s); escena.add(s); }
  const antorchas = [];
  const fuego = (x, y, z, t) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blanda, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffb45e, opacity: 0, fog: false })); s.position.set(x, y, z); s.scale.set(t, t, 1); s.userData.f = rnd() * 6; antorchas.push(s); escena.add(s); };
  for (const p of puertas) fuego(Math.cos(p.ang) * (R - 4), 6, Math.sin(p.ang) * (R - 4), 26);
  for (let i = 0; i < 6; i++) fuego(Math.cos(i * 1.05) * 15, 4, Math.sin(i * 1.05) * 15, 22);
  fuego(sede.x, 8, sede.z, 46);

  /* ---------- luz ---------- */
  const sol = new THREE.DirectionalLight(0xffffff, 2.5), luna = new THREE.DirectionalLight(0x8fa8ff, 0), cielo = new THREE.HemisphereLight(0xbfd8ff, 0x4a4030, 0.8);
  sol.castShadow = true; sol.shadow.mapSize.setScalar(movil ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -R - 60, right: R + 60, top: R + 60, bottom: -R - 60, near: 20, far: 1600 });
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 0.5;
  escena.add(sol, luna, cielo);
  escena.background = new THREE.Color(0x9cc4e8); escena.fog = new THREE.FogExp2(0x9cc4e8, 0.0011);

  const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), ejeY = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), esc = new THREE.Vector3(1, 1, 1), nada = new THREE.Vector3(0, 0, 0);
  function actualizar(t, luz, noche) {
    sol.position.copy(luz.dirSol).multiplyScalar(700); sol.intensity = luz.sol.intensity; sol.color.copy(luz.sol.color); sol.castShadow = luz.sol.castShadow;
    luna.position.copy(luz.dirLuna).multiplyScalar(700); luna.intensity = luz.luna.intensity * 1.2; cielo.intensity = luz.luzCielo.intensity;
    escena.background.copy(luz.horizonte).lerp(luz.arriba, 0.3); escena.fog.color.copy(luz.horizonte);
    // de noche la mayoría se recoge
    andares.forEach((a, i) => {
      const fuera = noche > 0.6 && i % 4 !== 0;
      let x, z, rumbo;
      if (a.tipo === 'avenida') { const s = Math.sin(t * a.v + a.f), r = 22 + (s * 0.5 + 0.5) * (R - 28); x = Math.cos(a.ang) * r - Math.sin(a.ang) * a.lado; z = Math.sin(a.ang) * r + Math.cos(a.ang) * a.lado; rumbo = -a.ang + (Math.cos(t * a.v + a.f) > 0 ? 0 : Math.PI); }
      else { const ang = a.f + t * a.v / a.r, r = a.r + (a.r > 22 ? onda(ang, a.r) : 0); x = Math.cos(ang) * r; z = Math.sin(ang) * r; rumbo = -ang - Math.PI / 2 * Math.sign(a.v); }
      pos.set(x, 0.95 + Math.abs(Math.sin(t * 7 + a.f)) * 0.12, z);
      mat.compose(pos, q.setFromAxisAngle(ejeY, rumbo), fuera ? nada : esc);
      gente.setMatrixAt(i, mat); cabezas.setMatrixAt(i, mat);
    });
    gente.instanceMatrix.needsUpdate = true; cabezas.instanceMatrix.needsUpdate = true;
    const dia = 1 - noche * 0.8;
    for (const s of bocanadas) { const u = s.userData, k = (t * 0.12 + u.fase) % 1; s.position.set(u.origen.x + k * k * 14, u.origen.y + k * 20, u.origen.z + Math.sin(u.fase * 9) * k * 3); const tam = 2.5 + k * 11; s.scale.set(tam, tam, 1); s.material.opacity = Math.sin(k * Math.PI) * 0.4 * (0.35 + 0.65 * dia); }
    for (const s of antorchas) s.material.opacity = noche * (0.5 + 0.12 * Math.sin(t * 9 + s.userData.f) + 0.06 * Math.sin(t * 23 + s.userData.f));
    for (const b of banderas) { const p = b.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 1.4 - t * 6) * 0.16 * x); } p.needsUpdate = true; }
    if (agua) agua.material.roughness = 0.12 + 0.05 * Math.sin(t * 0.8);
  }

  return {
    escena, etiquetas, R, actualizar,
    vista: { pos: new THREE.Vector3(0, R * 1.5, R * 2.15), objetivo: new THREE.Vector3(0, 0, R * 0.1) },
    limite: R + 70,
  };
}
