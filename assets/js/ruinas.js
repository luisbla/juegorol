// ruinas.js — parajes: lo que se ve al acercarse a un lugar que no es una ciudad.
// De las ruinas solo se enseña el paraje y la entrada, nunca el interior, y cada una tiene su propia traza:
// se cuentan con lo que la gente del lugar cree de ellas, y nada aquí debe hacer pensar que tienen que ver entre sí.
import * as THREE from 'three';
import { azarDe } from './ruido.js';
import { crearBarcoModelo } from './barco.js';
import { crearMatas } from './campo.js';
import { lluvia } from './clima.js';
import { crearFigura } from './figuras.js';
import { blanda as blandaDe } from './texturas.js';
import { matUtil, cajaB, cantear, gBarril, gCarro, gGallina, gPerro, gOveja, gVaca, gPuesto, gPozo, gCaballo, gPebetero, gRisco } from './utileria.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function crearEntrada(l) {
  const rnd = azarDe('entrada-' + l.id), escena = new THREE.Scene(), etiquetas = [], vivos = [];
  const mats = new Map();
  const mat = (color, extra) => { if (extra) return new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra }); if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 1 })); return mats.get(color); };
  // piedra de cantería: el material lleva [alto de hilada, largo de sillar, parte con verdín] y cada pieza se trocea y se tiñe sillar a sillar
  const canto = (color, alto = 1, largo = 1.8, verdin = 0) => { const m = mat(color, { vertexColors: true }); m.userData.sillar = [alto, largo, verdin]; return m; };
  const pieza = (geo, m, x, y, z, padre = escena) => { if (m.userData.sillar) geo = cantear(geo, m.userData.sillar); const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; padre.add(o); return o; };
  // las cajas llevan los cantos matados, salvo las muy grandes o las que van con textura
  const hiladas = (v, paso) => Math.max(1, Math.round(v / paso));
  const caja = (m, w, h, d, x, y, z, ry = 0, padre) => { const S = m.userData.sillar, o = pieza(S ? new THREE.BoxGeometry(w, h, d, hiladas(w, S[1]), hiladas(h, S[0]), hiladas(d, S[1])) : m.map || Math.max(w, h, d) > 14 ? new THREE.BoxGeometry(w, h, d) : cajaB(w, h, d), m, x, y + h / 2, z, padre); o.rotation.y = ry; return o; };
  // enseres y animales de utileria.js: una sola malla cada uno, con su color en los vértices
  const enser = (geo, x, z, ry = 0, s = 1, y = 0, padre) => { const o = pieza(geo, matUtil, x, y, z, padre); o.rotation.y = ry; o.scale.setScalar(s); return o; };
  const cil = (m, r0, r1, h, x, y, z, padre, seg = 10) => pieza(new THREE.CylinderGeometry(r0, r1, h, seg, m.userData.sillar ? hiladas(h, m.userData.sillar[0] * (Math.max(r0, r1) < 1.7 ? 2 : 1)) : 1), m, x, y + h / 2, z, padre);
  const roca = (m, r, x, y, z, sy = 0.7, padre) => { const o = pieza(new THREE.DodecahedronGeometry(r, 0), m, x, y, z, padre); o.scale.set(1 + rnd() * 0.4, sy, 1 + rnd() * 0.4); o.rotation.set(rnd(), rnd() * 6, rnd()); return o; };
  const nido = (x, z, ry = 0, y = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; escena.add(g); return g; };
  const rotulo = (nombre, x, y, z) => etiquetas.push({ nombre, pos: new THREE.Vector3(x, y, z), clase: 'hito' });
  let texBorde = null;
  const borde = () => {   // máscara del claro: lleno por dentro, orilla desigual y difuminada
    if (!texBorde) { const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N), rb = azarDe('borde'), f = [rb() * 6, rb() * 6, rb() * 6, rb() * 6];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const u = (i + 0.5) / N * 2 - 1, v = (j + 0.5) / N * 2 - 1, r = Math.hypot(u, v), a = Math.atan2(v, u), orilla = 0.84 + 0.05 * Math.sin(a * 3 + f[0]) + 0.035 * Math.sin(a * 7 + f[1]) + 0.025 * Math.sin(a * 13 + f[2]) + 0.015 * Math.sin(a * 29 + f[3]);
        const k = Math.min(1, Math.max(0, (orilla - r) / 0.17)), g = Math.round(255 * k * k * (3 - 2 * k)), o = (j * N + i) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = g; im.data[o + 3] = 255; }
      x.putImageData(im, 0, 0); texBorde = new THREE.CanvasTexture(c); }
    return texBorde;
  };
  const disco = (color, radio, y = 0, extra, duro = false) => {
    const suave = !extra && !duro && radio >= 6; let m = extra ? mat(color, extra) : matSuelo(color);
    if (suave) { m = m.clone(); m.alphaMap = borde(); m.transparent = true; m.depthWrite = false; }
    const o = pieza(new THREE.CircleGeometry(suave ? radio / 0.86 : radio, 48), m, 0, y, 0); o.rotation.x = -Math.PI / 2; if (suave) { o.rotation.z = (color % 97) * 0.31 + radio; o.renderOrder = 1; } o.castShadow = false; return o; };
  // Suelo: una textura de manchas para que no sea un color plano, llano donde se pisa y con lomas alrededor que cierran el horizonte.
  let texManchas = null;
  const manchas = () => {
    if (!texManchas) { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#d2d2d2'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 260; i++) { const r = 8 + rnd() * 30, px = rnd() * 256, py = rnd() * 256, g = x.createRadialGradient(px, py, 0, px, py, r), v = rnd() > 0.5 ? 255 : 60; g.addColorStop(0, `rgba(${v},${v},${v},${0.05 + rnd() * 0.09})`); g.addColorStop(1, `rgba(${v},${v},${v},0)`); x.fillStyle = g; for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { x.setTransform(1, 0, 0, 1, dx, dy); x.fillRect(px - r, py - r, r * 2, r * 2); } }
      x.setTransform(1, 0, 0, 1, 0, 0); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.1})`; x.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2.5, 1 + rnd() * 2.5); }
      texManchas = new THREE.CanvasTexture(c); texManchas.wrapS = texManchas.wrapT = THREE.RepeatWrapping; texManchas.colorSpace = THREE.SRGBColorSpace; }
    return texManchas;
  };
  const matsSuelo = new Map();
  const matSuelo = color => { if (!matsSuelo.has(color)) { const t = manchas().clone(); t.repeat.set(9, 9); t.needsUpdate = true; matsSuelo.set(color, new THREE.MeshStandardMaterial({ color, map: t, roughness: 1 })); } return matsSuelo.get(color); };
  let relieve = false, llano = 50; const f1 = rnd() * 6, f2 = rnd() * 6;
  const alturaEn = (x, z) => { if (!relieve) return 0; const r = Math.hypot(x, z), k = Math.min(1, Math.max(0, (r - llano) / 50)), s = k * k * (3 - 2 * k); return s * (5 + 4 * Math.sin(x * 0.045 + f1) * Math.cos(z * 0.05 + f2) + 2 * Math.sin(x * 0.11 + z * 0.09 + f1)); };
  const suelo = (color, radio = 150, { plano = false } = {}) => {
    relieve = !plano; const g = new THREE.PlaneGeometry(radio * 2, radio * 2, plano ? 1 : 90, plano ? 1 : 90).rotateX(-Math.PI / 2), p = g.attributes.position;
    if (relieve) { for (let i = 0; i < p.count; i++) p.setY(i, alturaEn(p.getX(i), p.getZ(i))); g.computeVertexNormals(); }
    const m = matSuelo(color).clone(); m.map = manchas().clone(); m.map.repeat.set(radio / 9, radio / 9); m.map.needsUpdate = true;
    const o = pieza(g, m, 0, 0, 0); o.castShadow = false; return o;
  };
  // Árboles: se apuntan aquí y se plantan todos al final, instanciados (tronco con ramas por un lado, copa por otro para poder teñirla).
  const bosque = { hoja: [], pino: [], seco: [] };
  const arbol = (x, z, s, copa = 0x3a5a30, seco = false) => (seco ? bosque.seco : bosque.hoja).push([x, z, s, copa, 1]);
  const pino = (x, z, s, c = 0x3f5a45) => bosque.pino.push([x, z, s, c, 1]);
  const arboleda = (puntos, copas, { alto = 1, pinos = false } = {}) => puntos.forEach(([x, z, s], i) => (pinos ? bosque.pino : bosque.hoja).push([x, z, s * 1.25, copas[i % copas.length], Math.pow(alto, 0.7)]));
  const une = gs => mergeGeometries(gs.map(g => { const q = g.index ? g.toNonIndexed() : g; q.deleteAttribute('uv'); return q; }));
  const rama = (r0, r1, largo, x, y, z, rx, rz) => new THREE.CylinderGeometry(r0, r1, largo, 5).translate(0, largo / 2, 0).applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, 0, rz)).setPosition(x, y, z));
  const modeloArbol = (tipo, v) => {   // [tronco, copa]; altura natural ≈ 7
    const az = azarDe(`arbol-${tipo}-${v}`), tr = [], co = [];
    if (tipo === 'pino') {
      tr.push(new THREE.CylinderGeometry(0.16, 0.32, 3, 6).translate(0, 1.5, 0));
      for (let i = 0; i < 5; i++) co.push(new THREE.ConeGeometry(2.1 - i * 0.36, 2.3, 8).translate((az() - 0.5) * 0.2, 2.4 + i * 1.25, (az() - 0.5) * 0.2));
    } else {
      tr.push(new THREE.CylinderGeometry(0.24, 0.42, 3.0, 7).translate(0, 1.5, 0), new THREE.CylinderGeometry(0.42, 0.75, 0.6, 7).translate(0, 0.3, 0), new THREE.CylinderGeometry(0.16, 0.24, 1.6, 6).translate(0, 3.7, 0));
      const n = tipo === 'seco' ? 6 : 4;
      for (let i = 0; i < n; i++) { const a = i / n * 6.28 + az(), inc = 0.6 + az() * 0.5, y = 2.3 + az() * 1.6, largo = (tipo === 'seco' ? 2.4 : 1.9) + az(); tr.push(rama(0.07, 0.16, largo, 0, y, 0, Math.cos(a) * inc, -Math.sin(a) * inc)); if (tipo === 'seco') tr.push(rama(0.03, 0.07, largo * 0.6, Math.sin(a) * Math.sin(inc) * largo * 0.8, y + Math.cos(inc) * largo * 0.8, Math.cos(a) * Math.sin(inc) * largo * 0.8, Math.cos(a + 0.8) * 0.5, -Math.sin(a + 0.8) * 0.5)); }
      if (tipo !== 'seco') { co.push(new THREE.IcosahedronGeometry(1.9, 1).scale(1, 0.82, 1).translate(0, 5.1, 0)); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + az(), d = 1.2 + az() * 0.8; co.push(new THREE.IcosahedronGeometry(1.0 + az() * 0.6, 1).scale(1, 0.8, 1).translate(Math.cos(a) * d, 4.0 + az() * 1.7, Math.sin(a) * d)); } }
    }
    const copa = co.length ? une(co) : null;
    if (copa) { const p = copa.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i += 3) { const k = 0.78 + az() * 0.3 + (p.getY(i) - 4) * 0.035; for (let j = 0; j < 3; j++) c.fill(k, (i + j) * 3, (i + j) * 3 + 3); } copa.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
    return [une(tr), copa];
  };
  const plantar = camara => {
    for (const k of Object.keys(bosque)) bosque[k] = bosque[k].filter(([x, z, s]) => Math.hypot(x - camara[0], z - camara[2]) > 8 + 3.2 * s);   // ninguno delante de la cámara al entrar
    const corteza = mat(0x3a2a1c), hojas = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), eje = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    for (const tipo of ['hoja', 'pino', 'seco']) for (let v = 0; v < 3; v++) {
      const lista = bosque[tipo].filter((_, i) => i % 3 === v); if (!lista.length) continue;
      const [gt, gc] = modeloArbol(tipo, v), tr = new THREE.InstancedMesh(gt, corteza, lista.length), co = gc && new THREE.InstancedMesh(gc, hojas, lista.length);
      lista.forEach(([x, z, s, color, alto], i) => { const k = s * (tipo === 'pino' ? 0.95 : 0.92); M.compose(new THREE.Vector3(x, alturaEn(x, z) - 0.1, z), Q.setFromAxisAngle(eje, rnd() * 6.283), new THREE.Vector3(k, k * alto, k)); tr.setMatrixAt(i, M); if (co) { co.setMatrixAt(i, M); co.setColorAt(i, c.setHex(color)); } });
      for (const m of [tr, co]) if (m) { m.castShadow = m.receiveShadow = true; m.frustumCulled = false; escena.add(m); }
    }
  };
  const matas = opciones => { const m = crearMatas({ rnd, altura: alturaEn, ...opciones }); escena.add(m.malla); vivos.push(m.actualizar); };
  const trigal = (n, hueco, desde = 0, alto) => matas({ tipo: 'trigo', n, hueco, desde, alto });
  const pradera = (n, hueco, colores, desde = 0, hasta = 80) => matas({ tipo: 'hierba', n, hueco, desde, hasta, colores, fuerza: 0.5 });
  // Gente: figuras con esqueleto (figuras.js). Se piden con su oficio y lo que llevan, y echan a andar solas en cuanto se las mueve.
  let nocheAhora = 0, nFiguras = 0;
  const paisano = i => l.region === 'thraengarde' ? ['clan', 'aldeana', 'clan', 'minero'][i % 4] : l.region === 'astravan' ? ['aldeano', 'aldeana', 'mercader', 'marino'][i % 4] : ['aldeano', 'aldeana'][i % 2];
  const figura = (x, z, ry, color, padre = escena, y = 0, talla = 1, { estado, ...ropa } = {}) => {
    rnd(); if (rnd() >= 0.25) rnd(); const fase = rnd() * 6.28;   // el mismo gasto de azar de siempre, para que nada más del paraje cambie de sitio
    const f = crearFigura({ rnd: azarDe(`gente-${l.id}-${nFiguras}`), color, talla, tipo: paisano(nFiguras), ...ropa }), g = f.grupo; nFiguras++;
    f.estado.fase = fase; Object.assign(f.estado, estado); g.position.set(x, y, z); g.rotation.y = ry; g.userData.f = f; padre.add(g);
    vivos.push(t => { if (g.visible) f.actualizar(t); });
    return g;
  };
  // anda por una ruta cerrada de puntos [x, z]; de noche se recoge, salvo que sea de los que velan
  const anda = (g, ruta, v = 1.6, vela = false) => {
    const fase = g.userData.f.estado.fase, acum = [0];
    for (let i = 0; i < ruta.length; i++) { const a = ruta[i], b = ruta[(i + 1) % ruta.length]; acum.push(acum[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const total = acum[ruta.length], y0 = g.position.y; let giro = null;
    vivos.push(t => {
      g.visible = vela || nocheAhora < 0.6; if (!g.visible) return;
      const s = (t * v + fase * 7) % total; let i = 0; while (acum[i + 1] < s) i++;
      const a = ruta[i], b = ruta[(i + 1) % ruta.length], k = (s - acum[i]) / (acum[i + 1] - acum[i] || 1), rumbo = Math.atan2(b[0] - a[0], b[1] - a[1]);
      g.position.set(a[0] + (b[0] - a[0]) * k, y0, a[1] + (b[1] - a[1]) * k);
      giro = giro === null ? rumbo : giro + Math.atan2(Math.sin(rumbo - giro), Math.cos(rumbo - giro)) * 0.14; g.rotation.y = giro;   // dobla las esquinas girando, no de golpe
    });
    return g;
  };
  // qué hace con el cuerpo: cualquiera de las posturas de figuras.js (golpea, habla, escucha, remueve, percha, carga…)
  const faena = (g, modo, ritmo = 1, extra) => { Object.assign(g.userData.f.estado, { brazos: modo, ritmo }, extra); return g; };
  const gallina = (x, z, color = 0xe8e0d0) => { const g = nido(x, z, rnd() * 6); enser(gGallina(color), 0, 0, 0, 1.15, 0, g);
    const f = rnd() * 6.28, x0 = x, z0 = z; vivos.push(t => { g.visible = nocheAhora < 0.6; const p = t * 0.25 + f; g.position.set(x0 + Math.sin(p) * 1.1 + Math.sin(p * 2.7) * 0.4, 0, z0 + Math.cos(p * 1.3) * 1.1); g.rotation.set(Math.max(0, Math.sin(t * 3 + f * 5)) * 0.7, f + Math.sin(p) * 1.5, 0, 'YXZ'); }); return g; };
  // luz de noche: cristales que se encienden, faroles y, con cuentagotas, luces de verdad
  const vidrio = new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.4, emissive: 0xffc070, emissiveIntensity: 0 }), farolM = new THREE.MeshStandardMaterial({ color: 0x6a5a30, emissive: 0xffc060, emissiveIntensity: 0.1 }), lucesNoche = [];
  const farol = (x, z, ry = 0, alto = 3.4, y = 0) => { const g = nido(x, z, ry, y); caja(mat(0x3a2a1c), 0.2, alto, 0.2, 0, 0, 0, 0, g); caja(mat(0x3a2a1c), 0.9, 0.12, 0.12, 0.36, alto - 0.2, 0, 0, g); caja(mat(0x2b2b2e), 0.44, 0.08, 0.44, 0.72, alto - 0.42, 0, 0, g); caja(farolM, 0.3, 0.44, 0.3, 0.72, alto - 0.86, 0, 0, g);
    if (lucesNoche.length < 4) { const l2 = new THREE.PointLight(0xffb060, 0, 30, 1.8); l2.position.set(0.72, alto - 0.6, 0); g.add(l2); lucesNoche.push([l2, 70]); } return g; };
  const gTejado = new THREE.ConeGeometry(0.7071, 1, 4).rotateY(Math.PI / 4);   // a cuatro aguas: torres, toldos y tiendas
  const gDosAguas = (() => {   // prisma con la cumbrera a lo largo de X; base 1×1, alto 1, centrado en el origen
    const A = [-0.5, -0.5, -0.5], B = [0.5, -0.5, -0.5], C = [0.5, -0.5, 0.5], D = [-0.5, -0.5, 0.5], E = [-0.5, 0.5, 0], F = [0.5, 0.5, 0], p = [], uv = [];
    for (const [a, b, c, u] of [[D, C, F, [0, 0, 1, 0, 1, 1]], [D, F, E, [0, 0, 1, 1, 0, 1]], [B, A, E, [0, 0, 1, 0, 1, 1]], [B, E, F, [0, 0, 1, 1, 0, 1]], [A, D, E], [C, B, F], [A, B, C], [A, C, D]]) { p.push(...a, ...b, ...c); uv.push(...(u || [0, 0, 0.02, 0, 0.02, 0.02])); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  })();
  // Casa: zócalo, entramado, puerta con marco y escalón, ventanas con alféizar y contraventanas, alero y chimenea con remate.
  // Todas sus piezas se marcan como fijas y al final se funden por material.
  const CONTRAS = [0x4a5a3a, 0x7a3b2e, 0x2f4f6f, 0x6a5a2f];
  let texTeja = null; const matsTeja = new Map();
  const matTeja = color => {
    if (!texTeja) { const N = 128, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N), rt = azarDe('teja'), tono = Array.from({ length: 64 }, () => rt());   // píxel a píxel, sin degradados de canvas (en Safari dejan motas)
      for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) { const f = py >> 4, fy = (py & 15) / 16, qx = px + (f % 2) * 8, k = (qx >> 4) % 8, v = tono[f * 8 + k]; let g = 214;
        g = v > 0.5 ? g + (255 - g) * (v - 0.5) * 0.5 : g * (1 - (0.5 - v) * 0.5); if ((qx & 15) === 15) g *= 0.78;
        g *= fy < 0.25 ? 1 - 0.3 * (1 - fy / 0.25) : 1; if (fy > 0.25 && fy < 0.9) g += (255 - g) * 0.1 * (fy - 0.25) / 0.65;
        const o = (py * N + px) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = Math.round(g); im.data[o + 3] = 255; }
      x.putImageData(im, 0, 0);
      texTeja = new THREE.CanvasTexture(c); texTeja.wrapS = texTeja.wrapT = THREE.RepeatWrapping; texTeja.repeat.set(3, 1); texTeja.colorSpace = THREE.SRGBColorSpace; texTeja.anisotropy = 4; }
    if (!matsTeja.has(color)) { const col = new THREE.Color(color), hsl = col.getHSL({}); col.setHSL(hsl.h, hsl.s * 0.82, hsl.l); const m = new THREE.MeshStandardMaterial({ color: col, map: texTeja, roughness: 0.9 }); m.userData.conUV = true; matsTeja.set(color, m); }
    return matsTeja.get(color);
  };
  const casa = (x, z, w, d, h, ry = 0, { pared = 0xd2c4a4, teja = 0xa5512c, chim = false, puerta = true, y = 0, entramado = true, piedra = false, ventanas = true } = {}) => {
    const g = nido(x, z, ry, y), osc = mat(0x3a2a1c), pc = mat(0x8d8676), cc = mat(CONTRAS[Math.floor(rnd() * 4)]), F = (m, cw, ch, cd, cx, cy, cz, cry = 0) => { const o = caja(m, cw, ch, cd, cx, cy, cz, cry, g); o.userData.fijo = true; return o; };
    F(pc, w + 0.3, 0.5, d + 0.3, 0, 0, 0); F(mat(pared), w, h, d, 0, 0, 0);
    const t = pieza(gDosAguas, matTeja(teja), 0, h + h * 0.32, 0, g); t.scale.set(w * 1.16, h * 0.64, d * 1.24); t.userData.fijo = true;
    F(osc, w * 1.16 + 0.2, 0.2, 0.3, 0, h + h * 0.64 - 0.1, 0); for (const s of [-1, 1]) F(osc, w * 1.16, 0.14, 0.18, 0, h - 0.04, s * d * 0.62);
    if (entramado && !piedra) { for (const sx of [-1, 1]) for (const sz of [-1, 1]) F(osc, 0.24, h, 0.24, sx * w / 2, 0, sz * d / 2); for (const sz of [-1, 1]) { F(osc, w, 0.2, 0.1, 0, h * 0.5, sz * (d / 2 + 0.02)); F(osc, w, 0.2, 0.1, 0, h - 0.2, sz * (d / 2 + 0.02)); } }
    else if (piedra) for (const sx of [-1, 1]) for (let j = 0; j < 4; j++) F(pc, 0.5, 0.42, 0.5, sx * w / 2, 0.5 + j * h / 4.4, d / 2);
    const hueco = (px, pz, pry, an = 0.8, al = 0.9, py = h * 0.5) => { const v = nido(px, pz, pry); g.add(v); const V = (m, a, b, c2, vx, vy, vz) => { const o = caja(m, a, b, c2, vx, vy, vz, 0, v); o.userData.fijo = true; }; V(osc, an + 0.24, al + 0.24, 0.1, 0, py - 0.12, 0.02); V(vidrio, an, al, 0.14, 0, py, 0.03); V(osc, 0.06, al, 0.18, 0, py, 0.03); V(pc, an + 0.5, 0.12, 0.3, 0, py - 0.22, 0.12); for (const s of [-1, 1]) V(cc, an * 0.5, al, 0.07, s * an * 0.8, py, 0.05); };
    const nv = !ventanas ? 0 : w > 7 ? 2 : 1; for (const s of [-1, 1]) for (let i = 0; i < nv; i++) hueco(s * (w * 0.2 + (i + (puerta ? 0.4 : 0)) * w * 0.18), d / 2, 0);
    if (ventanas) { for (const s of [-1, 1]) hueco(s * w / 2, 0, s * Math.PI / 2); hueco(w * 0.2, -d / 2, Math.PI); }
    if (puerta) { F(osc, 1.3, 2.05, 0.12, 0, 0.3, d / 2 + 0.03); F(mat(0x4a3423), 1.0, 1.9, 0.18, 0, 0.3, d / 2 + 0.04); F(mat(0x2b2b2e), 0.08, 0.2, 0.26, 0.3, 1.1, d / 2 + 0.04); F(pc, 1.7, 0.3, 0.7, 0, 0, d / 2 + 0.4); }
    if (chim) { F(mat(0x7d7468), 0.7, h * 0.75, 0.7, w * 0.28, h, d * 0.1); F(mat(0x7d7468), 0.95, 0.16, 0.95, w * 0.28, h + h * 0.75, d * 0.1); }
    return g;
  };
  // funde por material todo lo marcado como fijo: cientos de piezas pasan a ser un puñado de mallas
  const fundir = () => {
    escena.updateMatrixWorld(true); const lotes = new Map(), quitar = [];
    escena.traverse(o => { if (!o.isMesh || !o.userData.fijo) return; const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(k === 'color' && o.material.vertexColors) && !(k === 'uv' && o.material.userData.conUV)) g.deleteAttribute(k); if (!lotes.has(o.material)) lotes.set(o.material, []); lotes.get(o.material).push(g); quitar.push(o); });
    for (const o of quitar) o.parent.remove(o);
    for (const [m, gs] of lotes) { const o = new THREE.Mesh(mergeGeometries(gs), m); o.castShadow = o.receiveShadow = true; escena.add(o); }
  };
  const barril = (x, z, s = 1) => { enser(gBarril(), x, z, (x * 1.7 + z) % 3, s).userData.fijo = true; };
  const cerca = (x0, z0, x1, z1, m = mat(0x5a4633), alto = 1.1) => { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(d / 1.6)), ry = -Math.atan2(z1 - z0, x1 - x0); for (let i = 0; i <= n; i++) caja(m, 0.16, alto, 0.16, x0 + (x1 - x0) * i / n, 0, z0 + (z1 - z0) * i / n); for (const f of [0.45, 0.85]) caja(m, d, 0.09, 0.07, (x0 + x1) / 2, alto * f, (z0 + z1) / 2, ry); };
  const hoguera = (x, z, viva) => { for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; roca(mat(0x55504a), 0.22, x + Math.cos(a) * 0.7, 0.12, z + Math.sin(a) * 0.7); } cil(mat(0x15120f), 0.5, 0.5, 0.1, x, 0, z); if (viva) { const f = pieza(new THREE.ConeGeometry(0.35, 1.0, 6), new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.85 }), x, 0.6, z); vivos.push(t => { f.scale.y = 0.8 + 0.3 * Math.sin(t * 9); }); const luz = new THREE.PointLight(0xff9a4a, 60, 26, 1.8); luz.position.set(x, 1.4, z); escena.add(luz); } };
  const tienda = (x, z, ry, color, caida = 0) => { const g = nido(x, z, ry), t = pieza(gTejado, mat(color, { side: THREE.DoubleSide }), 0, 0.8, 0, g); t.scale.set(2.6, caida ? 0.5 : 1.6, 2.2); if (caida) { t.position.y = 0.25; t.rotation.z = caida * 0.12; }
    const osc = new THREE.Color(color).multiplyScalar(0.72).getHex(), palo = mat(0x4a3a2a);
    if (!caida) { pieza(gTejado, mat(osc, { side: THREE.DoubleSide }), 0, 0.14, 0, g).scale.set(2.9, 0.3, 2.5);   // faldón
      caja(mat(0x17130f), 0.62, 0.95, 0.04, 0, 0, 0.9, 0, g).rotation.x = -0.62; for (const s of [-1, 1]) { const sol = caja(mat(osc), 0.34, 1.0, 0.03, s * 0.42, 0, 0.93, 0, g); sol.rotation.set(-0.62, 0, s * 0.3); }   // entrada con las solapas recogidas
      cil(palo, 0.04, 0.04, 0.5, 0, 1.55, 0, g, 5); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const v = cil(palo, 0.012, 0.012, 1.5, sx * 1.55, 0, sz * 1.35, g, 3); v.rotation.set(sz * 0.9, 0, -sx * 0.9); v.position.y = 0.45; cil(palo, 0.03, 0.03, 0.3, sx * 2.05, 0, sz * 1.8, g, 4); } }
    else for (let i = 0; i < 2; i++) { const v = cil(palo, 0.04, 0.04, 1.8, (i - 0.5) * 1.4, 0, 0.4 - i * 0.7, g, 5); v.rotation.set(1.45, i * 1.3, 0); v.position.y = 0.3; }   // los palos de la vencida, por el suelo
    return g; };   // la vencida queda aplastada en el suelo, no en el aire
  // res: según el tamaño y el color que se pida sale un perro, una oveja o una vaca; pace cabeceando
  const res = (x, z, ry, color, s = 1) => { const g = nido(x, z, ry); if (s < 0.9) enser(gPerro(color), 0, 0, 0, s / 0.62 * 1.05, 0, g); else if (color === 0xf0ece0) enser(gOveja(), 0, 0, 0, s / 1.2 * 1.1, 0, g); else enser(gVaca(color), 0, 0, 0, s / 2.2 * 1.1, 0, g); const fr = rnd() * 6.28; vivos.push(t => { g.rotation.x = Math.max(0, Math.sin(t * 0.4 + fr)) * 0.1; }); return g; };
  const carro = (x, z, ry, carga = ['sacos', 'pacas', 'barriles', 'cajas'][Math.floor(Math.abs(x * 7 + z * 3)) % 4]) => { const o = enser(gCarro({ carga }), x, z, ry, 1.05); o.userData.fijo = true; return o; };
  let texBlanda = null;
  const blanda = () => texBlanda ??= blandaDe(0.55);
  const niebla = (n, y, radio, opacidad = 0.5, color = 0xffffff, ancho = 26) => { for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blanda(), transparent: true, depthWrite: false, opacity: opacidad, color })), x0 = (rnd() - 0.5) * radio * 2, z = (rnd() - 0.5) * radio * 2; s.scale.set(ancho, ancho * 0.28, 1); s.position.set(x0, y + rnd() * 1.5, z); escena.add(s); vivos.push((t, cam) => { s.position.x = x0 + Math.sin(t * 0.05 + i) * 10; if (cam) { const d = s.position.distanceTo(cam.position); s.material.opacity = opacidad * THREE.MathUtils.smoothstep(d, ancho * 0.45, ancho * 1.5); } }); } };
  const humo = (x, y, z, oscuro) => { for (let k = 0; k < 5; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blanda(), transparent: true, depthWrite: false, color: oscuro ? 0x2a2725 : 0xd9d4cc })); escena.add(s); vivos.push(t => { const f = (t * 0.12 + k / 5) % 1; s.position.set(x + f * f * 5, y + f * 9, z); const e = 1.5 + f * 6; s.scale.set(e, e, 1); s.material.opacity = Math.sin(f * Math.PI) * (oscuro ? 0.7 : 0.5) * (1 - nocheAhora * 0.45); if (!oscuro) s.material.color.setHex(0xd9d4cc).multiplyScalar(1 - nocheAhora * 0.6); }); } };
  const nevada = (n = 600, ancho = 80) => { const p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (rnd() - 0.5) * ancho; p[i * 3 + 1] = rnd() * 30; p[i * 3 + 2] = (rnd() - 0.5) * ancho; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); escena.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.85 }))); vivos.push(() => { for (let i = 0; i < n; i++) { p[i * 3 + 1] -= 0.06; p[i * 3] += 0.03; if (p[i * 3 + 1] < 0) { p[i * 3 + 1] = 30; p[i * 3] = Math.sin(i * 12.9) * ancho * 0.5; } } g.attributes.position.needsUpdate = true; }); };
  let texRizo = null;
  const rizo = () => {   // mapa de normales de un oleaje menudo, hecho con senos para que encaje al repetirse
    if (!texRizo) { const N = 256, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), img = x.createImageData(N, N), T = 6.283;
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const u = i / N, w = j / N, dx = Math.cos(T * (3 * u + 2 * w)) * 3 + Math.cos(T * (7 * u + 6 * w) + 2) * 3.5 - Math.cos(T * (5 * w - u) + 1), dy = Math.cos(T * (3 * u + 2 * w)) * 2 + Math.cos(T * (7 * u + 6 * w) + 2) * 3 + Math.cos(T * (5 * w - u) + 1) * 5, l = Math.hypot(dx * 0.12, dy * 0.12, 1), k = (j * N + i) * 4; img.data[k] = (-dx * 0.12 / l * 0.5 + 0.5) * 255; img.data[k + 1] = (-dy * 0.12 / l * 0.5 + 0.5) * 255; img.data[k + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
      x.putImageData(img, 0, 0); texRizo = new THREE.CanvasTexture(c); texRizo.wrapS = texRizo.wrapT = THREE.RepeatWrapping; }
    return texRizo;
  };
  const lamina = (color, radio, y = 0.12, quieta = false) => {
    const n = rizo().clone(); n.repeat.set(radio / (quieta ? 14 : 10), radio / (quieta ? 14 : 10)); n.anisotropy = 4; n.needsUpdate = true;
    const o = disco(color, radio, y, { roughness: quieta ? 0.08 : 0.18, metalness: 0.35, transparent: true, opacity: 0.93, normalMap: n, normalScale: new THREE.Vector2(quieta ? 0.2 : 0.4, quieta ? 0.2 : 0.4) });
    vivos.push(t => { n.offset.set(t * (quieta ? 0.004 : 0.012), t * (quieta ? 0.003 : 0.02)); }); return o;
  };
  // nenúfares: hojas redondas con su muesca, algunas con flor, que suben y bajan apenas
  const nenufares = (n, radio, y, hueco = () => false) => {
    const hoja = new THREE.CircleGeometry(0.7, 12, 0.35, 5.6).rotateX(-Math.PI / 2), m = new THREE.InstancedMesh(hoja, new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }), n), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), eje = new THREE.Vector3(0, 1, 0), c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n * 4 && k < n; i++) { const a = rnd() * 6.28, r = rnd() * radio, cx = Math.cos(a) * r, cz = Math.sin(a) * r; if (hueco(cx, cz)) continue; for (let j = 0; j < 4 && k < n; j++) { const x = cx + (rnd() - 0.5) * 4, z = cz + (rnd() - 0.5) * 4, s = 0.6 + rnd() * 0.9; M.compose(new THREE.Vector3(x, y + 0.03, z), Q.setFromAxisAngle(eje, rnd() * 6.28), new THREE.Vector3(s, 1, s)); m.setMatrixAt(k, M); m.setColorAt(k++, c.setHex([0x4a6a36, 0x5a7a3e, 0x3f5a30][k % 3])); if (rnd() < 0.18) { const f = pieza(new THREE.ConeGeometry(0.22, 0.3, 7), mat(rnd() > 0.5 ? 0xf2e8ee : 0xe8a8c0), x, y + 0.2, z); f.rotation.x = Math.PI; f.userData.fijo = true; pieza(new THREE.SphereGeometry(0.08, 6, 5), mat(0xe8c040), x, y + 0.24, z).userData.fijo = true; } } }
    m.count = k; m.receiveShadow = true; escena.add(m); vivos.push(t => { m.position.y = Math.sin(t * 0.8) * 0.015; });
  };
  // burbujas de gas del fango: suben, crecen y revientan
  const burbujas = (n, radio, y) => { for (let i = 0; i < n; i++) { const b = pieza(new THREE.SphereGeometry(0.14, 8, 6), mat(0xcfe0d8, { transparent: true, opacity: 0.5, roughness: 0.1 }), 0, y, 0), an = pieza(new THREE.RingGeometry(0.2, 0.26, 16), new THREE.MeshBasicMaterial({ color: 0xdfeee6, transparent: true, opacity: 0, side: THREE.DoubleSide }), 0, y + 0.02, 0); b.castShadow = an.castShadow = false; an.rotation.x = -Math.PI / 2; const f = rnd() * 10, v = 0.25 + rnd() * 0.3; let x = 0, z = 0, vuelta = -1;
    vivos.push(t => { const u = (t * v + f) % 1, nv = Math.floor(t * v + f); if (nv !== vuelta) { vuelta = nv; x = (Math.sin(nv * 12.9898 + i) * 43758.5453 % 1) * radio; z = (Math.sin(nv * 78.233 + i * 3) * 43758.5453 % 1) * radio; } b.position.set(x, y - 0.3 + Math.min(1, u * 1.6) * 0.32, z); b.scale.setScalar(u < 0.62 ? 0.4 + u * 1.6 : 0.001); an.position.set(x, y + 0.02, z); const w = Math.max(0, (u - 0.62) / 0.38); an.scale.setScalar(1 + w * 5); an.material.opacity = w > 0 ? (1 - w) * 0.6 : 0; }); } };
  const juncos = (n, radio, hueco = () => false) => { const m = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 1.6, 4), mat(0x7a8a4a), n), M = new THREE.Matrix4(); let k = 0; for (let i = 0; i < n * 3 && k < n; i++) { const x = (rnd() - 0.5) * radio * 2, z = (rnd() - 0.5) * radio * 2; if (hueco(x, z)) continue; M.makeScale(1, 0.7 + rnd() * 0.8, 1).setPosition(x, 0.7, z); m.setMatrixAt(k++, M); } m.count = k; escena.add(m); };
  const cuervos = (pts) => pts.forEach(([x, y, z], i) => { const g = nido(x, z, 0, y); pieza(new THREE.SphereGeometry(0.28, 6, 5), mat(0x15151a), 0, 0, 0, g).scale.set(1, 0.9, 1.6); pieza(new THREE.ConeGeometry(0.07, 0.25, 4), mat(0x15151a), 0, 0.05, 0.5, g).rotation.x = Math.PI / 2; vivos.push(t => { g.rotation.y = Math.sin(t * 0.5 + i * 2) * 1.2; }); });
  const cintas = (x, y, z, n, radio) => { for (let i = 0; i < n; i++) { const a = i / n * 6.28, c = caja(mat([0xb23a2e, 0xe0c040, 0x2f6aa0, 0xf0ead8][i % 4]), 0.12, 1.1, 0.03, x + Math.cos(a) * radio, y + (i % 3) * 0.5, z + Math.sin(a) * radio); vivos.push(tt => { c.rotation.z = Math.sin(tt * 2.5 + i) * 0.4; }); } };
  let bruma = 0.0042;

  /* ================= ruinas ================= */
  const PARAJES = {
    // Las Criptas Silentes: una puerta enorme de sillería hundida en la ladera, bajo un bosque que casi no deja pasar la luz. Está cerrada.
    criptas() {
      suelo(0x3f4a2e); bruma = 0.017; pradera(2600, (x, z) => Math.abs(x) < 13 && z > -8 && z < 12, [0x2a4226, 0x3f5a30, 0x587044], 0, 70); const sillar = canto(0x8a8e80, 1.1, 2.0, 0.14), musgo = mat(0x4f5f3a), losa = mat(0x5c6058);
      const o = pieza(new THREE.SphereGeometry(34, 28, 14, 0, 6.3, 0, 1.5), mat(0x46552f), 0, -14, -34); o.scale.set(1.5, 0.95, 1);
      // fachada: cuatro columnas, entablamento, frontón y dos hojas de piedra sin tirador
      for (const x of [-10.5, -5.4, 5.4, 10.5]) { caja(sillar, 3.4, 1.2, 3.4, x, 0, -4); cil(sillar, 1.25, 1.4, 14, x, 1.2, -4, undefined, 14); caja(sillar, 3.2, 1.0, 3.2, x, 15.2, -4); for (let i = 0; i < 3; i++) cil(musgo, 1.42 - i * 0.03, 1.42, 0.5, x, 2 + i * 4.4 + rnd() * 2, -4, undefined, 14); }
      caja(sillar, 26, 2.4, 4.2, 0, 16.2, -4.4); caja(musgo, 26.6, 0.4, 4.6, 0, 18.6, -4.4); const fr = pieza(gTejado, sillar, 0, 21.4, -4.6); fr.scale.set(27, 5, 4.2); caja(musgo, 12, 0.5, 4.4, -3, 19.1, -4.4, 0.02);
      caja(mat(0x4a4e48), 15, 16.2, 2, 0, 0, -6.6); caja(losa, 4.4, 13, 0.9, -2.3, 0.6, -5.6); caja(losa, 4.4, 13, 0.9, 2.3, 0.6, -5.6); caja(mat(0x2e312c), 0.2, 13, 1.0, 0, 0.6, -5.56);
      for (const s of [-1, 1]) { caja(sillar, 1.2, 14, 1.6, s * 5.2, 0.6, -5.4); for (let i = 0; i < 5; i++) caja(sillar, 4, 3.4 - i * 0.5, 6 + i * 1.6, s * (15 + i * 3.4), 0, -6.4 - i * 0.6, s * 0.2); }
      caja(sillar, 11.6, 1.6, 1.8, 0, 13.6, -5.4);
      for (let i = 0; i < 7; i++) caja(sillar, 20 + i * 1.6, 0.4, 1.5, 0, 0.3 - i * 0.07, -1.8 + i * 1.5);
      // lo caído y lo que ha crecido encima
      const c1 = cil(sillar, 1.25, 1.35, 11, 13, 1.3, 6); c1.rotation.z = Math.PI / 2 - 0.06; c1.rotation.y = 0.5; c1.position.y = 1.5; cil(sillar, 1.35, 1.4, 2.6, -14, 0, 3, undefined, 14); cil(sillar, 1.3, 1.35, 1.4, -11, 0, 6, undefined, 14);
      for (let i = 0; i < 26; i++) roca(i % 3 ? sillar : musgo, 0.5 + rnd() * 1.1, (rnd() - 0.5) * 44, 0.3, 2 + rnd() * 22, 0.6);
      for (let i = 0; i < 8; i++) { const r = cil(mat(0x33261a), 0.18, 0.4, 9 + rnd() * 5, -9 + i * 2.6 + rnd(), 12 + rnd() * 3, -4.2 + rnd() * 0.6, undefined, 5); r.rotation.z = (rnd() - 0.5) * 0.5; }   // raíces que bajan por la fachada
      // el bosque: cerrado por todas partes menos por donde se llega
      const pts = []; for (let i = 0; i < 900 && pts.length < 230; i++) { const x = (rnd() - 0.5) * 190, z = -70 + rnd() * 170; if (Math.abs(x - z * 0.2) < 21 + Math.max(0, z) * 0.22 && z > -8) continue; if (Math.abs(x) < 16 && z < -2 && z > -30) continue; pts.push([x, z, 1.5 + rnd() * 1.5]); }
      arboleda(pts, [0x243a22, 0x2f4a2a, 0x2a4226, 0x35502c], { alto: 1.5 });
      for (const [x, z] of [[-20, 8], [21, 12], [-26, 22], [17, 26]]) arbol(x, z, 2.2, 0, true);
      // la gente del reino deja avisos y no pasa de aquí
      for (let i = 0; i < 9; i++) { const x = -14 + i * 3.5, z = 24 + Math.sin(i) * 1.4, p = cil(mat(0x4a3a2a), 0.12, 0.16, 3.2, x, 0, z, undefined, 5); p.rotation.z = (rnd() - 0.5) * 0.3; const t = caja(mat(i % 2 ? 0x8a2a22 : 0xd8d0c0), 0.9, 1.1, 0.04, x + 0.4, 1.9, z); vivos.push(tt => { t.rotation.y = Math.sin(tt * 2 + i) * 0.5; }); }
      cuervos([[-4, 19.4, -4.2], [1.5, 19.4, -4.2], [6, 19.4, -4.2], [-12, 2.9, 3]]);
      niebla(26, 0.8, 46, 0.42, 0xdfe8dc, 30);
      rotulo('La puerta', 0, 17, -3); rotulo('Estacas de aviso', 0, 6, 24);
      return { pos: [14, 9, 52], objetivo: [0, 8.5, 0], cielo: 0x4a5a4a, R: 46, limite: 44, luz: 0.55 };
    },
    // La Cuna de los Demonios: una grieta en la roca, en un circo de nieve. Los clanes la guardan como suelo sagrado.
    cuna() {
      suelo(0xe6ecf2); bruma = 0.012; const basalto = mat(0x2e3138), hielo = mat(0xcfe6f4, { roughness: 0.2, emissive: 0x2a6a9a, emissiveIntensity: 0.25 });
      for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (i / 15 - 0.5) * 2.6, d = 22 + rnd() * 6; roca(basalto, 8 + rnd() * 5, Math.cos(a) * d, 5 + rnd() * 5, Math.sin(a) * d - 2, 1.4 + rnd() * 0.8); }
      for (const s of [-1, 1]) { const p = roca(basalto, 5, s * 6.6, 5, -9.5, 2.0); p.rotation.set(0, s * 0.4, s * 0.12); }
      caja(mat(0x08090c), 3.2, 9, 3, 0, 0, -9.5); const d = caja(basalto, 9, 1.6, 3.4, 0, 9, -8.6); d.rotation.z = 0.06;
      for (let i = 0; i < 9; i++) { const c = pieza(new THREE.ConeGeometry(0.25 + rnd() * 0.25, 1.5 + rnd() * 2, 5), hielo, -3.6 + i * 0.9, 8.3 - rnd() * 0.4, -7.2 + rnd() * 0.6); c.rotation.x = Math.PI; }
      for (const s of [-1, 1]) {
        enser(gPebetero(2.2, 0.9), s * 5.4, 1.5); const b = cil(new THREE.MeshStandardMaterial({ color: 0x0a1420, emissive: 0x58b8ff, emissiveIntensity: 2.2 }), 0.75, 0.75, 0.14, s * 5.4, 2.5, 1.5);
        const f = pieza(new THREE.ConeGeometry(0.5, 1.6, 6), new THREE.MeshBasicMaterial({ color: 0xa8dcff, transparent: true, opacity: 0.8 }), s * 5.4, 3.5, 1.5); vivos.push(t => { f.scale.y = 0.8 + 0.3 * Math.sin(t * 8 + s); b.material.emissiveIntensity = 2 + 0.4 * Math.sin(t * 3 + s); });
        const luz = new THREE.PointLight(0x8fd0ff, 120, 40, 1.7); luz.position.set(s * 5.4, 4, 1.5); escena.add(luz);
        for (let i = 0; i < 4; i++) { const x = s * (7 + i * 2.6), z = 5 + i * 3.4; cil(mat(0x3a3028), 0.1, 0.14, 4.4, x, 0, z, undefined, 5); for (let k = 0; k < 3; k++) { const t = caja(mat([0x7a2e2a, 0x2f4a6a, 0xd8d0c0][(i + k) % 3]), 0.9, 0.28, 0.03, x + 0.45, 3.8 - k * 0.5, z); vivos.push(tt => { t.rotation.y = Math.sin(tt * 3 + i + k) * 0.6; t.position.x = x + Math.cos(t.rotation.y) * 0.45; t.position.z = z - Math.sin(t.rotation.y) * 0.45; }); } }
      }
      caja(basalto, 4.4, 0.9, 2.2, 0, 0, 2.6); for (let i = 0; i < 4; i++) roca(mat(0x7a6a56), 0.5, -1.4 + i * 0.95, 1.2, 2.6, 0.5); for (const s of [-1, 1]) { const a = pieza(new THREE.ConeGeometry(0.14, 2.0, 5), mat(0xe8dfc8), s * 1.9, 1.7, 2.9); a.rotation.z = -s * 0.5; }
      for (let i = 0; i < 12; i++) roca(mat(0xf2f6fa), 1 + rnd() * 1.6, (rnd() - 0.5) * 44, 0.3, 6 + rnd() * 26, 0.45);
      for (let i = 0; i < 7; i++) pino(-26 + rnd() * 8 + (i % 2) * 44, 14 + rnd() * 20, 1.1 + rnd() * 0.5, 0x3a5046);
      nevada();
      rotulo('La grieta', 0, 12.5, -8.6); rotulo('Ofrendas de los clanes', 0, 4, 2.6); rotulo('Postes de oración', 12, 6.5, 9);
      return { pos: [12, 12, 36], objetivo: [0, 4.5, -2], cielo: 0x9aa8b8 };
    },
    // El Sagrario del Surco: un cenobio hundido en el trigal. Solo asoma la mitad de arriba; lo demás lo tapa la tierra de labor.
    sagrario() {
      const HOYA = 26, FONDO = -4.2, arenisca = canto(0xd2c098, 0.95, 1.7, 0.03), sombra = canto(0xb5a37c, 0.95, 1.7, 0.03), tierra = mat(0x6a4e32);
      const campo = pieza(new THREE.RingGeometry(HOYA, 150, 48), matSuelo(0xb0903e), 0, 0, 0); campo.rotation.x = -Math.PI / 2; campo.castShadow = false;
      const talud = pieza(new THREE.CylinderGeometry(HOYA + 0.4, HOYA - 4, -FONDO, 40, 1, true), mat(0x7a5a3a, { side: THREE.BackSide }), 0, FONDO / 2, 0); talud.castShadow = false;
      disco(0x5f452c, HOYA - 3.6, FONDO, undefined, true);
      // mies alrededor de la hoya: matas de espigas que se mecen con el viento
      trigal(5200, (x, z) => Math.hypot(x, z) < HOYA + 1.2 || (Math.abs(x - 21) < 2.4 && z > 16), HOYA + 1.2);
      const muro = (x, z, w, d, alto, ry = 0) => caja(arenisca, w, alto - FONDO, d, x, FONDO, z, ry);
      // la iglesia: nave sin techo, con los muros a distinta altura, y lo que queda de la espadaña
      muro(-7, -6, 1.4, 26, 5.5); muro(7, -11, 1.4, 16, 6.5); muro(7, 3.5, 1.4, 6, 2.2); muro(0, -19, 15.4, 1.4, 8); muro(-4.6, 7, 4.6, 1.4, 4); muro(4.6, 7, 4.6, 1.4, 1.6);
      muro(0, -19.6, 5, 2.2, 13); for (const s of [-1, 1]) caja(arenisca, 1.2, 3.4, 2.2, s * 1.9, 13, -19.6); caja(arenisca, 2.2, 1.0, 2.2, -1.4, 16.4, -19.6); caja(mat(0x14161a), 2.4, 3, 0.4, 0, 8.4, -18.5);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { caja(sombra, 1.6, 9 - FONDO - i * 0.9 - (s > 0 && i > 1 ? 4 : 0), 1.2, s * 8.2, FONDO, -16 + i * 6); }   // contrafuertes
      for (const z of [-14, -8, -2]) { caja(mat(0x14161a), 0.3, 3.4, 1.6, -6.4, 1.0, z); caja(mat(0x14161a), 0.3, 3.4, 1.6, 6.4, 1.6, z); }   // ventanas ciegas
      for (let i = 0; i < 3; i++) { const z = -14 + i * 6.5, a = pieza(new THREE.TorusGeometry(6.2, 0.6, 6, 18, Math.PI), arenisca, 0, 1.5, z); if (i === 2) { a.geometry = cantear(new THREE.TorusGeometry(6.2, 0.6, 6, 10, Math.PI * 0.55), arenisca.userData.sillar); } }   // arcos fajones; el último, roto
      // claustro al lado: arquerías a medias y un pozo cegado
      for (let i = 0; i < 6; i++) { const x = 11 + i * 2.9; cil(arenisca, 0.42, 0.5, 4.6 - FONDO - (i > 3 ? 2.6 : 0), x, FONDO, 4, undefined, 10); cil(arenisca, 0.42, 0.5, 3 - FONDO - (i % 2) * 2, x, FONDO, -10, undefined, 10); if (i < 3) { const a = pieza(new THREE.TorusGeometry(1.45, 0.3, 5, 12, Math.PI), arenisca, x + 1.45, 4.6, 4); } }
      for (let i = 0; i < 5; i++) cil(arenisca, 0.42, 0.5, 2.4 - FONDO + (i % 2), 25.5, FONDO, -10 + i * 3.5, undefined, 10);
      caja(arenisca, 10, 0.7, 0.9, 15.4, 6.1, 4); cil(sombra, 1.5, 1.6, 1.4, 18, FONDO, -3, undefined, 12); cil(mat(0x1a1410), 1.2, 1.2, 0.1, 18, FONDO + 1.4, -3, undefined, 12);
      // la escalera que baja: lo que encontró el arado
      for (let i = 0; i < 7; i++) caja(sombra, 4.4, 0.5, 1.1, 0, FONDO - 0.5 - i * 0.55, -3 - i * 1.05);
      caja(mat(0x060504), 4.6, 0.2, 9, 0, FONDO - 0.02, -6.6).castShadow = false; for (const s of [-1, 1]) caja(arenisca, 0.8, 1.6, 9.4, s * 2.7, FONDO, -6.6); caja(arenisca, 6.2, 1.4, 1.0, 0, FONDO + 1.6, -11.6);
      for (let i = 0; i < 40; i++) roca(i % 3 ? arenisca : tierra, 0.4 + rnd() * 0.9, (rnd() - 0.5) * 40, FONDO + 0.3, -20 + rnd() * 34, 0.6);
      for (const [x, z, ry] of [[-11, 2, 0.4], [-13, -8, 1.2], [3, 12, 0.2]]) { const c = cil(arenisca, 0.5, 0.55, 5, x, FONDO + 0.5, z, undefined, 10); c.rotation.z = Math.PI / 2; c.rotation.y = ry; c.position.y = FONDO + 0.5; }
      // rampa por donde bajan los curiosos, el arado y el surco a medias
      const rampa = caja(tierra, 4.6, 0.4, 12, 21, FONDO / 2 - 0.2, 21); rampa.rotation.x = -0.36; rampa.castShadow = false;
      const ar = nido(21, 30, 0.1); caja(mat(0x5a4633), 0.2, 0.2, 4.4, 0, 0.8, 0.6, 0, ar).rotation.x = 0.16; caja(mat(0x2b2b2e), 0.12, 1.1, 0.8, 0, 0, -1.3, 0, ar).rotation.x = 0.5; for (const s of [-0.4, 0.4]) caja(mat(0x5a4633), 0.1, 1.6, 0.1, s, 0.7, -2.1, 0, ar).rotation.x = -0.7; const rd = cil(mat(0x3a2a1c), 0.55, 0.55, 0.12, 0, 0, 2.4, ar, 12); rd.rotation.z = Math.PI / 2; rd.position.y = 0.55;
      caja(tierra, 1.2, 0.2, 44, 21, 0, 54);
      // lo que deja la gente del campo
      cil(mat(0x3a2a1c), 0.3, 0.45, 2.6, -29, 0, 8, undefined, 6); roca(mat(0x5a6a3a), 2.4, -29, 3.8, 8, 0.8); roca(mat(0x6a7a42), 1.6, -27.8, 4.8, 7.4, 0.8); cintas(-29, 2.4, 8, 9, 2.2);
      for (let i = 0; i < 6; i++) { const g = pieza(new THREE.ConeGeometry(0.5, 1.7, 7), mat(0xd9b24e), -8 + i * 1.6, 0.85, 27.4 + (i % 2) * 0.5); g.rotation.z = (i % 2 - 0.5) * 0.25; }
      faena(figura(25, 27, -2.4, 0x8a6a48), 'habla', 0.6); faena(figura(23.4, 28.2, 1.2, 0x5a6b3a), 'escucha'); const cur = figura(-3, 2, 0, 0x6a5a2f, escena, 0, 1, { tipo: 'aldeano', lleva: 'cayado' }); cur.position.y = FONDO; anda(cur, [[-3, 4], [3.6, 4], [3.6, -1], [-3.6, -1]], 0.9);
      rotulo('La nave', 0, 11, -8); rotulo('La espadaña', 0, 20, -19.6); rotulo('La escalera', 0, 1.5, -6); rotulo('El claustro', 18, 8.5, -3); rotulo('El arado', 21, 4, 30); rotulo('Espino de las cintas', -29, 8, 8);
      return { pos: [24, 22, 46], objetivo: [2, 1, -6], cielo: 0xbcd0e0, R: 46, limite: 44 };
    },
    // La Ciudad Ahogada: torres rotas en mitad del lago, vistas desde el agua. Los pescadores no pasan de las boyas.
    ahogada() {
      suelo(0x163f55, 260, { plano: true }).position.y = -3; lamina(0x1f5a78, 260, 0.02); bruma = 0.0058;
      const cal = canto(0xcfccc0, 1.0, 1.9, 0.12), verdin = mat(0x5a6a52), hueco = mat(0x0a0d10);
      for (const [x, z, r, h, vencida] of [[0, -14, 4.2, 20, 0], [-12, -22, 3.0, 12, 0.12], [11, -24, 3.2, 16, -0.08], [-5, -36, 2.6, 8, 0], [20, -12, 2.4, 6, 0.25], [-22, -8, 2.6, 4.5, -0.2], [6, -44, 3.6, 11, 0.05], [-18, -40, 2.4, 5, 0.3], [24, -34, 2.8, 9, -0.12]]) {
        const g = nido(x, z, 0, -1.5); g.rotation.z = vencida;
        cil(cal, r, r * 1.08, h, 0, 0, 0, g, 14); cil(verdin, r * 1.1, r * 1.12, 2.4, 0, 0, 0, g, 14);
        for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; if ((i * 7) % 3 === 0) continue; caja(cal, r * 0.5, 0.8 + ((i * 5) % 3) * 0.9, r * 0.35, Math.cos(a) * r * 0.92, h, Math.sin(a) * r * 0.92, -a + Math.PI / 2, g); }
        for (let q = 0; q < Math.floor(h / 4); q++) for (let i = 0; i < 3; i++) { const a = i * 2.1 + q; caja(hueco, 0.7, 1.5, 0.3, Math.sin(a) * r * 0.98, 3.4 + q * 3.6, Math.cos(a) * r * 0.98, a, g); }
      }
      for (const [x0, z0, x1, z1] of [[0, -14, -12, -22], [0, -14, 11, -24], [11, -24, 6, -44], [-12, -22, -5, -36]]) { const d = Math.hypot(x1 - x0, z1 - z0); caja(cal, d - 6, 3, 1.4, (x0 + x1) / 2, -1.6, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0)); }
      // un puente que ya no une nada y la cúpula de algo grande, a ras de agua
      for (let i = 0; i < 4; i++) { const a = pieza(new THREE.TorusGeometry(3, 0.7, 6, 14, Math.PI), cal, 30 + i * 6.4, 0, -22); if (i === 2) a.visible = false; caja(cal, 1.6, 3, 1.6, 27 + i * 6.4, -1.5, -22); } caja(cal, 12, 0.8, 2.2, 33, 3.3, -22); caja(cal, 5, 0.8, 2.2, 47.5, 3.3, -22, 0.1);
      const cup = pieza(new THREE.SphereGeometry(7, 14, 8, 0, 6.3, 0, 1.1), verdin, -30, -3.5, -30); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; cil(cal, 0.4, 0.5, 4, -30 + Math.cos(a) * 5.4, -1, -30 + Math.sin(a) * 5.4, undefined, 8); }
      for (let i = 0; i < 14; i++) roca(i % 2 ? cal : verdin, 0.8 + rnd() * 1.4, -28 + rnd() * 60, 0.1, -46 + rnd() * 40, 0.5);
      // boyas: hasta aquí llegan las redes. Las barcas faenan de este lado, y la orilla queda lejos, al fondo
      for (let i = 0; i < 15; i++) { const a = (i / 14 - 0.5) * 2.6, x = Math.sin(a) * 44, z = 12 - Math.cos(a) * 14, b = pieza(new THREE.SphereGeometry(0.55, 8, 6), mat(i % 2 ? 0xb23a2e : 0xe8e0d0), x, 0.25, z); vivos.push(t => { b.position.y = 0.25 + Math.sin(t * 1.4 + i) * 0.12; }); }
      for (const [x, z, ry, vela] of [[-9, 24, 0.4, 'recogidas'], [8, 30, -0.5, 'ninguna'], [-24, 34, 1.1, 'recogidas'], [26, 20, 2.6, 'dadas']]) { const b = crearBarcoModelo({ eslora: 5.5, palos: 1, velas: vela, lona: 0xd9cfb8 }), g = nido(x, z, ry, 0.05); g.add(b); faena(figura(-0.6, 0, Math.PI / 2, 0x4a5a6a, g, 0.42, 0.8, { tipo: 'marino' }), 'remueve', 0.5, { piernas: 'sentado', asiento: 0.34 }); vivos.push(t => { g.position.y = 0.05 + Math.sin(t * 0.9 + x) * 0.08; g.rotation.z = Math.sin(t * 0.7 + x) * 0.03; }); }
      const orilla = pieza(new THREE.CylinderGeometry(238, 236, 9, 60, 1, true), mat(0x4f6a4a, { side: THREE.BackSide }), 0, 4, 0); orilla.castShadow = false;
      for (let i = 0; i < 40; i++) { const a = i / 40 * 6.28 + rnd() * 0.1; roca(mat(i % 2 ? 0x3f5a3c : 0x4a6646), 12 + rnd() * 9, Math.cos(a) * 232, 6 + rnd() * 5, Math.sin(a) * 232, 0.8); }
      niebla(14, 2.2, 60, 0.3, 0xffffff, 34);
      rotulo('Torres rotas', 0, 23, -14); rotulo('Boyas: hasta aquí las redes', 0, 3.5, -2); rotulo('El puente', 36, 7, -22);
      return { pos: [10, 8, 66], objetivo: [0, 6, -8], cielo: 0x8aa0b0, R: 56, limite: 46 };
    },

    /* ================= lugares habitados y de paso ================= */
    pueblo() {
      const REG = { valcoria: [0x587a3c, 0xd2c4a4, 0xa5512c], marendol: [0xc2a455, 0xe6dcc0, 0xb5652a], astravan: [0x5a8a4c, 0xd8d0c0, 0x56508a] }[l.region] || [0x587a3c, 0xd2c4a4, 0xa5512c], [verde, pared, teja] = REG, lago = l.id === 'claro';
      suelo(l.region === 'marendol' ? 0xb0903e : verde); disco(0xc2b494, 31, 0.02); disco(0xcbbd9c, 9, 0.03); caja(mat(0xc2b494), 6, 0.06, 120, 0, 0, 14).castShadow = false; caja(mat(0xc2b494), 90, 0.06, 5, 0, 0, 0).castShadow = false;
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28 + 0.2, r = 15 + (i % 3) * 5, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) < 5 || (lago && x > 22)) continue; casa(x, z, 5 + rnd() * 2, 4.4 + rnd(), 3.2 + rnd() * 1.2, -a + Math.PI / 2 + (rnd() - 0.5) * 0.3, { pared, teja, chim: i % 2 === 0, entramado: l.region !== 'marendol' }); if (i % 4 === 0) humo(x + 1.4, 6.5, z, false); }
      // ermita con espadaña, pozo, puestos y gente
      const e = casa(-9, -9, 5.4, 9, 5, 0.6, { pared: 0xdad2c0, teja, piedra: true }); caja(mat(0xbdb4a2), 2.6, 9, 2.6, 0, 0, -5.4, 0, e); pieza(gTejado, mat(teja), 0, 10.3, -5.4, e).scale.set(3.2, 2.6, 3.2); cil(mat(0xd9b24e), 0.4, 0.5, 0.7, 0, 7.4, -4.0, e, 8);
      enser(gPozo(), 0, 0, 0.3, 1.25).userData.fijo = true;
      for (let i = 0; i < 3; i++) enser(gPuesto([0xc9283c, 0x2f6fb5, 0xe8a23a][i], i !== 2), 4 + i * 3.2, -5, 0, 0.86).userData.fijo = true;
      // vecinos: dos de charla junto al pozo, los tenderos, gente que va y viene, críos corriendo y un perro detrás
      faena(figura(2.2, 2.6, -2.2, 0x7a3b2e), 'habla'); faena(figura(0.8, 3.6, 1.0, 0x2f4f6f), 'jarras');
      for (let i = 0; i < 3; i++) faena(figura(4 + i * 3.2, -6.1, 0, [0x5a6b3a, 0x8a7a55, 0x6a5a2f][i], escena, 0, 1, { tipo: i === 1 ? 'aldeana' : 'mercader' }), i === 1 ? 'remueve' : 'habla', 0.8);
      faena(figura(5.6, -3.2, Math.PI, 0x4a3a5a, escena, 0, 1, { tipo: 'aldeana', llevaI: 'cesta' }), 'escucha'); anda(figura(0, 0, 0, 0x6a2f3a), [[1.6, 30], [1.6, 4], [-4, -3], [-1.6, -28], [-1.6, 4]], 1.5); anda(figura(0, 0, 0, 0x3f5a5a, escena, 0, 1, { tipo: 'aldeana', llevaI: 'cesta' }), [[-30, 1.4], [-4, 1.4], [3, 4], [30, -1.4], [3, -1.4]], 1.3); anda(figura(0, 0, 0, 0x8a6a48, escena, 0, 1, { tipo: 'aldeano', carga: ['saco'], estado: { brazos: 'carga' } }), [[10, 9], [-6, 11], [-12, 4], [-5, -3], [6, 2]], 1.1);
      const corro = Array.from({ length: 12 }, (_, i) => [Math.cos(i / 12 * 6.28) * 4.6, Math.sin(i / 12 * 6.28) * 4.6]); for (let i = 0; i < 2; i++) anda(figura(0, 0, 0, [0xb23a2e, 0x2f6aa0][i], escena, 0, 0.62, { tipo: 'crio' }), corro, 3.4 + i * 0.3);
      const perro = res(0, 0, 0, 0x6a4a2e, 0.62); vivos.push(t => { const a = t * 0.72 + 1.2; perro.visible = nocheAhora < 0.6; perro.position.set(Math.cos(a) * 5.6, Math.abs(Math.sin(t * 9)) * 0.08, Math.sin(a) * 5.6); perro.rotation.y = -a; });
      for (let i = 0; i < 5; i++) gallina(-15 + rnd() * 3, -2 + rnd() * 3, [0xe8e0d0, 0x8a5a36, 0xc9a06a][i % 3]);
      farol(-4.4, -4.6, 0.8); farol(7, 6, 3.6); farol(-3, 8.6, -0.6);
      carro(-4, 14, 0.2); barril(6, 4); barril(7, 4.6); for (let i = 0; i < 3; i++) res(-16 + i * 1.6, 12 + (i % 2), rnd() * 6, 0xf0ece0, 1.2);
      cerca(-20, 9, -12, 9); cerca(-20, 9, -20, 16); cerca(-20, 16, -12, 16);
      if (lago) {   // pueblo de pescadores: la orilla, el embarcadero y las redes
        const a = lamina(0x1f5a78, 60, 0.1); a.position.set(86, 0.1, 0); for (let i = 0; i < 9; i++) caja(mat(0x6b5440), 1.6, 0.14, 1.2, 28 + i * 1.2, 0.5, 2); for (let i = 0; i < 4; i++) cil(mat(0x4a3a2a), 0.12, 0.12, 2.4, 30 + i * 2.6, -1, 2.7, undefined, 5);
        for (const [x, z, ry] of [[36, -2, 0.3], [34, 6, -0.2], [40, 8, 1.2]]) { const b = crearBarcoModelo({ eslora: 4.4, palos: 1, velas: 'recogidas', lona: 0xd9cfb8 }); b.position.set(x, 0.14, z); b.rotation.y = ry; escena.add(b); }
        for (let i = 0; i < 3; i++) { const x = 20, z = -10 + i * 3.4; for (const s of [-1.4, 1.4]) cil(mat(0x4a3a2a), 0.08, 0.1, 2.6, x, 0, z + s, undefined, 5); caja(mat(0x4a3a2a), 0.1, 0.1, 3, x, 2.6, z); caja(mat(0x5a6a5a, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 0.04, 2.0, 2.8, x, 0.6, z); }
        rotulo('Embarcadero', 32, 4, 2);
      } else if (l.region === 'marendol') { for (let i = 0; i < 8; i++) pieza(new THREE.ConeGeometry(1.1, 1.8, 8), mat(0xd2aa4e), 26 + (i % 4) * 3, 0.9, -14 + Math.floor(i / 4) * 4); trigal(5200, (x, z) => Math.abs(x) < 4.5 || Math.abs(z) < 4 || (x > 22 && x < 40 && z > -18 && z < -6), 33); }
      else arboleda(Array.from({ length: 60 }, () => { const a = rnd() * 6.28, d = 36 + rnd() * 50; return [Math.cos(a) * d, Math.sin(a) * d, 1.1 + rnd() * 0.9]; }).filter(p => Math.abs(p[0]) > 6), [0x2f4a2a, 0x3a5a30, 0x4a5a2a]);
      if (l.region !== 'marendol') pradera(2600, (x, z) => Math.abs(x) < 4.5 || Math.abs(z) < 3.6 || (lago && x > 24), l.region === 'astravan' ? [0x3f7a3a, 0x6aa44e, 0x8ac060] : undefined, 30);
      if (l.region !== 'valcoria') for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, d = 34 + rnd() * 30, x = Math.cos(a) * d; if (Math.abs(x) > 6 && !(lago && x > 16)) arbol(x, Math.sin(a) * d, 1 + rnd() * 0.6); }
      rotulo('Ermita', -9, 14, -11); rotulo('Plaza del pozo', 0, 6, 0);
      return { pos: [24, 30, 52], objetivo: [2, 1, -2], cielo: 0xa8c4dc, R: 46, limite: 42 };
    },
    posta() {
      const nieve = l.region === 'thraengarde', esLlano = l.region === 'marendol', var_ = { roble: 0, cuervo: 1, marca: 2, viento: 3 }[l.id] ?? [...l.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 4, AT = [15, 12, 17.5, 13.5][var_], piedra = canto([0x8d8372, 0x9a8f7a, 0x7f7a70, 0x94887a][var_], 1.0, 1.9, nieve ? 0 : 0.05), teja = nieve ? 0xe4eaf0 : 0x6b4a32, VISTA = [[22, 14, 40], [-27, 13, 36], [30, 16, 30], [-20, 15, 42]][var_], lejosDeVista = pts => pts.filter(([x, z]) => Math.hypot(x - VISTA[0], z - VISTA[2]) > 15);
      suelo(nieve ? 0xe6ecf2 : esLlano ? 0xb0903e : 0x587a3c); disco(nieve ? 0xd8dfe6 : 0xbfae8c, 17, 0.02); caja(mat(nieve ? 0xcfd6de : 0xc2b494), 6, 0.06, 130, 3, 0, 0, 0.25).castShadow = false; if (nieve) bruma = 0.012;
      // la torre de la posta, con cadalso de madera
      caja(piedra, 7.6, 1.6, 7.6, -6, 0, -4); caja(piedra, 7, AT, 7, -6, 0, -4); caja(mat(0x5a4633), 9.4, 1.0, 9.4, -6, AT, -4); for (const [x, z] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) { caja(mat(0x5a4633), 0.5, 3.6, 0.5, -6 + x, AT + 1, -4 + z); const jab = caja(mat(0x4a3a2a), 0.3, 2.4, 0.3, -6 + x * 0.94, AT - 1.9, -4 + z * 0.94); jab.rotation.set(-z * 0.11, 0, x * 0.11); } for (const s of [-1, 1]) { caja(mat(0x6a5039), 9.4, 1.6, 0.3, -6, AT + 1, -4 + s * 4.4); caja(mat(0x6a5039), 0.3, 1.6, 9.4, -6 + s * 4.4, AT + 1, -4); }
      pieza(gTejado, matTeja(teja), -6, AT + 6.4, -4).scale.set(10.6, 4, 10.6); caja(mat(0x3a2a1c), 1.6, 2.8, 0.2, -6, 0, -0.45); for (const y of [AT * 0.33, AT * 0.63]) caja(mat(0x14161a), 0.7, 1.6, 0.2, -6, y, -0.45);
      const asta = cil(mat(0x3a2c20), 0.12, 0.12, 5, -6, AT + 8, -4, undefined, 5), ban = pieza(new THREE.PlaneGeometry(3.4, 1.8, 8, 1).translate(1.7, 0, 0), mat(nieve ? 0x4f7fa8 : esLlano ? 0xb08a2e : 0x3f7a3a, { side: THREE.DoubleSide }), -6, AT + 12, -4); vivos.push(t => { const p = ban.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 2 - t * (esLlano ? 11 : 6)) * (esLlano ? 0.34 : 0.18) * x); } p.needsUpdate = true; });
      // casa de postas, cuadra y abrevadero
      casa(7, -8, 9, 6, 4.2, -0.2, { teja, chim: true, pared: nieve ? 0x8a8478 : 0xd2c4a4 }); humo(9.4, 8, -8, false); const cu = nido(12, 3, -0.2); caja(mat(0x7a5c3e), 9, 3.2, 0.3, 0, 0, -2, 0, cu); for (const s of [-1, 1]) caja(mat(0x7a5c3e), 0.3, 3.2, 4, s * 4.35, 0, 0, 0, cu); for (let i = 0; i < 4; i++) caja(mat(0x3a2a1c), 0.3, 3.2, 0.3, -4.35 + i * 2.9, 0, 2, 0, cu); const tj = caja(mat(new THREE.Color(teja).multiplyScalar(0.9).getHex()), 9.8, 0.2, 5.2, 0, 3.6, 0, 0, cu); tj.rotation.x = 0.2; for (let i = 0; i < 6; i++) { const ri = caja(mat(0x3a2a1c), 0.14, 0.1, 5.3, -4.5 + i * 1.8, 3.74, 0, 0, cu); ri.rotation.x = 0.2; }
      const ab = nido(2, 6, 0.25); caja(mat(0x6a5039), 3.4, 0.7, 1.1, 0, 0, 0, 0, ab); caja(mat(0x3f6f80, { roughness: 0.2 }), 3.0, 0.05, 0.8, 0, 0.68, 0, 0, ab);
      const cab = nido(12.5, 3.2, Math.PI - 0.2); for (const [x, c] of [[-2.9, 0x6a4326], [0, 0x2f2620]]) enser(gCaballo(c), x, 0, 0, 1.05, 0, cab);
      const sen = nido(-1, 10, 0.3); cil(mat(0x5a4633), 0.14, 0.16, 4, 0, 0, 0, sen, 6); for (let i = 0; i < 2; i++) caja(mat(0x8a6a48), 2.2, 0.5, 0.1, (i ? -1 : 1) * 1.0, 3.2 - i * 0.7, 0, 0, sen);
      carro(6, 12, 0.6); barril(-1, -1); barril(0, -1.6); faena(figura(9.6, 6.6, 0.4, 0x6a5a2f, escena, 0, 1, { tipo: 'aldeano', lleva: 'martillo', delantal: 0x7a4a28, mangaCorta: true }), 'golpea', 1.4, { flexion: 0.15 }); anda(figura(0, 0, 0, 0x4a5a6a, escena, 0, 1, { tipo: 'guardia', ...(l.region === 'thraengarde' ? { manto: 0x8a8478 } : {}) }), [[-3, 2], [1.4, 7.2], [8, 8], [1.4, 7.2]], 1.2); farol(-1.4, 0.6, 0.6); if (!nieve) for (let i = 0; i < 4; i++) gallina(13 + rnd() * 3, 9 + rnd() * 3, [0xe8e0d0, 0x8a5a36][i % 2]);
      if (nieve) { for (let i = 0; i < 12; i++) { const an = 9 + rnd() * 9, al = 14 + rnd() * 24, o = pieza(gRisco(i % 5), matUtil, (rnd() - 0.5) * 110, al / 2 - 1.5, -34 - rnd() * 42); o.scale.set(an, al, an); o.rotation.y = rnd() * 6.28; o.castShadow = false; } for (let i = 0; i < 9; i++) pino((rnd() - 0.5) * 70, 20 + rnd() * 30, 1.2 + rnd() * 0.6, 0x3a5046); cil(mat(0x2b2b2e), 1.2, 0.8, 0.6, -6, AT + 8.4, -4); nevada(500); rotulo('Almenara', -6, AT + 15, -4); }
      else if (esLlano) { arbol(-22, 8, 1.6, 0x6a7a3a); trigal(5200, (x, z) => Math.abs(x - 3 - z * 0.26) < 4.5, 19, undefined); }
      else { arbol(-20, 6, 4.2, 0x35502c); pradera(2600, (x, z) => Math.abs(x - 3 - z * 0.26) < 4.5, undefined, 18); arboleda(lejosDeVista(Array.from({ length: 50 }, () => { const a = rnd() * 6.28, d = 34 + rnd() * 50; return [Math.cos(a) * d, Math.sin(a) * d, 1.1 + rnd() * 0.9]; })), [0x2f4a2a, 0x3a5a30]); if (l.id === 'roble') rotulo('El roble', -20, 22, 6); }
      if (var_ === 1) { enser(gPozo(), -17, 9, 0.6, 1.2).userData.fijo = true; caja(mat(0x5a4633), 3.4, 0.7, 1.1, -13.5, 0, 12, 0.5); caja(mat(0x3f6a80), 3.0, 0.1, 0.7, -13.5, 0.62, 12, 0.5); rotulo('Pozo', -17, 5, 9); }
      else if (var_ === 2) { for (let i = 0; i < 22; i++) { const a = 2.2 + i * 0.13, q = cil(mat(i % 3 ? 0x5a4633 : 0x4a3a2a), 0.22, 0.26, 2.6 + (i % 4) * 0.2, Math.cos(a) * 21 - 2, 0, Math.sin(a) * 21 - 2, undefined, 5); q.userData.fijo = true; } for (let i = 0; i < 9; i++) { const t = cil(mat(0x6a5039), 0.22, 0.22, 2.2, -15 + (i % 3) * 0.48, 0.25 + Math.floor(i / 3) * 0.44, 10, undefined, 6); t.rotation.x = Math.PI / 2; } rotulo('Leñera', -15, 3.5, 10); }
      else if (var_ === 3) { for (const [x, z, k] of [[17, -13, 1], [21, -9, 0.8], [14, -17, 0.7]]) { const al = pieza(new THREE.ConeGeometry(2.6 * k, 3.6 * k, 9), mat(0xc9a84e), x, 1.8 * k, z); al.userData.fijo = true; cil(mat(0x5a4633), 0.08, 0.08, 4.4 * k, x, 0, z, undefined, 4); } rotulo('Almiares', 17, 5.5, -13); }
      rotulo('Torre de la posta', -6, AT + (nieve ? 19 : 15), -4); rotulo('Cuadra', 12, 6, 3);
      return { pos: VISTA, objetivo: [0, 6, -2], cielo: nieve ? 0x9aa8b8 : 0xa8c4dc, R: 44, limite: 40 };
    },
    // Puesto de Vigía Quemado
    quemado() {
      suelo(0x4a5a34); disco(0x2a2622, 16, 0.03); pradera(2400, () => false, [0x3a4a2a, 0x5a6a3a, 0x7a7a4a], 17); const carbon = mat(0x3b3531), viga = mat(0x221d1a), tizne = canto(0x5c554d, 1.0, 1.8, 0), ceniza = mat(0x8a857c), brasa = mat(0x3a1a0c, { emissive: 0xff5a1a, emissiveIntensity: 1.6 });
      disco(0x6f6a62, 7.5, 0.05); caja(tizne, 7.4, 3.2, 7.4, 0, 0, 0); for (let i = 0; i < 9; i++) { const b = caja(brasa, 0.3 + rnd() * 0.4, 0.12, 0.3 + rnd() * 0.3, (rnd() - 0.5) * 10, 0.05, 4 + (rnd() - 0.5) * 9, rnd() * 3); b.castShadow = false; } for (let i = 0; i < 12; i++) roca(ceniza, 0.25 + rnd() * 0.5, (rnd() - 0.5) * 18, 0.12, (rnd() - 0.5) * 18, 0.35);
      caja(carbon, 7, 7, 7, 0, 0, 0); caja(mat(0x0c0a08), 5.6, 0.2, 5.6, 0, 7, 0); caja(carbon, 1.4, 5, 7, -2.8, 7, 0); caja(carbon, 7, 2.8, 1.4, 0, 7, -2.8); caja(carbon, 1.4, 1.6, 3, 2.8, 7, -2); caja(mat(0x0c0a08), 1.6, 2.8, 0.3, 0, 0, 3.4);
      for (const [x, y, z, len, rz, ry] of [[3, 5, 3, 9, 0.6, 0.4], [-1, 8.5, -1, 7, -0.5, 1.2], [4, 0.4, 6, 8, 1.5, 0.3], [-5, 0.4, 4, 6, 1.5, 2.0], [1, 9.6, 1.6, 6, 1.2, 0.8]]) { const v = caja(viga, 0.5, len, 0.5, x, y - len / 2, z); v.position.y = y; v.rotation.set(0, ry, rz); }
      for (let i = 0; i < 30; i++) roca(i % 2 ? carbon : viga, 0.3 + rnd() * 0.7, (rnd() - 0.5) * 22, 0.25, (rnd() - 0.5) * 22, 0.6);
      for (let i = 0; i < 14; i++) { const a = i / 14 * 6.28; if (i % 5 === 0) continue; const p = cil(viga, 0.2, 0.26, 2.2 + rnd() * 1.6, Math.cos(a) * 13, 0, Math.sin(a) * 13, undefined, 5); p.rotation.z = (rnd() - 0.5) * 0.6; }   // lo que queda de la empalizada
      for (let i = 0; i < 9; i++) { const f = cil(mat(0x5a4633), 0.03, 0.03, 1.2, (rnd() - 0.5) * 16, 0.3, 5 + rnd() * 8, undefined, 4); f.rotation.set(0.5 + rnd() * 0.4, rnd() * 6, 0); }   // flechas clavadas
      humo(0, 8, 0, true); humo(-2, 6, 2, true); cuervos([[-2.8, 12.4, 0], [3, 0.6, 7], [0, 10, -2.8]]);
      arboleda(Array.from({ length: 70 }, () => { const a = rnd() * 6.28, d = 28 + rnd() * 60; return [Math.cos(a) * d, Math.sin(a) * d, 1.1 + rnd() * 0.9]; }).filter(([x, z]) => Math.hypot(x - 16, z - 30) > 14), [0x2f4a2a, 0x3a5a30, 0x4a5a2a]); for (let i = 0; i < 7; i++) arbol(Math.cos(i) * 20, Math.sin(i) * 20, 1.3, 0, true);
      rotulo('La torre', 0, 15, 0); rotulo('Empalizada', 13, 5, 0);
      return { pos: [16, 12, 30], objetivo: [0, 4, 0], cielo: 0x7a8088, R: 38 };
    },
    // Campamento Abandonado
    campamento() {
      suelo(0x5a7040); disco(0x6a6040, 14, 0.03); pradera(2600, () => false, undefined, 14.5);
      for (const [x, z, ry, c, caida] of [[-6, -3, 0.3, 0x9a8a68, 0], [5, -5, 1.9, 0x8a7a58, 0.6], [2, 6, 1.0, 0x9a8a68, 0], [-8, 5, 2.4, 0x7a6a4e, -0.5], [9, 3, 0.2, 0x8a7a58, 0]]) { const t = tienda(x, z, ry, c, caida); t.scale.setScalar(1.9); }
      hoguera(0, 0, false); hoguera(-3, 9, false); const olla = cil(mat(0x2b2b2e), 0.6, 0.5, 0.7, 1.6, 0.3, 0.8, undefined, 10); olla.rotation.z = 1.3;
      for (let i = 0; i < 4; i++) { const p = cil(mat(0x5a4633), 0.04, 0.04, 3.4, -2 + i * 1.4 + rnd(), 0.06, 3 + rnd() * 2, undefined, 4); p.rotation.set(Math.PI / 2, 0, rnd() * 3); p.position.y = 0.06; pieza(new THREE.ConeGeometry(0.09, 0.4, 5), mat(0x9aa0aa), p.position.x, 0.08, p.position.z + 1.8); }
      for (let i = 0; i < 6; i++) { caja(mat([0x6a5039, 0x8a6a48, 0x5a4a3a][i % 3]), 0.9, 0.5, 0.7, (rnd() - 0.5) * 16, 0, (rnd() - 0.5) * 14, rnd() * 3); roca(mat(0xb89a62), 0.45, (rnd() - 0.5) * 16, 0.25, (rnd() - 0.5) * 14, 0.6); }
      const c = carro(11, -8, 0.8); c.rotation.z = 0.35; cil(mat(0x3a2a1c), 0.55, 0.55, 0.1, 13.4, 0.02, -5.6, undefined, 12);
      for (let i = 0; i < 14; i++) disco(0x4a4630, 0.28, 0.04).position.set(-4 - i * 1.5 + (i % 2) * 0.5, 0.04, 12 + i * 2.2);   // huellas que se van, con prisa
      caja(mat(0x4a3a2a), 0.2, 4.6, 0.2, -11, 0, -6); caja(mat(0x5a2a22), 1.6, 1.0, 0.05, -10.2, 3.2, -6).rotation.z = -0.5;
      arboleda(Array.from({ length: 80 }, () => { const a = rnd() * 6.28, d = 24 + rnd() * 60; return [Math.cos(a) * d, Math.sin(a) * d, 1.1 + rnd() * 0.9]; }), [0x2f4a2a, 0x3a5a30, 0x4a5a2a]);
      rotulo('Hogueras frías', 0, 3.5, 0); rotulo('Huellas', -12, 2.5, 24);
      return { pos: [14, 13, 30], objetivo: [0, 1.5, 0], cielo: 0x8a98a0, R: 38 };
    },
    // Los Palafitos
    palafitos() {
      suelo(0x3a3f2a, 150, { plano: true }); lamina(0x3a4a3a, 150, 0.5, true); bruma = 0.02; const vieja = mat(0x5a4c3a), podrida = mat(0x3f3528);
      for (const [x, z, ry, caida, h] of [[-8, -4, 0.2, 0.05, 3.6], [2, -8, -0.3, -0.12, 4.2], [10, -1, 0.5, 0.2, 3.0], [-2, 6, 1.2, 0, 3.4], [14, -10, 0.1, -0.3, 2.2]]) {
        const g = nido(x, z, ry); g.rotation.z = caida; for (const sx of [-2, 2]) for (const sz of [-1.6, 1.6]) cil(podrida, 0.18, 0.22, h + 1.5, sx, -1.5, sz, g, 5);
        caja(vieja, 5, 0.3, 4.2, 0, h, 0, 0, g); caja(vieja, 4.4, 2.6, 3.6, 0, h + 0.3, 0, 0, g); pieza(gDosAguas, mat(0x6a6a4a), 0, h + 3.9, 0, g).scale.set(5.6, 2.2, 4.8); caja(mat(0x14120e), 1, 1.8, 0.1, 0, h + 0.3, 1.82, 0, g); if (caida) caja(vieja, 2, 0.2, 3, 2.6, h - 0.6, 0, 0, g).rotation.z = -0.7;
      }
      for (const [x0, z0, x1, z1] of [[-8, -4, 2, -8], [2, -8, 10, -1], [-8, -4, -2, 6]]) { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.round(d / 1.1); for (let i = 1; i < n; i++) if ((i * 7) % 5) caja(vieja, 1.6, 0.14, 0.9, x0 + (x1 - x0) * i / n, 3.5 + Math.sin(i) * 0.15, z0 + (z1 - z0) * i / n, -Math.atan2(z1 - z0, x1 - x0) + Math.PI / 2); }
      const b = crearBarcoModelo({ eslora: 5, palos: 1, velas: 'ninguna' }); b.position.set(-12, 0.1, 6); b.rotation.set(0.5, 0.6, 0.3); escena.add(b);
      for (let i = 0; i < 16; i++) arbol((rnd() - 0.5) * 80, (rnd() - 0.5) * 70, 1 + rnd() * 0.8, 0, true);
      juncos(700, 60, (x, z) => Math.hypot(x, z + 3) < 6); nenufares(260, 46, 0.5, (x, z) => Math.hypot(x - 2, z + 2) < 4); burbujas(9, 30, 0.5); niebla(30, 1.2, 50, 0.5, 0xdfe8dc, 30);
      for (let i = 0; i < 3; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blanda(), color: 0x9fffd0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.set(2.4, 2.4, 1); escena.add(s); vivos.push(t => { s.position.set(Math.sin(t * 0.2 + i * 2) * 22, 1.6 + Math.sin(t + i), -18 + Math.cos(t * 0.15 + i) * 14); s.material.opacity = 0.5 + 0.4 * Math.sin(t * 1.3 + i); }); }
      rotulo('Cabañas', 0, 11, -5); rotulo('Pasarelas', -3, 6, 1);
      return { pos: [18, 11, 34], objetivo: [1, 3.5, -3], cielo: 0x6a7a70, R: 40, luz: 0.7 };
    },
    // El Paso Viejo
    pasarela() {
      suelo(0x3a3f2a, 150, { plano: true }); lamina(0x3a4a3a, 150, 0.5, true); bruma = 0.02; const tronco = mat(0x5a4c3a);
      for (let i = 0; i < 60; i++) { if ((i > 14 && i < 21) || (i > 36 && i < 41) || i === 50) continue; const z = 34 - i * 1.25, c = cil(tronco, 0.34, 0.34, 6 + (i % 3) * 0.4, Math.sin(i * 0.12) * 2.4, 0.5, z, undefined, 7); c.rotation.z = Math.PI / 2; c.rotation.y = (rnd() - 0.5) * 0.08; c.position.y = 0.75 + (i % 7 === 0 ? -0.25 : 0); if (i % 6 === 0) for (const s of [-3.2, 3.2]) cil(mat(0x3f3528), 0.22, 0.26, 3.4, Math.sin(i * 0.12) * 2.4 + s, -1, z, undefined, 5); }
      for (const [x, z, ry] of [[3, 14, 0.5], [-4, 8, 1.4], [2.5, -14, 2.2]]) { const c = cil(tronco, 0.34, 0.34, 5.5, x, 0.5, z, undefined, 7); c.rotation.set(0.1, ry, Math.PI / 2); c.position.y = 0.45; }   // troncos sueltos donde falta camino
      const mo = nido(-5, 30, 0.2); cil(mat(0x7d766c), 0.5, 0.7, 2.6, 0, 0.3, 0, mo, 6); caja(mat(0x7d766c), 1.4, 0.3, 0.4, 0, 2.6, 0, 0, mo);
      for (let i = 0; i < 18; i++) arbol((rnd() - 0.5) * 90 + (rnd() > 0.5 ? 14 : -14), (rnd() - 0.5) * 80, 1 + rnd() * 0.8, 0, true);
      juncos(900, 62, (x, z) => Math.abs(x - Math.sin((34 - z) / 1.25 * 0.12) * 2.4) < 4); nenufares(260, 48, 0.5, (x, z) => Math.abs(x) < 5); burbujas(9, 30, 0.5); niebla(30, 1.2, 55, 0.5, 0xdfe8dc, 30);
      rotulo('Calzada de troncos', 0, 4, 18); rotulo('Tramo perdido', 0, 4, 10); rotulo('Mojón', -5, 5, 30);
      return { pos: [16, 9, 44], objetivo: [0, 1.5, 4], cielo: 0x6a7a70, R: 44, limite: 40, luz: 0.7 };
    },
    // La Barcaza Hundida
    pecio() {
      suelo(0x3a3f2a, 150, { plano: true }); lamina(0x3a4a3a, 150, 0.35, true); bruma = 0.016; disco(0x4a4030, 18, 0.4).position.set(6, 0.4, 2);
      const b = crearBarcoModelo({ eslora: 22, palos: 1, velas: 'ninguna', color: 0x4d3c2a }); b.position.set(0, 0.6, 0); b.rotation.set(0.42, 0.5, 0.06); escena.add(b);
      const palo = cil(mat(0x3a2c20), 0.2, 0.26, 11, 6, 0.6, 9, undefined, 6); palo.rotation.set(0.2, 0.9, Math.PI / 2 - 0.08); palo.position.y = 0.9;
      for (let i = 0; i < 9; i++) { const c = caja(mat(i % 2 ? 0x8a6a48 : 0x6a5039), 1.4, 1.1, 1.4, 3 + rnd() * 9, 0.2, 5 + rnd() * 8, rnd() * 3); c.rotation.z = (rnd() - 0.5) * 0.5; } for (let i = 0; i < 6; i++) { const c = cil(mat(0x6a4a2e), 0.55, 0.55, 1.2, 8 + rnd() * 8, 0.3, -2 + rnd() * 9, undefined, 9); c.rotation.z = rnd() > 0.5 ? Math.PI / 2 : 0.2; c.position.y = 0.7; }
      for (let i = 0; i < 4; i++) roca(mat(0xb89a62), 0.7, 5 + rnd() * 6, 0.6, 9 + rnd() * 4, 0.6);
      const g = nido(-14, 10, 0.6); cil(mat(0xd8d4cc), 0.05, 0.05, 1.6, 0, 0.4, 0, g, 4); pieza(new THREE.SphereGeometry(0.4, 8, 6), mat(0xe8e4dc), 0, 2.2, 0, g).scale.set(0.8, 1, 1.5); const cu = cil(mat(0xe8e4dc), 0.07, 0.09, 1.1, 0, 2.4, 0.5, g, 5); cu.rotation.x = 0.7; vivos.push(t => { cu.rotation.x = 0.7 + Math.max(0, Math.sin(t * 0.4)) * 0.8; });   // una garza
      for (let i = 0; i < 12; i++) arbol((rnd() - 0.5) * 90, -20 - rnd() * 40, 1 + rnd() * 0.8, 0, true);
      juncos(700, 60, (x, z) => Math.hypot(x - 4, z - 3) < 15); nenufares(220, 46, 0.35, (x, z) => Math.hypot(x - 5, z - 2) < 19); burbujas(9, 30, 0.35); niebla(22, 1.2, 50, 0.45, 0xdfe8dc, 30);
      rotulo('El casco', 0, 9, 0); rotulo('Carga desparramada', 9, 4, 8);
      return { pos: [22, 11, 32], objetivo: [3, 2, 2], cielo: 0x6a7a70, R: 40, luz: 0.75 };
    },
    // La Cabaña del Renegado
    cabana() {
      suelo(0xe6ecf2); bruma = 0.011;
      const g = nido(0, 0, 0.3); for (let i = 0; i < 7; i++) { const t = cil(mat(i % 2 ? 0x5a4633 : 0x4f3d2c), 0.32, 0.32, 7.4, 0, 0, 0, g, 7); t.rotation.z = Math.PI / 2; t.position.set(0, 0.32 + i * 0.6, 2.6); const u = t.clone(); u.position.z = -2.6; g.add(u); const v = cil(mat(i % 2 ? 0x4f3d2c : 0x5a4633), 0.32, 0.32, 5.6, 0, 0, 0, g, 7); v.rotation.x = Math.PI / 2; v.position.set(3.4, 0.62 + i * 0.6, 0); const w = v.clone(); w.position.x = -3.4; g.add(w); }
      pieza(gDosAguas, mat(0xe8eef4), 0, 5.7, 0, g).scale.set(9.4, 3, 7.4); caja(mat(0x2a1f18), 1.3, 2.4, 0.2, -0.8, 0, 2.95, 0, g); caja(mat(0x3a2a1c, { emissive: 0xffb858, emissiveIntensity: 0.9 }), 0.9, 0.9, 0.2, 1.6, 1.6, 2.95, 0, g); caja(mat(0x7d7468), 1.1, 4.4, 1.1, 2.2, 3.4, -1.2, 0, g); humo(2.4, 8.6, -0.6, false);
      const le = nido(6, 2, 0.3); for (let f = 0; f < 4; f++) for (let i = 0; i < 6 - f; i++) { const t = cil(mat(f % 2 ? 0x7a5a3a : 0x6a4a2e), 0.26, 0.26, 2.2, 0, 0, 0, le, 6); t.rotation.z = Math.PI / 2; t.position.set(0, 0.26 + f * 0.46, -1.4 + i * 0.55 + f * 0.28); } pieza(gTejado, mat(0xe8eef4), 0, 2.6, 0, le).scale.set(3, 0.8, 4);
      cil(mat(0x5a4633), 0.6, 0.7, 0.9, -5, 0, 4, undefined, 8); caja(mat(0x7a5a3a), 0.5, 0.5, 0.5, -5, 0.9, 4, 0.4);   // el leño que está partiendo
      faena(figura(-3.9, 4.9, -2.3, 0x4a4238, escena, 0, 1, { tipo: 'clan', lleva: 'hacha', tocado: null }), 'golpea', 0.7, { dosManos: true, flexion: 0.2 }); const lumbre = new THREE.PointLight(0xffb060, 0, 26, 1.8); lumbre.position.set(2.4, 2.2, 4.6); escena.add(lumbre); lucesNoche.push([lumbre, 60]); res(8, 7, 2, 0xb8a888, 1.4); for (let i = 0; i < 9; i++) disco(0xcfd8e2, 0.3, 0.02).position.set(-3 - i * 1.2 + (i % 2) * 0.4, 0.02, 8 + i * 2.4);
      for (const s of [-1, 1]) { const e = caja(mat(0x6a5039), 0.2, 2.6, 0.06, 4.6 + s * 0.2, 0, 3.4); e.rotation.x = -0.25; }
      for (let i = 0; i < 20; i++) roca(mat(0x3a3c44), 5 + rnd() * 6, (rnd() - 0.5) * 100, 1.5, -34 - rnd() * 30, 1.5);
      arboleda(Array.from({ length: 60 }, () => { const a = rnd() * 6.28, d = 18 + rnd() * 50; return [Math.cos(a) * d, Math.sin(a) * d, 1 + rnd() * 0.7]; }).filter(p => p[1] < 12 || Math.abs(p[0]) > 14), [0x3a5046, 0x33483e], { pinos: true });
      nevada(500);
      rotulo('La cabaña', 0, 10, 0); rotulo('Leñera', 6, 5, 2);
      return { pos: [14, 9, 28], objetivo: [0, 2.5, 0], cielo: 0x9aa8b8, R: 36 };
    },
    // La granja grande de Marendol
    granja() {
      suelo(0xb0903e); disco(0xb89a6a, 26, 0.03); trigal(5200, (x, z) => x > 22 && x < 48 && z > 0 && z < 20, 28);
      casa(-6, -8, 12, 7, 5, 0, { pared: 0xe6dcc0, teja: 0xb5652a, chim: true, entramado: false }); humo(-2.6, 9.6, -8, false); casa(10, -6, 9, 13, 6.4, 0, { pared: 0x8a6a48, teja: 0x74683f, puerta: false, entramado: false, ventanas: false }); caja(mat(0x3a2a1c), 4, 4.4, 0.2, 10, 0, 0.6); caja(mat(0x14161a), 1.6, 1.6, 0.2, 10, 6.6, 0.4);
      cil(mat(0xd8d0c0), 2.2, 2.2, 9, 20, 0, -8, undefined, 14); pieza(new THREE.ConeGeometry(2.5, 2.4, 14), mat(0xb5652a), 20, 10.2, -8);
      cerca(-20, 4, -6, 4); cerca(-20, 4, -20, 16); cerca(-20, 16, -6, 16); cerca(-6, 16, -6, 9); for (let i = 0; i < 5; i++) res(-17 + (i % 3) * 4, 7 + Math.floor(i / 3) * 5 + rnd(), rnd() * 6, [0x7a4a2e, 0x3a2a22, 0xd8c8b0][i % 3], 2.2);
      cerca(2, 6, 14, 6); cerca(14, 6, 14, 14); cerca(14, 14, 2, 14); cerca(2, 14, 2, 6); for (let i = 0; i < 7; i++) res(4 + (i % 4) * 2.6, 8 + Math.floor(i / 4) * 3.4, rnd() * 6, 0xf0ece0, 1.2);
      for (let i = 0; i < 8; i++) caja(mat(0xd2aa4e), 2, 1.1, 1.3, -2 + (i % 4) * 2.2, i > 3 ? 1.1 : 0, -1.4, (i % 2) * 0.1);
      const esp = nido(-14, -2, 0.3); caja(mat(0x5a4633), 0.14, 3.4, 0.14, 0, 0, 0, 0, esp); caja(mat(0x5a4633), 2.6, 0.14, 0.14, 0, 2.5, 0, 0, esp); caja(mat(0x7a3b2e), 1.4, 1.6, 0.3, 0, 1.4, 0, 0, esp); pieza(new THREE.SphereGeometry(0.4, 8, 6), mat(0xb89a62), 0, 3.5, 0, esp); pieza(new THREE.ConeGeometry(0.7, 0.5, 8), mat(0xd2aa4e), 0, 3.95, 0, esp);
      enser(gPozo(), 2, -3, 0.4, 1.15).userData.fijo = true; carro(-2, 6, 0.4); faena(figura(-1, 2.6, 2.6, 0x8a6a48, escena, 0, 1, { tipo: 'aldeana', llevaI: 'cesta' }), 'remueve'); for (let i = 0; i < 6; i++) gallina(-3.4 + rnd() * 3, 3.4 + rnd() * 2.6, [0xe8e0d0, 0x8a5a36, 0xc9a06a][i % 3]); anda(figura(0, 0, 0, 0x6a5a2f, escena, 0, 1, { tipo: 'aldeano', lleva: 'cubo', tocado: 'sombrero', colorTocado: 0xd8bf7a }), [[-21.5, 2.6], [-4.6, 2.6], [-4.6, 17.4], [-21.5, 17.4]], 1.0); faena(figura(16, 3, 4, 0x5a6b3a), 'habla', 0.6); faena(figura(17.2, 1.6, 0.9, 0x7a3b2e), 'jarras'); farol(-0.4, -3.8, 0.4);
      for (let i = 0; i < 15; i++) { arbol(26 + (i % 5) * 4.4, 4 + Math.floor(i / 5) * 5, 0.8, 0x6a8a3a); }
      rotulo('Casa', -6, 10, -8); rotulo('Granero', 10, 12, -6); rotulo('Silo', 20, 14, -8); rotulo('Frutales', 34, 6, 9);
      return { pos: [16, 20, 42], objetivo: [2, 2, 0], cielo: 0xbcd0e0, R: 46, limite: 42 };
    },
    // Faro de Astravan
    faro() {
      suelo(0x163f55, 200, { plano: true }).position.y = -3; lamina(0x1f5a78, 200, 0.02); const pena = mat(0x77736c);
      for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, d = rnd() * 13; roca(pena, 4 + rnd() * 4, Math.cos(a) * d, 1.5 + (13 - d) * 0.25, Math.sin(a) * d * 0.8, 0.9); }
      cil(mat(0x8d897f), 5.4, 6, 3, 0, 4.4, 0, undefined, 16);
      for (let i = 0; i < 6; i++) cil(mat(i % 2 ? 0xb23a2e : 0xece8df), 3.6 - i * 0.22, 3.82 - i * 0.22, 4.4, 0, 7.4 + i * 4.4, 0, undefined, 16);
      cil(mat(0x2b2b2e), 3.4, 3.4, 0.4, 0, 33.8, 0, undefined, 16); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; caja(mat(0x2b2b2e), 0.12, 1.3, 0.12, Math.cos(a) * 3.2, 34.2, Math.sin(a) * 3.2); }
      const fanal = cil(mat(0xfff0c0, { emissive: 0xffd070, emissiveIntensity: 1.6, transparent: true, opacity: 0.9 }), 1.9, 1.9, 3, 0, 34.2, 0, undefined, 12); pieza(new THREE.ConeGeometry(2.6, 2.4, 12), mat(0xb23a2e), 0, 38.4, 0);
      const haz = nido(0, 0, 0, 35.7); for (const s of [-1, 1]) { const c = pieza(new THREE.ConeGeometry(5, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }), 0, 0, s * 30, haz); c.rotation.x = s * Math.PI / 2; c.castShadow = false; }
      vivos.haz = haz; caja(mat(0x3a2a1c), 1.4, 2.6, 0.2, 0, 7.4, 3.75); for (const y of [14, 22, 29]) caja(mat(0x14161a), 0.7, 1.4, 0.2, 0, y, 3.75 - (y - 7.4) * 0.05);
      casa(7, 3, 6, 5, 3.4, -0.4, { pared: 0xd8d0c0, teja: 0xb23a2e, chim: true, y: 3.6 }); humo(8.6, 9.6, 3, false);
      for (let i = 0; i < 8; i++) caja(mat(0x6b5440), 1.8, 0.16, 1.2, -9 - i * 1.2, 1.2 - i * 0.02, 6); for (let i = 0; i < 4; i++) cil(mat(0x4a3a2a), 0.14, 0.14, 3.4, -10 - i * 2.6, -1.5, 6.7, undefined, 5);
      const b = crearBarcoModelo({ eslora: 5, palos: 1, velas: 'recogidas' }), gb = nido(-16, 9, 0.4, 0.05); gb.add(b); vivos.push(t => { gb.position.y = 0.05 + Math.sin(t) * 0.1; });
      const lejos = crearBarcoModelo({ eslora: 16, palos: 3, velas: 'dadas' }), gl = nido(60, -70, 2.2, 0.1); gl.add(lejos); vivos.push(t => { gl.position.x = 60 - ((t * 1.2) % 160); gl.position.y = 0.1 + Math.sin(t * 0.8) * 0.2; });
      const f = figura(0, 0, 0, 0x2f4f6f, escena, 0, 1, { tipo: 'marino', lleva: 'farol' }); f.position.y = 34.2; anda(f, Array.from({ length: 14 }, (_, i) => [Math.cos(i / 14 * 6.28) * 2.75, Math.sin(i / 14 * 6.28) * 2.75]), 0.7, true); farol(4.6, 6.4, 2.4, 3, 3.6);
      rotulo('El fanal', 0, 42, 0); rotulo('Casa del farero', 7, 10.5, 3); rotulo('Embarcadero', -13, 4, 6);
      return { pos: [30, 20, 52], objetivo: [0, 17, 0], cielo: 0x8ab0d0, R: 56, limite: 44 };
    },
    // Hierrohondo: la mina del Dominio. Bocamina entibada en la roca, vagonetas, barracón, escorial y empalizada.
    mina() {
      suelo(0xdfe5ec); bruma = 0.011; disco(0x8a8478, 21, 0.03); const roca2 = mat(0x33363d), viga = mat(0x3a3028), tabla = mat(0x5a4c3a), hierro = mat(0x2b2b2e), mena = mat(0x2a2630);
      for (let i = 0; i < 22; i++) { const a = -Math.PI / 2 + (i / 21 - 0.5) * 2.7, d = 24 + rnd() * 8; roca(roca2, 8 + rnd() * 6, Math.cos(a) * d, 6 + rnd() * 7, Math.sin(a) * d - 4, 1.5 + rnd()); }
      for (let i = 0; i < 9; i++) roca(mat(0xeef2f6), 5 + rnd() * 3, -30 + i * 7.5, 17 + rnd() * 5, -30 - rnd() * 6, 0.5);   // nieve en lo alto
      // bocamina: marco de tres cuadros de entibado que se pierde en lo negro
      caja(mat(0x050506), 5.2, 5.4, 6, 0, 0, -19);
      for (let i = 0; i < 4; i++) { const z = -15.6 - i * 1.3; for (const sx of [-2.7, 2.7]) caja(viga, 0.5, 5.2, 0.5, sx, 0, z); caja(viga, 6.4, 0.55, 0.55, 0, 5.2, z); }
      for (const sx of [-1, 1]) { const t = caja(viga, 0.4, 4.4, 0.4, sx * 4.2, 0, -14.8); t.rotation.z = -sx * 0.5; }
      caja(tabla, 3.4, 1.0, 0.14, 0, 6.0, -15.4); caja(mat(0xcfd6de), 0.5, 0.5, 0.16, 0, 6.25, -15.36);
      // vía y vagonetas: una sale cargada y vuelve vacía
      for (const sx of [-0.7, 0.7]) caja(hierro, 0.12, 0.12, 30, sx, 0.05, -2); for (let i = 0; i < 20; i++) caja(viga, 2.2, 0.1, 0.3, 0, 0, -16.5 + i * 1.5);
      const vag = nido(0, 0); caja(tabla, 1.9, 1.0, 2.6, 0, 0.5, 0, 0, vag); for (const sx of [-0.85, 0.85]) for (const sz of [-0.8, 0.8]) { const r = cil(hierro, 0.32, 0.32, 0.14, sx, 0, sz, vag, 10); r.rotation.z = Math.PI / 2; r.position.y = 0.32; }
      const carga = new THREE.Group(); vag.add(carga); for (let i = 0; i < 6; i++) roca(mena, 0.45, (rnd() - 0.5) * 1.1, 1.6, (rnd() - 0.5) * 1.6, 0.7, carga);
      const empuja = figura(0, 2.1, Math.PI, 0x5a5048, vag, 0, 1, { tipo: 'minero', estado: { brazos: 'empuja', camina: 1.96 } });
      vivos.push(t => { const f = (t * 0.035) % 1, ida = f < 0.5, k = ida ? f * 2 : 2 - f * 2; vag.position.z = -17 + k * 28; carga.visible = ida; empuja.position.z = ida ? -2.1 : 2.1; empuja.rotation.y = ida ? 0 : Math.PI; });
      // escorial, lavadero y montones de mena
      for (let i = 0; i < 40; i++) roca(i % 3 ? mena : mat(0x55504a), 0.5 + rnd() * 0.9, 9 + rnd() * 9, 0.3 + rnd() * (2.6 - Math.abs(rnd() - 0.5) * 3), 8 + rnd() * 8, 0.7);
      const cob = nido(-10, 6, 0.2); for (const sx of [-3, 3]) for (const sz of [-2, 2]) caja(viga, 0.35, 3.4, 0.35, sx, 0, sz, 0, cob); pieza(gDosAguas, mat(0xe4eaf0), 0, 4.3, 0, cob).scale.set(7.6, 1.8, 5.6); caja(tabla, 5, 0.9, 1.4, 0, 0, 0, 0, cob); for (let i = 0; i < 5; i++) roca(mena, 0.4, -2 + i, 1.2, 0, 0.6, cob);
      faena(figura(-10.6, 7.6, Math.PI + 0.2, 0x4a4238, escena, 0, 1, { tipo: 'minero', lleva: 'martillo' }), 'golpea', 1.2, { flexion: 0.15 }); faena(figura(-8.6, 7.7, Math.PI + 0.2, 0x55483a, escena, 0, 1, { tipo: 'minero', lleva: 'martillo' }), 'golpea', 0.9, { flexion: 0.15 });
      // barracón de los que pican, cuerpo de guardia y empalizada
      casa(-15, -5, 14, 5.4, 3.4, Math.PI / 2 - 0.1, { pared: 0x4a3f36, teja: 0xe4eaf0, chim: true, entramado: false }); humo(-13.4, 7, -3.6, false);
      casa(13, -4, 6, 5, 3.6, -0.3, { pared: 0x6c7180, teja: 0xe4eaf0, chim: true, piedra: true });
      for (let i = 0; i < 46; i++) { const a = 0.35 + i / 45 * 2.45, x = Math.cos(a) * 27, z = Math.sin(a) * 23 + 2; if (Math.abs(x) < 2.6) continue; const p = cil(viga, 0.3, 0.34, 3.6, x, 0, z, undefined, 6); pieza(new THREE.ConeGeometry(0.3, 0.7, 6), viga, x, 3.95, z); }
      for (const sx of [-1, 1]) caja(viga, 0.6, 5, 0.6, sx * 2.9, 0, 25); caja(viga, 6.6, 0.5, 0.6, 0, 5, 25);
      const at = nido(8, 21); for (const sx of [-1.2, 1.2]) for (const sz of [-1.2, 1.2]) caja(viga, 0.3, 6, 0.3, sx, 0, sz, 0, at); caja(tabla, 3.4, 0.25, 3.4, 0, 6, 0, 0, at); pieza(gTejado, mat(0xe4eaf0), 0, 9.4, 0, at).scale.set(4.4, 1.6, 4.4); figura(0, 0, 2.4, 0x2e3440, at, 6.25, 1, { tipo: 'guardia', manto: 0x6a5a48 });
      hoguera(4.5, 15, true); farol(-3.4, 24, 0); farol(3.4, 24, Math.PI);
      anda(figura(0, 0, 0, 0x2e3440, escena, 0, 1, { tipo: 'guardia', manto: 0x8a8478 }), [[-22, 14], [-6, 20], [14, 17], [22, 6], [14, 17], [-6, 20]], 1.1, true);
      anda(figura(0, 0, 0, 0x5a5048, escena, 0, 1, { tipo: 'minero', lleva: 'pico' }), [[-9, 4.4], [-3, -2], [-1.6, -14], [-3, -2]], 0.9); anda(figura(0, 0, 0, 0x4f4a44, escena, 0, 1, { tipo: 'minero', carga: ['saco'], estado: { brazos: 'carga' } }), [[10, 9], [2.4, 4], [1.6, -13], [2.4, 4]], 0.8);
      carro(-4, 18, 1.2); for (let i = 0; i < 5; i++) barril(16 + (i % 2), 3 + i * 0.9);
      faena(figura(-6.6, 16.6, 1.2 + Math.PI, 0x6a5646, escena, 0, 1.5, { tipo: 'troll', carga: ['saco'] }), 'carga', 0.5);   // un troll uncido carga la mena en el carro
      for (let i = 0; i < 9; i++) pino(-34 + rnd() * 10 + (i % 2) * 58, 6 + rnd() * 30, 1.1 + rnd() * 0.6, 0x3a5046);
      nevada(500);
      rotulo('La bocamina', 0, 9.5, -15.4); rotulo('Barracón', -15, 8, -5); rotulo('Lavadero de mena', -10, 7.5, 6); rotulo('Escorial', 13, 5, 12); rotulo('Cuerpo de guardia', 13, 8, -4);
      return { pos: [22, 17, 40], objetivo: [0, 3, 0], cielo: 0x97a5b6, R: 44, limite: 34 };
    },
    // El Mercado de las Barcas: barcazas amarradas borda con borda en mitad del lago
    mercado() {
      suelo(0x163f55, 260, { plano: true }).position.y = -3; lamina(0x1f6a80, 260, 0.02); bruma = 0.0065;
      const tabla = mat(0x8a6a48), oscura = mat(0x4a3a2a), TOLDOS = [0xb23a2e, 0x2f6aa0, 0xd9a23a, 0x3f8a54, 0x8a4a8e, 0xe0d8c0];
      const flota = [];   // cada barcaza se mece a su aire
      const barcaza = (x, z, ry, largo, i) => {
        const g = nido(x, z, ry, 0.05), b = crearBarcoModelo({ eslora: largo, palos: 1, velas: 'ninguna', color: [0x5a3f2b, 0x4a3a30, 0x6a4a2e][i % 3] }); g.add(b);
        const y = largo * 0.07;
        if (i % 4 !== 3) {   // puesto con toldo y género
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) caja(oscura, 0.12, 2.6, 0.12, sx * largo * 0.2, y, sz * largo * 0.085, 0, g);
          const t = pieza(gTejado, mat(TOLDOS[i % 6], { side: THREE.DoubleSide }), 0, y + 3.1, 0, g); t.scale.set(largo * 0.5, 1.0, largo * 0.26);
          caja(tabla, largo * 0.3, 0.9, largo * 0.1, 0, y, 0, 0, g);
          for (let k = 0; k < 6; k++) { const px = (k - 2.5) * largo * 0.045; if (i % 3 === 0) roca(mat([0xb03a2a, 0xd2aa4e, 0x6a8a3a][k % 3]), 0.28, px, y + 1.1, 0, 0.8, g); else if (i % 3 === 1) caja(mat(k % 2 ? TOLDOS[(i + 2) % 6] : 0xd9c9a0), 0.5, 0.2 + (k % 3) * 0.14, 0.9, px, y + 0.9, 0, 0, g); else cil(mat(0x6a4a2e), 0.26, 0.26, 0.6, px, y + 0.9, 0, g, 8); }
          faena(figura(0, -largo * 0.1, 0, [0x7a3b2e, 0x2f4f6f, 0x5a6b3a, 0x8a7a55][i % 4], g, y, 1, { tipo: i % 2 ? 'mercader' : 'aldeana' }), i % 2 ? 'habla' : 'remueve', 0.8); faena(figura(0.9, largo * 0.12, Math.PI + 0.3, [0x6a5a2f, 0x4a3a5a, 0x3f5a5a][i % 3], g, y, 1, i % 2 ? {} : { llevaI: 'cesta' }), 'escucha');
        } else { for (let k = 0; k < 5; k++) caja(k % 2 ? tabla : oscura, 1.2, 1.0, 1.2, -2 + k * 1.1, y + (k === 2 ? 1.0 : 0), (k % 2) * 0.5 - 0.25, k * 0.3, g); figura(-largo * 0.3, 0, 1.2, 0x5a5048, g, y, 1, { tipo: 'marino' }); }
        const fa = farol(0, 0, 0.5, 2.6, 0); fa.position.set(largo * 0.34, y, 0); g.add(fa);
        flota.push([g, rnd() * 6.28, ry]); return g;
      };
      // dos hileras enfrentadas con una calle de agua en medio, y pasarelas de tabla entre bordas
      const puestos = []; for (let i = 0; i < 6; i++) { puestos.push([-25 + i * 10, -6.5, 0.04 * (i % 2 ? 1 : -1), 9 + (i % 2)]); puestos.push([-23 + i * 10, 6.5, Math.PI + 0.05 * (i % 2 ? -1 : 1), 9 + ((i + 1) % 2)]); }
      puestos.forEach(([x, z, ry, largo], i) => barcaza(x, z, ry, largo, i));
      for (let i = 0; i < 5; i++) for (const z of [-6.5, 6.5]) { const pas = caja(tabla, 2.4, 0.12, 1.1, -20 + i * 10 + (z > 0 ? 2 : 0), 0.9, z); vivos.push(t => { pas.position.y = 0.9 + Math.sin(t * 0.9 + i) * 0.05; }); }
      for (const x of [-27, -7, 13]) { const pas = caja(tabla, 1.2, 0.12, 9.4, x, 0.9, 0); for (const s of [-1, 1]) cil(oscura, 0.12, 0.12, 2.6, x + s * 0.5, -1.2, 0, undefined, 5); vivos.push(t => { pas.position.y = 0.9 + Math.sin(t * 0.8 + x) * 0.04; }); }
      // la barcaza grande de la decana, al fondo, con dos pisos de toldo y el farol mayor
      const dec = nido(34, 0, Math.PI / 2, 0.05), bd = crearBarcoModelo({ eslora: 16, palos: 2, velas: 'recogidas', color: 0x3f2f24, lona: 0xb23a2e }); dec.add(bd); flota.push([dec, 1.3, Math.PI / 2]);
      const td = pieza(gTejado, mat(0xb23a2e, { side: THREE.DoubleSide }), -3, 5.6, 0, dec); td.scale.set(7, 1.4, 4.4); for (const sx of [-5.6, -0.4]) for (const sz of [-1.6, 1.6]) caja(oscura, 0.14, 3.6, 0.14, sx, 1.3, sz, 0, dec);
      faena(figura(-3, 0, -Math.PI / 2, 0x6a2f3a, dec, 1.2, 1, { tipo: 'mercader' }), 'arenga', 0.5); faena(figura(-1.4, 1, 2.4, 0x4a5a6a, dec, 1.2), 'escucha'); faena(figura(-4.6, -1, 0.6, 0x8a7a55, dec, 1.2), 'jarras');
      // gente que cruza por las pasarelas y botes que van y vienen por la calle de agua
      anda(figura(0, 0, 0, 0x7a3b2e, escena, 1.0, 1, { tipo: 'guardia' }), [[-27, -4], [-27, 4], [-7, 4.4], [-7, -4.4]], 1.2, true); anda(figura(0, 0, 0, 0x2f6aa0, escena, 1.0), [[13, 4.4], [13, -4.4], [-7, -4.4], [-7, 4.4]], 1.0);
      for (let i = 0; i < 4; i++) { const g = nido(0, 0, 0, 0.05), b = crearBarcoModelo({ eslora: 3.6, palos: 1, velas: 'ninguna', color: 0x6a4a2e }); g.add(b); const r = faena(figura(-0.3, 0, Math.PI / 2, [0x4a5a6a, 0x6a5a2f, 0x5a6b3a, 0x7a3b2e][i], g, 0.28, 0.85, { tipo: 'marino', lleva: 'percha' }), 'percha', 1.2); const f0 = rnd(), z0 = (i - 1.5) * 1.3, v = 0.012 + rnd() * 0.01;
        vivos.push(t => { const f = (t * v + f0) % 1, ida = f < 0.5, k = ida ? f * 2 : 2 - f * 2; g.position.set(-44 + k * 92, 0.05 + Math.sin(t * 1.3 + i) * 0.05, z0 + Math.sin(k * 9 + i) * 0.5 + (i > 1 ? 16 : 0) * Math.sin(k * 3.14)); g.rotation.y = ida ? 0 : Math.PI; }); }
      for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, d = 30 + rnd() * 30, b = pieza(new THREE.SphereGeometry(0.4, 8, 6), mat(i % 2 ? 0xb23a2e : 0xe8e0d0), Math.cos(a) * d, 0.2, Math.sin(a) * d * 0.6); vivos.push(t => { b.position.y = 0.2 + Math.sin(t * 1.4 + i) * 0.1; }); }
      vivos.push(t => { for (const [g, f, ry] of flota) { g.position.y = 0.05 + Math.sin(t * 0.8 + f) * 0.06; g.rotation.set(Math.sin(t * 0.6 + f) * 0.02, ry, Math.sin(t * 0.5 + f * 2) * 0.025, 'YXZ'); } });
      // la orilla, lejos, y la ciudad apenas insinuada al suroeste
      const orilla = pieza(new THREE.CylinderGeometry(238, 236, 8, 60, 1, true), mat(0x4f7a4a, { side: THREE.BackSide }), 0, 3.5, 0); orilla.castShadow = false;
      for (let i = 0; i < 40; i++) { const a = i / 40 * 6.28 + rnd() * 0.1; roca(mat(i % 2 ? 0x3f6a3c : 0x4a7646), 12 + rnd() * 9, Math.cos(a) * 232, 6 + rnd() * 5, Math.sin(a) * 232, 0.8); }
      for (let i = 0; i < 9; i++) caja(mat(i % 2 ? 0xd8d0c0 : 0xbdb4a2), 6 + rnd() * 6, 8 + rnd() * 14, 6, -150 - rnd() * 40, 0, 150 + rnd() * 50, rnd());
      rotulo('Calle del agua', -8, 5, 0); rotulo('Barcaza de la decana', 34, 12, 0); rotulo('Puestos', -15, 7.5, -6.5);
      return { pos: [-34, 17, 34], objetivo: [-6, 1.5, 0], cielo: 0x8ab8d8, R: 56, limite: 42 };
    },
    // Torre de Aldrian: un claro en el bosque y una torre con la puerta cerrada
    torre() {
      suelo(0x4a6a38); disco(0x5a7a44, 20, 0.03); bruma = 0.0068; pradera(3000, (x, z) => Math.hypot(x, z) < 6.5 || (x > 7.5 && x < 18.5 && z > 3.5 && z < 14.5) || (Math.abs(x) < 2.4 && z > 5 && z < 16), [0x3a6a36, 0x5a8a48, 0x86b060], 0, 70); const piedra = canto(0x7a7480, 1.0, 1.7, 0.1), piedra2 = canto(0x8a8590, 1.25, 2.1, 0.06), teja = mat(0x3d3a52);
      cil(piedra, 5.2, 5.8, 3, 0, 0, 0, undefined, 14); for (let i = 0; i < 6; i++) { cil(i % 2 ? piedra : piedra2, 4.2 - i * 0.16, 4.4 - i * 0.16, 5, 0, 3 + i * 5, 0, undefined, 14); cil(mat(0x9a96a2), 4.52 - i * 0.16, 4.52 - i * 0.16, 0.36, 0, 2.82 + i * 5, 0, undefined, 14); }
      for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28 + 0.9, b = caja(piedra, 1.5, 9, 2.4, Math.sin(a) * 5.3, 0, Math.cos(a) * 5.3, a); b.rotation.x = -0.1; }   // contrafuertes
      cil(piedra, 4.6, 3.6, 2, 0, 33, 0, undefined, 14); cil(piedra, 4.4, 4.4, 5, 0, 35, 0, undefined, 14); const ch = pieza(new THREE.ConeGeometry(5.2, 10, 14), teja, 0.6, 45, 0); ch.rotation.z = -0.08;
      cil(mat(0x2b2b2e), 0.08, 0.08, 2.4, 1.0, 50, 0, undefined, 4); caja(mat(0xd9b24e), 1.4, 0.4, 0.06, 1.3, 51, 0);
      caja(mat(0x2a1f18), 2.2, 4, 0.4, 0, 0, 5.5); caja(piedra, 3.2, 0.6, 0.8, 0, 4, 5.4); for (const s of [0.35, 0.75]) caja(mat(0x2b2b2e), 2.2, 0.2, 0.46, 0, 4 * s, 5.52); for (let i = 0; i < 3; i++) caja(piedra, 4 + i * 0.8, 0.3, 1, 0, 0.6 - i * 0.3, 6.4 + i * 0.9).position.y = 0.45 - i * 0.15;
      for (const [a, y, luz] of [[0.3, 12, 0], [2.2, 18, 0], [-1.2, 24, 0], [0.1, 36.5, 1], [2.4, 36.5, 1]]) caja(mat(0x14161a, luz ? { emissive: 0xffc878, emissiveIntensity: 1.4 } : undefined), 1.0, 1.8, 0.3, Math.sin(a) * (y > 30 ? 4.4 : 4.3 - (y - 3) * 0.032), y, Math.cos(a) * (y > 30 ? 4.4 : 4.3 - (y - 3) * 0.032), a);
      const bal = nido(0, 0, 2.2, 35); caja(mat(0x5a4633), 3, 0.2, 2, 0, 0, 5.2, 0, bal); for (let i = 0; i < 5; i++) caja(mat(0x3a2a1c), 0.1, 1, 0.1, -1.4 + i * 0.7, 0.2, 6.1, 0, bal); const cat = cil(mat(0xd9b24e), 0.14, 0.2, 2.2, 0, 1.4, 5.6, bal, 8); cat.rotation.x = 1.1;
      for (let i = 0; i < 9; i++) { const r = cil(mat(0x3f5a3a), 0.1, 0.2, 10 + rnd() * 12, Math.sin(i * 0.7) * 4.5, 0, Math.cos(i * 0.7) * 4.5, undefined, 5); r.position.y = r.geometry.parameters.height / 2; }   // hiedra
      // un huerto de hierbas, tutores y un banco
      cerca(8, 4, 18, 4); cerca(18, 4, 18, 14); cerca(18, 14, 8, 14); cerca(8, 14, 8, 8); for (let i = 0; i < 20; i++) roca(mat([0x5a8a44, 0x7a9a4a, 0x8a6a9a, 0xd9c24e][i % 4]), 0.5, 9.4 + (i % 5) * 1.9, 0.4, 5.6 + Math.floor(i / 5) * 2.2, 0.8);
      caja(mat(0x6a5039), 2.6, 0.14, 0.6, -7, 0.6, 6); for (const s of [-1, 1]) caja(mat(0x3a2a1c), 0.14, 0.6, 0.5, -7 + s, 0, 6);
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; roca(mat(0x8a8690), 0.5, Math.cos(a) * 13, 0.2, 13 + Math.sin(a) * 2.4 + Math.abs(Math.cos(a)) * 4, 0.5); }
      cuervos([[4.4, 35.2, 2], [-3, 3.2, 5], [0, 0.4, 9]]);
      const pts = []; for (let i = 0; i < 900 && pts.length < 220; i++) { const x = (rnd() - 0.5) * 180, z = (rnd() - 0.5) * 170; if (Math.hypot(x, z) < 24 || (Math.abs(x - z * 0.3) < 14 && z > 0)) continue; pts.push([x, z, 1.4 + rnd() * 1.4]); }
      arboleda(pts, [0x2a4a2e, 0x35583a, 0x2f5034, 0x3f6a42], { alto: 1.4 }); niebla(12, 1, 40, 0.3, 0xe8f0e8, 28);
      rotulo('La torre', 0, 54, 0); rotulo('La puerta', 0, 6.5, 5.6); rotulo('Huerto de hierbas', 13, 4, 9);
      return { pos: [30, 14, 78], objetivo: [0, 24, 0], cielo: 0x7a9a8a, R: 52, limite: 40, luz: 0.8 };
    },
  };
  const v = (PARAJES[l.id] || PARAJES[l.tipo] || PARAJES.pueblo)();
  // lluvia: rayas que caen alrededor del paraje cuando en la región hay chubasco; polvo que cruza los campos de Marendol
  const NG = 2200, pg = new Float32Array(NG * 6), gotas = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pg, 3)), new THREE.LineBasicMaterial({ color: 0xc8d6e4, transparent: true, opacity: 0, depthWrite: false }));
  const semG = new Float32Array(NG * 3); for (let i = 0; i < NG; i++) { semG.set([(rnd() - 0.5) * 190, rnd() * 60, (rnd() - 0.5) * 190], i * 3); }
  gotas.frustumCulled = false; gotas.visible = false; escena.add(gotas);
  if (l.region === 'marendol') for (let i = 0; i < 7; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: blanda(), transparent: true, depthWrite: false, opacity: 0.16, color: 0xd9c08a })), z0 = (rnd() - 0.5) * 90, f0 = rnd() * 140; sp.scale.set(30, 7, 1); escena.add(sp); vivos.push(t => { sp.position.set(((t * 5 + f0) % 140) - 70, 2.2, z0 + Math.sin(t * 0.2 + i) * 4); }); }
  plantar(v.pos); fundir();

  /* ---------- luz del día, la misma hora que en el mapa ---------- */
  const sol = new THREE.DirectionalLight(0xffffff, 2); sol.castShadow = true; sol.shadow.mapSize.setScalar(2048);
  Object.assign(sol.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 10, far: 500 }); sol.shadow.bias = -0.0006;
  const luna = new THREE.DirectionalLight(0x9db4e8, 0), luzCielo = new THREE.HemisphereLight(0xcfe0ff, 0x4a4436, 0.8);
  escena.add(sol, sol.target, luna, luzCielo);
  escena.background = new THREE.Color(v.cielo); escena.fog = new THREE.FogExp2(v.cielo, bruma);
  const tinte = new THREE.Color(v.cielo), k = v.luz ?? 1;
  const blancoCielo = new THREE.Color(0xffffff), sueloCielo = new THREE.Color(0x4a4436);
  function actualizar(t, luz, noche, cam) {
    sol.position.copy(luz.dirSol).multiplyScalar(180); sol.intensity = luz.sol.intensity * k; sol.color.copy(luz.sol.color); sol.castShadow = luz.sol.castShadow;
    luna.position.copy(luz.dirLuna).multiplyScalar(180); luna.intensity = luz.luna.intensity * 1.2;
    // la luz del cielo toma el color del cielo de esa hora (cálida al atardecer, azul de noche) y no baja tanto: las sombras largas no se quedan en gris
    luzCielo.intensity = (luz.luzCielo.intensity + 0.4 * (1 - noche)) * (0.5 + 0.5 * k); luzCielo.color.copy(luz.horizonte).lerp(blancoCielo, 0.45); luzCielo.groundColor.copy(luz.sol.color).multiplyScalar(0.32).lerp(sueloCielo, 0.5);
    escena.background.copy(luz.horizonte).lerp(luz.arriba, 0.3).lerp(tinte, (k < 1 ? 0.7 : 0.35) * (1 - noche * 0.8)); escena.fog.color.copy(escena.background);
    nocheAhora = noche; vidrio.emissiveIntensity = noche * 1.3; farolM.emissiveIntensity = 0.1 + noche * 2.6; for (const [luzN, fuerza] of lucesNoche) luzN.intensity = fuerza * noche;
    const agua = lluvia(t, l.region); gotas.visible = agua > 0.02;
    if (gotas.visible) { gotas.material.opacity = agua * 0.5; const ahora = performance.now() / 1000; for (let i = 0; i < NG; i++) { const x = semG[i * 3], z = semG[i * 3 + 2], y = ((semG[i * 3 + 1] - ahora * (42 + (i % 7) * 3)) % 60 + 60) % 60; pg[i * 6] = x; pg[i * 6 + 1] = y; pg[i * 6 + 2] = z; pg[i * 6 + 3] = x + 0.3; pg[i * 6 + 4] = y - 1.6; pg[i * 6 + 5] = z; } gotas.geometry.attributes.position.needsUpdate = true; sol.intensity *= 1 - agua * 0.55; }
    escena.fog.density = Math.max(bruma, Math.min(bruma * (1 + agua * 0.9), 0.008 + bruma * 0.25));   // el chubasco cierra un paraje despejado; el que ya tiene bruma espesa no se queda en blanco
    for (const f of vivos) f(t, cam);
    if (vivos.haz) { vivos.haz.rotation.y = t * 0.5; vivos.haz.visible = noche > 0.3; }
  }
  const SONIDO = { criptas: { viento: 0.4, pajaros: 0.1 }, cuna: { viento: 0.95 }, sagrario: { viento: 0.3, pajaros: 0.6 }, ahogada: { mar: 0.55, viento: 0.3 }, faro: { mar: 0.9, viento: 0.4 }, torre: { viento: 0.25, pajaros: 0.5 },
    pueblo: { gentio: 0.35, pajaros: 0.5 }, posta: { viento: l.region === 'valcoria' ? 0.25 : 0.7, pajaros: l.region === 'valcoria' ? 0.4 : 0 }, quemado: { viento: 0.5 }, campamento: { viento: 0.4, pajaros: 0.2 }, mina: { viento: 0.7, fuego: 0.15 }, mercado: { gentio: 0.7, mar: 0.4 }, palafitos: { grillos: 0.7, viento: 0.2 }, pasarela: { grillos: 0.7, viento: 0.25 }, pecio: { grillos: 0.6, viento: 0.2 }, cabana: { viento: 0.8, fuego: 0.15 }, granja: { pajaros: 0.6, viento: 0.2 } };
  return { escena, etiquetas, R: v.R ?? 34, minDist: 8, actualizar, sonido: SONIDO[l.id] || SONIDO[l.tipo] || { viento: 0.4 }, vista: { pos: new THREE.Vector3(...v.pos), objetivo: new THREE.Vector3(...v.objetivo) }, limite: v.limite ?? 34 };
}
