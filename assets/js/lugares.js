// lugares.js — un modelo por tipo de lugar. Sin ficheros de modelos: geometría propia y texturas pintadas en canvas
// (sillares, tejas, entramado y ventanas que se encienden de noche).
import * as THREE from 'three';
import { azarDe } from './ruido.js';
import { radioDe } from './terreno.js';

const ESCALA = 1.5;

/* ---------- texturas ---------- */
function lienzo(w, h, pintar) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  pintar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}
const css = n => '#' + n.toString(16).padStart(6, '0');
function motear(x, w, h, rnd, fuerza = 0.1, n = 700) {
  for (let i = 0; i < n; i++) {
    x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${rnd() * fuerza})` : `rgba(0,0,0,${rnd() * fuerza})`;
    x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
  }
}
const VENTANAS = [[0.14, 0.52], [0.43, 0.52], [0.72, 0.52]];   // posición de los huecos en cada cara (u, v)

const cache = new Map();
const unaVez = (clave, crear) => { if (!cache.has(clave)) cache.set(clave, crear()); return cache.get(clave); };
const ventanas = [];   // materiales cuyas ventanas se iluminan de noche

// Pared de casa: enlucido o madera, con entramado opcional y tres ventanas por cara.
function matPared(color, { entramado = false, piedra = false } = {}) {
  return unaVez(`pared${color}${entramado}${piedra}`, () => {
    const rnd = azarDe('pared' + color);
    const map = lienzo(128, 128, (x, w, h) => {
      x.fillStyle = css(color); x.fillRect(0, 0, w, h);
      if (piedra) {
        x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 1.5;
        for (let f = 0; f < 8; f++) { const y = f * 16; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); for (let c = 0; c < 5; c++) { const px = c * 28 + (f % 2) * 14; x.beginPath(); x.moveTo(px, y); x.lineTo(px, y + 16); x.stroke(); } }
      }
      motear(x, w, h, rnd, 0.12);
      if (entramado) {
        x.fillStyle = '#4a3524';
        x.fillRect(0, 0, w, 7); x.fillRect(0, h - 7, w, 7); x.fillRect(0, 0, 6, h); x.fillRect(w - 6, 0, 6, h); x.fillRect(w / 2 - 3, 0, 6, h);
      }
      for (const [u, v] of VENTANAS) {
        x.fillStyle = '#2b2118'; x.fillRect(u * w - 2, v * h - 2, 22, 30);
        x.fillStyle = '#1a1d24'; x.fillRect(u * w, v * h, 18, 26);
        x.fillStyle = '#2b2118'; x.fillRect(u * w + 8, v * h, 2, 26);
      }
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.28)');   // mugre junto al suelo
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    });
    const emissiveMap = lienzo(128, 128, (x, w, h) => {
      x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
      VENTANAS.forEach(([u, v], i) => { if (i !== 1 || rnd() > 0.3) { x.fillStyle = i % 2 ? '#ffb858' : '#ffd58a'; x.fillRect(u * w, v * h, 18, 26); x.fillStyle = '#000'; x.fillRect(u * w + 8, v * h, 2, 26); } });
    });
    const m = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.92 });
    ventanas.push(m);
    return m;
  });
}
// Sillería para murallas, torres y ruinas.
function matPiedra(color, repetir = 2) {
  return unaVez(`piedra${color}${repetir}`, () => {
    const rnd = azarDe('piedra' + color);
    const map = lienzo(128, 128, (x, w, h) => {
      x.fillStyle = css(color); x.fillRect(0, 0, w, h);
      for (let f = 0; f < 8; f++) for (let c = 0; c < 5; c++) {
        const t = rnd();
        x.fillStyle = t > 0.5 ? `rgba(255,255,255,${(t - 0.5) * 0.22})` : `rgba(0,0,0,${(0.5 - t) * 0.3})`;
        x.fillRect(c * 28 + (f % 2) * 14 - 14, f * 16, 27, 15);
      }
      motear(x, w, h, rnd, 0.14, 900);
    });
    map.repeat.set(repetir, repetir);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
  });
}
// Tejado: hiladas de teja, pizarra o paja.
function matTejado(color) {
  return unaVez('teja' + color, () => {
    const rnd = azarDe('teja' + color);
    const map = lienzo(64, 64, (x, w, h) => {
      x.fillStyle = css(color); x.fillRect(0, 0, w, h);
      for (let f = 0; f < 8; f++) {
        for (let c = 0; c < 8; c++) { const t = rnd(); x.fillStyle = t > 0.5 ? `rgba(255,255,255,${(t - 0.5) * 0.25})` : `rgba(0,0,0,${(0.5 - t) * 0.35})`; x.fillRect(c * 8 + (f % 2) * 4 - 4, f * 8, 7, 7); }
        x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(0, f * 8 + 7, w, 1);
      }
    });
    map.repeat.set(2, 2);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.85, side: THREE.DoubleSide });
  });
}
const matLiso = (color, extra = {}) => unaVez('liso' + color + JSON.stringify(extra), () => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra }));

/* ---------- geometría ---------- */
const gCaja = new THREE.BoxGeometry(1, 1, 1);
const gCil = new THREE.CylinderGeometry(1, 1, 1, 14);
const gCono = new THREE.ConeGeometry(1, 1, 14);
const gRoca = new THREE.DodecahedronGeometry(1, 0);
// Casco de barco: cilindro afilado en proa y popa (eje Y = eslora).
const gCasco = (() => {
  const g = new THREE.CylinderGeometry(1, 0.62, 1, 12, 8), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = 1 - Math.pow(Math.abs(p.getY(i)) * 2, 2.4) * 0.88; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
  g.computeVertexNormals(); return g;
})();
// Tejado a dos aguas: prisma con la cumbrera a lo largo de X. Base 1×1, alto 1.
const gDosAguas = (() => {
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [-0.5, 1, 0], F = [0.5, 1, 0];
  const caras = [[D, C, F, [0, 0], [1, 0], [1, 1]], [D, F, E, [0, 0], [1, 1], [0, 1]], [B, A, E, [0, 0], [1, 0], [1, 1]], [B, E, F, [0, 0], [1, 1], [0, 1]],
    [A, D, E, [0, 0], [1, 0], [0.5, 1]], [C, B, F, [0, 0], [1, 0], [0.5, 1]]];
  const p = [], uv = [];
  for (const [a, b, c, ua, ub, uc] of caras) { p.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
})();

function pieza(g, geo, material, w, h, d, x, y, z, ry = 0) {
  const m = new THREE.Mesh(geo, material);
  m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m;
}
const caja = (g, w, h, d, x, y, z, material, ry = 0) => pieza(g, gCaja, material, w, h, d, x, y + h / 2, z, ry);
const cil = (g, r, h, x, y, z, material) => pieza(g, gCil, material, r, h, r, x, y + h / 2, z);
const cono = (g, r, h, x, y, z, material) => pieza(g, gCono, material, r, h, r, x, y + h / 2, z);
const roca = (g, r, x, y, z, material, rnd) => { const m = pieza(g, gRoca, material, r, r * (0.6 + rnd() * 0.5), r * (0.8 + rnd() * 0.5), x, y, z, rnd() * 6); m.rotation.z = rnd(); return m; };

function casa(g, x, z, w, d, alto, pared, teja, ry = 0, chimenea = false) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  caja(c, w, alto, d, 0, 0, 0, pared);
  pieza(c, gDosAguas, teja, w * 1.14, alto * 0.72, d * 1.22, 0, alto, 0);
  if (chimenea) caja(c, 0.34, alto * 0.75, 0.34, w * 0.26, alto * 0.95, d * 0.12, matPiedra(0x7d7468, 1));
  return c;
}
function torreon(g, x, z, r, alto, piedra, teja, almenas = false) {
  cil(g, r, alto, x, 0, z, piedra);
  if (almenas) {
    cil(g, r * 1.14, 0.5, x, alto, z, piedra);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; caja(g, r * 0.42, 0.55, r * 0.3, x + Math.cos(a) * r * 1.05, alto + 0.5, z + Math.sin(a) * r * 1.05, piedra, -a + Math.PI / 2); }
  } else cono(g, r * 1.28, r * 2.3, x, alto, z, teja);
}
function bandera(g, x, y, z, color, lista) {
  caja(g, 0.1, 2.6, 0.1, x, y, z, matLiso(0x3a2c20));
  const geo = new THREE.PlaneGeometry(2.1, 1.1, 8, 1); geo.translate(1.05, 0, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 }));
  m.position.set(x, y + 2.0, z); g.add(m); lista.push(m);
}

const ESTILOS = {
  valcoria: { pared: 0xcfc0a0, teja: 0x9a4530, muro: 0x8f8676, casas: 20, entramado: true },
  griselda: { pared: 0x6c7180, teja: 0x30343f, muro: 0x565b67, casas: 9, fortaleza: true },
  solterra: { pared: 0xdcc48e, teja: 0xb5652a, muro: 0xa8946a, casas: 14 },
  astravan: { pared: 0xd8d0c0, teja: 0x4b3f7a, muro: 0x8a8fa0, casas: 18 },
};

const CONSTRUCTORES = {
  capital(g, l, rnd, ctx) {
    const e = ESTILOS[l.id] || ESTILOS.valcoria, R = 9.5;
    const piedra = matPiedra(e.muro), pared = matPared(e.pared, { entramado: e.entramado, piedra: e.fortaleza }), teja = matTejado(e.teja), castillo = matPared(e.fortaleza ? 0x5d626e : e.muro, { piedra: true });
    // muralla en lienzos con almenas, y una puerta al sur entre dos torres
    const N = 22, largo = 2 * Math.PI * R / N;
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2;
      if (Math.abs(a - Math.PI / 2) < 0.2) continue;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      caja(g, largo * 1.06, 2.3, 0.7, x, 0, z, piedra, -a + Math.PI / 2);
      for (const s of [-0.3, 0.3]) caja(g, largo * 0.24, 0.42, 0.72, x + Math.cos(a + Math.PI / 2) * largo * s, 2.3, z + Math.sin(a + Math.PI / 2) * largo * s, piedra, -a + Math.PI / 2);
    }
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.25; torreon(g, Math.cos(a) * R, Math.sin(a) * R, 1.0, 3.5, piedra, teja, i % 2 === 0); }
    for (const s of [-1, 1]) torreon(g, s * 1.75, R - 0.2, 0.85, 3.9, piedra, teja, true);
    caja(g, 2.6, 2.9, 0.9, 0, 0, R - 0.2, piedra); caja(g, 1.1, 1.7, 1.0, 0, 0, R - 0.18, matLiso(0x2a2018));
    // castillo
    const alto = e.fortaleza ? 6.6 : 4.4;
    caja(g, 4.6, alto, 4.0, 0, 0, -1.2, castillo);
    if (e.fortaleza) { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; caja(g, 0.7, 0.6, 0.5, Math.cos(a) * 2.3, alto, -1.2 + Math.sin(a) * 2.0, piedra, -a); } }
    else pieza(g, gDosAguas, teja, 5.2, 2.6, 4.8, 0, alto, -1.2);
    torreon(g, -2.5, -3.2, 1.0, e.fortaleza ? 9.4 : 7.4, piedra, teja, e.fortaleza);
    torreon(g, 2.5, -3.2, 0.85, e.fortaleza ? 7.8 : 6.0, piedra, teja, e.fortaleza);
    torreon(g, 2.5, 0.8, 0.7, 5.2, piedra, teja, e.fortaleza);
    if (e.fortaleza) torreon(g, -2.4, 0.8, 1.15, 8.4, piedra, teja, true);
    bandera(g, -2.5, (e.fortaleza ? 9.9 : 9.7), -3.2, ctx.colorRegion, ctx.banderas);
    // casas en calles concéntricas, mirando al centro
    let puestas = 0;
    for (let intento = 0; intento < 90 && puestas < e.casas; intento++) {
      const a = rnd() * Math.PI * 2, d = 4.2 + rnd() * 4.0, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < 3.9 && z < 2.6 && z > -5.2) continue;
      if (Math.abs(x) < 1.3 && z > 0) continue;   // calle de la puerta
      casa(g, x, z, 1.5 + rnd() * 0.7, 1.2 + rnd() * 0.4, 1.15 + rnd() * 0.7, pared, teja, -a + (rnd() - 0.5) * 0.5, rnd() > 0.5);
      puestas++;
    }
    return { humos: [[3.2, 3.4, 4.2], [-4.2, 3.2, 3.2], [4.5, 3.0, -1.5]], luz: 1.0, alto: e.fortaleza ? 11 : 10 };
  },
  pueblo(g, l, rnd) {
    const pared = matPared(0xd2c4a4, { entramado: true }), teja = matTejado(l.region === 'astravan' ? 0x56508a : 0xa5512c);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 + rnd(), d = 2.6 + rnd() * 2.6;
      casa(g, Math.cos(a) * d, Math.sin(a) * d, 1.6 + rnd() * 0.6, 1.3 + rnd() * 0.4, 1.2 + rnd() * 0.4, pared, teja, -a + 0.3, i % 2 === 0);
    }
    // ermita con espadaña
    casa(g, 0, 0, 1.5, 2.2, 1.7, matPared(0xdad2c0, { piedra: true }), teja, Math.PI / 2);
    caja(g, 0.9, 3.6, 0.9, 0, 0, -1.2, matPiedra(0xbdb4a2, 1)); cono(g, 0.8, 1.3, 0, 3.6, -1.2, teja);
    // pozo
    cil(g, 0.5, 0.5, 2.0, 0, 1.6, matPiedra(0x8d8676, 1));
    return { humos: [[2.4, 2.8, 1.4], [-2.6, 2.6, -1.0]], luz: 0.6, alto: 6 };
  },
  posta(g, l) {
    const nieve = l.region === 'thraengarde', teja = matTejado(nieve ? 0xe4eaf0 : 0x6b4a32), piedra = matPiedra(0x8d8372, 1);
    caja(g, 2.0, 4.8, 2.0, 0, 0, 0, piedra);
    caja(g, 2.7, 0.35, 2.7, 0, 4.8, 0, matLiso(0x5a4633));
    for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) caja(g, 0.18, 1.3, 0.18, x, 5.15, z, matLiso(0x5a4633));
    pieza(g, gCono, teja, 1.95, 1.6, 1.95, 0, 7.25, 0);
    casa(g, 2.9, 0.6, 2.2, 1.6, 1.2, matPared(0xbcab8b, { entramado: true }), teja, 0.2, true);
    caja(g, 2.6, 0.12, 1.6, -2.6, 0.7, 0.8, matLiso(0x6a5039)); for (const x of [-3.7, -1.5]) caja(g, 0.14, 0.7, 0.14, x, 0, 0.8, matLiso(0x4a3a2a));   // abrevadero
    return { humos: [[3.3, 2.6, 0.7]], luz: 0.4, alto: 8.5 };
  },
  quemado(g, l, rnd) {
    const carbon = matPiedra(0x24201d, 1), viga = matLiso(0x120f0d);
    caja(g, 2.0, 2.6, 2.0, 0, 0, 0, carbon);
    caja(g, 0.5, 1.6, 2.0, -0.75, 2.6, 0, carbon); caja(g, 2.0, 0.9, 0.5, 0, 2.6, -0.75, carbon);   // muros a medio caer
    const v1 = caja(g, 0.26, 3.4, 0.26, 0.8, 1.6, 0.5, viga); v1.rotation.z = 0.55;
    const v2 = caja(g, 0.26, 2.6, 0.26, -0.3, 2.4, -0.3, viga); v2.rotation.x = -0.5;
    const v3 = caja(g, 3.2, 0.22, 0.22, 1.6, 0.1, 1.2, viga, 0.4);
    for (let i = 0; i < 7; i++) roca(g, 0.3 + rnd() * 0.4, (rnd() - 0.5) * 6, 0.15, (rnd() - 0.5) * 6, carbon, rnd);
    return { humos: [[0, 3.2, 0]], humoOscuro: true, luz: 0, alto: 5 };
  },
  campamento(g, l, rnd) {
    const lona = new THREE.MeshStandardMaterial({ color: 0x9a8a68, roughness: 1, side: THREE.DoubleSide });
    for (const [x, z, s, ry, caida] of [[-1.9, 0.4, 1, 0.3, 0], [1.7, -0.6, 0.9, 1.9, 0.5], [0.4, 2.3, 0.75, 1.0, 0]]) {
      const t = pieza(g, gDosAguas, lona, 2.6 * s, 1.5 * s, 2.0 * s, x, 0, z, ry);
      t.rotation.z = caida;   // una tienda vencida
    }
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; roca(g, 0.2, Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7 - 0.4, matLiso(0x55504a), rnd); }
    caja(g, 0.9, 0.12, 0.12, 0, 0.12, -0.4, matLiso(0x1a1512), 0.6);
    caja(g, 0.12, 2.3, 0.12, -3.3, 0, -1.4, matLiso(0x4a3a2a)); caja(g, 1.3, 0.5, 0.9, 3.2, 0, 1.8, matLiso(0x6a5039), 0.4);   // poste y un arcón
    return { humos: [], luz: 0, alto: 3 };
  },
  granja(g, l, rnd) {
    const teja = matTejado(0x9a5a30);
    casa(g, -2.2, 0, 2.3, 1.8, 1.4, matPared(0xd8c8a2, { entramado: true }), teja, 0.1, true);
    casa(g, 2.0, -0.6, 3.6, 2.4, 2.1, matPared(0x8c4a35), matTejado(0x5c3a2a), -0.1);   // granero
    cil(g, 0.85, 3.6, 5.0, 0, 0.6, matPiedra(0xb9ab8c, 1)); cono(g, 1.0, 1.2, 5.0, 3.6, 0.6, teja);   // silo
    for (let i = 0; i < 5; i++) { const m = cil(g, 0.7, 0.9, -1 + i * 1.5, 0, 3.4, matLiso(0xd2aa4e)); m.rotation.z = Math.PI / 2; m.position.y = 0.7; }   // pacas
    const palo = matLiso(0x6a5039);   // cercado
    for (let i = 0; i < 9; i++) { const x = -5 + i * 1.3; caja(g, 0.12, 0.8, 0.12, x, 0, -3.4, palo); if (i < 8) caja(g, 1.3, 0.08, 0.08, x + 0.65, 0.55, -3.4, palo); }
    return { humos: [[-1.7, 2.7, 0.2]], luz: 0.4, alto: 5.5 };
  },
  taberna(g) {
    const pared = matPared(0xd0bd98, { entramado: true }), teja = matTejado(0x7a3f28);
    caja(g, 4.0, 1.5, 2.8, 0, 0, 0, matPiedra(0x9a9080, 1));
    caja(g, 4.3, 1.5, 3.1, 0, 1.5, 0, pared);   // planta alta en voladizo
    pieza(g, gDosAguas, teja, 4.9, 2.2, 3.7, 0, 3.0, 0);
    caja(g, 0.6, 2.4, 0.6, 1.3, 3.0, 0.3, matPiedra(0x7d7468, 1));
    casa(g, -3.4, 1.0, 2.0, 1.6, 1.1, matPared(0x8a6a48), matTejado(0x5c3a2a), 0.3);   // cuadra
    caja(g, 0.14, 2.4, 0.14, 2.9, 0, 2.1, matLiso(0x4a3a2a)); caja(g, 1.1, 0.7, 0.1, 2.9, 1.7, 2.1, matLiso(0xb5652a));   // cartel
    for (let i = 0; i < 3; i++) { const b = cil(g, 0.35, 0.7, 1.4 + i * 0.8, 0, 2.0, matLiso(0x6a4a2e)); b.scale.x = b.scale.z = 0.35; }   // barriles
    return { humos: [[1.3, 5.6, 0.3]], luz: 0.8, alto: 6.5 };
  },
  cabana(g, l, rnd) {
    const troncos = matPared(0x5a4634), nieve = matTejado(0xe4eaf0);
    casa(g, 0, 0, 2.2, 1.7, 1.25, troncos, nieve, 0.2, true);
    for (let i = 0; i < 4; i++) { const m = cil(g, 0.16, 0.9, -1.9, 0, -0.3 + i * 0.05, matLiso(0x6a5039)); m.rotation.z = Math.PI / 2; m.position.y = 0.16 + (i > 1 ? 0.3 : 0); m.position.z += (i % 2) * 0.34; }   // leña
    roca(g, 0.6, 1.9, 0.25, 0.9, matPiedra(0x8a8e96, 1), rnd);
    return { humos: [[0.7, 2.6, 0.3]], luz: 0.35, alto: 4 };
  },
  faro(g, l, rnd) {
    const blanco = matPiedra(0xece8df, 1), rojo = matLiso(0xa3382c), roquedo = matPiedra(0x77736c, 1);
    for (let i = 0; i < 9; i++) roca(g, 1.0 + rnd() * 1.2, (rnd() - 0.5) * 7, -0.2, (rnd() - 0.5) * 7, roquedo, rnd);
    cil(g, 1.7, 0.9, 0, 0, 0, roquedo);
    const fuste = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.3, 9.5, 16), blanco); fuste.position.y = 0.9 + 4.75; g.add(fuste);
    const franja = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.14, 1.5, 16), rojo); franja.position.y = 4.4; g.add(franja);
    cil(g, 1.25, 0.25, 0, 10.4, 0, matLiso(0x3a3a3f));
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; caja(g, 0.06, 0.6, 0.06, Math.cos(a) * 1.18, 10.65, Math.sin(a) * 1.18, matLiso(0x3a3a3f)); }   // barandilla
    const linterna = new THREE.Mesh(gCil, new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffd76a, emissiveIntensity: 1.8 }));
    linterna.scale.set(0.62, 1.1, 0.62); linterna.position.y = 11.2; g.add(linterna);
    cono(g, 0.95, 1.0, 0, 11.75, 0, rojo);
    casa(g, 2.7, 0.9, 1.9, 1.5, 1.2, matPared(0xece8df), matTejado(0xa3382c), 0.2, true);   // casa del farero
    return { humos: [], luz: 0.5, alto: 13.5, faro: 11.2 };
  },
  puerto(g, l, rnd, ctx) {
    const pared = matPared(0xd8d0c0, { entramado: true }), teja = matTejado(0x4b3f7a), rojiza = matTejado(0xa5512c), piedra = matPiedra(0x8a8fa0), madera = matLiso(0x6b5440);
    // caserío en tres calles paralelas a la costa; las casas del frente, más altas
    for (let f = 0; f < 3; f++) for (let i = 0; i < 10; i++) {
      casa(g, -10.8 + i * 2.4 + rnd() * 0.5 + (f % 2), -3.4 - f * 2.7 - rnd() * 0.5, 1.7 + rnd() * 0.5, 1.5, 1.3 + rnd() * 0.9 + (f === 0 ? 0.6 : 0), pared, (i + f) % 3 ? teja : rojiza, (rnd() - 0.5) * 0.3, rnd() > 0.5);
    }
    // lonja con soportales
    casa(g, -5.0, 0.0, 7.4, 2.6, 2.4, matPared(0xcbbf9f, { piedra: true }), teja, 0);
    for (let i = 0; i < 9; i++) cil(g, 0.16, 1.7, -8.4 + i * 0.85, 0, 1.75, piedra);
    caja(g, 7.6, 0.22, 1.1, -5.0, 1.7, 1.8, madera);
    // almacenes en hilera, de hastial al muelle
    for (let i = 0; i < 4; i++) casa(g, 1.6 + i * 2.8, -0.1, 2.6, 2.4, 1.9 + (i % 2) * 0.5, matPared(i % 2 ? 0x9a7a55 : 0x8a6a48), matTejado(0x5c3a2a), Math.PI / 2);
    // aduana y torre de la cadena
    torreon(g, -11.6, 0.4, 1.2, 6.4, piedra, teja, true); bandera(g, -11.6, 7.4, 0.4, ctx.colorRegion, ctx.banderas);
    torreon(g, 12.6, 0.4, 1.0, 5.2, piedra, teja, false);
    // mercado del muelle: puestos con toldos
    const TOLDOS = [0xb23a2e, 0x2f6aa0, 0xd9a23a, 0x3f8a54];
    for (let i = 0; i < 8; i++) {
      const x = -10 + i * 1.35, z = 2.5 + (i % 2) * 0.45;
      caja(g, 0.9, 0.5, 0.6, x, 0, z, madera);
      pieza(g, gDosAguas, matLiso(TOLDOS[i % 4], { side: THREE.DoubleSide }), 1.15, 0.4, 0.95, x, 1.2, z);
      for (const dx of [-0.45, 0.45]) caja(g, 0.06, 1.2, 0.06, x + dx, 0, z + 0.3, madera);
    }
    // mercancía apilada
    for (let i = 0; i < 14; i++) { const x = 1 + rnd() * 11, z = 1.9 + rnd() * 1.3; if (rnd() > 0.5) cil(g, 0.3, 0.6, x, 0, z, matLiso(0x6a4a2e)); else caja(g, 0.6, 0.5 + rnd() * 0.5, 0.6, x, 0, z, matLiso(rnd() > 0.5 ? 0x8a6a48 : 0x7a5a3a), rnd()); }
    return { humos: [[-6, 3.4, -4], [3, 3.2, -6.5], [8, 3.0, -4]], luz: 1.5, alto: 9, muelles: true };
  },
  palafitos(g, l, rnd) {
    const madera = matLiso(0x4a3c2c), vieja = matLiso(0x54463a), paja = matTejado(0x6b6046);   // sin ventanas: nadie enciende luz aquí
    const chozas = [[-3.2, -0.6, 0], [0.4, 0.8, 0.12], [3.4, -1.0, -0.2], [0.2, -3.2, 0.3]];
    chozas.forEach(([x, z, caida], i) => {
      const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.z = caida; c.rotation.y = rnd() * 0.6; g.add(c);
      for (const [px, pz] of [[-0.9, -0.7], [0.9, -0.7], [-0.9, 0.7], [0.9, 0.7]]) caja(c, 0.16, 2.6, 0.16, px, -0.9, pz, madera);
      caja(c, 2.4, 0.16, 2.0, 0, 1.6, 0, madera);
      if (i !== 3) { caja(c, 1.7, 1.0, 1.4, 0, 1.76, 0, vieja); pieza(c, gDosAguas, paja, 2.1, 0.9, 1.8, 0, 2.76, 0); }
      else caja(c, 0.14, 1.3, 0.14, 0.7, 1.76, 0.5, madera);   // de la cuarta solo queda la plataforma
    });
    // pasarelas, una rota
    caja(g, 2.2, 0.1, 0.5, -1.4, 1.62, 0.1, madera, 0.35); caja(g, 1.9, 0.1, 0.5, 1.9, 1.6, -0.1, madera, -0.5);
    const rota = caja(g, 1.6, 0.1, 0.5, 0.3, 1.0, -1.4, madera, 1.5); rota.rotation.z = 0.5;
    return { humos: [], luz: 0, alto: 5.5 };
  },
  pasarela(g, l, rnd) {
    // calzada de troncos sobre pilotes: tramos sueltos, alguno vencido, y pilotes huérfanos donde faltan
    const madera = matLiso(0x54442f), vieja = matLiso(0x3d3226);
    for (let i = 0; i < 9; i++) {
      const x = -10.5 + i * 2.6, falta = i === 3 || i === 6;
      for (const z of [-0.55, 0.55]) caja(g, 0.2, 2.6 + rnd(), 0.2, x, -1.1, z, vieja);
      if (falta) continue;
      const t = new THREE.Group(); t.position.set(x + 1.3, 1.25, 0); t.rotation.z = i === 2 || i === 7 ? -0.28 : (rnd() - 0.5) * 0.06; g.add(t);
      for (let k = 0; k < 6; k++) { const tr = cil(t, 0.13, 1.5, -1.1 + k * 0.44, -0.75, 0, madera); tr.rotation.x = Math.PI / 2; tr.position.y = 0; }
      if (rnd() > 0.5) caja(t, 2.4, 0.08, 0.08, 0, 0.75, 0.62, vieja);   // resto de barandilla
    }
    return { humos: [], luz: 0, alto: 3.5 };
  },
  pecio(g, l, rnd) {
    // barcaza de carga escorada en el fango: casco abierto, cuadernas al aire y el palo roto
    const madera = matLiso(0x4d3c2a), oscura = matLiso(0x2f251b);
    const b = new THREE.Group(); b.rotation.z = 0.38; b.rotation.y = 0.5; b.position.y = 0.2; g.add(b);
    const casco = pieza(b, gCasco, madera, 1.0, 7.5, 1.5, 0, 0.3, 0); casco.rotation.z = Math.PI / 2;
    caja(b, 5.6, 0.14, 2.3, 0, 1.0, 0, oscura);
    for (let i = 0; i < 7; i++) { const c = caja(b, 0.12, 1.5, 0.12, -2.6 + i * 0.86, 1.0, 1.2, oscura); c.rotation.x = 0.35; if (i % 3) caja(b, 0.12, 1.3, 0.12, -2.6 + i * 0.86, 1.0, -1.2, oscura).rotation.x = -0.35; }
    const palo = cil(b, 0.13, 2.4, 0.6, 1.0, 0, madera); palo.rotation.z = 0.2;
    const caido = cil(g, 0.12, 4.2, 2.6, 0.3, 1.8, madera); caido.rotation.z = Math.PI / 2 - 0.1; caido.rotation.y = 0.9; caido.position.y = 0.5;
    for (let i = 0; i < 4; i++) cil(g, 0.32, 0.6, -2 + rnd() * 5, -0.1, 2 + rnd() * 1.5, matLiso(0x5a4630));   // barriles en el fango
    return { humos: [], luz: 0, alto: 4 };
  },
  ruina(g, l, rnd) {
    const k = l.suelo === 'agua' ? 1.9 : 1, piedra = matPiedra(0x67635c, 1), oscura = matPiedra(0x4a4742, 1);
    // gradas circulares, columnas rotas y el arco de entrada
    cil(g, 4.4, 0.35 * k, 0, 0, 0, piedra); cil(g, 3.6, 0.35 * k, 0, 0.35 * k, 0, oscura);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, alto = (1.1 + rnd() * 3.6) * k, x = Math.cos(a) * 3.3, z = Math.sin(a) * 3.3;
      if (i === 2 || i === 3) continue;
      const c = cil(g, 0.42, alto, x, 0.7 * k, z, i % 2 ? piedra : oscura); c.rotation.z = (rnd() - 0.5) * 0.14;
      if (alto > 3.6 * k) caja(g, 1.0, 0.3, 1.0, x, 0.7 * k + alto, z, oscura, rnd());   // capitel
    }
    const tirada = cil(g, 0.42, 2.6, 4.6, 0, 1.8, piedra); tirada.rotation.z = Math.PI / 2; tirada.position.y = 0.42; tirada.rotation.y = 0.5;
    caja(g, 0.8, 3.8 * k, 0.8, -1.3, 0.7 * k, 1.6, piedra); caja(g, 0.8, 3.8 * k, 0.8, 1.3, 0.7 * k, 1.6, piedra);
    caja(g, 3.8, 0.7, 0.9, 0, 0.7 * k + 3.8 * k, 1.6, oscura);
    caja(g, 3.2, 2.4 * k, 2.6, 0, 0.7 * k, -1.2, oscura);   // cella
    for (let i = 0; i < 9; i++) roca(g, 0.35 + rnd() * 0.5, (rnd() - 0.5) * 11, 0.2, (rnd() - 0.5) * 11, piedra, rnd);
    if (l.suelo === 'agua') { torreon(g, -4.0, -3.0, 0.9, 7.8, oscura, matTejado(0x3b3a42), true); cil(g, 0.8, 5.6, 3.8, 0, -3.4, piedra); cil(g, 0.7, 4.4, -1.6, 0, 4.6, oscura); }
    return { humos: [], luz: 0, brillo: true, alto: 5 * k };
  },
  torre(g) {
    const piedra = matPiedra(0x6f7568, 1);
    const fuste = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.05, 8.6, 12), piedra); fuste.position.y = 4.3; g.add(fuste);
    cil(g, 1.05, 0.5, 0, 8.6, 0, matLiso(0x4f5449));
    cono(g, 1.15, 2.6, 0, 9.1, 0, matTejado(0x2f3d55));
    return { humos: [], luz: 0.25, alto: 12, luzAlta: 7.4 };
  },
};

// Piezas y materiales que reutiliza ciudad.js para levantar el interior de las capitales.
export const kit = { matPared, matPiedra, matTejado, matLiso, gCaja, gCil, gCono, gRoca, gDosAguas, gCasco, ESTILOS, ventanas };

// Devuelve el grupo ya colocado y los datos que usan el ambiente (humo, luces, banderas) y la interfaz (selección).
export function crearLugares(mundo, terreno) {
  const grupo = new THREE.Group(), lista = [], banderas = [];
  const colorDe = id => mundo.regiones.find(r => r.id === id)?.color ?? '#cccccc';
  for (const l of mundo.lugares) {
    const g = new THREE.Group(), escala = ESCALA * (l.tamano || 1);
    const info = (CONSTRUCTORES[l.tipo] || CONSTRUCTORES.pueblo)(g, l, azarDe(l.id), { colorRegion: colorDe(l.region), banderas });
    const suelo = terreno.alturaEn(l.x, l.y);
    const y = l.suelo === 'agua' ? -2.4 : l.suelo === 'marisma' ? 0.1 : Math.max(suelo, 0.25);
    g.scale.setScalar(escala);
    g.position.set(l.x - terreno.cx, y - 0.1, l.y - terreno.cz);
    if (info.muelles) {
      // todo lo que toca el agua va a cota fija: muelle de piedra, espigones, grúas, barcos amarrados, astillero y rompeolas
      const rnd = azarDe(l.id + '-muelles'), aCota = c => (c - g.position.y) / escala;
      const madera = matLiso(0x6b5440), pilote = matLiso(0x4a3a2a), sillar = matPiedra(0x8d897f, 1), casco = matLiso(0x5a3f2b), jarcia = matLiso(0x3a2c20);
      const muelle = caja(g, 27, 1.5, 2.2, 0, 0, 4.4, sillar); muelle.position.y = aCota(0.25);
      const amarrado = (x, z, largo, ry) => {
        const b = new THREE.Group(); b.position.set(x, aCota(0.1), z); b.rotation.y = ry; g.add(b);
        const c = pieza(b, gCasco, casco, 0.85, largo, 1.0, 0, 0.3, 0); c.rotation.x = Math.PI / 2;
        caja(b, 1.3, 0.1, largo * 0.7, 0, 0.78, 0, madera);
        caja(b, 1.2, 0.7, largo * 0.18, 0, 0.85, -largo * 0.3, casco);   // castillo de popa
        for (const dz of [largo * 0.12, -largo * 0.14]) { cil(b, 0.08, largo * 0.75, 0, 0.85, dz, jarcia); const v = caja(b, largo * 0.42, 0.07, 0.07, 0, 0.85 + largo * 0.52, dz, jarcia); v.rotation.y = 0.15; caja(b, largo * 0.38, 0.28, 0.12, 0, 0.85 + largo * 0.5, dz, matLiso(0xe6dcc6)); }
      };
      [-10.5, -5.2, 0.4, 5.6, 10.6].forEach((dx, i) => {
        const largo = 11 + (i % 2) * 5 + (i === 2 ? 6 : 0);
        const m = caja(g, 1.25, 0.3, largo, dx, 0, 5.4 + largo / 2, madera); m.position.y = aCota(0.85);
        for (let dz = 7; dz < 5.4 + largo; dz += 3.2) for (const s of [-0.55, 0.55]) { const p = caja(g, 0.26, 2.8, 0.26, dx + s, 0, dz, pilote); p.position.y = aCota(-0.5); }
        if (i !== 1) amarrado(dx + 2.1, 8.5 + largo * 0.45, 5.2 + (i % 3) * 1.1, (rnd() - 0.5) * 0.12);
        if (i % 2 === 0 && i > 0) amarrado(dx - 1.9, 7.5 + largo * 0.3, 3.2, (rnd() - 0.5) * 0.2);
      });
      // grúas de rueda sobre el muelle
      for (const dx of [-7.8, 3.0, 8.2]) {
        const gr = new THREE.Group(); gr.position.set(dx, aCota(1.75), 4.6); gr.rotation.y = (rnd() - 0.5) * 0.8; g.add(gr);
        caja(gr, 1.3, 1.1, 1.3, 0, 0, 0, matPared(0x8a6a48)); pieza(gr, gCono, matTejado(0x5c3a2a), 1.05, 0.9, 1.05, 0, 1.55, 0);
        const brazo = caja(gr, 0.2, 4.4, 0.2, 0, 1.4, 1.1, jarcia); brazo.rotation.x = 0.75;
        caja(gr, 0.05, 2.2, 0.05, 0, 1.9, 3.05, jarcia); caja(gr, 0.5, 0.45, 0.5, 0, 1.45, 3.05, matLiso(0x8a6a48));
      }
      // astillero: un casco a medio hacer en la grada
      const grada = new THREE.Group(); grada.position.set(14.6, aCota(0.9), 3.4); grada.rotation.y = 0.25; g.add(grada);
      caja(grada, 2.6, 0.2, 7.5, 0, 0, 2.4, madera).rotation.x = 0.07;
      for (let i = 0; i < 8; i++) for (const s of [-1, 1]) { const c = caja(grada, 0.12, 1.5, 0.12, s * 0.85, 0.3, -0.6 + i * 0.85, casco); c.rotation.z = -s * 0.35; }
      caja(grada, 0.2, 0.2, 7.0, 0, 0.3, 2.4, casco);
      // rompeolas de escollera que cierra la dársena, con su baliza
      for (let i = 0; i < 22; i++) {
        const t = i / 21, giro = Math.max(0, (t - 0.5) / 0.5), x = -19.5 + giro * giro * 13, z = 4.5 + t * 33;
        const r = roca(g, 1.0 + rnd() * 0.7, x + (rnd() - 0.5), 0, z + (rnd() - 0.5), sillar, rnd); r.position.y = aCota(0.25 + rnd() * 0.4);
        if (i === 21) { const bal = cil(g, 0.4, 2.6, x, 0, z, matPiedra(0xece8df, 1)); bal.position.y = aCota(2.0); const luz = pieza(g, gCil, new THREE.MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffc857, emissiveIntensity: 1.6 }), 0.3, 0.45, 0.3, x, aCota(3.5), z); }
      }
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.userData.id = l.id;
    grupo.add(g);
    const radio = l.oculto ? 15 : Math.max(10, radioDe(l) * 1.15);
    const diana = new THREE.Mesh(new THREE.SphereGeometry(radio, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
    diana.position.set(g.position.x, Math.max(y, 0) + (l.oculto ? 6 : radio * 0.45), g.position.z);
    diana.userData.id = l.id;
    grupo.add(diana);
    lista.push({
      datos: l, grupo: g, diana, info, escala, radio,
      base: new THREE.Vector3(g.position.x, y, g.position.z),
      ancla: new THREE.Vector3(g.position.x, Math.max(y, 0) + info.alto * escala + 2.5, g.position.z),
    });
  }
  return { grupo, lista, dianas: lista.map(l => l.diana), ventanas, banderas };
}
