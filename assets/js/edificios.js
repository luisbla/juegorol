// edificios.js — los edificios singulares de las ciudades, vistos por fuera y de cerca.
// Cada uno se construye en coordenadas propias (fachada hacia +z, suelo en y = 0) con las piezas que le pasa ciudad.js,
// que luego lo funde todo por material. Devuelve lo que no se puede fundir: fuegos, humos, bandera y altura.
import * as THREE from 'three';

import { matUtil, gBarril, gTonel, gCajon, gSaco, gCarro, gLena, gBanco, gMesa, gJarra, gCaballo, gMuneco, gArmero, gPozo, gPuesto } from './utileria.js';

// los enseres de utileria.js se calculan una vez y se reparten
const memo = new Map(), U = (clave, fn) => { if (!memo.has(clave)) memo.set(clave, fn()); return memo.get(clave); };

export function crearEdificios(k) {
  const { caja, cil, cono, poner, sub, casa, torre, G, rnd, matLiso: L, matPiedra, matTejado, vidrio, farolM, brasaM } = k;
  const pc = k.piedraClara, muro = k.piedra, enl = L(k.colPared), teja = k.teja, teja2 = k.teja2;
  const osc = L(0x3a2a1c), tabla = L(0x6a5039), tablon = L(0x7a5c3e), clara = L(0x9a7a55), hoja = L(0x4a3423);
  const hierro = L(0x2b2b2e, { metalness: 0.5, roughness: 0.5 }), acero = L(0x9aa0aa, { metalness: 0.7, roughness: 0.35 }), oro = L(0xd9b24e, { metalness: 0.6, roughness: 0.35 });
  const paja = L(0xd2aa4e), saca = L(0xb89a62), cuerda = L(0xa8905c), verde = L(0x4f7a3a), agua = L(0x3f6f80, { roughness: 0.2 }), carbon = L(0x17140f), negro = L(0x14161a);
  const muroOsc = matPiedra(0x6a6258, 2), pizarra = matTejado(0x3d4350), region = L(k.colorRegion);
  const PI = Math.PI;

  /* ---------- piezas sueltas ---------- */
  const enser = (g, x, z, ry = 0, e = 1, y = 0) => poner(g, matUtil, x, y, z, e, e, e, ry);
  const tumbado = (m, r, h, x, y, z, ry = 0) => poner(G.cil, m, x, y, z, r, h, r, ry, PI / 2);      // cilindro con el eje a lo largo de x
  const disco = (m, r, h, x, y, z, ry = 0, rx = PI / 2) => poner(G.cil, m, x, y, z, r, h, r, ry, 0, rx);   // cilindro de canto, eje hacia z
  const tejado = (w, d, alto, x, y, z, m, ry = 0) => { poner(G.dosAguas, m, x, y, z, w, alto, d, ry); sub(x, z, ry, () => caja(osc, w + 0.3, 0.24, 0.34, 0, y + alto - 0.12, 0)); };

  // Ventana sobre un paño cuya normal mira a +z girado ry. y = alféizar.
  function ventana(x, y, z, ry = 0, { w = 1.2, h = 1.6, contra = 0x4a5a3a, reja = false, jardinera = false } = {}) {
    sub(x, z, ry, () => {
      caja(osc, w + 0.3, h + 0.3, 0.14, 0, y, 0.02); caja(vidrio, w, h, 0.18, 0, y + 0.15, 0.03);
      caja(osc, 0.08, h, 0.24, 0, y + 0.15, 0.03); caja(osc, w, 0.08, 0.24, 0, y + 0.15 + h * 0.55, 0.03);
      caja(pc, w + 0.6, 0.16, 0.4, 0, y - 0.14, 0.14);
      if (contra !== null) for (const s of [-1, 1]) { caja(L(contra), 0.56, h + 0.1, 0.1, s * (w / 2 + 0.44), y + 0.1, 0.08); caja(hierro, 0.5, 0.06, 0.13, s * (w / 2 + 0.44), y + 0.1 + h * 0.75, 0.08); }
      if (reja) for (let i = 0; i < 4; i++) caja(hierro, 0.07, h, 0.07, -w / 2 + (i + 0.5) * w / 4, y + 0.15, 0.2);
      if (jardinera) { caja(tabla, w + 0.3, 0.3, 0.38, 0, y + 0.02, 0.36); caja(verde, w + 0.1, 0.22, 0.3, 0, y + 0.3, 0.36); for (let i = 0; i < 4; i++) caja(L(i % 2 ? 0xc0392b : 0xe0c040), 0.16, 0.16, 0.16, -w / 2 + 0.2 + i * (w - 0.4) / 3, y + 0.5, 0.36); }
    });
  }
  function puerta(x, z, ry = 0, { w = 1.8, h = 3, doble = false, marco = pc, y = 0 } = {}) {
    sub(x, z, ry, () => {
      caja(marco, w + 0.7, h + 0.4, 0.26, 0, y, 0); caja(hoja, w, h, 0.34, 0, y, 0.02);
      const n = Math.max(3, Math.round(w / 0.45)); for (let i = 1; i < n; i++) caja(osc, 0.04, h, 0.37, -w / 2 + i * w / n, y, 0.02);   // tablas
      if (doble) caja(osc, 0.09, h, 0.4, 0, y, 0.02);
      for (const f of [0.22, 0.72]) caja(hierro, w, 0.13, 0.4, 0, y + h * f, 0.02);
      for (const s of doble ? [-0.28, 0.28] : [w * 0.3]) caja(hierro, 0.12, 0.3, 0.5, s, y + h * 0.45, 0.02);
      caja(pc, w + 1.1, 0.18, 0.9, 0, y, 0.5);
    });
  }
  function farol(x, z, alto = 3.6, ry = 0) {
    sub(x, z, ry, () => { caja(osc, 0.2, alto, 0.2, 0, 0, 0); caja(osc, 0.9, 0.12, 0.12, 0.36, alto - 0.2, 0); caja(hierro, 0.44, 0.08, 0.44, 0.72, alto - 0.42, 0); caja(farolM, 0.3, 0.44, 0.3, 0.72, alto - 0.86, 0); caja(hierro, 0.4, 0.08, 0.4, 0.72, alto - 0.94, 0); });
  }
  // cartel colgante, perpendicular a la fachada
  function cartel(x, y, z, ry, color) {
    sub(x, z, ry, () => { caja(hierro, 0.1, 0.1, 1.7, 0, y, 0.85); for (const s of [0.45, 1.35]) caja(hierro, 0.04, 0.3, 0.04, 0, y - 0.3, s); caja(tabla, 0.12, 0.95, 1.25, 0, y - 1.25, 0.9); caja(L(color), 0.17, 0.5, 0.65, 0, y - 1.03, 0.9); });
  }
  function barril(x, z, { r = 0.55, y = 0 } = {}) { enser(U('barril', () => gBarril(0.5, 1.05)), x, z, (x + z * 2) % 3, r / 0.5, y); }
  function tonel(x, z, ry = 0, r = 0.6) { enser(U('tonel', () => gTonel(0.6, 1.3)), x, z, ry, r / 0.6); }
  function cajon(x, z, s = 1, ry = 0, y = 0) { enser(U('cajon', () => gCajon(1)), x, z, ry, s, y); }
  function saco(x, z, y = 0, s = 0.6) { enser(U('saco', () => gSaco(1)), x, z, rnd() * 6, s * 1.05, y); }
  // carro de varas (las varas miran a +x, como antes)
  function carro(x, z, ry = 0, carga) { enser(U('carro-' + carga, () => gCarro({ carga })), x, z, ry + PI / 2, 1.15); }
  function lena(x, z, ry = 0) { enser(U('lena', gLena), x, z, ry); }
  function banco(x, z, ry = 0, w = 2.2) { enser(U('banco-' + w, () => gBanco(w)), x, z, ry); }
  function mesa(x, z, ry = 0, w = 2.4) { sub(x, z, ry, () => { enser(U('mesa-' + w, () => gMesa(w, 1.1, 0.95)), 0, 0); for (let i = 0; i < 3; i++) enser(U('jarra', () => gJarra(1.5)), -0.6 + i * 0.6, (i % 2) * 0.3 - 0.15, i, 1, 1.09); }); }
  function chimenea(x, y, z, h, m = pc) { caja(m, 1.0, h, 1.0, x, y, z); caja(m, 1.35, 0.22, 1.35, x, y + h, z); for (const s of [-0.25, 0.25]) cil(L(0x9a4a2e), 0.18, 0.5, x + s, y + h + 0.22, z); }
  // entramado visto sobre un paño de frente
  function entramado(w, h, y, z, x = 0) {
    for (const yy of [y, y + h - 0.25]) caja(osc, w, 0.25, 0.12, x, yy, z);
    const n = Math.round(w / 1.4);
    for (let i = 0; i <= n; i++) caja(osc, 0.22, h, 0.12, x - w / 2 + 0.11 + i * (w - 0.22) / n, y, z);
    const paso = (w - 0.22) / n, largo = Math.hypot(paso, h) * 0.92, ang = Math.atan2(paso, h);
    for (const [i, s] of [[0, 1], [n - 1, -1]]) poner(G.caja, osc, x - w / 2 + 0.11 + (i + 0.5) * paso, y + h / 2, z, 0.16, largo, 0.1, 0, -s * ang);
  }
  function caballo(x, z, ry, color) { enser(U('caballo-' + color, () => gCaballo(color)), x, z, ry + PI / 2, 1.08); }
  const PELO = [0x2a1f18, 0x5a3a22, 0x8a6a3a, 0x1a1a1a, 0xb8b0a4];
  // la gente que está quieta junto a los edificios la dibuja ciudad.js con figuras de verdad (figuras.js); aquí solo se apunta dónde va
  function figura(x, z, ry, color, arma) { if (!arma) rnd(); k.figura(x, z, ry, color, arma); }
  const singular = (...a) => k.figura(...a);   // figuras con modelo propio (trolls): no gastan azar
  function muneco(x, z, ry = 0) { enser(U('muneco', gMuneco), x, z, ry); }
  function diana(x, z, ry = 0) { sub(x, z, ry, () => { for (const s of [-0.5, 0.5]) poner(G.caja, tabla, s, 1.1, -0.35, 0.12, 2.4, 0.12, 0, 0, -0.3); poner(G.caja, tabla, 0, 1.0, -0.9, 0.12, 2.2, 0.12, 0, 0, 0.45); disco(saca, 1.0, 0.3, 0, 1.9, 0, 0, PI / 2 - 0.3); disco(L(0xb03a2a), 0.65, 0.32, 0, 1.9, 0, 0, PI / 2 - 0.3); disco(L(0xf0ead8), 0.3, 0.34, 0, 1.9, 0, 0, PI / 2 - 0.3); }); }
  function armero(x, z, ry = 0, n = 6, espadas = false) { enser(U(`armero-${n}-${espadas}`, () => gArmero(n, espadas)), x, z, ry); }
  function brasero(x, z, y = 0) { for (let i = 0; i < 3; i++) { const a = i * 2.094; caja(hierro, 0.09, 1.2, 0.09, x + Math.cos(a) * 0.4, y, z + Math.sin(a) * 0.4); } cil(hierro, 0.66, 0.4, x, y + 1.1, z); cil(brasaM, 0.56, 0.08, x, y + 1.5, z); return [x, y + 2.2, z]; }
  function cerca(x0, z0, x1, z1, { alto = 1.3, paso = 1.6, m = tabla } = {}) {
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(d / paso)), ry = -Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) caja(m, 0.22, alto, 0.22, x0 + (x1 - x0) * i / n, 0, z0 + (z1 - z0) * i / n, ry);
    for (const f of [0.45, 0.85]) caja(m, d, 0.12, 0.1, (x0 + x1) / 2, alto * f, (z0 + z1) / 2, ry);
  }

  /* ---------- los edificios ---------- */
  const r = { alto: 9, fuegos: [], humos: [], bandera: null };
  const E = {
    cuartel() {
      const W = 13, D = 6.5, H = 6.4, x0 = 0.8, z0 = -1.4, f = z0 + D / 2;
      caja(pc, W + 0.5, 0.8, D + 0.5, x0, 0, z0); caja(muro, W, H, D, x0, 0, z0); caja(pc, W + 0.5, 0.3, D + 0.5, x0, H, z0);
      for (let i = 0; i < 7; i++) caja(pc, 0.9, 0.7, 0.5, x0 - W / 2 + 0.8 + i * (W - 1.6) / 6, H + 0.3, f);   // almenas sobre la fachada
      tejado(W + 0.6, D - 0.6, 2.8, x0, H + 0.3, z0 - 0.3, teja);
      puerta(x0, f, 0, { w: 3, h: 3.8, doble: true });
      for (let i = 0; i < 5; i++) caja(hierro, 0.1, 0.9, 0.1, x0 - 1.2 + i * 0.6, 3.8, f + 0.22);   // rastrillo recogido
      caja(pc, 4.6, 0.5, 0.5, x0, 4.6, f + 0.1);
      for (const s of [-1, 1]) { ventana(x0 + s * 3.6, 3.4, f, 0, { w: 0.45, h: 1.6, contra: null }); ventana(x0 + s * 5.4, 3.4, f, 0, { w: 0.45, h: 1.6, contra: null }); ventana(x0 + s * 4.5, 1.1, f, 0, { w: 0.9, h: 1.2, contra: null, reja: true }); }
      for (const z of [z0 - 1.6, z0 + 1.6]) ventana(x0 + W / 2, 3.4, z, PI / 2, { w: 0.45, h: 1.6, contra: null });
      puerta(x0 + 3, z0 - D / 2, PI, { w: 1.4, h: 2.5 });
      caja(osc, 2.2, 0.12, 0.12, x0, 6.1, f + 0.3); caja(region, 1.7, 1.2, 0.08, x0, 4.9, f + 0.34);   // pendón sobre la puerta
      const tx = -7.4, tz = -1.6;
      torre(tx, tz, 2.3, 13, muro, teja, true); cil(pc, 2.42, 0.3, tx, 6.4, tz); cil(pc, 2.5, 0.9, tx, 0, tz);
      for (let i = 0; i < 3; i++) for (const y of [3.5, 9]) { const a = 0.3 + i * 1.2; sub(tx, tz, a, () => caja(negro, 0.3, 1.5, 0.12, 0, y, 2.28)); }
      r.bandera = [tx, 14, tz];
      for (const s of [-1, 1]) r.fuegos.push([...brasero(x0 + s * 2.7, f + 1.5), 14]);
      for (let i = 0; i < 2; i++) caja(pc, 4 + i * 1, 0.2, 0.6, x0, 0, f + 0.9 + i * 0.5);
      // patio de instrucción delante, con murete
      armero(-5.6, 5.6, 0, 6); armero(-5.6, 7.2, 0, 5, true); muneco(5, 6.6, -0.2); muneco(7.4, 6.4, 0.3); diana(9.6, 3.6, -PI / 2);
      for (const [a, b] of [[-10, -2.4], [2.4, 10]]) { for (let x = a; x <= b + 0.01; x += 1.9) { caja(pc, 0.6, 1.2, 0.6, x, 0, 9.6); caja(pc, 0.8, 0.16, 0.8, x, 1.2, 9.6); } caja(pc, b - a, 0.7, 0.35, (a + b) / 2, 0, 9.6); }
      figura(x0 - 2, f + 3.2, 0.4, 0x4a5a6a, true); figura(x0 + 2, f + 3.2, -0.4, 0x4a5a6a, true);
      barril(7, 2.6); barril(7.9, 3.2); cajon(-3.4, 2.7, 1.1, 0.2); farol(-2.6, 9.2); farol(2.6, 9.2, 3.6, PI);
      r.alto = 16;
    },
    posada() {
      const W = 11, D = 6.6, x0 = 0.6, z0 = -1.2, f = z0 + D / 2, f2 = f + 0.36;
      caja(pc, W, 3.2, D, x0, 0, z0); caja(enl, W + 0.7, 3.0, D + 0.7, x0, 3.2, z0);
      for (let i = 0; i < 9; i++) caja(osc, 0.26, 0.3, 0.6, x0 - W / 2 + 0.3 + i * (W - 0.6) / 8, 2.92, f + 0.2);   // cabezas de viga del voladizo
      entramado(W + 0.7, 3.0, 3.2, f2 + 0.02, x0);
      for (const s of [-1, 1]) for (const zz of [z0 - D / 2 - 0.3, z0, z0 + D / 2 + 0.3]) caja(osc, 0.14, 3, 0.26, x0 + s * (W / 2 + 0.36), 3.2, zz);
      tejado(W + 2, D + 2.4, 4.3, x0, 6.2, z0, teja2);
      for (const dx of [-2.8, 2.8]) { caja(enl, 1.6, 1.5, 1.8, x0 + dx, 7.0, f - 0.5); poner(G.dosAguas, teja2, x0 + dx, 8.5, f - 0.5, 2.3, 0.9, 2.0, PI / 2); ventana(x0 + dx, 7.25, f + 0.4, 0, { w: 0.8, h: 0.85, contra: null }); }
      chimenea(x0 + 3.8, 8.4, z0 - 1.2, 3.4); r.humos.push([x0 + 3.8, 12.5, z0 - 1.2]); chimenea(x0 - 4, 8.0, z0 - 1.8, 3.2);
      puerta(x0, f, 0, { w: 1.9, h: 2.7 });
      for (const s of [-1, 1]) caja(osc, 0.26, 2.9, 0.26, x0 + s * 1.7, 0, f + 1.8);
      tejado(4.4, 2.4, 0.9, x0, 2.9, f + 1.0, teja2);
      for (const s of [-1, 1]) ventana(x0 + s * 3.7, 1.15, f, 0, { jardinera: true });
      for (const dx of [-4.2, -1.4, 1.4, 4.2]) ventana(x0 + dx, 4.1, f2 + 0.1, 0, { w: 1.0, h: 1.4, jardinera: Math.abs(dx) < 2 });
      for (const s of [-1, 1]) { ventana(x0 + s * W / 2, 1.15, z0, s * PI / 2); ventana(x0 + s * (W / 2 + 0.36), 4.1, z0 - 1.6, s * PI / 2, { w: 1.0, h: 1.4 }); ventana(x0 + s * (W / 2 + 0.36), 4.1, z0 + 1.6, s * PI / 2, { w: 1.0, h: 1.4 }); }
      puerta(x0 - 2, z0 - D / 2, PI, { w: 1.4, h: 2.4 });
      cartel(x0 + 4.9, 5.3, f2, 0, 0xb5652a);
      // cuadra adosada
      const cx = -7.4, cz = 1.0;
      caja(tablon, 4.6, 3.4, 5.4, cx, 0, cz); poner(G.dosAguas, teja2, cx, 3.4, cz, 6.2, 2.2, 5.4, PI / 2); for (const sx of [-1, 1]) for (const sz of [-1, 1]) caja(osc, 0.3, 3.4, 0.3, cx + sx * 2.3, 0, cz + sz * 2.7);
      puerta(cx, cz + 2.7, 0, { w: 2.6, h: 2.6, doble: true, marco: osc }); caja(osc, 1.2, 1.0, 0.12, cx, 3.7, cz + 3.12);
      // delante: mesas, barriles, abrevadero y un carro
      mesa(4.6, 6.4, 0.15); banco(4.5, 5.4, 0.15); banco(4.7, 7.4, 0.15); banco(3.6, f + 0.5, 0, 1.8);
      barril(6.9, f + 0.8); barril(7.7, f + 1.5); tonel(6.6, f + 2.6, 0.5); lena(-2.9, f + 0.9, PI / 2);
      farol(-1.9, f + 2.6); farol(3.1, f + 2.6, 3.6, PI);
      for (const x of [-4.4, -1.4]) caja(osc, 0.2, 1.25, 0.2, x, 0, 8.1); caja(osc, 3.3, 0.14, 0.14, -2.9, 1.15, 8.1);
      caja(tabla, 2.4, 0.6, 0.9, -2.9, 0, 9.3); caja(agua, 2.1, 0.05, 0.65, -2.9, 0.58, 9.3);
      caballo(-2.9, 5.7, -PI / 2, 0x6a4326); carro(-8, 8.6, 0.3, 'cajas'); cil(pc, 0.9, 0.9, 8.2, 0, 8.4); cil(agua, 0.75, 0.05, 8.2, 0.86, 8.4);
      r.alto = 13;
    },
    herreria(o) {
      const W = 9, D = 5.5, H = 4.4, z0 = -3, f = z0 + D / 2;
      caja(pc, W + 0.4, 0.7, D + 0.4, 0, 0, z0); caja(muroOsc, W, H, D, 0, 0, z0); tejado(W + 1.4, D + 1.6, 3, 0, H, z0, teja2);
      caja(muroOsc, 2.3, 10, 2.3, 3.0, 0, z0 - 0.6); caja(pc, 2.7, 0.3, 2.7, 3.0, 10, z0 - 0.6); caja(negro, 1.5, 0.2, 1.5, 3.0, 10.3, z0 - 0.6); r.humos.push([3.0, 11, z0 - 0.6]);
      puerta(-2.6, f, 0, { w: 1.6, h: 2.6, marco: osc }); ventana(-4.5, 1.4, z0, -PI / 2); ventana(4.5, 1.4, z0 + 1.2, PI / 2, { reja: true, contra: null });
      // cobertizo abierto: aquí se trabaja
      for (const x of [-4.4, 0, 4.4]) { caja(osc, 0.32, 3.1, 0.32, x, 0, f + 4.6); poner(G.caja, osc, x, 2.6, f + 4.1, 0.16, 1.2, 0.16, 0, 0, 0.8); }
      caja(osc, 9.4, 0.28, 0.28, 0, 3.1, f + 4.6); poner(G.caja, teja2, 0, 3.86, f + 2.4, 9.9, 0.2, 5.2, 0, 0, 0.27);
      for (const x of [-4.4, 0, 4.4]) poner(G.caja, osc, x, 3.7, f + 2.4, 0.2, 0.2, 5.0, 0, 0, 0.27);
      caja(muroOsc, 3.2, 1.4, 2.2, 2.6, 0, f + 1.3); caja(brasaM, 2.4, 0.16, 1.5, 2.6, 1.4, f + 1.3); for (let i = 0; i < 6; i++) poner(G.roca, carbon, 1.8 + rnd() * 1.7, 1.6, f + 0.8 + rnd() * 1.0, 0.25, 0.2, 0.25, rnd() * 6);
      caja(muroOsc, 3.2, 0.5, 0.5, 2.6, 1.4, f + 0.3); r.fuegos.push([2.6, 2.6, f + 1.6, 15]);
      poner(G.cono, L(0x5a3a26), 0.2, 1.7, f + 1.3, 0.7, 1.9, 0.7, 0, -PI / 2); caja(osc, 0.2, 1.3, 0.2, -0.2, 0, f + 1.3); caja(tabla, 0.1, 0.1, 1.4, -0.7, 2.3, f + 1.3);   // fuelle
      cil(tabla, 0.6, 0.9, -1.6, 0, f + 2.8); caja(hierro, 1.3, 0.45, 0.5, -1.6, 0.9, f + 2.8); caja(hierro, 0.75, 0.25, 0.46, -1.6, 1.35, f + 2.8); poner(G.cono, hierro, -0.65, 1.2, f + 2.8, 0.2, 0.8, 0.2, 0, -PI / 2);   // yunque
      poner(G.caja, tabla, -2.0, 1.75, f + 2.9, 0.08, 0.8, 0.08, 0, 0.9); caja(hierro, 0.3, 0.22, 0.2, -2.3, 1.95, f + 2.9);   // martillo sobre el yunque
      barril(-0.1, f + 3.6); cil(agua, 0.46, 0.03, -0.1, 1.13, f + 3.6);
      for (const s of [-0.45, 0.45]) caja(osc, 0.14, 1.1, 0.7, -3.7 + s, 0, f + 3.3); tumbado(pc, 0.72, 0.26, -3.7, 1.15, f + 3.3); caja(hierro, 0.5, 0.08, 0.08, -3.1, 1.15, f + 3.3);   // muela
      caja(osc, 3.2, 0.15, 0.12, 0.2, 2.5, f + 0.1); for (let i = 0; i < 6; i++) { caja(hierro, 0.09, 0.7 + (i % 3) * 0.2, 0.08, -1.1 + i * 0.5, 1.7 - (i % 3) * 0.2, f + 0.14); caja(hierro, 0.26, 0.16, 0.1, -1.1 + i * 0.5, 1.6 - (i % 3) * 0.2, f + 0.14); }
      for (let i = 0; i < 3; i++) disco([L(0x7a2e2a), L(0x2f4a6a), acero][i], 0.6, 0.1, -4.0 + i * 0.1, 2.9, f + 0.12 + i * 0, 0);
      armero(6.3, f + 1.4, PI / 2, 5, true); armero(6.3, f + 4.2, PI / 2, 4);
      if (o?.id === 'griselda') {   // en Griselda el fuelle lo mueve un troll uncido, y la forja lleva las runas del hielo
        singular(-1.0, f + 2.3, 2.3, 0x6a5646, false, { tipo: 'troll', piel: 0x8fa3b5, calzas: 0x8fa3b5, botas: 0x647280, pelo: 0x56606c, talla: 1.32, brazos: 'fuelle' });
        poner(G.roca, pc, 5.2, 1.3, f + 5.6, 0.6, 1.8, 0.4, 0.3); caja(L(0x9fd0e6, { emissive: 0x4fa0d0, emissiveIntensity: 0.6 }), 0.08, 1.0, 0.4, 5.13, 0.8, f + 5.98, 0.3);
      }
      caja(tablon, 2.6, 1.0, 1.7, -6.4, 0, f + 2.2); for (let i = 0; i < 12; i++) poner(G.roca, carbon, -7.3 + rnd() * 1.8, 1.0 + rnd() * 0.3, f + 1.6 + rnd() * 1.2, 0.32, 0.26, 0.32, rnd() * 6);
      for (let i = 0; i < 6; i++) tumbado(hierro, 0.06, 3.2, -6.2, 0.08 + (i % 2) * 0.12, f + 4.2 + i * 0.14, 0.05);
      disco(osc, 0.8, 0.12, -5.3, 0.8, f + 0.3, 0, PI / 2 - 0.2); for (let i = 0; i < 4; i++) poner(G.caja, clara, -5.3, 0.8, f + 0.38, 0.08, 1.5, 0.05, 0, i * PI / 4, -0.2);
      cartel(-4.4, 3.0, f + 4.8, 0, 0x2b2b2e); farol(4.4, f + 5.4);
      r.alto = 12;
    },
    establos() {
      const W = 15, D = 5, H = 3.8, z0 = -3;
      caja(paja, W - 0.6, 0.12, D - 0.4, 0, 0, z0); caja(tablon, W, H, 0.3, 0, 0, z0 - D / 2); for (const s of [-1, 1]) caja(tablon, 0.3, H, D, s * (W / 2 - 0.15), 0, z0);
      const paso = (W - 0.4) / 5;
      for (let i = 0; i <= 5; i++) { const x = -W / 2 + 0.2 + i * paso; caja(osc, 0.36, H, 0.36, x, 0, z0 + D / 2); if (i && i < 5) caja(tablon, 0.14, 2.1, D - 0.6, x, 0, z0); }
      caja(osc, W, 0.32, 0.36, 0, H, z0 + D / 2);
      for (let i = 0; i < 5; i++) { const x = -W / 2 + 0.2 + (i + 0.5) * paso; if (i === 1) continue; caja(tabla, paso - 0.5, 1.4, 0.12, x, 0, z0 + D / 2); poner(G.caja, osc, x, 0.7, z0 + D / 2 + 0.07, 0.1, paso * 0.9, 0.06, 0, 1.05); caja(hierro, 0.3, 0.08, 0.16, x + paso / 2 - 0.4, 1.0, z0 + D / 2); }
      tejado(W + 1.6, D + 2, 3.2, 0, H + 0.3, z0, teja2);
      caja(tablon, 3, 2.2, 2.2, 0, H + 0.3, z0 + 1.9); poner(G.dosAguas, teja2, 0, H + 2.5, z0 + 1.9, 2.8, 1.1, 3.6, PI / 2); caja(negro, 1.6, 1.5, 0.1, 0, H + 0.6, z0 + 3.02);   // pajar con su puerta de carga
      caja(osc, 0.2, 0.2, 1.8, 0, H + 2.5, z0 + 3.6); caja(cuerda, 0.05, 2.4, 0.05, 0, H + 0.1, z0 + 4.3); caja(paja, 1.2, 0.7, 0.8, 0, H - 0.6, z0 + 4.3);
      caballo(-W / 2 + 0.2 + 0.5 * paso, z0 - 0.2, -PI / 2, 0x6a4326); caballo(-W / 2 + 0.2 + 2.5 * paso, z0 - 0.2, -PI / 2, 0x2f2620); caballo(-W / 2 + 0.2 + 3.5 * paso, z0 - 0.2, -PI / 2, 0xb8a888); caballo(-W / 2 + 0.2 + 4.5 * paso, z0 - 0.4, -PI / 2, 0x8a5a36);
      // cercado con un caballo suelto
      cerca(1.5, 2.5, 10, 2.5); cerca(10, 2.5, 10, 10); cerca(10, 10, 1.5, 10); cerca(1.5, 10, 1.5, 6.5); for (const z of [2.5, 4.8]) caja(osc, 0.3, 2.2, 0.3, 1.5, 0, z); caja(osc, 0.2, 0.2, 2.6, 1.5, 2.2, 3.65);
      caballo(5.4, 7.4, 0.5, 0x7a4a2e); caja(tabla, 2.6, 0.6, 0.9, 8.4, 0, 3.6); caja(agua, 2.3, 0.05, 0.65, 8.4, 0.58, 3.6); cono(paja, 1.0, 0.9, 4, 0, 8.6);
      // paja, aperos y un carro
      for (let i = 0; i < 6; i++) caja(paja, 1.5, 0.8, 0.9, -8.4 + (i % 3) * 1.6 + (i > 2 ? 0.8 : 0), i > 2 ? 0.8 : 0, 1.6, (i % 2) * 0.1); cono(paja, 1.7, 1.7, -8, 0, 5.2);
      poner(G.caja, tabla, -6.4, 1.3, 4.6, 0.08, 2.8, 0.08, 0, 0.35); for (let i = 0; i < 3; i++) caja(hierro, 0.04, 0.5, 0.04, -6.95 + i * 0.12, 2.5, 4.6);   // horca
      carro(-3.4, 7.6, 0.35, 'pacas');
      caja(osc, 2.6, 0.16, 0.16, -1.2, 1.3, 2.2); for (const s of [-1.2, 1.2]) caja(osc, 0.16, 1.3, 0.5, -1.2 + s, 0, 2.2); for (const s of [-0.6, 0.6]) { caja(L(0x5a2f1e), 0.8, 0.3, 0.9, -1.2 + s, 1.4, 2.2); caja(L(0x3a1f14), 0.3, 0.3, 0.5, -1.2 + s, 1.65, 1.9); }   // sillas de montar
      for (let i = 0; i < 3; i++) cil(tabla, 0.3, 0.45, -4 + i * 0.8, 0, 1.2 + (i % 2) * 0.5); farol(0.6, 1.4);
      r.alto = 10;
    },
    salon() {
      const W = 16, D = 7.5, H = 4.2, f = D / 2 - 1.5, zc = -1.5;
      caja(pc, W + 0.6, 0.8, D + 0.6, 0, 0, zc); caja(muro, W, H, D, 0, 0, zc); tejado(W + 1.6, D + 2.6, 8, 0, H, zc, pizarra);
      for (const s of [-1, 1]) for (const d of [-1, 1]) {   // vigas cruzadas en los hastiales, rematadas en cabeza de dragón
        poner(G.caja, osc, s * (W / 2 + 0.85), H + 4.66, zc + d * 2.1, 0.34, 11.2, 0.34, 0, 0, -d * 0.563);
        poner(G.cono, osc, s * (W / 2 + 0.85), H + 9.6, zc - d * 1.1, 0.34, 1.3, 0.34, 0, 0, -d * 0.9);
      }
      for (const s of [-1, 1]) { ventana(s * (W / 2), 5.4, zc, s * PI / 2, { w: 1.0, h: 1.5, contra: null }); for (const z of [-2, 2]) ventana(s * W / 2, 1.6, zc + z, s * PI / 2, { w: 0.45, h: 1.5, contra: null }); }
      caja(osc, 1.8, 0.5, 1.8, 0, H + 7.8, zc); r.humos.push([0, H + 8.6, zc]);
      // pórtico tallado
      poner(G.dosAguas, pizarra, 0, H, f + 2.2, 6.4, 3.6, 5.6, PI / 2);
      for (const s of [-1, 1]) { cil(tabla, 0.5, H, s * 2.4, 0, f + 4.6); cil(osc, 0.58, 0.3, s * 2.4, 0.9, f + 4.6); cil(osc, 0.58, 0.3, s * 2.4, 3.1, f + 4.6); cono(tabla, 0.5, 0.9, s * 2.4, H, f + 4.6); caja(osc, 0.3, 0.3, 4.6, s * 2.4, H - 0.3, f + 2.3); }
      caja(osc, 5.2, 0.34, 0.34, 0, H - 0.3, f + 4.6);
      for (const s of [-1, 1]) poner(G.cono, L(0xe8dfc8), s * 0.7, H + 2.2, f + 5.05, 0.12, 1.5, 0.12, 0, -s * 0.9);   // cuernas sobre la entrada
      puerta(0, f, 0, { w: 3, h: 3.4, doble: true, marco: osc });
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) disco(L([0x7a2e2a, 0x2f4a6a, 0x3f5a3a, 0xb08a2e][i]), 0.62, 0.12, s * (3.6 + i * 1.35), 2.6, f + 0.1);   // escudos de los clanes
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) disco(acero, 0.16, 0.16, s * (3.6 + i * 1.35), 2.6, f + 0.14);
      for (let i = 0; i < 3; i++) caja(pc, 5.4 + i * 0.8, 0.22, 0.6, 0, 0, f + 5.2 + i * 0.5 - 0.6 * 0);
      for (const s of [-1, 1]) { r.fuegos.push([...brasero(s * 4.6, f + 5.6), 14]); caja(osc, 0.2, 5.2, 0.2, s * 6.4, 0, f + 5); caja(osc, 1.4, 0.14, 0.14, s * 6.4, 5.0, f + 5); caja(region, 1.2, 3, 0.07, s * 6.4, 1.9, f + 5); }
      lena(-7, f + 1.2, PI / 2); lena(-5, f + 1.2, PI / 2); barril(7, f + 0.9); barril(7.9, f + 1.3); banco(5.6, f + 0.6, 0, 2);
      poner(G.roca, pc, 9.4, 1.5, f + 5, 0.7, 2.0, 0.45, 0.4); caja(L(0x9fd0e6, { emissive: 0x4fa0d0, emissiveIntensity: 0.6 }), 0.1, 1.2, 0.5, 9.3, 0.9, f + 5.42, 0.4);   // piedra rúnica
      r.alto = 16;
    },
    patio() {
      for (const [a, b, c, d] of [[-9.5, -7, 9.5, -7], [9.5, -7, 9.5, 7.5], [-9.5, 7.5, -9.5, -7], [-9.5, 7.5, -2, 7.5], [2, 7.5, 9.5, 7.5]]) cerca(a, b, c, d, { alto: 1.7, paso: 1.3, m: tablon });
      for (const s of [-1, 1]) caja(osc, 0.4, 4.2, 0.4, s * 2, 0, 7.5); caja(osc, 5, 0.4, 0.4, 0, 4.2, 7.5); caja(region, 1.6, 1.8, 0.07, 0, 2.3, 7.55);
      for (let i = 0; i < 4; i++) muneco(-5.5 + i * 2.7, -4.8, (i % 2) * 0.3 - 0.15);
      for (let i = 0; i < 3; i++) diana(-8, -2.5 + i * 3.4, PI / 2);
      for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; caja(osc, 0.24, 1.3, 0.24, Math.cos(a) * 3.4, 0, 1.6 + Math.sin(a) * 3.4); caja(cuerda, 4.8, 0.07, 0.07, Math.cos(a + PI / 4) * 2.4, 1.1, 1.6 + Math.sin(a + PI / 4) * 2.4, -(a + PI / 4) - PI / 2); }
      figura(-0.9, 1.6, PI / 2, 0x6a2f2a, true); figura(0.9, 1.7, -PI / 2, 0x2f4a6a, true); figura(4.2, 2.5, -1.2, 0x4a4a4a, false);
      singular(-5.6, 1.4, PI / 2, 0x5a4a3c, false, { tipo: 'troll', piel: 0x8fa3b5, calzas: 0x8fa3b5, botas: 0x647280, pelo: 0x56606c, talla: 1.5, brazos: 'jarras' });   // el troll del patio: contra él se prueban los que van a jurar
      casa(6.6, -4.2, 4.6, 3.6, 3, tablon, teja2, 0, false); puerta(6.6, -2.4, 0, { w: 1.5, h: 2.4, marco: osc }); armero(7.6, 1.2, -PI / 2, 6); armero(7.6, 4.4, -PI / 2, 5, true);
      for (let i = 0; i < 3; i++) disco(L([0x7a2e2a, 0x2f4a6a, 0x3f5a3a][i]), 0.6, 0.1, 4.4 + i * 0.25, 0.65, -2.2 + i * 0.05, 0, PI / 2 - 0.25);
      barril(-6.6, 5.8); for (let i = 0; i < 7; i++) caja(clara, 0.04, 1.2, 0.04, -6.8 + rnd() * 0.4, 0.8, 5.6 + rnd() * 0.4); barril(-5.4, 6.2); banco(-3.6, 6.4, 0, 2.4); banco(4.6, 6.4, 0, 2.4);
      cono(paja, 1.2, 1.0, -7.6, 0, -5.6); farol(-3.2, 8.4); farol(3.2, 8.4, 3.6, PI);
      r.bandera = [2, 4.4, 7.5]; r.alto = 8;
    },
    santuario() {
      // El Mudo es el santuario: una mole de hielo arrodillada en el centro del crómlech, más alta que los dinteles, para que se vea desde cualquier calle.
      const roca = matPiedra(0x565b67, 1), hielo = L(0xdfeaf2, { roughness: 0.2, metalness: 0.1 }), hielo2 = L(0xb9d6ea, { roughness: 0.15, metalness: 0.15, emissive: 0x3a7aa8, emissiveIntensity: 0.35 }), brasaAzul = L(0x9fd8ff, { emissive: 0x58b8ff, emissiveIntensity: 2 });
      cil(roca, 11.2, 0.6, 0, 0, 0); cil(roca, 9.8, 0.6, 0, 0.6, 0); cil(roca, 8.2, 0.6, 0, 1.2, 0);
      for (let i = 0; i < 3; i++) caja(pc, 4.4, 0.6 * (3 - i), 1.5, 0, 0, 8.4 + i * 1.5);
      for (let i = 0; i < 8; i++) {   // crómlech: ocho menhires con dinteles, abierto por delante
        const a = i / 8 * PI * 2 + PI / 8, am = a + PI / 8;
        caja(roca, 1.2, 6.2 + (i % 3) * 0.5, 1.1, Math.cos(a) * 8.9, 1.2, Math.sin(a) * 8.9, -a);
        if (Math.abs(Math.sin(am) - 1) > 0.1) caja(roca, 7.9, 0.8, 1.2, Math.cos(am) * 8.2, 7.4, Math.sin(am) * 8.2, -am - PI / 2);
        caja(hielo2, 0.16, 1.8, 0.5, Math.cos(a) * 8.28, 3.0, Math.sin(a) * 8.28, -a);   // runas
      }
      // detrás, una corona de carámbanos que sube del suelo; delante queda despejado
      for (let i = 0; i < 7; i++) { const u = (i + 0.5) / 7, a = PI + (0.12 + u * 0.76) * PI, h = 4.5 + Math.sin(u * PI) * 5 + rnd() * 2.5; poner(G.cono, i % 2 ? hielo2 : hielo, Math.cos(a) * 5.9, 1.8 + h / 2 - 0.3, Math.sin(a) * 5.9, 1.0, h, 1.0, -a, -0.22); }
      for (let i = 0; i < 6; i++) { const a = PI + (0.2 + i * 0.12) * PI; poner(G.cono, i % 2 ? hielo : hielo2, Math.cos(a) * 7.0, 1.8 + 1.3, Math.sin(a) * 7.0, 0.6, 3.2 + (i % 3) * 0.8, 0.6, -a, -0.3); }
      caja(pc, 3.0, 0.9, 1.3, 0, 1.8, 6.4); caja(L(0xe8f2f8), 2.6, 0.06, 1.0, 0, 2.7, 6.4); for (let i = 0; i < 4; i++) cil(i % 2 ? oro : hielo2, 0.18, 0.34, -0.9 + i * 0.6, 2.76, 6.4);   // altar con ofrendas
      // el Mudo, al doble de tamaño: de rodillas, con los puños en la losa y cadenas a dos menhires
      sub(0, -1.2, 0, () => { const Y = 0.9, ojo = L(0x0c1c2c, { emissive: 0x7fd4ff, emissiveIntensity: 3 });
        poner(G.roca, hielo2, 0, Y + 2.5, 0, 1.45, 1.7, 1.15, 0.3, 0.22); poner(G.roca, hielo, 0, Y + 1.0, 0.1, 1.25, 0.9, 1.2, 1.1);
        for (const s of [-1, 1]) { poner(G.roca, hielo2, s * 1.55, Y + 3.5, 0.15, 0.85, 0.75, 0.85, s); poner(G.caja, hielo, s * 1.85, Y + 1.75, 0.95, 0.62, 2.9, 0.62, 0, -0.42, s * 0.08); poner(G.roca, hielo2, s * 1.95, Y + 0.5, 1.75, 0.72, 0.55, 0.72, s * 2);
          poner(G.roca, hielo, s * 0.8, Y + 0.5, 0.9, 0.7, 0.55, 1.2, s * 0.4); caja(ojo, 0.16, 0.1, 0.06, s * 0.2, Y + 4.42, 1.02); caja(hierro, 0.8, 0.22, 0.8, s * 1.9, Y + 1.0, 1.42);
          poner(G.caja, hierro, s * 2.95, Y + 0.7, 1.81, 2.32, 0.09, 0.09, -s * 0.355, -s * 0.262); }   // la cadena baja de la muñeca al pie del menhir
        poner(G.roca, hielo2, 0, Y + 4.35, 0.5, 0.58, 0.62, 0.58, 0.6);
        for (let i = 0; i < 5; i++) poner(G.cono, i % 2 ? hielo : hielo2, (i - 2) * 0.55, Y + 4.3 - Math.abs(i - 2) * 0.35, -0.75, 0.36, 2.4 - Math.abs(i - 2) * 0.4, 0.36, 0, -0.55, -(i - 2) * 0.18); }, 2);
      r.fuegos.push([0, 8, 2.5, 36, 0x8fd0ff]);
      for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) { const a = i * 2.094; caja(hierro, 0.1, 1.5, 0.1, s * 4.2 + Math.cos(a) * 0.45, 0, 12.0 + Math.sin(a) * 0.45); } cil(hierro, 0.75, 0.45, s * 4.2, 1.4, 12.0); cil(brasaAzul, 0.62, 0.1, s * 4.2, 1.85, 12.0); cono(brasaAzul, 0.3, 0.9, s * 4.2, 1.9, 12.0); }
      for (let i = 0; i < 9; i++) { const a = i / 9 * PI * 2 + 0.2; if (Math.abs(Math.sin(a) - 1) < 0.25) continue; poner(G.roca, i % 3 ? L(0xcfdbe6, { roughness: 0.3 }) : roca, Math.cos(a) * 12.8, 1.2, Math.sin(a) * 12.2, 0.9, 1.6 + rnd() * 1.4, 0.8, a, 0.15); }
      for (const s of [-1, 1]) { caja(osc, 0.2, 5, 0.2, s * 6.2, 0, 12.6); caja(L(0xe8f2f8), 1.1, 2.8, 0.07, s * 6.2, 2.0, 12.7); caja(hielo2, 0.5, 0.5, 0.09, s * 6.2, 3.6, 12.72); }
      r.alto = 15;
    },
    molino() {
      cil(pc, 3.45, 0.7, 0, 0, 0); cil(muro, 3.3, 4, 0, 0, 0); cil(muro, 3.0, 4, 0, 4, 0); cil(muro, 2.7, 3.4, 0, 8, 0);
      for (const y of [3.9, 7.9]) cil(pc, y < 5 ? 3.36 : 3.06, 0.22, 0, y, 0);
      cil(osc, 2.95, 0.5, 0, 11.3, 0); cono(teja2, 3.3, 3.8, 0, 11.6, 0); cil(osc, 0.14, 1.2, 0, 15.2, 0); caja(oro, 0.9, 0.3, 0.06, 0.3, 16.0, 0);   // veleta
      disco(osc, 0.32, 1.6, 0, 9.5, 3.0);
      cil(tabla, 4.5, 0.2, 0, 4.0, 0);   // galería
      for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2, am = a + PI / 16; caja(osc, 0.16, 1.1, 0.16, Math.cos(a) * 4.3, 4.2, Math.sin(a) * 4.3); caja(osc, 1.75, 0.1, 0.1, Math.cos(am) * 4.22, 5.2, Math.sin(am) * 4.22, -am - PI / 2); if (i % 2) poner(G.caja, osc, Math.cos(a) * 3.8, 3.2, Math.sin(a) * 3.8, 0.16, 1.9, 0.16, -a, -0.6); }
      puerta(0, 3.26, 0, { w: 1.4, h: 2.5 });
      for (const [a, y] of [[0, 6.2], [1.9, 2.0], [-1.9, 2.0], [2.6, 6.0], [-2.4, 9.2], [0.9, 9.0]]) ventana(Math.sin(a) * (y > 4 ? (y > 8 ? 2.68 : 2.98) : 3.28), y, Math.cos(a) * (y > 4 ? (y > 8 ? 2.68 : 2.98) : 3.28), a, { w: 0.7, h: 0.95, contra: null });
      poner(G.caja, osc, 0, 5.9, -5.3, 0.26, 12, 0.26, 0, 0, 0.47); caja(osc, 1.6, 0.2, 0.2, 0, 0.6, -8.2); cil(tabla, 0.5, 0.2, 0, 0.3, -8.2);   // timón de la caperuza
      // casa del molinero
      casa(-6.2, 1.4, 4.8, 4.2, 3.1, enl, teja2, 0, true); caja(pc, 5, 0.6, 4.4, -6.2, 0, 1.4); puerta(-6.9, 3.5, 0, { w: 1.3, h: 2.3, marco: osc }); ventana(-5.0, 1.2, 3.5, 0, { w: 0.9, h: 1.1, jardinera: true }); ventana(-8.6, 1.2, 1.4, -PI / 2, { w: 0.9, h: 1.1 });
      r.humos.push([-5, 6, 1.8]);
      // grano, harina y muelas viejas
      for (let i = 0; i < 9; i++) saco(3.6 + (i % 3) * 0.85, 3.4 + Math.floor(i / 3) % 2 * 0.8, i > 5 ? 0.5 : 0, 0.6);
      disco(pc, 1.15, 0.3, 4.6, 1.1, 1.5, 0.5, PI / 2 - 0.25); cil(negro, 0.2, 0.32, 6.4, 0, 3.2); cil(pc, 1.15, 0.3, 6.4, 0, 3.2);
      carro(1.6, 8, 0.2, 'sacos'); caballo(5.6, 8.9, 0.2, 0x8a6a48);
      cerca(-9.5, 5.5, -3, 5.5); cerca(-9.5, 5.5, -9.5, -1); barril(2.6, 3.4); cajon(-2.6, 4, 0.9, 0.3); farol(2.2, 4.6);
      r.alto = 18;
    },
    lonja() {
      const W = 15, D = 6, H = 6, z0 = -2.4, f = z0 + D / 2, muroClaro = matPiedra(0xcbbf9f, 2);
      caja(pc, W + 0.6, 0.8, D + 0.6, 0, 0, z0); caja(muroClaro, W, H, D, 0, 0, z0); caja(pc, W + 0.6, 0.35, D + 0.6, 0, H, z0); tejado(W + 1.6, D + 1.6, 3.4, 0, H + 0.35, z0, teja);
      // soportal
      caja(pc, W + 0.8, 0.3, 4.2, 0, 0, f + 2); for (let i = 0; i < 2; i++) caja(pc, W + 1.6 + i, 0.15, 0.6, 0, 0, f + 4.3 + i * 0.5);
      for (let i = 0; i < 8; i++) { const x = -7 + i * 2; caja(pc, 0.95, 0.35, 0.95, x, 0.3, f + 3.4); cil(pc, 0.36, 3.2, x, 0.65, f + 3.4); caja(pc, 0.9, 0.3, 0.9, x, 3.85, f + 3.4); if (i < 7) for (const s of [-1, 1]) poner(G.caja, pc, x + 1 + s * 0.62, 3.75, f + 3.4, 0.3, 0.8, 0.5, 0, s * 0.6); }
      caja(pc, W + 0.6, 0.6, 1.0, 0, 4.15, f + 3.4); poner(G.caja, teja, 0, 5.15, f + 1.9, W + 1.2, 0.2, 4.0, 0, 0, 0.2);
      puerta(0, f, 0, { w: 2.6, h: 3.5, doble: true, y: 0.3 }); for (const s of [-1, 1]) { puerta(s * 5.4, f, 0, { w: 1.5, h: 2.8, y: 0.3 }); ventana(s * 2.9, 1.7, f, 0, { w: 1.1, h: 1.6, contra: null, reja: true }); }
      for (const s of [-1, 1]) for (const z of [-1.8, 1.8]) { ventana(s * W / 2, 1.6, z0 + z, s * PI / 2, { contra: null, reja: true }); ventana(s * W / 2, 4.0, z0 + z, s * PI / 2, { w: 0.9, h: 1.1 }); }
      for (const s of [-1, 1]) { caja(osc, 0.12, 0.12, 0.9, s * 4, 4.6, f + 4.2); caja(region, 1.0, 2.2, 0.06, s * 4, 2.3, f + 4.5); }
      // torrecilla de la campana
      caja(muroClaro, 2.6, 3.2, 2.6, 0, H + 2.6, z0); for (let i = 0; i < 4; i++) sub(0, z0, i * PI / 2, () => caja(negro, 1.2, 1.5, 0.1, 0, H + 3.8, 1.3)); caja(pc, 3, 0.25, 3, 0, H + 5.8, z0);
      poner(G.cono, teja, 0, H + 7.3, z0, 2.1, 2.6, 2.1); cil(oro, 0.42, 0.6, 0, H + 4.4, z0); cil(osc, 0.1, 1.0, 0, H + 8.5, z0);
      // puestos y género delante
      const TOLDO = [0xb23a2e, 0x2f6aa0];
      [-5.2, 5.2].forEach((x, i) => sub(x, f + 7.2, 0, () => {
        caja(clara, 3.4, 0.14, 1.4, 0, 1.0, 0); for (const sx of [-1.6, 1.6]) for (const sz of [-0.6, 0.6]) caja(osc, 0.12, sz < 0 ? 2.9 : 2.3, 0.12, sx, 0, sz);
        poner(G.caja, L(TOLDO[i]), 0, 2.65, 0, 3.8, 0.06, 1.7, 0, 0, 0.45); for (let j = 0; j < 5; j++) (i ? cajon(-1.2 + j * 0.6, 0, 0.42, 0, 1.14) : saco(-1.2 + j * 0.6, 0, 1.1, 0.34));
        figura(0, -1.1, 0, i ? 0x6a5a2f : 0x5a6b3a, false);
      }));
      caja(hierro, 0.2, 3, 0.2, 0, 0, f + 7); caja(hierro, 1.4, 0.5, 1.4, 0, 0, f + 7); caja(hierro, 3.6, 0.14, 0.14, 0, 2.9, f + 7); for (const s of [-1, 1]) { caja(hierro, 0.03, 1.3, 0.03, s * 1.7, 1.6, f + 7); cil(oro, 0.7, 0.08, s * 1.7, 1.55, f + 7); }   // peso público
      for (let i = 0; i < 6; i++) cajon(-8.4 + (i % 3) * 1.2, f + 5.2 + (i > 2 ? 0.3 : 0), 1.0, (i % 2) * 0.2, i > 2 ? 0.8 : 0); for (let i = 0; i < 7; i++) saco(7.2 + (i % 3) * 0.8, f + 5.2 + (i % 2) * 0.7, i > 4 ? 0.45 : 0, 0.58);
      barril(2.4, f + 5.4); barril(3.2, f + 5.9); tonel(-2.6, f + 5.6, 0.3); farol(-8.6, f + 3.4); farol(8.6, f + 3.4, 3.6, PI); carro(-1, f + 10, 0.1, 'cajas');
      r.alto = 16;
    },
    cambio() {
      const marmol = matPiedra(0xb9b3a4, 2), W = 9.4, D = 6, H = 6.6, z0 = -1.6, f = z0 + D / 2, y0 = 0.9;
      caja(pc, 12.6, 0.3, 10.6, 0, 0, 0.2); caja(pc, 11.6, 0.3, 9.6, 0, 0.3, 0); caja(pc, 10.8, 0.3, 8.8, 0, 0.6, -0.2);
      caja(marmol, W, H, D, 0, y0, z0); caja(pc, W + 0.3, 0.5, D + 0.3, 0, y0, z0);
      for (let i = 0; i < 5; i++) { const x = -4 + i * 2; caja(pc, 1.0, 0.3, 1.0, x, y0, f + 1.7); cil(pc, 0.4, 5.1, x, y0 + 0.3, f + 1.7); for (const y of [y0 + 0.5, y0 + 5.0]) cil(pc, 0.46, 0.14, x, y, f + 1.7); caja(pc, 1.0, 0.3, 1.0, x, y0 + 5.4, f + 1.7); }
      caja(pc, 10.4, 0.8, D + 3.4, 0, y0 + 5.7, z0 + 1.2); caja(pc, 10.9, 0.25, D + 3.9, 0, y0 + 6.5, z0 + 1.2);
      poner(G.dosAguas, pizarra, 0, y0 + 6.75, z0 + 1.2, D + 3.9, 2.5, 10.9, PI / 2); disco(oro, 0.8, 0.14, 0, y0 + 7.6, f + 3.2);   // frontón con la moneda
      puerta(0, f, 0, { w: 2.1, h: 3.7, doble: true, y: y0 }); for (const y of [0.45, 0.6]) caja(hierro, 2.1, 0.13, 0.4, 0, y0 + 3.7 * y, f + 0.02);
      for (const s of [-1, 1]) { ventana(s * 3.1, y0 + 1.6, f, 0, { w: 1.1, h: 1.9, contra: null, reja: true }); for (const z of [-2.9, -0.7, 1.5]) caja(pc, 0.3, H, 0.55, s * (W / 2 + 0.1), y0, z0 + z); for (const z of [-1.8, 0.4]) ventana(s * W / 2, y0 + 1.8, z0 + z, s * PI / 2, { w: 0.9, h: 1.6, contra: null, reja: true }); }
      caja(marmol, 6, 4.4, 2.6, 0, 0, z0 - D / 2 - 1.3); caja(pc, 6.4, 0.3, 3, 0, 4.4, z0 - D / 2 - 1.3); sub(0, z0 - D / 2 - 2.6, PI, () => { caja(hierro, 1.5, 2.4, 0.2, 0, 0, 0); for (let i = 0; i < 3; i++) caja(acero, 1.6, 0.1, 0.26, 0, 0.5 + i * 0.7, 0); });   // cámara acorazada
      for (let i = 0; i < 5; i++) { const x = -5 + i * 2.5; cil(pc, 0.28, 1.0, x, 0, 6.6); poner(G.roca, pc, x, 1.15, 6.6, 0.3, 0.3, 0.3); if (i < 4 && i !== 1 && i !== 2) caja(hierro, 2.5, 0.07, 0.07, x + 1.25, 0.8, 6.6); }
      for (const s of [-1, 1]) { sub(s * 6.6, 4.4, 0, () => { caja(tablon, 1.3, 2.7, 1.3, 0, 0, 0); cono(pizarra, 1.1, 0.9, 0, 2.7, 0); caja(negro, 0.8, 1.9, 0.1, 0, 0.1, 0.62); }); figura(s * 6.6, 5.6, 0, 0x3a3a4a, true); farol(s * 5.2, 4.0, 3.4, s > 0 ? PI : 0); cil(pc, 0.6, 1.0, s * 2.6, y0, f + 2.6); cil(verde, 0.5, 0.6, s * 2.6, y0 + 1.0, f + 2.6); }
      r.alto = 13;
    },
    almacenes() {
      const tejaAlm = matTejado(0x5c3a2a), z0 = -1.6, D = 7.2, f = z0 + D / 2;
      for (let i = 0; i < 3; i++) {
        const x = -5.7 + i * 5.7, h = 4.6 + (i % 2) * 0.9, m = L(i % 2 ? 0x9a7a55 : 0x846646);
        caja(pc, 5.3, 0.6, D + 0.2, x, 0, z0); caja(m, 5.1, h, D, x, 0, z0); poner(G.dosAguas, tejaAlm, x, h, z0, D + 0.9, 2.7, 5.9, PI / 2); caja(osc, 0.3, 0.26, D + 1.1, x, h + 2.58, z0);
        caja(m, 5.1, 0.1, 0.1, x, h, f); for (const s of [-1, 1]) { caja(osc, 0.3, h, 0.3, x + s * 2.45, 0, f); poner(G.caja, osc, x + s * 1.7, h - 1.0, f + 0.06, 0.16, 2.3, 0.1, 0, s * 0.75); }
        caja(osc, 5.1, 0.26, 0.14, x, h - 0.26, f + 0.04); caja(osc, 5.1, 0.2, 0.14, x, 3.5, f + 0.04);
        puerta(x, f, 0, { w: 2.8, h: 3.2, doble: true, marco: osc }); for (const s of [-1, 1]) poner(G.caja, osc, x + s * 0.7, 1.6, f + 0.2, 0.1, 3.3, 0.06, 0, s * 0.4);
        caja(osc, 1.5, 1.5, 0.12, x, h + 0.15, f + 0.47); caja(hoja, 1.2, 1.25, 0.14, x, h + 0.25, f + 0.48);   // puerta del sobrado
        caja(osc, 0.24, 0.24, 2.0, x, h + 1.9, f + 1.2); disco(hierro, 0.22, 0.12, x, h + 1.7, f + 2.0, PI / 2);   // pescante y polea
        if (i === 1) { caja(cuerda, 0.05, h - 0.9, 0.05, x, 2.6, f + 2.0); cajon(x, f + 2.0, 1.1, 0.3, 1.7); } else caja(cuerda, 0.05, 1.4, 0.05, x, h + 0.3, f + 2.0);
        if (i !== 1) ventana(x + (i ? 2.55 : -2.55), 1.8, z0, (i ? 1 : -1) * PI / 2, { w: 0.8, h: 0.9, contra: null, reja: true });
      }
      poner(G.caja, tabla, 5.7, 0.14, f + 1.0, 2.8, 0.12, 1.6, 0, 0, 0.16);   // rampa
      for (let i = 0; i < 9; i++) cajon(-8.6 + (i % 3) * 1.25, f + 3.6 + Math.floor(i / 3) % 2 * 0.2, 1.1, (i % 2) * 0.15, i > 5 ? 1.8 : i > 2 ? 0.9 : 0);
      for (let i = 0; i < 5; i++) barril(-3.6 + (i % 3) * 1.2, f + 4.8 + (i > 2 ? 1.1 : 0)); barril(-3, f + 5.2, { y: 1.15 }); tonel(1.6, f + 5.4, 0.2); tonel(1.9, f + 6.8, 0.25);
      for (let i = 0; i < 10; i++) saco(6.2 + (i % 4) * 0.8, f + 4.2 + (i % 2) * 0.7, i > 7 ? 0.9 : i > 3 ? 0.45 : 0, 0.6);
      cil(cuerda, 0.55, 0.3, 4.4, 0, f + 3.6); cil(cuerda, 0.5, 0.3, 4.4, 0.3, f + 3.6); carro(-0.4, f + 9.4, 0.1, 'sacos'); figura(3.4, f + 6.4, 2.2, 0x8a6a48, false); figura(-6, f + 6.2, 0.8, 0x6a5a2f, false);
      farol(-2.85, f + 0.7); farol(2.85, f + 0.7, 3.6, PI);
      r.alto = 11;
    },
  };
  /* ---------- piezas de las sedes ---------- */
  function almenado(x0, z0, x1, z1, y, m, paso = 1.7) {
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(d / paso)), ry = -Math.atan2(z1 - z0, x1 - x0);
    for (let i = 0; i <= n; i++) caja(m, 0.85, 0.9, 0.6, x0 + (x1 - x0) * i / n, y, z0 + (z1 - z0) * i / n, ry);
  }
  function ventanal(x, y, z, ry = 0, w = 1.0, h = 2.2) { ventana(x, y, z, ry, { w, h, contra: null }); sub(x, z, ry, () => { caja(pc, w + 0.7, 0.3, 0.3, 0, y + h + 0.3, 0.08); poner(G.caja, pc, 0, y + h + 0.75, 0.08, 0.6, 0.6, 0.26, 0, PI / 4); }); }
  function torreon(x, z, rad, alto, m, tj, almenas) {
    torre(x, z, rad, alto, m, tj, almenas); cil(pc, rad + 0.25, 1.0, x, 0, z); for (const f of [0.45, 0.8]) cil(pc, rad + 0.1, 0.28, x, alto * f, z);
    for (let i = 0; i < 4; i++) for (const f of [0.3, 0.62, 0.9]) { const a = i * PI / 2 + f * 3; sub(x, z, a, () => caja(negro, 0.3, 1.5, 0.12, 0, alto * f - 0.8, rad - 0.02)); }
  }
  function contrafuerte(x, z, ry, h, m = pc) { sub(x, z, ry, () => { caja(m, 1.1, h, 1.5, 0, 0, 0.75); poner(G.caja, m, 0, h + 0.35, 0.55, 1.1, 0.3, 1.9, 0, 0, 0.55); caja(m, 1.3, 0.9, 2.1, 0, 0, 1.0); }); }
  function pozo(x, z) { enser(U('pozo', gPozo), x, z, 0.3); }
  function fuente(x, z, figuraColor) { cil(pc, 3.0, 0.8, x, 0, z); cil(agua, 2.7, 0.06, x, 0.72, z); cil(pc, 0.7, 2.0, x, 0.8, z); cil(pc, 1.5, 0.3, x, 2.6, z); cil(agua, 1.3, 0.05, x, 2.88, z); if (figuraColor) { cil(L(figuraColor), 0.34, 1.6, x, 2.9, z); cil(L(figuraColor), 0.24, 0.4, x, 4.5, z); poner(G.caja, L(figuraColor), x + 0.5, 4.2, z, 0.1, 1.3, 0.1, 0, -0.9); } }
  function estatua(x, z, ry = 0) { sub(x, z, ry, () => { caja(pc, 1.4, 1.6, 1.4, 0, 0, 0); caja(pc, 1.7, 0.2, 1.7, 0, 1.6, 0); cil(L(0x8a8f8a), 0.36, 1.7, 0, 1.8, 0); cil(L(0x8a8f8a), 0.26, 0.42, 0, 3.5, 0); poner(G.caja, L(0x8a8f8a), 0.45, 3.2, 0.3, 0.09, 2.2, 0.09, 0, 0, 0.5); }); }
  function arbolito(x, z, s = 1, pino = false) { cil(osc, 0.22 * s, 1.6 * s, x, 0, z); if (pino) { cono(L(0x3f5a45), 1.3 * s, 2.6 * s, x, 1.2 * s, z); cono(L(0x3f5a45), 0.9 * s, 2.0 * s, x, 2.8 * s, z); } else { poner(G.roca, verde, x, 2.6 * s, z, 1.5 * s, 1.3 * s, 1.5 * s, x); poner(G.roca, L(0x5c8a44), x + 0.5 * s, 3.3 * s, z - 0.3 * s, 1.0 * s, 0.9 * s, 1.0 * s, z); } }
  function puesto(x, z, ry, color, genero) { sub(x, z, ry, () => { enser(U(`puesto-${color}-${!!genero}`, () => gPuesto(color, !!genero)), 0, 0); if (!genero) for (let j = 0; j < 5; j++) rnd(); figura(0, -1.1, 0, 0x6a5a2f, false); }); }
  function balista(x, z, ry) { sub(x, z, ry, () => { caja(osc, 0.5, 0.9, 3.4, 0, 0, 0); for (const s of [-1, 1]) { caja(osc, 0.3, 1.1, 0.3, s * 0.9, 0, 0.8); disco(osc, 0.55, 0.14, s * 1.1, 0.55, -0.9, PI / 2); } caja(tabla, 0.3, 0.3, 4.2, 0, 1.0, 0.2); poner(G.caja, tabla, 1.1, 1.3, 1.6, 2.6, 0.16, 0.16, -0.35); poner(G.caja, tabla, -1.1, 1.3, 1.6, 2.6, 0.16, 0.16, 0.35); caja(acero, 0.1, 0.1, 3.0, 0, 1.3, 0.6); poner(G.cono, acero, 0, 1.35, 2.3, 0.14, 0.5, 0.14, 0, 0, PI / 2); }); }
  function recinto(o, m, pino) {   // muralla del recinto con almenas, torres y cuerpo de guardia hacia la plaza
    const R = o.rS;
    for (let i = 0; i < 20; i++) { const a = i / 20 * PI * 2; if (Math.abs(((a + PI / 2 + PI * 3) % (PI * 2)) - PI) < 0.25) continue; sub(Math.cos(a) * R, -Math.sin(a) * R, a + PI / 2, () => { caja(m, R * 0.33, 5, 1.6, 0, 0, 0); caja(pc, R * 0.33, 0.25, 1.9, 0, 5, 0); for (const s of [-0.33, 0, 0.33]) caja(m, R * 0.07, 0.9, 0.5, s * R * 0.33, 5.25, -0.65); }); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2 + 0.3; if (Math.abs(a - PI / 2) < 0.5) continue; torreon(Math.cos(a) * R, Math.sin(a) * R, 2.4, 8.5, m, o.teja, o.fortaleza); }
    const gx = Math.sin(0.34) * R, gz = Math.cos(0.34) * R;
    for (const s of [-1, 1]) { torreon(s * gx, gz, 2.2, 9.5, m, o.teja, true); caja(region, 1.1, 3.6, 0.07, s * (gx - 2.6), 2.6, gz + 0.9); caja(osc, 1.4, 0.12, 0.12, s * (gx - 2.6), 6.2, gz + 0.9); r.fuegos.push([...brasero(s * (gx + 3.4), gz + 2.5), 14, o.frio ? 0x8fd0ff : undefined]); figura(s * (gx - 1.2), gz + 2.2, 0, o.frio ? 0x3a4250 : 0x4a5a6a, true); }
    caja(m, gx * 2 - 3, 2.6, 1.8, 0, 5.2, gz); caja(pc, gx * 2 - 3, 0.25, 2.1, 0, 7.8, gz); almenado(-gx + 2.2, gz + 0.7, gx - 2.2, gz + 0.7, 8.05, m);
    for (let i = 0; i < 6; i++) caja(hierro, 0.12, 1.3, 0.12, -1.6 + i * 0.64, 4.0, gz + 0.3);
    for (let i = 0; i < 3; i++) { const a = 0.9 + i * 1.9; arbolito(Math.cos(a) * (R - 4), Math.sin(a) * (R - 4), 1.1, pino); }
  }

  /* ---------- casas corrientes: relieve sobre la caja pintada ---------- */
  // Las ventanas pintadas en la textura caen siempre en el mismo sitio de cada cara; aquí se les pone alféizar, dintel y contraventanas,
  // se abre una puerta y se añade lo propio de cada barrio. nivel 1 = lo justo; nivel 2 = casa de primera línea, con todo.
  const CONTRAS = [0x4a5a3a, 0x7a3b2e, 0x2f4f6f, 0x6a5a2f, 0x5a3a2a], TOLDOS = [0xb23a2e, 0x2f6aa0, 0xd9a23a, 0x3f8a54, 0x8a4a8e];
  E.casa = o => {
    const { w, d, alto: h, nivel, clase, lado: s, piedra, rnd: rd } = o, zf = s * d / 2, ryF = s > 0 ? 0 : PI, cc = L(CONTRAS[Math.floor(rd() * CONTRAS.length)]);
    const wh = h * 26 / 128, yb = h * 0.277, hueco = (x, z, ry, an) => sub(x, z, ry, () => {
      const a = an * 18 / 128; caja(pc, a + 0.36, 0.1, 0.3, 0, yb - 0.1, 0.1); caja(osc, a + 0.3, 0.12, 0.16, 0, yb + wh, 0.05);
      caja(vidrio, a, wh, 0.05, 0, yb, 0.02); caja(clara, 0.07, wh, 0.07, 0, yb, 0.035); caja(clara, a, 0.07, 0.07, 0, yb + wh * 0.56, 0.035); for (const t of [-1, 1]) caja(clara, 0.07, wh, 0.07, t * (a / 2 - 0.035), yb, 0.035);
      for (const t of [-1, 1]) caja(cc, a * 0.5, wh, 0.08, t * a * 0.8, yb, 0.06);
    });
    caja(pc, w + 0.24, 0.4, d + 0.24, 0, 0, 0);
    for (const u of [-0.29, 0, 0.29]) { if (u) hueco(u * w, zf, ryF, w); if (nivel > 1) hueco(u * w, -zf, ryF + PI, w); }
    if (nivel > 1 && clase !== 'arrabal') for (const t of [-1, 1]) for (const u of [-0.29, 0, 0.29]) hueco(t * w / 2, u * d, t * PI / 2, d);
    // puerta: tapa la ventana central si queda a su altura; si no, la ventana se queda encima
    const pw = Math.max(1.0, w * 18 / 128 + 0.4), alta = yb > 2.1, ph = alta ? 2.0 : Math.max(2.0, yb + wh + 0.08);
    if (alta) hueco(0, zf, ryF, w);
    sub(0, zf, ryF, () => {
      caja(osc, pw + 0.3, ph + 0.15, 0.14, 0, 0, 0.04); caja(hoja, pw, ph, 0.2, 0, 0, 0.05); caja(osc, 0.05, ph, 0.23, 0, 0, 0.05); caja(hierro, 0.08, 0.2, 0.3, pw * 0.3, ph * 0.45, 0.05); caja(pc, pw + 0.7, 0.14, 0.6, 0, 0, 0.42);
      if (nivel < 2) return;
      if (clase === 'mercaderes') {
        if (rd() < 0.65) { poner(G.caja, L(TOLDOS[Math.floor(rd() * 5)]), 0, ph + 0.75, 0.85, pw + 1.7, 0.06, 1.6, 0, 0, 0.4); for (const t of [-1, 1]) caja(osc, 0.1, ph + 0.4, 0.1, t * (pw / 2 + 0.75), 0, 1.55); caja(clara, pw + 1.2, 0.1, 0.7, 0, 0.85, 1.25 + 0.0); for (let i = 0; i < 4; i++) caja(L(TOLDOS[(i + 2) % 5]), 0.3, 0.22, 0.4, -pw / 2 - 0.3 + i * (pw + 0.6) / 3, 0.95, 1.25); for (const t of [-1, 1]) caja(osc, 0.1, 0.85, 0.6, t * (pw / 2 + 0.5), 0, 1.25); }
        if (rd() < 0.6) cartel(w * 0.37, Math.min(h - 0.2, 3.7), 0, 0, TOLDOS[Math.floor(rd() * 5)]);
        if (rd() < 0.5) { cajon(-w * 0.36, 0.7, 0.8, rd()); cajon(-w * 0.36 + 0.3, 0.75, 0.6, rd(), 0.64); } else barril(-w * 0.36, 0.7);
      } else if (clase === 'artesanos') {
        if (rd() < 0.5) cartel(-w * 0.37, Math.min(h - 0.2, 3.2), 0, 0, [0x2b2b2e, 0x8a6a3a, 0x6a2f2a][Math.floor(rd() * 3)]);
        if (rd() < 0.5) banco(w * 0.3, 0.55, 0, 1.5); if (rd() < 0.4) barril(-w * 0.34, 0.7);
      } else if (clase === 'alto') {
        const by = alta ? yb : yb, bx = alta ? 0 : 0.29 * w, a = w * 18 / 128;
        if (rd() < 0.7) { caja(pc, a + 1.1, 0.14, 0.8, bx, by - 0.24, 0.42); for (const t of [-1, 1]) caja(pc, 0.18, 0.4, 0.5, bx + t * (a / 2 + 0.3), by - 0.64, 0.3); for (let i = 0; i < 6; i++) caja(hierro, 0.05, 0.7, 0.05, bx - a / 2 - 0.45 + i * (a + 0.9) / 5, by - 0.1, 0.78); caja(hierro, a + 1.1, 0.06, 0.06, bx, by + 0.6, 0.78); }
        for (const t of [-1, 1]) { cil(pc, 0.32, 0.5, t * (pw / 2 + 0.6), 0, 0.5); poner(G.roca, verde, t * (pw / 2 + 0.6), 0.85, 0.5, 0.4, 0.45, 0.4, t); }
        if (rd() < 0.35) farol(-pw / 2 - 1.4, 0.7, 3.2);
      } else {
        if (rd() < 0.5) lena(w * 0.33, 0.6, PI / 2); if (rd() < 0.4) { caja(tabla, 0.9, 0.7, 0.7, -w * 0.34, 0, 0.6); caja(tabla, 1.0, 0.08, 0.8, -w * 0.34, 0.85, 0.6); for (let i = 0; i < 4; i++) caja(osc, 0.04, 0.5, 0.04, -w * 0.34 - 0.35 + i * 0.23, 0.15, 0.96); }   // gallinero
      }
    });
    if (!piedra) for (const sx of [-1, 1]) for (const sz of [-1, 1]) caja(osc, 0.22, h, 0.22, sx * w / 2, 0, sz * d / 2);
    else if (nivel > 1) for (const sx of [-1, 1]) for (let j = 0; j < 4; j++) caja(pc, 0.5, 0.42, 0.5, sx * w / 2, 0.5 + j * h / 4.4, zf);
    caja(osc, w * 1.14 + 0.2, 0.16, 0.24, 0, h * 1.7 - 0.08, 0); for (const t of [-1, 1]) caja(osc, w * 1.14, 0.12, 0.14, 0, h - 0.03, t * d * 0.61);
    if (o.chim) { caja(pc, 1.0, 0.16, 1.0, w * 0.26, h * 1.75, d * 0.1); cil(L(0x9a4a2e), 0.16, 0.4, w * 0.26, h * 1.75 + 0.16, d * 0.1); }
    if (nivel < 2) return;
    if (clase === 'artesanos' && rd() < 0.55) sub(w / 2, 0, PI / 2, () => {   // cobertizo de trabajo adosado
      for (const t of [-1, 1]) caja(osc, 0.16, 2.1, 0.16, t * d * 0.32, 0, 1.9); poner(G.caja, o.teja, 0, 2.5, 0.95, d * 0.8, 0.12, 2.2, 0, 0, 0.25);
      caja(clara, d * 0.5, 0.12, 0.7, 0, 0.9, 0.6); for (const t of [-1, 1]) caja(osc, 0.12, 0.9, 0.6, t * d * 0.22, 0, 0.6); caja(hierro, 0.3, 0.2, 0.2, 0.2, 1.02, 0.6); barril(-d * 0.3, 1.5, { r: 0.4, h: 0.9 });
    });
    if (clase === 'arrabal' && rd() < 0.5) sub(-w / 2, 0, -PI / 2, () => {   // ropa tendida
      for (const t of [-1, 1]) caja(osc, 0.12, 2.2, 0.12, t * d * 0.35, 0, 1.6); caja(cuerda, d * 0.7, 0.03, 0.03, 0, 2.05, 1.6);
      for (let i = 0; i < 4; i++) caja(L([0xe8dfc8, 0x7a3b2e, 0x2f4f6f, 0xc9b06a][i]), 0.5, 0.7 - (i % 2) * 0.2, 0.03, -d * 0.26 + i * d * 0.17, 1.3 + (i % 2) * 0.2, 1.6);
    });
    if ((clase === 'alto' || clase === 'mercaderes') && h > 4.2 && rd() < 0.6) {   // buhardilla hacia la calle
      const zd = d * 0.34, y0 = h + 0.7 * h * (1 - (zd + 0.62) / (0.61 * d)), dx = (rd() - 0.5) * w * 0.4;
      sub(dx, 0, ryF, () => { caja(o.pared, 1.3, 1.3, 1.3, 0, y0 - 0.15, zd); poner(G.dosAguas, o.teja, 0, y0 + 1.15, zd, 1.8, 0.7, 1.9, PI / 2); caja(vidrio, 0.7, 0.7, 0.06, 0, y0 + 0.2, zd + 0.66); caja(osc, 0.9, 0.9, 0.04, 0, y0 + 0.1, zd + 0.65); });
    }
  };

  /* ---------- sedes del poder ---------- */
  E.sede = o => {
    const k = o.rS / 22, tj = o.teja, m = matPiedra(o.colMuro, 3);
    recinto(o, matPiedra(o.colMuro, 2), o.id === 'griselda');
    if (o.id === 'griselda') {
      // torre del homenaje: un bloque ciego, con matacanes, saeteras y fuego azul en la puerta
      const W = 17 * k, D = 21 * k, H = 17, zc = -2, zf = zc + D / 2;
      caja(pc, W + 2, 1.2, D + 2, 0, 0, zc); caja(m, W + 1, 2.6, D + 1, 0, 0, zc); caja(m, W, H, D, 0, 0, zc); caja(m, W + 0.8, 0.5, D + 0.8, 0, H, zc);
      for (const [a, b, c, d] of [[-W / 2, zf + 0.4, W / 2, zf + 0.4], [W / 2 + 0.4, zf, W / 2 + 0.4, zc - D / 2], [-W / 2 - 0.4, zf, -W / 2 - 0.4, zc - D / 2], [-W / 2, zc - D / 2 - 0.4, W / 2, zc - D / 2 - 0.4]]) almenado(a, b, c, d, H + 0.5, m, 1.9);
      for (let x = -W / 2 + 0.6; x <= W / 2; x += 1.3) { caja(pc, 0.5, 0.9, 0.9, x, H - 1.1, zf + 0.3); }   // matacanes
      for (const s of [-1, 1]) for (let z = zc - D / 2 + 1; z <= zf; z += 1.5) caja(pc, 0.9, 0.9, 0.5, s * (W / 2 + 0.3), H - 1.1, z);
      for (const y of [4.5, 8.5, 12.5]) for (let i = 0; i < 6; i++) { const x = -W / 2 + 1.6 + i * (W - 3.2) / 5; if (y < 8 && Math.abs(x) < 3.4) continue; ventana(x, y, zf, 0, { w: 0.5, h: 1.8, contra: null }); }
      for (const s of [-1, 1]) for (const y of [5, 10]) for (const z of [-6, 0, 6]) ventana(s * W / 2, y, zc + z * k, s * PI / 2, { w: 0.5, h: 1.8, contra: null });
      for (const s of [-1, 1]) for (const z of [-6.5, 0, 6.5]) contrafuerte(s * W / 2, zc + z * k, s * PI / 2, 9, m);
      caja(m, 6.4, 7.6, 1.2, 0, 0, zf + 0.3); puerta(0, zf + 0.9, 0, { w: 4, h: 6, doble: true, marco: m, y: 1 }); for (const f of [0.4, 0.55, 0.88]) caja(hierro, 4, 0.16, 0.4, 0, 1 + 6 * f, zf + 0.94);
      for (let i = 0; i < 5; i++) caja(pc, 8 + i * 0.7, 0.2 * (5 - i), 0.8, 0, 0, zf + 1.4 + i * 0.8);
      for (const s of [-1, 1]) { caja(region, 1.5, 8.5, 0.08, s * (W / 2 - 2.2), 7.6, zf + 0.12); caja(osc, 1.9, 0.14, 0.14, s * (W / 2 - 2.2), 16.1, zf + 0.16); caja(pc, 1.2, 3.2, 1.2, s * 4.6, 0, zf + 4.4); r.fuegos.push([s * 4.6, 4.6, zf + 4.4, 18, 0x8fd0ff]); cil(L(0x9fd8ff, { emissive: 0x58b8ff, emissiveIntensity: 2 }), 0.5, 0.2, s * 4.6, 3.2, zf + 4.4); }
      for (const [x, z, rad, alto] of [[-9 * k, -12 * k, 3.6, 27], [9 * k, -12 * k, 3.0, 22], [9 * k, 8 * k, 2.6, 19]]) { torreon(x, z, rad, alto, m, tj, true); for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; poner(G.cono, osc, x + Math.cos(a) * (rad + 0.5), alto + 1.2, z + Math.sin(a) * (rad + 0.5), 0.2, 2.2, 0.2, -a, -0.5); } }
      caja(m, 3, 4, 3, -3 * k, H, zc - 3 * k); almenado(-3 * k - 1.4, zc - 3 * k + 1.5, -3 * k + 1.4, zc - 3 * k + 1.5, H + 4, m, 1.4); r.humos.push([-3 * k, H + 6, zc - 3 * k]);
      // patio: balistas, estacas, leña y nieve amontonada
      const R = o.rS;
      balista(-R * 0.52, R * 0.5, 0.5); balista(R * 0.52, R * 0.5, -0.5);
      for (const s of [-1, 1]) for (let i = 0; i < 7; i++) poner(G.cono, osc, s * 3.6, 1.0, zf + 6.5 + i * 1.3, 0.22, 2.4, 0.22, 0, 0, s > 0 ? 0 : 0);
      singular(R * -0.5, R * 1.1, 0.3, 0x5a4a3c, false, { tipo: 'troll', piel: 0x8fa3b5, calzas: 0x8fa3b5, botas: 0x647280, pelo: 0x56606c, talla: 1.5, piernas: 'suelo', brazos: 'reposo' }); caja(osc, 0.34, 2.6, 0.34, R * -0.5 - 1.9, 0, R * 1.1 - 0.4); poner(G.caja, hierro, R * -0.5 - 1.0, 1.2, R * 1.1 - 0.2, 1.9, 0.08, 0.08, 0.2, 0, 0.5);   // el troll de la puerta, encadenado a su poste
      armero(-R * 0.62, R * 0.12, PI / 2, 7); armero(R * 0.62, R * 0.12, -PI / 2, 6, true); lena(-R * 0.45, R * 0.32, 0.4); lena(-R * 0.36, R * 0.36, 0.4); barril(R * 0.4, R * 0.3); barril(R * 0.45, R * 0.34);
      for (let i = 0; i < 8; i++) { const a = rnd() * 6.28, d = R * (0.55 + rnd() * 0.3); if (Math.abs(Math.cos(a) * d) < 5 && Math.sin(a) > 0) continue; poner(G.roca, L(0xe8eef4), Math.cos(a) * d, 0.4, Math.sin(a) * d, 1.4 + rnd(), 0.6, 1.2 + rnd(), a); }
      figura(-2.6, zf + 3, 0.2, 0x3a4250, true); figura(2.6, zf + 3, -0.2, 0x3a4250, true); muneco(R * 0.5, R * 0.1, -0.6); muneco(R * 0.56, R * 0.02, -0.6);
    } else if (o.id === 'astravan') {
      // Casa del Consejo: soportal, balcones, torre del reloj y una plaza con fuente
      const W = 26 * k, D = 12 * k, H = 10, zc = -3, zf = zc + D / 2, za = 4.2 * k, claro = matPiedra(0xcfc6ae, 3);
      caja(pc, W + 0.8, 0.9, D + 0.8, 0, 0, zc); caja(claro, W, H, D, 0, 0, zc); caja(pc, W + 0.7, 0.4, D + 0.7, 0, H - 0.4, zc); tejado(28 * k, 13.5 * k, 5, 0, H, zc, tj);
      caja(pc, W + 1, 0.35, za - zf + 2.4, 0, 0, (za + zf) / 2 + 0.6); for (let i = 0; i < 2; i++) caja(pc, W + 2 + i, 0.17, 0.6, 0, 0, za + 2 + i * 0.5);
      for (let i = 0; i < 9; i++) { const x = -11 * k + i * 2.75 * k; caja(pc, 1.2, 0.4, 1.2, x, 0.35, za); cil(pc, 0.5, 4.2, x, 0.75, za); caja(pc, 1.15, 0.35, 1.15, x, 4.95, za); if (i < 8) for (const s of [-1, 1]) poner(G.caja, pc, x + 1.375 * k + s * (1.375 * k - 0.75), 4.75, za, 0.35, 1.0, 0.6, 0, s * 0.6); }
      caja(pc, 25 * k, 0.7, 1.3, 0, 5.3, za); poner(G.caja, tj, 0, 6.35, (za + zf) / 2, 25.6 * k, 0.2, za - zf + 1.2, 0, 0, 0.16);
      puerta(0, zf, 0, { w: 3, h: 4, doble: true, y: 0.35 }); for (const s of [-1, 1]) { puerta(s * 8 * k, zf, 0, { w: 1.8, h: 3, y: 0.35 }); for (const x of [3.6, 5.4]) ventana(s * x * k, 1.8, zf, 0, { w: 1.1, h: 1.8, contra: null, reja: true }); }
      for (let i = 0; i < 8; i++) { const x = -W / 2 + 1.8 + i * (W - 3.6) / 7; ventanal(x, 6.9, zf, 0, 0.9, 1.6); }
      for (const s of [-1, 1]) for (const z of [-3, 0, 3]) { ventanal(s * W / 2, 2.4, zc + z * k, s * PI / 2, 1.0, 2.0); ventanal(s * W / 2, 6.6, zc + z * k, s * PI / 2, 0.9, 1.6); }
      for (const x of [-7, -2.4, 2.4, 7]) { caja(claro, 1.6, 1.6, 2, x * k, H + 1.2, zf - 1.6); poner(G.dosAguas, tj, x * k, H + 2.8, zf - 1.6, 2.6, 0.9, 2.0, PI / 2); ventana(x * k, H + 1.5, zf - 0.58, 0, { w: 0.8, h: 0.9, contra: null }); }
      for (const x of [-9, 9]) chimenea(x * k, H + 2.5, zc - 1.5, 3.6);
      // torre del reloj
      const tz = -8 * k, tr = 5 * k;
      cil(pc, tr + 0.3, 1.2, 0, 0, tz); cil(claro, tr, 17, 0, 0, tz); for (const y of [8, 12.6]) cil(pc, tr + 0.14, 0.35, 0, y, tz); cil(tabla, tr + 1.0, 0.25, 0, 16.6, tz); for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; caja(osc, 0.16, 1.0, 0.16, Math.cos(a) * (tr + 0.85), 16.85, tz + Math.sin(a) * (tr + 0.85)); }
      cil(claro, tr * 0.8, 3.2, 0, 17, tz); for (let i = 0; i < 4; i++) sub(0, tz, i * PI / 2, () => { caja(negro, 1.4, 2, 0.12, 0, 17.6, tr * 0.8 - 0.02); disco(L(0xf0ead8), 1.5, 0.12, 0, 14.4, tr + 0.02); caja(negro, 0.12, 1.2, 0.06, 0, 14.4, tr + 0.1); poner(G.caja, negro, 0.35, 14.55, tr + 0.1, 0.1, 0.9, 0.06, 0, -1.1); });
      cil(oro, 0.5, 0.7, 0, 18.2, tz); cono(tj, tr * 0.8 + 0.7, 6, 0, 20.2, tz); cil(osc, 0.1, 1.6, 0, 26, tz); caja(oro, 0.9, 0.3, 0.06, 0.3, 27.2, tz);
      for (const s of [-1, 1]) { casa(s * 12 * k, 7 * k, 7, 5, 5, enl, teja2, PI / 2, true); puerta(s * (12 * k - 2.5), 7 * k, -s * PI / 2, { w: 1.4, h: 2.4 }); for (const z of [-2.2, 2.2]) ventana(s * (12 * k - 2.5), 1.3, 7 * k + z, -s * PI / 2, { w: 0.9, h: 1.1 }); }
      // la plaza del Consejo
      const R = o.rS;
      fuente(0, R * 0.62, 0x8a8f8a); for (const s of [-1, 1]) { estatua(s * 5.5, za + 4, 0); farol(s * 3.6, R * 0.86, 3.6, s > 0 ? PI : 0); banco(s * 4.6, R * 0.62, PI / 2, 2.4); puesto(s * R * 0.5, R * 0.55, -s * 0.5, s > 0 ? 0x2f6aa0 : 0xb08a2e, s > 0); for (const z of [0.3, 0.72]) { cil(pc, 0.8, 0.8, s * R * 0.3, 0, R * z); arbolito(s * R * 0.3, R * z, 0.8); } }
      for (const [x, z, c] of [[-2, za + 2.6, 0x5a2a5a], [1.2, za + 3, 0x2f4f6f], [6, R * 0.5, 0x7a3b2e], [-7, R * 0.45, 0x5a6b3a], [2.4, R * 0.74, 0x6a5a2f]]) figura(x, z, rnd() * 6, c, false);
      for (const s of [-1, 1]) { r.fuegos.push([...brasero(s * 2.6, za + 2.2, 0.35), 12]); }
    } else {
      // casa señorial (Solterra) o capitanía (el puerto): la misma casa grande, con vida distinta alrededor
      const W = 19 * k, D = 9 * k, H = 8, zc = -3, zf = zc + D / 2, puerto = o.puerto, R = o.rS;
      caja(pc, W + 0.6, 1.0, D + 0.6, 0, 0, zc); caja(pc, W, 4, D, 0, 0, zc); caja(enl, W + 0.6, 4, D + 0.6, 0, 4, zc);
      for (let i = 0; i < 12; i++) caja(osc, 0.28, 0.32, 0.6, -W / 2 + 0.3 + i * (W - 0.6) / 11, 3.7, zf + 0.2);
      entramado(W + 0.6, 4, 4, zf + 0.32, 0); for (const s of [-1, 1]) for (const z of [-D / 2 - 0.3, 0, D / 2 + 0.3]) caja(osc, 0.14, 4, 0.28, s * (W / 2 + 0.31), 4, zc + z);
      tejado(W * 1.14, D * 1.3, 5.6, 0, H, zc, tj);
      for (const x of [-5.5, 0, 5.5]) { caja(enl, 1.8, 1.7, 2.2, x * k, H + 0.9, zf - 1.2); poner(G.dosAguas, tj, x * k, H + 2.6, zf - 1.2, 2.8, 1.0, 2.2, PI / 2); ventana(x * k, H + 1.3, zf - 0.08, 0, { w: 0.9, h: 0.95, contra: null }); }
      chimenea(6.5 * k, H + 2.6, zc - 1, 4); r.humos.push([6.5 * k, H + 7.5, zc - 1]); chimenea(-6.5 * k, H + 2.6, zc - 1, 4);
      for (let i = 0; i < 4; i++) caja(pc, 5.4 - i * 0.3, 0.25 * (4 - i), 0.7, 0, 0, zf + 0.5 + i * 0.7);
      puerta(0, zf, 0, { w: 2.4, h: 3.2, doble: true, y: 1 }); for (const s of [-1, 1]) caja(osc, 0.3, 4, 0.3, s * 2.3, 0, zf + 2.4); tejado(5.8, 3.2, 1.2, 0, 4, zf + 1.4, tj);
      for (const s of [-1, 1]) for (const x of [3.6, 6.8]) { ventana(s * x * k, 1.7, zf, 0, { w: 1.1, h: 1.6, jardinera: !puerto }); ventana(s * x * k, 5.2, zf + 0.42, 0, { w: 1.0, h: 1.6 }); }
      ventana(0, 5.4, zf + 0.42, 0, { w: 1.4, h: 1.7 });
      for (const s of [-1, 1]) for (const z of [-2, 2]) { ventana(s * W / 2, 1.7, zc + z * k, s * PI / 2, { w: 1.0, h: 1.5 }); ventana(s * (W / 2 + 0.3), 5.2, zc + z * k, s * PI / 2, { w: 1.0, h: 1.5 }); }
      casa(-9 * k, 5 * k, 7, 6, 5.5, enl, tj, PI / 2, false); caja(pc, 6.2, 0.8, 7.2, -9 * k, 0, 5 * k); puerta(-9 * k + 3, 5 * k, PI / 2, { w: 1.5, h: 2.5, marco: osc }); for (const z of [-2.3, 2.3]) ventana(-9 * k + 3, 1.5, 5 * k + z, PI / 2, { w: 0.9, h: 1.2 }); ventana(-9 * k, 1.6, 5 * k + 3.5, 0, { w: 1.0, h: 1.3 });
      torreon(9 * k, 3 * k, 2.6, 13, matPiedra(o.colMuro, 2), tj, false); puerta(9 * k - 2.6, 3 * k, -PI / 2, { w: 1.2, h: 2.4 });
      for (const s of [-1, 1]) { farol(s * 3.4, zf + 3.6, 3.6, s > 0 ? PI : 0); figura(s * 3.4, zf + 2.0, 0, 0x4a5a6a, true); }
      if (puerto) {
        // capitanía: mástil de señales, ancla, un bote en picaderos, redes y género de a bordo
        cil(tabla, 2.9, 0.25, 9 * k, 9.6, 3 * k); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; caja(osc, 0.14, 1.0, 0.14, 9 * k + Math.cos(a) * 2.75, 9.85, 3 * k + Math.sin(a) * 2.75); }
        const mx = -R * 0.34, mz = R * 0.6;
        cil(pc, 1.0, 0.5, mx, 0, mz); cil(tabla, 0.2, 13, mx, 0.5, mz); caja(tabla, 6.4, 0.16, 0.16, mx, 10, mz); for (const s of [-1, 1]) { poner(G.caja, cuerda, mx + s * 1.6, 6.9, mz, 0.04, 7.2, 0.04, 0, s * 0.46); for (let i = 0; i < 3; i++) caja(L([0xb23a2e, 0xe0c040, 0x2f6aa0][i]), 0.9, 0.6, 0.05, mx + s * (2.6 - i * 0.5) , 8.9 - i * 0.9, mz); }
        const ax = R * 0.36, az = R * 0.58;
        sub(ax, az, 0.5, () => { poner(G.caja, hierro, 0, 2.0, 0, 0.3, 4.2, 0.3, 0, 0.35); poner(G.caja, hierro, 0.75, 0.5, 0, 2.6, 0.3, 0.3, 0, 0.35); for (const s of [-1, 1]) poner(G.cono, hierro, 0.75 + s * 1.3, 0.5 + s * 0.45 + 0.35, 0, 0.3, 0.9, 0.3, 0, 0.35 - s * 1.2); disco(hierro, 0.5, 0.12, -0.75, 4.0, 0); caja(tabla, 0.28, 0.28, 2.4, -0.55, 3.3, 0); });
        sub(-R * 0.5, R * 0.3, 0.3, () => { poner(G.casco, tablon, 0, 1.25, 0, 0.75, 6.4, 1.2, 0, PI / 2); poner(G.casco, osc, 0, 1.6, 0, 0.3, 5.8, 1.0, 0, PI / 2); for (const s of [-1.8, 1.8]) { caja(osc, 0.2, 0.9, 1.8, s, 0, 0); } });
        sub(R * 0.55, R * 0.28, -0.5, () => { for (const s of [-2, 0, 2]) caja(osc, 0.16, 2.6, 0.16, s, 0, 0); caja(osc, 4.2, 0.12, 0.12, 0, 2.5, 0); caja(L(0x5a6a5a, { transparent: true, opacity: 0.6 }), 4.0, 2.0, 0.05, 0, 0.5, 0.06); for (let i = 0; i < 6; i++) cil(L(0xc98a3a), 0.14, 0.1, -1.7 + i * 0.68, 0.5, 0.1); });
        for (let i = 0; i < 6; i++) cajon(R * 0.2 + (i % 3) * 1.2, R * 0.38 + (i > 2 ? 0.2 : 0), 1.0, i * 0.1, i > 2 ? 0.8 : 0); for (let i = 0; i < 4; i++) barril(-R * 0.14 - (i % 2) * 1.2, R * 0.4 + (i > 1 ? 1.2 : 0)); for (let i = 0; i < 3; i++) cil(cuerda, 0.6 - i * 0.05, 0.28, R * 0.08, i * 0.28, R * 0.5);
        mesa(-4.6, zf + 2.2, 0, 2.8); caja(L(0xe3d6b0), 1.8, 0.04, 0.9, -4.6, 1.1, zf + 2.2); figura(-4.6, zf + 1.2, 0, 0x2f4f6f, false);
        caja(osc, 0.24, 3.2, 0.24, 5.4, 0, zf + 3.4); caja(osc, 1.2, 0.2, 0.2, 5.9, 3.0, zf + 3.4); cil(oro, 0.4, 0.55, 6.3, 2.3, zf + 3.4);   // campana del puerto
        cartel(W / 2 - 1.2, 6.6, zf + 0.4, 0, 0x2f6aa0);
      } else {
        // casa del señor: hórreo, palomar, parra, carros de grano y frutales
        const hx = R * 0.5, hz = R * 0.3;
        sub(hx, hz, -0.4, () => { for (const sx of [-2.2, 0, 2.2]) for (const sz of [-1.1, 1.1]) { cil(pc, 0.3, 1.2, sx, 0, sz); cil(pc, 0.7, 0.2, sx, 1.2, sz); } caja(tablon, 6, 2.6, 3.2, 0, 1.4, 0); for (let i = 0; i < 9; i++) caja(osc, 0.1, 2.6, 0.06, -2.8 + i * 0.7, 1.4, 1.62); tejado(6.8, 4.2, 1.8, 0, 4, 0, teja2); poner(G.caja, tabla, 0, 0.7, 2.3, 0.9, 0.1, 1.8, 0, 0, -0.75); });
        const px = -R * 0.5, pz = R * 0.36;
        cil(enl, 1.7, 6, px, 0, pz); cil(pc, 1.85, 0.8, px, 0, pz); cono(teja2, 2.2, 2.6, px, 6, pz); for (let i = 0; i < 8; i++) for (const y of [3.4, 4.6]) { const a = i / 8 * PI * 2; sub(px, pz, a, () => caja(negro, 0.35, 0.4, 0.1, 0, y, 1.68)); } cil(tabla, 2.0, 0.1, px, 3.2, pz);
        sub(-R * 0.2, R * 0.6, 0, () => { for (const sx of [-3, 0, 3]) for (const sz of [-1.2, 1.2]) caja(osc, 0.2, 2.8, 0.2, sx, 0, sz); for (const sz of [-1.2, 1.2]) caja(osc, 6.4, 0.16, 0.16, 0, 2.8, sz); for (let i = 0; i < 7; i++) caja(osc, 0.12, 0.12, 2.8, -3 + i, 2.95, 0); for (let i = 0; i < 9; i++) poner(G.roca, i % 3 ? verde : L(0x6a8a3a), -2.8 + rnd() * 5.6, 3.15, -1 + rnd() * 2, 0.9, 0.3, 0.8, rnd() * 6); banco(0, 0, 0, 2.6); mesa(0, 0.9, 0, 2.6); });
        carro(R * 0.22, R * 0.62, 0.3, 'sacos'); caballo(R * 0.22 + 5.2, R * 0.62 - 1.2, 0.3, 0x8a5a36); carro(R * 0.5, R * 0.56, -0.5, 'pacas');
        pozo(4.8, zf + 5.2); for (let i = 0; i < 5; i++) arbolito(-R * 0.62 + (i % 3) * 3.2, R * 0.02 - Math.floor(i / 3) * 3.4 - 1, 0.85); for (let i = 0; i < 7; i++) saco(hx - 3 + (i % 4) * 0.8, hz + 3.4 + (i % 2) * 0.7, i > 4 ? 0.45 : 0, 0.6);
        cono(paja, 1.8, 2.0, R * 0.62, 0, R * 0.08); cono(paja, 1.4, 1.5, R * 0.56, 0, -R * 0.06); figura(R * 0.3, R * 0.5, 2, 0x8a6a48, false); figura(-R * 0.3, R * 0.5, 1, 0x6a5a2f, false);
      }
    }
    if (o.id !== 'griselda' && o.id !== 'astravan' && o.id !== 'solterra' && !o.puerto) castillo(o, k, m);
  };
  // castillo real (Valcoria y, por defecto, cualquier capital sin sede propia)
  function castillo(o, k, m) {
    const W = 17 * k, D = 14 * k, H = 12, zc = -2, zf = zc + D / 2, tj = o.teja, R = o.rS;
    caja(pc, W + 0.9, 1.1, D + 0.9, 0, 0, zc); caja(m, W, H, D, 0, 0, zc); caja(pc, W + 0.7, 0.45, D + 0.7, 0, H, zc);
    for (const [a, b, c, d] of [[-W / 2, zf + 0.3, W / 2, zf + 0.3], [W / 2 + 0.3, zf, W / 2 + 0.3, zc - D / 2], [-W / 2 - 0.3, zf, -W / 2 - 0.3, zc - D / 2]]) almenado(a, b, c, d, H + 0.45, m);
    tejado(W - 1.6, D - 1.6, 6, 0, H + 0.45, zc, tj);
    for (const x of [-4.2, 0, 4.2]) { caja(m, 1.8, 1.9, 2, x * k, H + 1.6, zc + D / 2 - 3.2); poner(G.dosAguas, tj, x * k, H + 3.5, zc + D / 2 - 3.2, 2.8, 1.1, 2.2, PI / 2); ventana(x * k, H + 2.0, zc + D / 2 - 2.18, 0, { w: 0.9, h: 1.0, contra: null }); }
    chimenea(-5 * k, H + 4, zc - 2, 4.2, m); chimenea(5 * k, H + 4, zc - 2, 4.2, m); r.humos.push([5 * k, H + 9, zc - 2]);
    for (const y of [3.4, 7.8]) for (let i = 0; i < 6; i++) { const x = -W / 2 + 1.7 + i * (W - 3.4) / 5; if (Math.abs(x) < 2.8) continue; ventanal(x, y, zf, 0, 1.0, y < 5 ? 2.2 : 1.9); }
    for (const s of [-1, 1]) for (const z of [-4, 0, 4]) { ventanal(s * W / 2, 3.4, zc + z * k, s * PI / 2); ventanal(s * W / 2, 7.8, zc + z * k, s * PI / 2, 1.0, 1.9); }
    for (const s of [-1, 1]) contrafuerte(s * 3.2, zf, 0, 7.5, m);
    for (let i = 0; i < 5; i++) caja(pc, 7.4 - i * 0.4, 0.25 * (5 - i), 0.7, 0, 0, zf + 0.5 + i * 0.7);
    puerta(0, zf, 0, { w: 3.2, h: 4.4, doble: true, y: 1.25 }); poner(G.caja, pc, 0, 6.3, zf + 0.1, 2.6, 2.6, 0.3, 0, PI / 4);
    caja(pc, 5.6, 0.35, 1.8, 0, 7.4, zf + 0.9); for (const s of [-2.4, -0.8, 0.8, 2.4]) caja(pc, 0.4, 0.8, 0.6, s, 6.6, zf + 0.5); for (let i = 0; i < 8; i++) caja(pc, 0.2, 0.9, 0.2, -2.6 + i * 0.74, 7.75, zf + 1.7); caja(pc, 5.6, 0.16, 0.22, 0, 8.65, zf + 1.7); ventanal(0, 7.9, zf, 0, 1.4, 2.4);
    for (const s of [-1, 1]) { caja(region, 1.3, 4.6, 0.08, s * 4.6 * k, 5.0, zf + 0.12); caja(osc, 1.7, 0.14, 0.14, s * 4.6 * k, 9.6, zf + 0.16); r.fuegos.push([...brasero(s * 4.4, zf + 3.6), 14]); figura(s * 2.6, zf + 3.8, 0, 0x6a2f2a, true); }
    for (const [x, z, rad, alto] of [[-9.5 * k, -9.5 * k, 3.3, 22], [9.5 * k, -9.5 * k, 2.8, 18], [9.5 * k, 5.5 * k, 2.4, 15], [-9.5 * k, 5.5 * k, 2.4, 15]]) { torreon(x, z, rad, alto, m, tj, false); cil(m, rad + 0.5, 1.2, x, alto - 1.2, z); for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; caja(pc, 0.5, 0.7, 0.5, x + Math.cos(a) * (rad + 0.35), alto - 1.9, z + Math.sin(a) * (rad + 0.35), -a); } }
    // capilla a un lado, cuadras al otro y el patio de honor
    sub(-R * 0.6, R * 0.34, PI / 2 - 0.5, () => { caja(pc, 5.6, 0.7, 8.4, 0, 0, 0); caja(m, 5.2, 5.5, 8, 0, 0, 0); poner(G.dosAguas, tj, 0, 5.5, 0, 9, 3.2, 6.2, PI / 2); puerta(0, 4, 0, { w: 1.6, h: 3 }); disco(vidrio, 0.8, 0.14, 0, 5.0, 4.06); disco(pc, 1.0, 0.1, 0, 5.0, 4.02); for (const s of [-1, 1]) for (const z of [-2.2, 0.6]) sub(0, 0, 0, () => ventanal(s * 2.6, 1.6, z, s * PI / 2, 0.7, 2.4)); caja(m, 1.6, 3.4, 1.6, 0, 7, 2.8); cono(tj, 1.3, 2.4, 0, 10.4, 2.8); cil(oro, 0.3, 0.45, 0, 9.4, 2.8); cil(oro, 0.08, 1.2, 0, 12.8, 2.8); });
    sub(R * 0.6, R * 0.34, -PI / 2 + 0.5, () => { caja(tablon, 9, 3.4, 0.3, 0, 0, -2); for (const s of [-1, 1]) caja(tablon, 0.3, 3.4, 4, s * 4.35, 0, 0); for (let i = 0; i < 4; i++) { caja(osc, 0.3, 3.4, 0.3, -4.35 + i * 2.9, 0, 2); if (i < 3) caballo(-2.9 + i * 2.9, -0.2, -PI / 2, [0x6a4326, 0x2f2620, 0xb8a888][i]); } caja(osc, 9, 0.3, 0.3, 0, 3.4, 2); poner(G.caja, teja2, 0, 3.9, 0, 9.8, 0.2, 5.2, 0, 0, 0.2); caja(paja, 8.4, 0.1, 3.6, 0, 0, 0); caja(paja, 1.4, 0.8, 0.9, 3, 0, 3.2); caja(paja, 1.4, 0.8, 0.9, 1.4, 0, 3.4); });
    fuente(0, R * 0.62, 0x8a8f8a); pozo(R * 0.34, R * 0.2);
    for (const s of [-1, 1]) { estatua(s * 6.4, zf + 6, 0); farol(s * 3.4, R * 0.84, 3.6, s > 0 ? PI : 0); banco(s * 5.2, R * 0.62, PI / 2, 2.4); for (const z of [0.42, 0.7]) arbolito(s * R * 0.3, R * z, 0.9); }
    armero(-R * 0.34, R * 0.16, PI / 2, 6); muneco(-R * 0.3, R * 0.3, 0.8); muneco(-R * 0.4, R * 0.26, 0.8); carro(R * 0.3, R * 0.5, -0.4, 'cajas'); barril(R * 0.2, R * 0.3); barril(R * 0.24, R * 0.34);
    figura(1.5, R * 0.46, 2.6, 0x5a2a5a, false); figura(-3, R * 0.5, 0.4, 0x2f4f6f, false);
  }

  return (tipo, o) => { r.alto = 9; r.fuegos = []; r.humos = []; r.bandera = null; E[tipo]?.(o); return { ...r }; };
}
