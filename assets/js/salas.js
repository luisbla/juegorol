// salas.js — interiores de los edificios singulares de las ciudades: herrería, cuartel y lonja.
// Igual que la taberna: una maqueta abierta por delante. Cada sala es una función que amuebla la misma caja.
import * as THREE from 'three';
import { azarDe } from './ruido.js';

const AN = 44, FO = 28, AL = 11;   // ancho (x), fondo (z), alto

export function crearSala(tipo, id) {
  const rnd = azarDe('sala-' + id), escena = new THREE.Scene(), etiquetas = [], vivos = [];   // vivos: funciones que animan algo
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
  const madera = mat(0x6b4f35), oscura = mat(0x3d2c1e), clara = mat(0x9a7a55), piedra = mat(0x77726a, { roughness: 1 }), hierro = mat(0x2b2b2e, { roughness: 0.55, metalness: 0.5 }), acero = mat(0x9aa0aa, { roughness: 0.35, metalness: 0.7 });
  const pieza = (geo, m, x, y, z, padre = escena) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); padre.add(o); return o; };
  const caja = (m, w, h, d, x, y, z, padre) => pieza(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, padre);
  const cil = (m, r, h, x, y, z, padre, seg = 12) => pieza(new THREE.CylinderGeometry(r, r, h, seg), m, x, y + h / 2, z, padre);
  const rotulo = (nombre, x, y, z) => etiquetas.push({ nombre, pos: new THREE.Vector3(x, y, z), clase: 'hito' });
  const ROPAS = [0x7a3b2e, 0x2f4f6f, 0x5a6b3a, 0x6a5a2f, 0x4a3a5a, 0x8a6a48];

  // la caja: suelo, fondo y dos laterales, con ventanas al fondo
  function caja3(colSuelo, colPared, ventanas = [-12, 12]) {
    caja(mat(colSuelo, { roughness: 1 }), AN, 1, FO, 0, -1, 0);
    const pared = mat(colPared, { roughness: 1 });
    caja(pared, AN, AL, 1, 0, 0, -FO / 2 - 0.5); caja(pared, 1, AL, FO, -AN / 2 - 0.5, 0, 0); caja(pared, 1, AL, FO, AN / 2 + 0.5, 0, 0);
    for (let z = -FO / 2 + 3; z < -1; z += 6) caja(oscura, AN + 1, 0.8, 0.9, 0, AL - 0.5, z);   // vigas, solo al fondo
    for (const x of ventanas) { caja(oscura, 4.2, 4.2, 0.3, x, 5.2, -FO / 2 + 0.25); caja(cristal, 3.5, 3.5, 0.2, x, 5.55, -FO / 2 + 0.42); }
  }
  const cristal = new THREE.MeshStandardMaterial({ color: 0x1a2028, emissive: 0xbcd6ff, emissiveIntensity: 0.8 });

  // una figura: cuerpo, cabeza y un brazo que se puede mover
  function persona(x, z, mira, color = ROPAS[Math.floor(rnd() * ROPAS.length)], alto = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = mira; g.scale.setScalar(alto); escena.add(g);
    pieza(new THREE.CapsuleGeometry(0.62, 1.7, 4, 10), mat(color, { roughness: 1 }), 0, 1.75, 0, g);
    pieza(new THREE.SphereGeometry(0.46, 12, 10), mat(0xd9b08c), 0, 3.35, 0, g);
    const hombro = new THREE.Group(); hombro.position.set(0.72, 2.6, 0); g.add(hombro);
    pieza(new THREE.CapsuleGeometry(0.17, 1.1, 4, 6), mat(color, { roughness: 1 }), 0, -0.6, 0, hombro);
    const fase = rnd() * 6.28;
    vivos.push(t => { g.position.y = Math.sin(t * 1.3 + fase) * 0.03; });
    return { g, hombro, fase };
  }
  function barril(x, z, r = 0.9, h = 1.8) { cil(madera, r, h, x, 0, z); cil(hierro, r + 0.04, 0.14, x, h * 0.25, z); cil(hierro, r + 0.04, 0.14, x, h * 0.75, z); }
  function luzFuego(x, y, z, fuerza, color = 0xff9a4a) {
    const l = new THREE.PointLight(color, fuerza, 60, 1.7); l.position.set(x, y, z); escena.add(l);
    vivos.push(t => { l.intensity = fuerza * (0.85 + 0.1 * Math.sin(t * 11 + x) + 0.07 * Math.sin(t * 23.7)); });
  }

  /* ================= herrería ================= */
  function herreria() {
    caja3(0x5a554e, 0x6e675d, [10]);
    // fragua: hogar de piedra con brasas y campana
    const fx = -13, fz = -FO / 2 + 3.2;
    caja(piedra, 9, 2.4, 5.4, fx, 0, fz); caja(piedra, 9, AL - 6, 3, fx, 6, fz - 1.2); caja(piedra, 1.2, 3.6, 5.4, fx - 3.9, 2.4, fz); caja(piedra, 1.2, 3.6, 5.4, fx + 3.9, 2.4, fz);
    const brasas = caja(new THREE.MeshStandardMaterial({ color: 0x331008, emissive: 0xff5a14, emissiveIntensity: 2.2 }), 6.2, 0.5, 3.4, fx, 2.4, fz + 0.4);
    for (let i = 0; i < 9; i++) pieza(new THREE.DodecahedronGeometry(0.45 + rnd() * 0.3), mat(0x16130f, { roughness: 1 }), fx - 2.6 + rnd() * 5.2, 3.0, fz - 0.6 + rnd() * 2.2);
    vivos.push(t => { brasas.material.emissiveIntensity = 1.9 + 0.5 * Math.sin(t * 2.2) + 0.2 * Math.sin(t * 9); });
    luzFuego(fx, 5, fz + 3, 330);
    // fuelle, con el aprendiz dándole
    const fuelle = new THREE.Group(); fuelle.position.set(fx + 7.4, 2.4, fz + 0.6); escena.add(fuelle);
    const saco = pieza(new THREE.ConeGeometry(1.5, 3.6, 8), mat(0x5a3a26, { roughness: 1 }), 0, 0, 0, fuelle); saco.rotation.z = Math.PI / 2;
    caja(oscura, 0.4, 2.4, 0.4, fx + 8.6, 0, fz + 0.6);
    const aprendiz = persona(fx + 9.6, fz + 2.4, -2.2, 0x6a5a2f, 0.85);
    vivos.push(t => { const k = 0.5 + 0.5 * Math.sin(t * 1.8); saco.scale.set(0.7 + k * 0.4, 1, 1); aprendiz.hombro.rotation.x = -0.6 - k * 0.9; });
    // yunque sobre tocón, y el herrero martilleando una barra al rojo
    const yx = -3, yz = 1;
    cil(madera, 1.3, 1.5, yx, 0, yz, undefined, 10); caja(hierro, 2.6, 0.9, 1.1, yx, 1.5, yz); caja(hierro, 1.4, 0.5, 0.9, yx, 2.4, yz);
    const cuerno = pieza(new THREE.ConeGeometry(0.45, 1.6, 8), hierro, yx + 2.0, 2.2, yz); cuerno.rotation.z = -Math.PI / 2;
    const barra = caja(new THREE.MeshStandardMaterial({ color: 0x40100a, emissive: 0xff7a1c, emissiveIntensity: 1.6 }), 2.6, 0.16, 0.22, yx - 0.3, 2.92, yz);
    const herrero = persona(yx - 0.4, yz + 2.3, Math.PI, 0x4a3326, 1.08);
    const martillo = new THREE.Group(); martillo.position.set(0, -1.25, 0); herrero.hombro.add(martillo);
    cil(madera, 0.08, 1.2, 0, -0.1, 0.5, martillo, 6).rotation.x = Math.PI / 2; caja(hierro, 0.45, 0.45, 0.8, 0, -0.3, 1.1, martillo);
    const chispa = new THREE.PointLight(0xffc070, 0, 14, 2); chispa.position.set(yx, 3.4, yz); escena.add(chispa);
    vivos.push(t => {
      const f = (t * 1.25) % 1, golpe = f < 0.75 ? f / 0.75 : 1 - (f - 0.75) / 0.25;   // sube despacio, baja de golpe
      herrero.hombro.rotation.x = -0.5 - golpe * 1.5; chispa.intensity = f > 0.97 || f < 0.06 ? 90 : 0;
      barra.material.emissiveIntensity = 1.2 + 0.5 * Math.sin(t * 0.7);
    });
    // pila de temple, banco de trabajo y carbón
    caja(madera, 4.6, 1.5, 2.2, 4.5, 0, 4.5); caja(mat(0x2a4a55, { roughness: 0.15 }), 4.2, 0.1, 1.8, 4.5, 1.42, 4.5);
    caja(clara, 9, 0.4, 2.6, 12, 2.6, -FO / 2 + 2); for (const x of [8, 16]) caja(oscura, 0.5, 2.6, 2.2, x, 0, -FO / 2 + 2);
    for (let i = 0; i < 5; i++) { caja(hierro, 0.18, 0.18, 1.5 + rnd(), 8.6 + i * 1.6, 3.0, -FO / 2 + 2).rotation.y = rnd() - 0.5; }
    caja(hierro, 0.9, 0.7, 0.6, 15.2, 3.0, -FO / 2 + 1.8);   // tornillo de banco
    for (let i = 0; i < 26; i++) pieza(new THREE.DodecahedronGeometry(0.5 + rnd() * 0.5), mat(0x15120f, { roughness: 1 }), -AN / 2 + 2 + rnd() * 4.5, 0.4 + rnd() * 1.4, 6 + rnd() * 5);
    // armero en la pared: espadas, hachas y escudos
    const ax = AN / 2 - 0.4;
    caja(oscura, 0.4, 0.5, 15, ax, 6.4, -2); caja(oscura, 0.4, 0.5, 15, ax, 3.0, -2);
    for (let i = 0; i < 7; i++) { const z = -8.5 + i * 2; caja(acero, 0.1, 3.6, 0.32, ax - 0.25, 3.2, z); caja(oscura, 0.16, 0.2, 1.1, ax - 0.25, 3.2, z); }
    for (let i = 0; i < 3; i++) { const e = cil(mat([0x7a2e2a, 0x2f4a6a, 0x5a6b3a][i]), 1.3, 0.2, ax - 0.4, 7.6, -7 + i * 5, undefined, 16); e.rotation.z = Math.PI / 2; const u = cil(acero, 0.35, 0.3, ax - 0.5, 8.75, -7 + i * 5); u.rotation.z = Math.PI / 2; }
    barril(15, 8); barril(17.2, 9.4); barril(13, 10.2, 0.8, 1.6);
    for (let i = 0; i < 8; i++) caja(acero, 0.12, 2.8 + rnd(), 0.12, 14.4 + rnd() * 1.2, 1.2, 7.5 + rnd() * 1.0).rotation.z = (rnd() - 0.5) * 0.3;   // barras en el barril
    rotulo('Fragua', fx, AL + 1, fz); rotulo('Yunque', yx, 6.5, yz); rotulo('Armero', ax - 2, AL + 0.5, -2); rotulo('Pila de temple', 4.5, 4, 4.5);
  }

  /* ================= cuartel ================= */
  function cuartel() {
    caja3(0x6a5038, 0x7a746a, [-4]);
    // literas de la guardia
    for (let i = 0; i < 4; i++) {
      const x = -AN / 2 + 3.4, z = -FO / 2 + 3.5 + i * 5.2;
      for (const sx of [-2.9, 2.9]) for (const sz of [-1.3, 1.3]) caja(oscura, 0.35, 6, 0.35, x + sx, 0, z + sz);
      for (const y of [1.2, 4.2]) { caja(madera, 6.2, 0.35, 2.9, x, y, z); caja(mat(0x8a8470, { roughness: 1 }), 5.8, 0.4, 2.5, x, y + 0.35, z); caja(mat(0xe6dcc6, { roughness: 1 }), 1.2, 0.35, 1.8, x - 2.1, y + 0.75, z); }
      caja(clara, 2.2, 1.1, 1.3, x + 4.4, 0, z);   // arcón al pie
      if (i === 1) { const d = pieza(new THREE.CapsuleGeometry(0.55, 2.6, 4, 8), mat(0x4a5a6a, { roughness: 1 }), x + 0.4, 2.3, z); d.rotation.z = Math.PI / 2; pieza(new THREE.SphereGeometry(0.42, 10, 8), mat(0xd9b08c), x - 2.0, 2.35, z); }
    }
    // sala de armas: lanzas y escudos contra el fondo
    const lx = 5;
    caja(oscura, 12, 0.4, 0.6, lx, 5.2, -FO / 2 + 0.6); caja(oscura, 12, 0.6, 1.2, lx, 0, -FO / 2 + 0.9);
    for (let i = 0; i < 9; i++) { const x = lx - 5.2 + i * 1.3; cil(madera, 0.09, 8, x, 0.6, -FO / 2 + 0.9, undefined, 6); pieza(new THREE.ConeGeometry(0.2, 0.9, 6), acero, x, 9.0, -FO / 2 + 0.9); }
    for (let i = 0; i < 4; i++) { const e = cil(mat(0x6a2f2a), 1.25, 0.2, lx - 4.5 + i * 3, 2.2, -FO / 2 + 1.9, undefined, 16); e.rotation.x = Math.PI / 2 - 0.25; }
    // mesa de guardia con el plano de la ciudad
    const mx = 2, mz = 4;
    caja(clara, 9, 0.4, 4.2, mx, 2.3, mz); for (const sx of [-3.8, 3.8]) for (const sz of [-1.6, 1.6]) caja(oscura, 0.45, 2.3, 0.45, mx + sx, 0, mz + sz);
    caja(mat(0xe3d6b0, { roughness: 1 }), 4.2, 0.05, 2.8, mx - 0.6, 2.72, mz); for (let i = 0; i < 5; i++) cil(mat(0x7a2e2a), 0.14, 0.3, mx - 2 + rnd() * 3, 2.75, mz - 1 + rnd() * 2, undefined, 6);
    cil(mat(0xe8dcc0), 0.1, 0.7, mx + 3.4, 2.7, mz + 1.2, undefined, 6); luzFuego(mx + 3.4, 4.6, mz + 1.2, 70, 0xffc878);
    for (const sz of [-3.2, 3.2]) caja(madera, 8, 0.3, 1.1, mx, 1.2, mz + sz);
    const capitan = persona(mx - 0.6, mz - 2.9, 0, 0x6a2f2a, 1.05); vivos.push(t => { capitan.hombro.rotation.x = -1.2 + Math.sin(t * 0.6) * 0.25; });   // señala el plano
    persona(mx - 3, mz + 3.0, Math.PI, 0x4a5a6a); persona(mx + 2.2, mz + 3.0, Math.PI, 0x4a5a6a);
    // centinela que hace la ronda
    const centinela = persona(0, 10, 0, 0x4a5a6a); const lanza = new THREE.Group(); centinela.hombro.add(lanza);
    cil(madera, 0.07, 6.5, 0, -3.2, 0.2, lanza, 6); pieza(new THREE.ConeGeometry(0.17, 0.8, 6), acero, 0, 3.7, 0.2, lanza);
    vivos.push(t => { const f = (t * 0.06) % 1, ida = f < 0.5, k = ida ? f * 2 : 2 - f * 2; centinela.g.position.x = -12 + k * 26; centinela.g.position.y = Math.abs(Math.sin(t * 5)) * 0.08; centinela.g.rotation.y = ida ? Math.PI / 2 : -Math.PI / 2; });
    // calabozo: reja, catre y un preso
    const cx = AN / 2 - 5, cz = -FO / 2 + 5;
    for (let i = 0; i <= 10; i++) cil(hierro, 0.12, AL - 3, AN / 2 - 10, 0, -FO / 2 + i, undefined, 6);
    for (let i = 0; i <= 10; i++) if (i < 3 || i > 5) cil(hierro, 0.12, AL - 3, AN / 2 - 10 + i, 0, -FO / 2 + 10, undefined, 6);
    caja(hierro, 10.2, 0.25, 0.3, cx, AL - 3, -FO / 2 + 10); caja(hierro, 0.3, 0.25, 10.2, AN / 2 - 10, AL - 3, cz);
    caja(madera, 2.4, 0.8, 5.4, AN / 2 - 2, 0, cz - 1); caja(mat(0x6a6456, { roughness: 1 }), 2.2, 0.3, 5.0, AN / 2 - 2, 0.8, cz - 1); cil(madera, 0.6, 0.9, cx - 2.5, 0, cz + 2.5, undefined, 8);
    const preso = persona(AN / 2 - 2.6, cz - 0.6, -Math.PI / 2, 0x6a5a4a, 0.9); preso.g.position.y = -0.6;
    // brasero, estandarte y arcones
    cil(hierro, 1.2, 1.4, 12, 0, 8, undefined, 10); const ascuas = cil(new THREE.MeshStandardMaterial({ color: 0x331008, emissive: 0xff5a14, emissiveIntensity: 2 }), 1.05, 0.2, 12, 1.35, 8, undefined, 10);
    vivos.push(t => { ascuas.material.emissiveIntensity = 1.8 + 0.4 * Math.sin(t * 2.6); }); luzFuego(12, 4, 8, 220);
    caja(mat(0x6a2f2a, { roughness: 1 }), 3.6, 5.5, 0.12, -11, 4.2, -FO / 2 + 0.3); caja(mat(0xd9b24e), 1.2, 1.2, 0.14, -11, 6.6, -FO / 2 + 0.34);
    caja(clara, 3, 1.5, 1.8, 17, 0, 11); barril(-9, 11);
    rotulo('Literas de la guardia', -AN / 2 + 4, 9, -2); rotulo('Sala de armas', lx, AL + 1, -FO / 2 + 1); rotulo('Mesa de guardia', mx, 6.5, mz); rotulo('Calabozo', cx, AL, cz);
  }

  /* ================= lonja ================= */
  function lonja() {
    caja3(0xa89f8c, 0xcbbf9f, [-14, 0, 14]);
    // dos filas de columnas y arcos de madera
    const col = mat(0xd8d0bc, { roughness: 1 });
    for (const z of [-5, 6]) for (let i = 0; i < 5; i++) { const x = -16 + i * 8; if (z === 6 && i === 2) continue; cil(col, 0.7, AL - 1, x, 0, z, undefined, 14); caja(col, 2, 0.6, 2, x, 0, z); caja(col, 1.8, 0.6, 1.8, x, AL - 1.6, z); }
    caja(oscura, AN, 0.7, 0.8, 0, AL - 1, -5);
    // báscula grande en el centro: el astil se balancea
    cil(hierro, 0.3, 6.2, 0, 0, 1, undefined, 8); caja(hierro, 2.2, 0.4, 2.2, 0, 0, 1);
    const astil = new THREE.Group(); astil.position.set(0, 6.2, 1); escena.add(astil); caja(hierro, 8.4, 0.22, 0.22, 0, -0.1, 0, astil);
    const platos = [-4, 4].map(s => { const p = new THREE.Group(); p.position.set(s, 0, 0); astil.add(p); cil(hierro, 0.03, 3.2, 0, -3.2, 0, p, 4); cil(mat(0xb08a4a, { metalness: 0.5, roughness: 0.4 }), 1.5, 0.14, 0, -3.3, 0, p, 18); return p; });
    for (let i = 0; i < 4; i++) pieza(new THREE.SphereGeometry(0.6, 8, 6), mat(0xb89a62, { roughness: 1 }), -0.6 + (i % 2) * 1.1, -2.85 + (i > 1 ? 0.6 : 0), -0.4 + (i % 3) * 0.4, platos[0]).scale.y = 0.7;
    for (let i = 0; i < 3; i++) cil(hierro, 0.35 - i * 0.07, 0.6, -0.5 + i * 0.6, -3.2, 0, platos[1], 8);
    vivos.push(t => { const a = Math.sin(t * 0.7) * 0.07; astil.rotation.z = a; for (const p of platos) p.rotation.z = -a; });
    const fiel = persona(1.2, 4.2, Math.PI, 0x2f4f6f); vivos.push(t => { fiel.hombro.rotation.x = -1.0 + Math.sin(t * 0.7) * 0.2; });
    // puestos: mostrador con género distinto en cada uno
    const GENERO = [['saco', 0xb89a62], ['pez', 0x8aa0a8], ['paño', 0x7a3b6a], ['cesta', 0xb5652a], ['saco', 0xd2c08a], ['paño', 0x2f6a5a]];
    GENERO.forEach(([clase, color], i) => {
      const x = -17 + (i % 3) * 14 + (i > 2 ? 3 : 0), z = i < 3 ? -FO / 2 + 3.4 : 10.5;
      caja(clara, 7, 0.35, 2.6, x, 2.2, z); for (const s of [-3, 3]) caja(oscura, 0.4, 2.2, 2.2, x + s, 0, z);
      for (let k = 0; k < 6; k++) {
        const px = x - 2.6 + k * 1.05, m = mat(color, { roughness: 1 });
        if (clase === 'saco') pieza(new THREE.SphereGeometry(0.6, 8, 6), m, px, 2.95, z + (k % 2) * 0.5 - 0.2).scale.y = 0.75;
        else if (clase === 'pez') { const p = pieza(new THREE.CapsuleGeometry(0.16, 0.9, 3, 6), mat(color, { roughness: 0.3, metalness: 0.4 }), px, 2.72, z); p.rotation.set(Math.PI / 2, 0, rnd() - 0.5); }
        else if (clase === 'paño') caja(mat(k % 2 ? color : 0xd9c9a0, { roughness: 1 }), 0.9, 0.3 + (k % 3) * 0.25, 1.8, px, 2.55, z);
        else { cil(m, 0.5, 0.5, px, 2.55, z, undefined, 10); pieza(new THREE.SphereGeometry(0.42, 8, 6), mat([0xb03a2a, 0xd2aa4e, 0x6a8a3a][k % 3]), px, 3.15, z).scale.y = 0.6; }
      }
      persona(x + (i % 2 ? 1.5 : -1.5), z + (i < 3 ? -1.9 : 1.9) * (i < 3 ? 0 : 1) + (i < 3 ? 2.6 : 0), i < 3 ? Math.PI : 0);   // comprador
      if (i < 3) for (let k = 0; k < 3; k++) pieza(new THREE.SphereGeometry(0.8, 8, 6), mat(color, { roughness: 1 }), x + 4.6, 0.6 + (k === 2 ? 1 : 0), z - 0.6 + (k % 2) * 1.2).scale.y = 0.75;
    });
    // mesa del escribano: libro de cuentas, tintero y arca
    const ex = AN / 2 - 6, ez = 0;
    caja(madera, 5.5, 0.4, 3, ex, 2.4, ez); for (const s of [-2.3, 2.3]) caja(oscura, 0.45, 2.4, 2.6, ex + s, 0, ez);
    caja(mat(0xe8dfc8, { roughness: 1 }), 1.8, 0.2, 1.3, ex - 0.5, 2.8, ez); caja(mat(0x5a2a22), 1.9, 0.08, 1.4, ex - 0.5, 2.78, ez); cil(hierro, 0.18, 0.3, ex + 1.4, 2.8, ez - 0.6, undefined, 8);
    const escribano = persona(ex - 0.3, ez - 2.4, 0, 0x3a3a4a); vivos.push(t => { escribano.hombro.rotation.x = -1.1; escribano.hombro.rotation.z = Math.sin(t * 5) * 0.06; });
    caja(hierro, 3.2, 1.9, 2, ex + 2.5, 0, ez - 5); caja(mat(0xb08a4a, { metalness: 0.5, roughness: 0.4 }), 0.5, 0.6, 0.1, ex + 2.5, 0.8, ez - 3.95);
    persona(ex - 0.6, ez + 2.6, Math.PI, 0x7a3b2e); persona(ex - 2.4, ez + 4.2, Math.PI, 0x5a6b3a);   // cola
    // mozos de carga y género apilado
    const mozo = persona(-10, 3, 0, 0x8a6a48); pieza(new THREE.SphereGeometry(0.75, 8, 6), mat(0xb89a62, { roughness: 1 }), 0, 3.4, -0.7, mozo.g).scale.y = 0.7;
    vivos.push(t => { const f = (t * 0.07) % 1, ida = f < 0.5, k = ida ? f * 2 : 2 - f * 2; mozo.g.position.z = -6 + k * 14; mozo.g.position.y = Math.abs(Math.sin(t * 6)) * 0.08; mozo.g.rotation.y = ida ? 0 : Math.PI; });
    for (let i = 0; i < 5; i++) caja(i % 2 ? clara : madera, 2, 1.6, 2, -AN / 2 + 2.4 + (i % 2) * 2.2, i > 2 ? 1.6 : 0, 2 + (i % 3) * 2.3).rotation.y = rnd() * 0.3;
    barril(-AN / 2 + 2.5, 10.5); barril(-AN / 2 + 4.7, 11.2);
    rotulo('Báscula', 0, 9.5, 1); rotulo('Puestos', -3, 7, -FO / 2 + 3.4); rotulo('Mesa del escribano', ex, 7, ez);
  }

  ({ herreria, cuartel, lonja })[tipo]();

  const ambiente = new THREE.HemisphereLight(0xffe2b8, 0x2a1c12, tipo === 'lonja' ? 1.0 : 0.5); escena.add(ambiente);
  const deFuera = new THREE.DirectionalLight(0xbcd6ff, 0.6); deFuera.position.set(-10, 14, -30); escena.add(deFuera);
  const general = new THREE.PointLight(0xffd9a0, tipo === 'lonja' ? 260 : 120, 80, 1.6); general.position.set(4, AL - 1, 6); escena.add(general);
  escena.background = new THREE.Color(0x0d0a08);

  function actualizar(t, luz, noche) {
    for (const f of vivos) f(t);
    cristal.emissiveIntensity = 0.06 + 0.9 * (1 - noche); deFuera.intensity = (tipo === 'lonja' ? 1.2 : 0.7) * (1 - noche);
  }
  return { escena, etiquetas, R: 30, minDist: 9, actualizar, vista: { pos: new THREE.Vector3(2, 30, 43), objetivo: new THREE.Vector3(0, 3, -1) }, limite: 20 };
}
