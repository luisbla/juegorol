// ciudad.js — interior de una capital. Escena 3D propia, generada con semilla a partir del lugar:
// las puertas de la muralla salen de los caminos reales que llegan a la ciudad en mundo.json.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kit } from './lugares.js';
import { azarDe } from './ruido.js';
import { crearEdificios } from './edificios.js';

const { matPared, matPiedra, matTejado, matLiso, gCaja, gCil, gCono, gRoca, gDosAguas, gCasco, ESTILOS } = kit;

const PERFIL = {
  valcoria: { sede: 'Castillo real', fuera: '#5f8244', dentro: '#a39472', calle: '#c2b494', teja2: 0x7d4a36, arbol: 'hoja' },
  griselda: { sede: 'Torre del homenaje', fuera: '#dde3e9', dentro: '#8b8e95', calle: '#a9acb2', teja2: 0x444a58, arbol: 'pino' },
  solterra: { sede: 'Casa del señor', fuera: '#c6a14c', dentro: '#b39a6c', calle: '#d3c198', teja2: 0x8a5a30, arbol: 'hoja' },
  astravan: { sede: 'Casa del Consejo', fuera: '#56824c', dentro: '#a79f8e', calle: '#cdc6b6', teja2: 0x7a4a52, arbol: 'hoja' },
  liria: { sede: 'Capitanía del puerto', fuera: '#56824c', dentro: '#a79f8e', calle: '#cdc6b6', teja2: 0xa5512c, arbol: 'hoja', escala: 0.8 },
};
// Edificios singulares de cada capital, además de la plaza y la sede.
const HITOS = {
  valcoria: [['Cuartel de la guardia', 'cuartel'], ['Posada', 'posada'], ['Herrería', 'herreria'], ['Establos', 'establos'], ['Molino', 'molino']],
  griselda: [['Salón de los clanes', 'salon'], ['Patio de armas', 'patio'], ['Armería', 'herreria'], ['Santuario del hielo', 'santuario']],
  solterra: [['Molino', 'molino'], ['Lonja del grano', 'lonja'], ['Posada', 'posada'], ['Establos', 'establos']],
  astravan: [['Lonja', 'lonja'], ['Casa de cambio', 'cambio'], ['Almacenes', 'almacenes'], ['Posada', 'posada'], ['Cuartel de la guardia', 'cuartel']],
  liria: [['Lonja', 'lonja'], ['Aduana', 'cuartel'], ['Almacenes', 'almacenes'], ['Posada', 'posada'], ['Casa de cambio', 'cambio']],
};
const RUMBOS = ['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'];
const difAng = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

const sinIndice = new Map();
const plana = g => { if (!sinIndice.has(g)) sinIndice.set(g, g.index ? g.toNonIndexed() : g); return sinIndice.get(g); };

export function crearCiudad(l, mundo, { movil = false } = {}) {
  const rnd = azarDe('ciudad-' + l.id), e = ESTILOS[l.id] || (l.tipo === 'puerto' ? ESTILOS.astravan : ESTILOS.valcoria), perfil = PERFIL[l.id] || PERFIL.valcoria;
  const tam = (l.tamano || 1) * (perfil.escala || 1), R = 62 * tam + 26, L = R + 135;
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

  // frente de agua: en Astravan, el lago grande donde está en el mapa; en un puerto, el mar al sur
  let lago = null;
  const frente = l.id === 'astravan' && mundo.lagos?.length ? { ang: Math.atan2(mundo.lagos[0].y - l.y, mundo.lagos[0].x - l.x), r: 190, nombre: 'Muelles del lago' }
    : l.tipo === 'puerto' ? { ang: Math.PI / 2, nombre: 'Muelles', mar: true } : null;
  if (frente?.mar) {
    // puerto: la ciudad es una media luna abierta al mar. La orilla corta el círculo, no hay muralla por ese lado
    // y la sede (la capitanía) va junto al muelle.
    lago = { ...frente, corte: R * 0.2, r: 5000, x: 0 }; lago.z = lago.corte + lago.r;
    puertas = puertas.filter(p => Math.sin(p.ang) * R < lago.corte - 14);
    sede.x = R * 0.44; sede.z = lago.corte - rSede - 15; angSede = Math.atan2(sede.z, sede.x);
  } else if (frente) {
    lago = { ...frente, margen: 34 };
    lago.x = Math.cos(lago.ang) * (R + lago.margen + lago.r); lago.z = Math.sin(lago.ang) * (R + lago.margen + lago.r);
    if (!puertas.some(p => difAng(p.ang, lago.ang) < 0.5)) puertas.push({ ang: lago.ang, nombre: lago.nombre, principal: true, lago: true });
  }
  const enLago = (x, z, margen = 0) => lago && Math.hypot(x - lago.x, z - lago.z) < lago.r + margen;
  const enMar = (x, z, margen = 0) => !!lago?.mar && z > lago.corte - margen;

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
  // sub: un marco dentro del marco, para piezas que se repiten giradas (ventanas, puertas, carros)
  const sub = (x, z, ry, fn) => { const antes = marco; marco = antes.clone().multiply(new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z)); fn(); marco = antes; };
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

  // edificios singulares: se les busca hueco (lejos de avenidas, de la sede y entre sí) antes de repartir las casas
  const hitos = [];
  for (const [nombre, tipo] of HITOS[l.id] || []) {
    let sitio = null, nota = -1;
    for (let k = 1; k < anillos.length - 1; k++) for (let i = 0; i < 40; i++) {
      const a = i / 40 * Math.PI * 2 + k, r = anillos[k], x = Math.cos(a) * r, z = Math.sin(a) * r;
      const d = Math.min(...puertas.map(p => difAng(a, p.ang) * r - 9), Math.hypot(x - sede.x, z - sede.z) - rSede - 12, ...hitos.map(q => Math.hypot(x - q.x, z - q.z) - 26), enMar(x, z, 18) ? -99 : 30) + rnd() * 4;
      if (d > nota) { nota = d; sitio = { nombre, tipo, x, z, ang: a }; }
    }
    if (sitio && nota > 2) hitos.push(sitio);
  }
  // barrios: cada sector entre avenidas tiene su carácter (tamaño de casa, materiales, apretura) y sus calles
  // no casan con las del sector vecino, para que la ciudad no sea una diana.
  const dosPi = Math.PI * 2, norma = a => ((a % dosPi) + dosPi) % dosPi;
  let lindes = puertas.map(p => norma(p.ang)).sort((a, b) => a - b);
  if (!lindes.length) lindes = [0];
  for (let pasada = 0; pasada < 3; pasada++) {   // parte los sectores demasiado anchos
    const mas = [];
    lindes.forEach((a, i) => { const sig = i + 1 < lindes.length ? lindes[i + 1] : lindes[0] + dosPi; if (sig - a > 1.7) mas.push(norma((a + sig) / 2)); });
    lindes = [...lindes, ...mas].sort((a, b) => a - b);
  }
  const BARRIOS = {
    alto: { nombre: 'Barrio alto', w: 1.28, alto: 1.3, paredes: [matPared(e.fortaleza ? 0x777b86 : 0xd6cfbf, { piedra: true })], tejas: [matTejado(e.fortaleza ? 0x2c2f38 : 0x4a5263)], hueco: 0.16, chim: 0.75 },
    mercaderes: { nombre: 'Barrio de mercaderes', w: 1.0, alto: 1.5, paredes: [paredes[0]], tejas: [tejas[0], tejas[2]], hueco: 0.0, chim: 0.5 },
    artesanos: { nombre: 'Barrio de artesanos', w: 1.06, alto: 1.0, paredes, tejas: [tejas[2]], hueco: 0.05, chim: 0.95 },
    arrabal: { nombre: 'Arrabal', w: 0.76, alto: 0.7, paredes: [matPared(0x8a7558), matPared(0x76644c)], tejas: [matTejado(0x8a7a4a), matTejado(0x74683f)], hueco: 0.04, chim: 0.2 },
  };
  const ORDEN = ['mercaderes', 'artesanos', 'arrabal'];
  const sectores = lindes.map((a0, i) => {
    const a1 = i + 1 < lindes.length ? lindes[i + 1] : lindes[0] + dosPi;
    return { a0, a1, medio: (a0 + a1) / 2, desfase: (rnd() - 0.5) * 7, clase: null };
  });
  sectores.reduce((m, q) => (difAng(q.medio, angSede) < difAng(m.medio, angSede) ? q : m)).clase = 'alto';   // el de la sede
  let turno = 0;
  for (const q of sectores) if (!q.clase) q.clase = ORDEN[turno++ % 3];
  const sectorDe = a => { const n = norma(a); return sectores.find(q => (n >= q.a0 && n < q.a1) || (n + dosPi >= q.a0 && n + dosPi < q.a1)) || sectores[0]; };
  // una plazuela por barrio, con su pozo
  const claros = [];
  for (const q of sectores) {
    const r = R * (0.55 + rnd() * 0.15), x = Math.cos(q.medio) * r, z = Math.sin(q.medio) * r;
    if (!enSede(x, z, 14) && !enMar(x, z, 20) && !hitos.some(k => Math.hypot(x - k.x, z - k.z) < 18)) claros.push({ x, z, sector: q });
  }
  for (const r0 of anillos) {
    const n = Math.floor(2 * Math.PI * r0 / 6.7), giro = rnd() * 6.28, callejon = 5 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + giro, sc = sectorDe(a), b = BARRIOS[sc.clase];
      const r = Math.min(R - 9, r0 + sc.desfase * Math.min(1, (r0 - 20) / 30) + onda(a, r0) + (rnd() - 0.5) * 1.8), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (cercaAvenida(a, r, 6.5) || enSede(x, z) || enMar(x, z, 11) || i % callejon === 0 || rnd() < b.hueco || hitos.some(q => Math.hypot(x - q.x, z - q.z) < 17.5) || claros.some(q => Math.hypot(x - q.x, z - q.z) < 9)) continue;
      const alto = (3.0 + rnd() * 1.6 + (1 - r / R) * 1.4 + (rnd() > 0.85 ? 1.6 : 0)) * b.alto;
      casa(x, z, (4.6 + rnd() * 1.5) * b.w, (4.3 + rnd() * 1.2) * b.w, alto, b.paredes[Math.floor(rnd() * b.paredes.length)], b.tejas[Math.floor(rnd() * b.tejas.length)], -(a + Math.PI / 2) + (rnd() - 0.5) * (sc.clase === 'arrabal' ? 0.5 : 0.14), rnd() < b.chim);
      if (rnd() > 0.9 && humos.length < 14) humos.push(new THREE.Vector3(x, alto * 1.8, z));
    }
  }
  for (const c of claros) {
    cil(piedraClara, 1.5, 1.1, c.x, 0, c.z); cil(matLiso(0x1c2a30), 1.2, 0.1, c.x, 1.05, c.z);
    for (const s of [-1.3, 1.3]) caja(madera, 0.22, 2.6, 0.22, c.x + s, 1.1, c.z); caja(madera, 3.0, 0.25, 0.4, c.x, 3.6, c.z);
    if (!etiquetas.some(q => q.nombre === BARRIOS[c.sector.clase].nombre)) etiquetas.push({ nombre: BARRIOS[c.sector.clase].nombre, pos: new THREE.Vector3(c.x, 16, c.z), clase: 'barrio' });
  }

  /* ---------- muralla, torres y puertas ---------- */
  const N = Math.round(2 * Math.PI * R / 9), tramo = 2 * Math.PI * R / N;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    if (cercaAvenida(a, R, 7.5) || enMar(Math.cos(a) * R, Math.sin(a) * R, 3)) continue;
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
    } else if (l.id === 'solterra' || l.tipo === 'puerto') {
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
    const k = rSede / 22, asta = { griselda: [-9 * k, 28.5, -12 * k], solterra: [9 * k, 18.5, 3 * k], liria: [9 * k, 18.5, 3 * k] }[l.id] || [-9.5 * k, 29, -9.5 * k];
    const p = aMundo(...asta); bandera(p.x, p.y, p.z, colorRegion);
  }
  etiquetas.push({ nombre: perfil.sede, pos: new THREE.Vector3(sede.x, 34, sede.z), clase: 'ciudad' });

  /* ---------- edificios singulares ---------- */
  const despues = [], aspas = [];
  // cristales y faroles se encienden al caer la noche; las brasas siempre
  const vidrio = new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.3, emissive: 0xffc070, emissiveIntensity: 0 });
  const farolM = new THREE.MeshStandardMaterial({ color: 0x6a5a30, emissive: 0xffc060, emissiveIntensity: 0.1 });
  const brasaM = new THREE.MeshStandardMaterial({ color: 0x331008, emissive: 0xff5a14, emissiveIntensity: 2 });
  const edificio = crearEdificios({ caja, cil, cono, poner, sub, casa, torre, rnd, matLiso, matPiedra, matTejado, vidrio, farolM, brasaM,
    G: { caja: gCaja, cil: gCil, cono: gCono, roca: gRoca, dosAguas: gDosAguas }, piedra, piedraClara, colPared: e.pared, colorRegion, teja: tejas[0], teja2: tejas[2] });   // lo que necesita piezas que se crean más abajo (fuegos) o que se mueve (molino)
  for (const q of hitos) {
    const ry = -q.ang - Math.PI / 2, ejeY0 = new THREE.Vector3(0, 1, 0);
    const fuera = (x, y, z) => new THREE.Vector3(x, y, z).applyAxisAngle(ejeY0, ry).add(new THREE.Vector3(q.x, 0, q.z));   // local → escena
    let alto = 9;
    conMarco(q.x, q.z, ry, () => {
      const r = edificio(q.tipo); alto = r.alto;
      for (const [x, y, z, fuerza, color] of r.fuegos) { const p = fuera(x, y, z); despues.push(() => fuego(p.x, p.y, p.z, fuerza, color)); }
      for (const h of r.humos) humos.push(fuera(...h));
      if (r.bandera) { const p = fuera(...r.bandera); marco = null; bandera(p.x, p.y, p.z, colorRegion); }
    });
    if (q.tipo === 'molino') {   // las aspas giran: van aparte de las mallas fundidas
      const eje = new THREE.Group(), rueda = new THREE.Group(), p = fuera(0, 9.5, 3.7);
      eje.position.copy(p); eje.rotation.y = ry; eje.add(rueda);
      for (let i = 0; i < 4; i++) {
        const brazo = new THREE.Group(); brazo.rotation.z = i * Math.PI / 2; rueda.add(brazo);
        const palo = new THREE.Mesh(gCaja, matLiso(0x4a3a2a)); palo.scale.set(0.25, 8, 0.25); palo.position.y = 4; brazo.add(palo);
        const lona = new THREE.Mesh(gCaja, matLiso(0xe6dcc6)); lona.scale.set(1.9, 6, 0.08); lona.position.set(1.0, 4.6, 0); brazo.add(lona);
      }
      rueda.traverse(o => { if (o.isMesh) o.castShadow = true; });
      aspas.push(rueda); escena.add(eje);
    }
    etiquetas.push({ nombre: q.nombre, pos: new THREE.Vector3(q.x, alto + 5, q.z), clase: 'hito', suelo: new THREE.Vector3(q.x, 0, q.z), frente: new THREE.Vector3(0, 0, 1).applyAxisAngle(ejeY0, ry),
      interior: ['posada', 'herreria', 'lonja'].includes(q.tipo) || (q.tipo === 'cuartel' && q.nombre.startsWith('Cuartel')) ? q.tipo : null });
  }

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
  if (lago?.mar) {
    const c = lago.corte, ancho = Math.sqrt(R * R - c * c) - 4, sillar = matPiedra(0x8d897f, 1), casco = matLiso(0x5a3f2b), jarcia = matLiso(0x3a2c20), lona = matLiso(0xe6dcc6);
    for (const s of [-1, 1]) torre(s * (ancho + 4), c - 1, 4.2, 15, piedra, tejas[0], true);   // la muralla muere en dos torres junto al agua
    caja(sillar, ancho * 2 + 6, 2.4, 10, 0, -1.2, c + 2);                                    // muelle de piedra
    for (let x = -ancho; x <= ancho; x += 7) caja(sillar, 1.0, 0.9, 1.0, x, 1.2, c + 6.4);       // norays
    // barco: casco afilado, cubierta, castillo de popa y dos palos; con las velas dadas si está fondeado
    const barco = (x, z, eslora, ry, velas) => {
      const ax = Math.cos(ry), az = -Math.sin(ry);
      poner(gCasco, casco, x, 0.8, z, eslora * 0.13, eslora, eslora * 0.19, ry, Math.PI / 2);
      caja(madera, eslora * 0.62, 0.22, eslora * 0.2, x, eslora * 0.13 + 0.7, z, ry);
      caja(casco, eslora * 0.2, eslora * 0.09, eslora * 0.19, x - ax * eslora * 0.3, eslora * 0.13 + 0.8, z - az * eslora * 0.3, ry);
      for (const d of [-0.12, 0.2]) {
        const mx = x + ax * eslora * d, mz = z + az * eslora * d, pie = eslora * 0.13 + 0.8;
        cil(jarcia, 0.18, eslora * 0.85, mx, pie, mz); caja(jarcia, 0.22, 0.22, eslora * 0.45, mx, pie + eslora * 0.62, mz, ry);
        if (velas) caja(lona, 0.12, eslora * 0.42, eslora * 0.42, mx + ax * 0.5, pie + eslora * 0.2, mz + az * 0.5, ry);
        else caja(lona, 0.4, 0.7, eslora * 0.4, mx, pie + eslora * 0.57, mz, ry);
      }
    };
    // espigones con barcos amarrados y grúas de rueda en el muelle
    const nEsp = Math.floor((ancho * 2 - 20) / 21);
    for (let i = 0; i < nEsp; i++) {
      const x = -ancho + 16 + i * 21, largo = 30 + (i % 3) * 11;
      caja(madera, 3.0, 0.5, largo, x, 1.0, c + 7 + largo / 2);
      for (let d = 4; d < largo; d += 5) for (const s of [-1.3, 1.3]) caja(matLiso(0x4a3a2a), 0.5, 3.6, 0.5, x + s, -1.6, c + 7 + d);
      barco(x + 5.2, c + 9 + largo * 0.55, 14 + (i % 2) * 4, Math.PI / 2, false);
      if (i % 3 === 1) barco(x - 4.6, c + 8 + largo * 0.35, 9, Math.PI / 2, false);
      if (i % 2 === 0) {
        caja(matPared(0x8a6a48), 2.6, 2.4, 2.6, x - 7, 1.2, c + 1.5); cono(matTejado(0x5c3a2a), 2.1, 1.8, x - 7, 3.6, c + 1.5);
        poner(gCaja, jarcia, x - 7, 6.2, c + 4.6, 0.42, 9, 0.42, 0, 0, 0.75);
        caja(jarcia, 0.1, 4.2, 0.1, x - 7, 4.6, c + 7.7); caja(matLiso(0x8a6a48), 1.1, 1.0, 1.1, x - 7, 3.6, c + 7.7);
      }
    }
    // almacenes de cara al muelle (la plaza del mercado se abre al agua y queda libre)
    for (let x = -ancho + 8; x <= ancho - 8; x += 9.5) {
      if (Math.abs(x) < 25 || enSede(x, c - 10, 6) || hitos.some(q => Math.hypot(x - q.x, c - 10 - q.z) < 11)) continue;
      casa(x, c - 10, 6.4, 8.5, 5 + ((x | 0) % 2), matPared((x | 0) % 2 ? 0x9a7a55 : 0x8a6a48), matTejado(0x5c3a2a), Math.PI / 2, false);
    }
    // puestos de pescado y mercancía apilada en el muelle
    for (let i = 0; i < 9; i++) { const x = -18 + i * 4.5; caja(madera, 2.4, 1.0, 1.5, x, 1.2, c + 1); poner(gDosAguas, matLiso(TOLDOS[i % 5], { side: THREE.DoubleSide }), x, 3.7, c + 1, 3.0, 0.8, 2.3); for (const s of [-1.1, 1.1]) caja(madera, 0.14, 2.5, 0.14, x + s, 1.2, c + 1.6); }
    for (let i = 0; i < 40; i++) { const x = (rnd() - 0.5) * ancho * 1.8, z = c + rnd() * 4.5; if (Math.abs(x) < 21) continue; if (rnd() > 0.5) cil(matLiso(0x6a4a2e), 0.6, 1.2, x, 1.2, z); else caja(matLiso(rnd() > 0.5 ? 0x8a6a48 : 0x7a5a3a), 1.2, 0.9 + rnd(), 1.2, x, 1.2, z, rnd()); }
    // astillero al este: un casco en grada, con las cuadernas al aire
    const ax0 = ancho - 13;
    poner(gCaja, madera, ax0, 0.9, c + 16, 6.5, 0.5, 26, 0, 0, 0.06);
    caja(casco, 0.6, 0.6, 22, ax0, 1.6, c + 15);
    for (let i = 0; i < 11; i++) for (const s of [-1, 1]) poner(gCaja, casco, ax0 + s * 1.9, 3.3, c + 5 + i * 2, 0.3, 4.2, 0.3, 0, -s * 0.38);
    etiquetas.push({ nombre: 'Astillero', pos: new THREE.Vector3(ax0, 12, c + 12), clase: 'hito' });
    etiquetas.push({ nombre: 'Muelles', pos: new THREE.Vector3(-ancho * 0.45, 13, c + 16), clase: 'ciudad' });
    // dos rompeolas de escollera cierran la dársena; en cada punta, una baliza
    const roquedo = matPiedra(0x77736c, 1);
    for (const s of [-1, 1]) {
      let bx = 0, bz = 0;
      for (let i = 0; i <= 26; i++) { const t = i / 26; bx = s * (ancho + 9 - t * t * ancho * 0.62); bz = c + 5 + t * 104; poner(gRoca, roquedo, bx + (rnd() - 0.5) * 2, 0.8 + rnd() * 0.8, bz + (rnd() - 0.5) * 2, 3.4 + rnd() * 1.6, 2.4 + rnd(), 3.4 + rnd() * 1.6, rnd() * 6, rnd()); }
      cil(piedraClara, 1.5, 7.5, bx, 2.2, bz); cono(matLiso(0xa3382c), 1.8, 1.8, bx, 9.7, bz);
      despues.push(() => fuego(bx, 9.2, bz, 20, s > 0 ? 0x7dffb0 : 0xff6a5a));   // verde y roja, como entrada de puerto
    }
    // barcos fondeados en la bahía, con las velas dadas
    barco(-34, c + 86, 19, 0.5, true); barco(30, c + 122, 22, -0.7, true); barco(66, c + 74, 16, 2.4, true);
    // el Faro de Astravan, en su peñón frente al puerto
    const fx = ancho * 0.72, fz = c + 158;
    for (let i = 0; i < 14; i++) poner(gRoca, roquedo, fx + (rnd() - 0.5) * 16, 0.6 + rnd() * 2, fz + (rnd() - 0.5) * 16, 4 + rnd() * 4, 3 + rnd() * 2.4, 4 + rnd() * 4, rnd() * 6, rnd());
    poner(gCil, matPiedra(0xece8df, 1), fx, 13, fz, 2.3, 20, 2.3); cil(matLiso(0xa3382c), 2.45, 3, fx, 10, fz); cil(matLiso(0x3a3a3f), 2.9, 0.5, fx, 23, fz); cono(matLiso(0xa3382c), 2.2, 2.4, fx, 25.6, fz);
    cil(matLiso(0xfff1b0, { emissive: 0xffd76a, emissiveIntensity: 1.6 }), 1.4, 2.2, fx, 23.5, fz);
    despues.push(() => fuego(fx, 24.5, fz, 60));
    etiquetas.push({ nombre: 'Faro de Astravan', pos: new THREE.Vector3(fx, 32, fz), clase: 'hito' });
  } else if (lago) {
    const p = puertas.find(q => q.lago) || puertas.reduce((m, q) => difAng(q.ang, lago.ang) < difAng(m.ang, lago.ang) ? q : m);
    const ux = Math.cos(lago.ang), uz = Math.sin(lago.ang), tx = -uz, tz = ux, orilla = R + lago.margen;
    for (const s of (lago.mar ? [-58, -40, -22, -4, 14, 32, 50] : [-28, -12, 6, 22])) {   // espigones con barcos amarrados
      const largo = 26 + Math.abs(s) * 0.4, bx = ux * (orilla + largo / 2 - 4) + tx * s, bz = uz * (orilla + largo / 2 - 4) + tz * s;
      caja(madera, largo, 0.5, 2.6, bx, 1.0, bz, -lago.ang);
      for (let d = 2; d < largo; d += 5) caja(matLiso(0x4a3a2a), 0.5, 3.4, 0.5, ux * (orilla + d - 4) + tx * (s + 1.2), -1.4, uz * (orilla + d - 4) + tz * (s + 1.2));
      // barco amarrado: casco afilado, cubierta y dos palos con la vela recogida
      const bx2 = ux * (orilla + largo * 0.68) + tx * (s - 3.6), bz2 = uz * (orilla + largo * 0.68) + tz * (s - 3.6), eslora = lago.mar ? 13 : 9, jarcia = matLiso(0x3a2c20);
      poner(gCasco, matLiso(0x5a3f2b), bx2, 0.7, bz2, 1.7, eslora, 2.3, -lago.ang, Math.PI / 2);
      caja(madera, eslora * 0.62, 0.2, 2.6, bx2, 1.75, bz2, -lago.ang);
      for (const d of [-0.2, 0.16]) { const mx = bx2 + ux * eslora * d, mz = bz2 + uz * eslora * d; cil(jarcia, 0.16, eslora * 0.8, mx, 1.8, mz); caja(jarcia, 0.2, 0.2, eslora * 0.42, mx, 1.8 + eslora * 0.6, mz, -lago.ang); caja(matLiso(0xe6dcc6), 0.34, 0.6, eslora * 0.38, mx, 1.8 + eslora * 0.56, mz, -lago.ang); }
    }
    for (let i = 0; i < (lago.mar ? 11 : 7); i++) { const s = (lago.mar ? -58 : -36) + i * 11; casa(ux * (orilla - 9) + tx * s, uz * (orilla - 9) + tz * s, 8, 5.5, 4.5 + (i % 2), matPared(i % 2 ? 0x9a7a55 : 0x8a6a48), matTejado(0x5c3a2a), -lago.ang + Math.PI / 2, false); }
    if (!p.lago) etiquetas.push({ nombre: lago.nombre, pos: new THREE.Vector3(ux * (orilla + 6), 12, uz * (orilla + 6)), clase: 'ciudad' });
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
    if (!cercaAvenida(a, r, 5) && !enSede(x, z, 2) && anillos.every(q => Math.abs(q - r) > 4.5) && !hitos.some(q => Math.hypot(x - q.x, z - q.z) < 17)) arbol(x, z, 0.7 + rnd() * 0.4);
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
    for (const r0 of anillos) for (const q of sectores) {   // cada barrio dibuja sus propios arcos de calle
      x.lineWidth = (q.clase === 'arrabal' ? 3.6 : 5.2) * k; x.beginPath();
      const d = q.desfase * Math.min(1, (r0 - 20) / 30);
      for (let i = 0; i <= 40; i++) { const a = q.a0 + (q.a1 - q.a0) * i / 40, r = Math.min(R - 4, r0 + paso / 2 + d + onda(a, r0 + paso / 2)); x.lineTo(px(Math.cos(a) * r), px(Math.sin(a) * r)); }
      x.stroke();
    }
    x.fillStyle = perfil.calle; for (const q of hitos) { x.beginPath(); x.arc(px(q.x), px(q.z), 14.5 * k, 0, 6.283); x.fill(); }   // plazuela delante de cada edificio singular
    for (const c of claros) { x.beginPath(); x.arc(px(c.x), px(c.z), 8.5 * k, 0, 6.283); x.fill(); }
    x.lineWidth = 2.6 * k;   // callejones entre anillos
    for (let i = 0; i < 46 * tam; i++) { const a = rnd() * 6.283, r = 24 + rnd() * (R - 36); x.beginPath(); x.moveTo(px(Math.cos(a) * r), px(Math.sin(a) * r)); x.lineTo(px(Math.cos(a) * (r + paso)), px(Math.sin(a) * (r + paso))); x.stroke(); }
    for (const p of puertas) { x.lineWidth = 8.5 * k; x.beginPath(); x.moveTo(px(0), px(0)); x.lineTo(px(Math.cos(p.ang) * (R + 2)), px(Math.sin(p.ang) * (R + 2))); x.stroke(); }
    x.fillStyle = perfil.calle; x.beginPath(); x.arc(px(0), px(0), 21 * k, 0, 6.283); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.12)'; x.lineWidth = 1.2; for (let r = 4; r < 21; r += 2.4) { x.beginPath(); x.arc(px(0), px(0), r * k, 0, 6.283); x.stroke(); }   // empedrado
    x.fillStyle = perfil.calle; x.beginPath(); x.arc(px(sede.x), px(sede.z), (rSede + 1) * k, 0, 6.283); x.fill();
    if (lago?.mar) {   // el mar se come la media luna sur; delante, la franja del muelle
      x.fillStyle = '#2a5d78'; x.fillRect(0, px(lago.corte + 6), T, T);
      x.fillStyle = '#a9a295'; x.fillRect(px(-R), px(lago.corte - 4), 2 * R * k, 10.5 * k);
    }
    for (let i = 0; i < 9000; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * R, s = 1 + rnd() * 5; x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${rnd() * 0.08})` : `rgba(0,0,0,${rnd() * 0.1})`; x.fillRect(px(Math.cos(a) * r), px(Math.sin(a) * r), s, s); }
  }
  const texSuelo = new THREE.CanvasTexture(lienzo); texSuelo.colorSpace = THREE.SRGBColorSpace; texSuelo.anisotropy = 8;
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(2 * L, 2 * L), new THREE.MeshStandardMaterial({ map: texSuelo, roughness: 1 }));
  suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; escena.add(suelo);
  let agua = null;
  if (lago) {
    agua = new THREE.Mesh(lago.mar ? new THREE.PlaneGeometry(2 * L, L - lago.corte - 6) : new THREE.CircleGeometry(lago.r, 128), new THREE.MeshStandardMaterial({ color: 0x236a8e, roughness: 0.2, metalness: 0.25, transparent: true, opacity: 0.92 }));
    agua.rotation.x = -Math.PI / 2; escena.add(agua);
    if (lago.mar) agua.position.set(0, 0.3, (L + lago.corte + 6) / 2); else agua.position.set(lago.x, 0.25, lago.z);
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
  const fuego = (x, y, z, t, color = 0xffb45e) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blanda, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color, opacity: 0, fog: false })); s.position.set(x, y, z); s.scale.set(t, t, 1); s.userData.f = rnd() * 6; antorchas.push(s); escena.add(s); };
  for (const p of puertas) fuego(Math.cos(p.ang) * (R - 4), 6, Math.sin(p.ang) * (R - 4), 26);
  for (let i = 0; i < 6; i++) fuego(Math.cos(i * 1.05) * 15, 4, Math.sin(i * 1.05) * 15, 22);
  fuego(sede.x, 8, sede.z, 46);
  for (const f of despues) f();

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
      let fuera = noche > 0.6 && i % 4 !== 0, x, z, rumbo;
      if (a.tipo === 'avenida') { const s = Math.sin(t * a.v + a.f), r = 22 + (s * 0.5 + 0.5) * (R - 28); x = Math.cos(a.ang) * r - Math.sin(a.ang) * a.lado; z = Math.sin(a.ang) * r + Math.cos(a.ang) * a.lado; rumbo = -a.ang + (Math.cos(t * a.v + a.f) > 0 ? 0 : Math.PI); }
      else { const ang = a.f + t * a.v / a.r, r = a.r + (a.r > 22 ? onda(ang, a.r) + sectorDe(ang).desfase * Math.min(1, (a.r - 20) / 30) : 0); x = Math.cos(ang) * r; z = Math.sin(ang) * r; rumbo = -ang - Math.PI / 2 * Math.sign(a.v); }
      if (enMar(x, z, 2)) fuera = true;
      pos.set(x, 0.95 + Math.abs(Math.sin(t * 7 + a.f)) * 0.12, z);
      mat.compose(pos, q.setFromAxisAngle(ejeY, rumbo), fuera ? nada : esc);
      gente.setMatrixAt(i, mat); cabezas.setMatrixAt(i, mat);
    });
    gente.instanceMatrix.needsUpdate = true; cabezas.instanceMatrix.needsUpdate = true;
    const dia = 1 - noche * 0.8;
    for (const s of bocanadas) { const u = s.userData, k = (t * 0.12 + u.fase) % 1; s.position.set(u.origen.x + k * k * 14, u.origen.y + k * 20, u.origen.z + Math.sin(u.fase * 9) * k * 3); const tam = 2.5 + k * 11; s.scale.set(tam, tam, 1); s.material.opacity = Math.sin(k * Math.PI) * 0.4 * (0.35 + 0.65 * dia); }
    for (const s of antorchas) s.material.opacity = noche * (0.5 + 0.12 * Math.sin(t * 9 + s.userData.f) + 0.06 * Math.sin(t * 23 + s.userData.f));
    for (const b of banderas) { const p = b.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 1.4 - t * 6) * 0.16 * x); } p.needsUpdate = true; }
    for (const a of aspas) a.rotation.z = t * 0.7;
    vidrio.emissiveIntensity = noche * 0.9; farolM.emissiveIntensity = 0.1 + noche * 2.4; brasaM.emissiveIntensity = 1.8 + 0.4 * Math.sin(t * 2.3);
    if (agua) agua.material.roughness = 0.12 + 0.05 * Math.sin(t * 0.8);
  }

  return {
    escena, etiquetas, R, actualizar,
    vista: { pos: new THREE.Vector3(0, R * 1.35, R * (lago?.mar ? 3.1 : 2.15)), objetivo: new THREE.Vector3(0, 0, R * (lago?.mar ? 0.45 : 0.1)) },
    limite: R + 70,
  };
}
