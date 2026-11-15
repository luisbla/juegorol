// salas.js — interiores de los edificios singulares de las ciudades: herrería, cuartel y lonja.
// Igual que la taberna: una maqueta abierta por delante. Cada sala es una función que amuebla la misma caja.
import * as THREE from 'three';
import { azarDe } from './ruido.js';
import { crearFigura } from './figuras.js';

const AN = 44, FO = 28, AL = 11;   // ancho (x), fondo (z), alto

export function crearSala(tipo, id, { color = 0x7a2e2a } = {}) {
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

  // gente: figuras con esqueleto (figuras.js), a la escala de estas salas. "extra" lleva el oficio, lo que carga y, en "estado", la postura.
  let nGente = 0;
  function persona(x, z, mira, color = ROPAS[Math.floor(rnd() * ROPAS.length)], alto = 1, { estado, ...ropa } = {}) {
    rnd(); const fase = rnd() * 6.28;   // el mismo gasto de azar de siempre
    const f = crearFigura({ rnd: azarDe(`sala-${id}-${nGente++}`), color, talla: 2.2 * alto, ...ropa });
    Object.assign(f.estado, { fase }, estado); f.grupo.position.set(x, 0, z); f.grupo.rotation.y = mira; escena.add(f.grupo);
    vivos.push(t => f.actualizar(t));
    return { g: f.grupo, f, fase };
  }
  // sienta a alguien con las caderas a la altura que toque (y = suelo bajo sus pies)
  const sienta = (p, y = 0, brazos = 'preside') => { Object.assign(p.f.estado, { piernas: 'sentado', brazos }); p.g.position.y = y; return p; };
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
    persona(fx + 9.6, fz + 2.4, -2.2, 0x6a5a2f, 0.85, { tipo: 'aldeano', tocado: null, barba: 0, delantal: 0x4a3a2a, estado: { brazos: 'fuelle' } });
    vivos.push(t => { const k = 0.5 + 0.5 * Math.sin(t * 1.8); saco.scale.set(0.7 + k * 0.4, 1, 1); });
    // yunque sobre tocón, y el herrero martilleando una barra al rojo
    const yx = -3, yz = 1;
    cil(madera, 1.3, 1.5, yx, 0, yz, undefined, 10); caja(hierro, 2.6, 0.9, 1.1, yx, 1.5, yz); caja(hierro, 1.4, 0.5, 0.9, yx, 2.4, yz);
    const cuerno = pieza(new THREE.ConeGeometry(0.45, 1.6, 8), hierro, yx + 2.0, 2.2, yz); cuerno.rotation.z = -Math.PI / 2;
    const barra = caja(new THREE.MeshStandardMaterial({ color: 0x40100a, emissive: 0xff7a1c, emissiveIntensity: 1.6 }), 2.6, 0.16, 0.22, yx - 0.3, 2.92, yz);
    persona(yx - 0.4, yz + 2.3, Math.PI, 0x4a3326, 1.08, { tipo: 'aldeano', tocado: null, peinado: 'calvo', barba: 0.9, ancho: 1.14, lleva: 'martillo', delantal: 0x3a2a20, estado: { brazos: 'golpea', ritmo: 1.25 / 0.9, fase: 0, flexion: 0.12 } });
    const chispa = new THREE.PointLight(0xffc070, 0, 14, 2); chispa.position.set(yx, 3.4, yz); escena.add(chispa);
    vivos.push(t => {
      const f = (t * 1.25) % 1, golpe = f < 0.75 ? f / 0.75 : 1 - (f - 0.75) / 0.25;   // sube despacio, baja de golpe
      chispa.intensity = f > 0.97 || f < 0.06 ? 90 : 0;
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
    persona(mx - 0.6, mz - 2.9, 0, 0x6a2f2a, 1.05, { tipo: 'guardia', lleva: null, tocado: null, carga: ['vaina'], capa: 0x6a2f2a, estado: { brazos: 'senala' } });   // señala el plano
    persona(mx - 3, mz + 3.0, Math.PI, 0x4a5a6a, 1, { tipo: 'guardia', lleva: null, carga: ['vaina'], estado: { brazos: 'escucha' } }); persona(mx + 2.2, mz + 3.0, Math.PI, 0x4a5a6a, 1, { tipo: 'guardia', lleva: null, tocado: null, carga: ['vaina'], estado: { brazos: 'jarras' } });
    // centinela que hace la ronda
    const centinela = persona(0, 10, 0, 0x4a5a6a, 1, { tipo: 'guardia' });
    vivos.push(t => { const f = (t * 0.06) % 1, ida = f < 0.5, k = ida ? f * 2 : 2 - f * 2; centinela.g.position.x = -12 + k * 26; centinela.g.rotation.y = ida ? Math.PI / 2 : -Math.PI / 2; });
    // calabozo: reja, catre y un preso
    const cx = AN / 2 - 5, cz = -FO / 2 + 5;
    for (let i = 0; i <= 10; i++) cil(hierro, 0.12, AL - 3, AN / 2 - 10, 0, -FO / 2 + i, undefined, 6);
    for (let i = 0; i <= 10; i++) if (i < 3 || i > 5) cil(hierro, 0.12, AL - 3, AN / 2 - 10 + i, 0, -FO / 2 + 10, undefined, 6);
    caja(hierro, 10.2, 0.25, 0.3, cx, AL - 3, -FO / 2 + 10); caja(hierro, 0.3, 0.25, 10.2, AN / 2 - 10, AL - 3, cz);
    caja(madera, 2.4, 0.8, 5.4, AN / 2 - 2, 0, cz - 1); caja(mat(0x6a6456, { roughness: 1 }), 2.2, 0.3, 5.0, AN / 2 - 2, 0.8, cz - 1); cil(madera, 0.6, 0.9, cx - 2.5, 0, cz + 2.5, undefined, 8);
    persona(AN / 2 - 2.6, cz - 0.6, -Math.PI / 2, 0x6a5a4a, 0.9, { tipo: 'aldeano', tocado: null, cinto: false, barba: 0.6, estado: { piernas: 'suelo' } });
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
    persona(1.2, 4.2, Math.PI, 0x2f4f6f, 1, { tipo: 'guardia', lleva: null, tocado: null, carga: [], estado: { brazos: 'reza', piernas: 'rodillas' } });
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
      persona(x + (i % 2 ? 1.5 : -1.5), z + (i < 3 ? -1.9 : 1.9) * (i < 3 ? 0 : 1) + (i < 3 ? 2.6 : 0), i < 3 ? Math.PI : 0, undefined, 1, { tipo: ['aldeana', 'mercader', 'aldeano'][i % 3], ...(i % 3 ? {} : { llevaI: 'cesta' }), estado: { brazos: ['escucha', 'habla', 'jarras'][i % 3] } });   // comprador
      if (i < 3) for (let k = 0; k < 3; k++) pieza(new THREE.SphereGeometry(0.8, 8, 6), mat(color, { roughness: 1 }), x + 4.6, 0.6 + (k === 2 ? 1 : 0), z - 0.6 + (k % 2) * 1.2).scale.y = 0.75;
    });
    // mesa del escribano: libro de cuentas, tintero y arca
    const ex = AN / 2 - 6, ez = 0;
    caja(madera, 5.5, 0.4, 3, ex, 2.4, ez); for (const s of [-2.3, 2.3]) caja(oscura, 0.45, 2.4, 2.6, ex + s, 0, ez);
    caja(mat(0xe8dfc8, { roughness: 1 }), 1.8, 0.2, 1.3, ex - 0.5, 2.8, ez); caja(mat(0x5a2a22), 1.9, 0.08, 1.4, ex - 0.5, 2.78, ez); cil(hierro, 0.18, 0.3, ex + 1.4, 2.8, ez - 0.6, undefined, 8);
    persona(ex - 0.3, ez - 2.4, 0, 0x3a3a4a, 1, { tipo: 'escriba', lleva: 'pluma', estado: { brazos: 'escribe' } });
    caja(hierro, 3.2, 1.9, 2, ex + 2.5, 0, ez - 5); caja(mat(0xb08a4a, { metalness: 0.5, roughness: 0.4 }), 0.5, 0.6, 0.1, ex + 2.5, 0.8, ez - 3.95);
    persona(ex - 0.6, ez + 2.6, Math.PI, 0x7a3b2e, 1, { tipo: 'mercader', estado: { brazos: 'habla' } }); persona(ex - 2.4, ez + 4.2, Math.PI, 0x5a6b3a, 1, { tipo: 'marino', estado: { brazos: 'jarras' } });   // cola
    // mozos de carga y género apilado
    const mozo = persona(-10, 3, 0, 0x8a6a48, 1, { tipo: 'aldeano', carga: ['saco'], estado: { brazos: 'carga' } });
    vivos.push(t => { const f = (t * 0.07) % 1, ida = f < 0.5, k = ida ? f * 2 : 2 - f * 2; mozo.g.position.z = -6 + k * 14; mozo.g.rotation.y = ida ? 0 : Math.PI; });
    for (let i = 0; i < 5; i++) caja(i % 2 ? clara : madera, 2, 1.6, 2, -AN / 2 + 2.4 + (i % 2) * 2.2, i > 2 ? 1.6 : 0, 2 + (i % 3) * 2.3).rotation.y = rnd() * 0.3;
    barril(-AN / 2 + 2.5, 10.5); barril(-AN / 2 + 4.7, 11.2);
    rotulo('Báscula', 0, 9.5, 1); rotulo('Puestos', -3, 7, -FO / 2 + 3.4); rotulo('Mesa del escribano', ex, 7, ez);
  }

  /* ================= piezas de los salones ================= */
  const oro = mat(0xd9b24e, { metalness: 0.6, roughness: 0.35 }), pendon = mat(color, { roughness: 1 });
  const alfombra = (c, w, d, x, z) => { caja(mat(c, { roughness: 1 }), w, 0.06, d, x, 0, z); caja(oro, w + 0.3, 0.04, d + 0.3, x, 0, z); };
  const columna = (x, z, m = piedra) => { caja(m, 2.2, 0.6, 2.2, x, 0, z); cil(m, 0.75, AL - 1.4, x, 0.6, z, undefined, 12); caja(m, 2.0, 0.6, 2.0, x, AL - 0.8, z); };
  const estandarte = (x, y, z, m, w = 2.6, h = 5.5) => { caja(oscura, w + 0.6, 0.2, 0.2, x, y + h, z); caja(m, w, h, 0.1, x, y, z); pieza(new THREE.ConeGeometry(w * 0.5, 0.9, 3), m, x, y - 0.4, z).rotation.set(Math.PI, 0, 0); };
  const sitial = (x, z, ry, m, alto = 4.6, an = 2) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; escena.add(g); caja(m, an, 1.0, 1.5, 0, 0, -0.15, g); caja(m, an, alto, 0.4, 0, 0, -0.9, g); for (const s of [-1, 1]) caja(m, 0.4, 2.2, 1.6, s * (an / 2 + 0.05), 0, -0.1, g); caja(mat(0x7a2030, { roughness: 1 }), an - 0.3, 0.25, 1.3, 0, 1.0, -0.1, g); return g; };
  const silla = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; escena.add(g); caja(madera, 1.3, 0.16, 1.2, 0, 1.0, 0, g); caja(madera, 1.3, 2.0, 0.14, 0, 1.1, -0.55, g); for (const sx of [-0.55, 0.55]) for (const sz of [-0.5, 0.5]) caja(oscura, 0.12, 1.0, 0.12, sx, 0, sz, g); };
  // alto: 2.2 para trabajar de pie alrededor; MESA_BAJA para comer sentado (el tablero queda a 2.1)
  const MESA_BAJA = 1.75, mesa = (x, z, w, d, m = clara, alto = 2.2, base = 0) => { caja(m, w, 0.35, d, x, base + alto, z); for (const sx of [-1, 1]) for (const sz of [-1, 1]) caja(oscura, 0.4, alto, 0.4, x + sx * (w / 2 - 0.5), base, z + sz * (d / 2 - 0.4)); };
  const lampara = (x, z, n = 8) => { caja(hierro, 0.08, 2.4, 0.08, x, AL - 2.4, z); const a = pieza(new THREE.TorusGeometry(1.9, 0.1, 6, 20), hierro, x, AL - 2.5, z); a.rotation.x = Math.PI / 2; for (let i = 0; i < n; i++) { const t = i / n * 6.283; cil(mat(0xe8dcc0), 0.07, 0.4, x + Math.cos(t) * 1.9, AL - 2.45, z + Math.sin(t) * 1.9, undefined, 5); pieza(new THREE.SphereGeometry(0.1, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffd98a }), x + Math.cos(t) * 1.9, AL - 1.95, z + Math.sin(t) * 1.9); } luzFuego(x, AL - 3, z, 150, 0xffd6a0); };
  const pebetero = (x, z, c = 0xff5a14, luz = 0xff9a4a, f = 140) => { cil(hierro, 0.25, 2.2, x, 0, z, undefined, 6); cil(hierro, 0.85, 0.5, x, 2.2, z, undefined, 10); cil(new THREE.MeshStandardMaterial({ color: 0x220a06, emissive: c, emissiveIntensity: 2.2 }), 0.72, 0.16, x, 2.62, z, undefined, 10); luzFuego(x, 4, z, f, luz); };
  const guardia = (x, z, mira, c = 0x4a5a6a, extra) => persona(x, z, mira, c, 1.04, { tipo: 'guardia', capa: c, ...extra });

  /* ================= salón del trono (castillo real) ================= */
  function trono() {
    caja3(0x8a857c, 0x9a958a, [-16, -8, 8, 16]);
    alfombra(0x7a1f26, 5, FO - 3, 0, 0.5);
    for (let i = 0; i < 3; i++) caja(piedra, 15 - i * 2, 0.5, 8 - i * 1.4, 0, i * 0.5, -FO / 2 + 4 + i * 0.1);   // estrado
    const g = sitial(0, -FO / 2 + 3.4, 0, oro, 6.2, 2.4); g.position.y = 1.5; caja(pendon, 1.6, 2.2, 0.1, 0, 3.4, -0.66, g); pieza(new THREE.ConeGeometry(0.5, 1.0, 4), oro, 0, 6.8, -0.9, g);
    sitial(4.2, -FO / 2 + 3.6, -0.2, madera, 4.4, 1.8).position.y = 1.5;
    sienta(persona(0, -FO / 2 + 3.04, 0, 0x5a1f2a, 1.0, { tipo: 'noble', tocado: 'corona', capa: 0x7a1f26, sinPano: true, barba: 0.7, peinado: 'largo', pelo: 0xb8b0a4 }), 1.62);
    estandarte(0, 4.6, -FO / 2 + 0.3, pendon, 4.4, 5.6); for (const s of [-1, 1]) estandarte(s * 12, 1.4, -FO / 2 + 0.3, mat(s > 0 ? 0x2f3f5a : 0x4a3a1a, { roughness: 1 }), 3, 5);
    for (const s of [-1, 1]) { for (let i = 0; i < 4; i++) { columna(s * 9, -8 + i * 6.4); if (i < 3) estandarte(s * 9, 4.4, -4.8 + i * 6.4, pendon, 1.6, 3.6); } guardia(s * 5.6, -FO / 2 + 6.4, 0, 0x6a2f2a); guardia(s * 4.2, 10.5, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0x6a2f2a); pebetero(s * 7.6, -FO / 2 + 5.4); }
    for (const s of [-1, 1]) { mesa(s * 16.5, 1, 4, 13, clara, MESA_BAJA); for (let i = 0; i < 5; i++) { cil(oro, 0.22, 0.5, s * 16.5 + (i % 2 - 0.5) * 1.4, 2.1, -4 + i * 2.6, undefined, 8); silla(s * 13.6, -4 + i * 2.6, s > 0 ? Math.PI / 2 : -Math.PI / 2); } }
    for (const [x, z, m, c, tipo, brazos] of [[-3.4, 3, 0.6, 0x2f4f6f, 'noble', 'habla'], [-4.6, 4.4, -2.4, 0x5a6b3a, 'aldeana', 'escucha'], [3.6, 1.4, -0.7, 0x4a3a5a, 'noble', 'jarras'], [4.8, 3, 2.6, 0x8a6a48, 'mercader', 'habla'], [1.6, 7.4, Math.PI, 0x6a5a2f, 'aldeano', 'escucha']]) persona(x, z, m, c, 1, { tipo, estado: { brazos } });
    persona(-2.2, -FO / 2 + 9.6, 0.3, 0x2f3f5a, 1, { tipo: 'escriba', estado: { brazos: 'arenga', ritmo: 0.6 } });
    lampara(-9 + 9, 2); lampara(0, -6, 6);
    rotulo('Trono', 0, AL + 1.5, -FO / 2 + 3.4); rotulo('Estrado', 5.5, 5.5, -FO / 2 + 6); rotulo('Mesas de la corte', -16.5, 6, 1); rotulo('Guardia real', 5, 7.5, 10.5);
  }

  /* ================= gran sala de la torre del homenaje ================= */
  function homenaje() {
    caja3(0x3a3c44, 0x4a4d56, [-15, 15]);
    const hielo = new THREE.MeshStandardMaterial({ color: 0xcfe6f4, emissive: 0x3f8fc8, emissiveIntensity: 0.7, roughness: 0.15, metalness: 0.1 }), piel = mat(0x8a7a66, { roughness: 1 });
    for (let i = 0; i < 2; i++) caja(piedra, 13 - i * 2.4, 0.7, 7 - i * 1.6, 0, i * 0.7, -FO / 2 + 3.6);
    const g = sitial(0, -FO / 2 + 3.2, 0, mat(0x2e3038, { roughness: 1 }), 7.4, 3.0); g.position.y = 1.4; caja(piel, 2.8, 0.3, 1.5, 0, 1.25, -0.1, g); caja(piel, 3.4, 2.4, 0.2, 0, 2, -0.62, g);
    for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.3, c = pieza(new THREE.ConeGeometry(0.55 - Math.abs(i - 3) * 0.06, 5 - Math.abs(i - 3) * 0.7, 5), hielo, Math.sin(a) * 4.6, 6.4 - Math.abs(i - 3) * 0.5, -FO / 2 + 1.2); c.rotation.z = -a * 0.8; }   // corona de hielo tras el trono
    const jefe = sienta(persona(0, -FO / 2 + 2.86, 0, 0x2a2e3a, 1.12, { tipo: 'clan', manto: 0xb0a898, tocado: null, peinado: 'largo', barba: 1, pelo: 0x1a1a1a, capa: 0x2a2e3a, sinPano: true }), 1.7); for (let i = 0; i < 5; i++) { const pico = pieza(new THREE.ConeGeometry(0.022, 0.13 - Math.abs(i - 2) * 0.025, 5), hielo, Math.sin((i - 2) * 0.5) * 0.105, 0.3, Math.cos((i - 2) * 0.5) * 0.105, jefe.f.h.cabeza); pico.rotation.z = -(i - 2) * 0.12; }   // corona de hielo
    luzFuego(0, 6, -FO / 2 + 3, 130, 0x8fd0ff);
    // hogar largo en el centro, con fuego azulado
    caja(piedra, 4, 0.7, 15, 0, 0, 3.4); const ascuas = caja(new THREE.MeshStandardMaterial({ color: 0x0a1420, emissive: 0x58b8ff, emissiveIntensity: 1.8 }), 3, 0.2, 14, 0, 0.7, 3.4);
    vivos.push(t => { ascuas.material.emissiveIntensity = 1.6 + 0.4 * Math.sin(t * 2.4); });
    for (let i = 0; i < 6; i++) { const f = pieza(new THREE.ConeGeometry(0.5, 1.6 + (i % 2) * 0.6, 5), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xbfe6ff : 0x7ac8ff, transparent: true, opacity: 0.8 }), (i % 2 - 0.5) * 0.9, 1.7, -2.6 + i * 2.4); vivos.push(t => { f.scale.y = 0.8 + 0.35 * Math.sin(t * 7 + i * 2); }); }
    luzFuego(0, 3.5, 0, 230, 0x9ad4ff); luzFuego(0, 3.5, 7, 200, 0x9ad4ff);
    // bancos de los clanes a ambos lados, cada uno bajo su escudo
    const CLAN = [0x7a2e2a, 0x2f4a6a, 0x3f5a3a, 0xb08a2e];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 2; i++) { caja(madera, 1.4, 1.2, 12, s * (6.4 + i * 3.2), 0, 3.4); }
      mesa(s * 8, 3.4, 1.8, 12, oscura, MESA_BAJA);
      for (let i = 0; i < 4; i++) { sienta(persona(s * 6.15, -1.4 + i * 3.2, s > 0 ? Math.PI / 2 : -Math.PI / 2, [0x3a3028, 0x4a3a30, 0x2e3440, 0x55483a][i], 1.05, { tipo: 'clan', lleva: i % 2 ? 'jarra' : undefined }), 0.02, i % 2 ? 'bebe' : i ? 'come' : 'escucha'); cil(mat(0xc9b06a), 0.25, 0.5, s * 7.9, 2.1, -1.4 + i * 3.2, undefined, 8); }
      for (let i = 0; i < 4; i++) { const e = cil(mat(CLAN[(i + (s > 0 ? 0 : 2)) % 4]), 1.3, 0.2, s * (AN / 2 - 0.4), 5.6, -8 + i * 5.6, undefined, 16); e.rotation.z = Math.PI / 2; const u = cil(acero, 0.35, 0.3, s * (AN / 2 - 0.55), 6.75, -8 + i * 5.6); u.rotation.z = Math.PI / 2; for (const d of [-1, 1]) { const h = caja(acero, 0.1, 3.4, 0.2, s * (AN / 2 - 0.45), 2.6, -8 + i * 5.6 + d * 0.9); h.rotation.x = d * 0.5; } }
      estandarte(s * 9, 3.4, -FO / 2 + 0.3, pendon, 2.6, 6.4); guardia(s * 4.6, -FO / 2 + 6.8, 0, 0x2e3440, { manto: 0x8a8478 }); columna(s * 13.5, -6, mat(0x3a3c44, { roughness: 1 })); columna(s * 13.5, 6, mat(0x3a3c44, { roughness: 1 }));
    }
    // altar del hielo, a un lado
    const ax = -AN / 2 + 4, az = -FO / 2 + 4;
    caja(piedra, 3.6, 1.6, 2.4, ax, 0, az); for (let i = 0; i < 5; i++) pieza(new THREE.ConeGeometry(0.4, 1.6 + (i % 3) * 0.9, 5), hielo, ax - 1.2 + i * 0.6, 2.4 + (i % 3) * 0.45, az - 0.4); for (let i = 0; i < 3; i++) cil(oro, 0.2, 0.35, ax - 0.8 + i * 0.8, 1.6, az + 0.7, undefined, 8); luzFuego(ax, 4, az + 1, 90, 0x8fd0ff);
    // trofeos
    for (const x of [-6, 6]) { caja(mat(0xe8dfc8), 1.0, 0.9, 0.8, x, 7.2, -FO / 2 + 0.5); for (const d of [-1, 1]) { const c = pieza(new THREE.ConeGeometry(0.16, 1.8, 5), mat(0xe8dfc8), x + d * 0.9, 8.3, -FO / 2 + 0.6); c.rotation.z = -d * 0.7; } }
    rotulo('Trono de piedra', 0, AL + 1.5, -FO / 2 + 3.2); rotulo('Hogar largo', 0, 5, 5); rotulo('Bancos de los clanes', 9, 6.5, 3.4); rotulo('Altar del hielo', ax, 7, az);
  }

  /* ================= sala del Consejo ================= */
  function consejo() {
    caja3(0xb9b0a0, 0xd6cdb8, [-15, -5, 5, 15]);
    const CASAS = [[0x2f6aa0, -7], [0x3f8a54, 0], [0xb08a2e, 7]];
    for (let i = 0; i < 2; i++) caja(mat(0xcfc6ae, { roughness: 1 }), 26 - i * 2, 0.5, 9 - i * 1.4, 0, i * 0.5, -FO / 2 + 4.6);
    // mesa en herradura y los tres sitiales, cada uno bajo el pendón de su Casa
    for (const [c, x] of CASAS) { const m = mat(c, { roughness: 1 }); estandarte(x, 4.2, -FO / 2 + 0.3, m, 3, 5.8); sitial(x, -FO / 2 + 3, 0, mat(0x5a4030), 5, 2.2).position.y = 1.0; sienta(persona(x, -FO / 2 + 2.64, 0, c, 1.0, { tipo: 'noble', capa: 0x2a2a30, sinPano: true, tocado: x ? undefined : 'gorro', colorTocado: 0x2a2a30 }), 1.12); }
    caja(mat(0x5a4030), 22, 0.4, 2.4, 0, 2.7, -FO / 2 + 6.6); caja(mat(0x4a3426), 22, 1.7, 0.3, 0, 1.0, -FO / 2 + 7.7); for (const s of [-1, 1]) { caja(mat(0x5a4030), 2.4, 0.4, 7, s * 12, 2.2, -FO / 2 + 11); caja(mat(0x4a3426), 0.3, 2.2, 7, s * 13.1, 0, -FO / 2 + 11); }
    for (const x of [-7, 0, 7]) { caja(mat(0xe8dfc8), 1.6, 0.06, 1.1, x, 3.12, -FO / 2 + 6.6); cil(hierro, 0.14, 0.3, x + 1.2, 3.1, -FO / 2 + 6.4, undefined, 6); }
    cil(oro, 0.5, 0.9, 3.5, 3.1, -FO / 2 + 6.6, undefined, 10); cil(oro, 0.16, 0.3, 3.5, 4.0, -FO / 2 + 6.6, undefined, 6);   // urna de los votos
    for (const s of [-1, 1]) { persona(s * 14.4, -FO / 2 + 10.4, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0x3a3a4a, 0.92, { tipo: 'escriba', lleva: 'pluma', estado: { brazos: 'escribe' } }); caja(mat(0xe8dfc8), 0.9, 0.06, 1.2, s * 12.6, 2.62, -FO / 2 + 10.4); }
    alfombra(0x2a3f5a, 12, 8, 0, 2.4);
    persona(0, 1.2, Math.PI, 0x7a3b2e, 1, { tipo: 'mercader', estado: { brazos: 'arenga' } });
    // tribuna del público
    for (let f = 0; f < 3; f++) { caja(madera, 30, 0.9 + f * 0.5, 1.4, 0, 0, 7 + f * 2.1); for (let i = 0; i < 7; i++) if ((i + f) % 3) sienta(persona(-12 + i * 4 + f, 7.1 + f * 2.1, Math.PI, undefined, 0.85, { tipo: ['mercader', 'aldeano', 'aldeana', 'marino'][(i + f) % 4] }), Math.max(0, f * 0.5 - 0.06), (i + f) % 2 ? 'escucha' : 'preside'); }
    caja(oscura, 31, 1.4, 0.2, 0, 0, 5.9);
    for (const s of [-1, 1]) { columna(s * 17, -6, mat(0xd8d0bc, { roughness: 1 })); columna(s * 17, 4, mat(0xd8d0bc, { roughness: 1 })); guardia(s * 15, -FO / 2 + 5, 0, 0x3a4a6a); mesa(s * 19.5, -2, 3, 6); for (let i = 0; i < 5; i++) caja(mat([0x7a3b2e, 0x2f4f6f, 0x5a6b3a][i % 3]), 0.5, 0.9, 1.3, s * 19.5, 2.55, -4 + i * 1.0); }
    caja(oscura, 7, 4.4, 0.2, -AN / 2 + 0.3 + 0.0, 4, 0).rotation.y = Math.PI / 2; caja(mat(0xe3d6b0, { roughness: 1 }), 6.4, 3.8, 0.1, -AN / 2 + 0.45, 4.3, 0).rotation.y = Math.PI / 2;   // mapa de los lagos
    for (let i = 0; i < 3; i++) pieza(new THREE.CircleGeometry(0.5 + i * 0.25, 10), mat(0x3f6f90), -AN / 2 + 0.52, 5.4 + i * 0.6, -1.6 + i * 1.5).rotation.y = Math.PI / 2;
    lampara(-9, 0); lampara(9, 0);
    rotulo('Sitiales de las Tres Casas', 0, AL + 1.5, -FO / 2 + 3); rotulo('Mesa del Consejo', 9, 6, -FO / 2 + 6.6); rotulo('Urna de los votos', 3.5, 6.2, -FO / 2 + 6.6); rotulo('Tribuna del público', 0, 6, 10);
  }

  /* ================= sala del señor (casa señorial) ================= */
  function senor() {
    caja3(0x7a5c3e, 0xd2c098, [-6, 6, 15]);
    // hogar grande a la izquierda
    const hx = -AN / 2 + 1.8, hz = 0;
    caja(piedra, 3, AL, 9, hx, 0, hz); caja(mat(0x14100c), 1.2, 4, 6, hx + 1.0, 0, hz); caja(oscura, 3.6, 0.5, 10, hx + 0.2, 4.6, hz);
    const lumbre = caja(new THREE.MeshStandardMaterial({ color: 0x331008, emissive: 0xff5a14, emissiveIntensity: 2 }), 1.0, 0.5, 4.4, hx + 1.2, 0, hz); vivos.push(t => { lumbre.material.emissiveIntensity = 1.8 + 0.5 * Math.sin(t * 2.6); }); luzFuego(hx + 4, 3, hz, 300);
    for (const z of [-2.6, 2.6]) { const perro = new THREE.Group(); perro.position.set(hx + 5, 0, z); perro.rotation.y = -Math.PI / 2 + z * 0.1; escena.add(perro); pieza(new THREE.CapsuleGeometry(0.5, 1.5, 4, 8), mat(z > 0 ? 0x6a4a2e : 0x3a2e24), 0, 0.55, 0, perro).rotation.x = Math.PI / 2; pieza(new THREE.SphereGeometry(0.42, 8, 6), mat(z > 0 ? 0x6a4a2e : 0x3a2e24), 0, 0.6, 1.3, perro); }
    // mesa larga puesta y el sitial del señor en la cabecera
    caja(madera, 12, 0.5, 6, 6, 0, -FO / 2 + 3.6); sitial(6, -FO / 2 + 2.6, 0, mat(0x5a4030), 5.4, 2.2).position.y = 0.5;
    sienta(persona(6, -FO / 2 + 2.24, 0, 0x6a5a2f, 1.0, { tipo: 'noble', capa: 0x4a5a2f, sinPano: true, barba: 0.5 }), 0.62);
    estandarte(6, 4.6, -FO / 2 + 0.3, pendon, 3.6, 5.4); for (const x of [-1, 13]) { caja(oscura, 3.4, 4.6, 0.2, x, 3.6, -FO / 2 + 0.3); caja(mat(0xc9a84a, { roughness: 1 }), 3, 4.2, 0.12, x, 3.8, -FO / 2 + 0.36); for (let i = 0; i < 4; i++) caja(mat(0x5a7a3a, { roughness: 1 }), 0.3, 2.6 + (i % 2) * 0.8, 0.14, x - 0.9 + i * 0.6, 4.0, -FO / 2 + 0.4); }   // tapices de espigas
    mesa(6, 3.4, 5, 15, clara, MESA_BAJA);
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) { const z = -2.6 + i * 2.4; silla(6 + s * 3.8, z, s > 0 ? -Math.PI / 2 : Math.PI / 2); cil(mat(0xc9c2b0, { metalness: 0.4, roughness: 0.5 }), 0.5, 0.06, 6 + s * 1.5, 2.1, z, undefined, 12); cil(mat(0xc9b06a), 0.18, 0.4, 6 + s * 0.7, 2.1, z + 0.4, undefined, 8); if ((i + (s > 0 ? 0 : 1)) % 2) sienta(persona(6 + s * 3.75, z, s > 0 ? -Math.PI / 2 : Math.PI / 2, undefined, 0.88, { tipo: ['aldeano', 'aldeana', 'mercader'][i % 3], lleva: i % 2 ? 'jarra' : undefined }), 0.14, i % 2 ? 'bebe' : 'come'); }
    for (let i = 0; i < 3; i++) { cil(mat(0xb5652a), 0.9, 0.4, 6, 2.56, -2 + i * 4.2, undefined, 12); pieza(new THREE.SphereGeometry(0.6, 8, 6), mat([0x8a4a2a, 0xd2aa4e, 0x6a8a3a][i]), 6, 3.2, -2 + i * 4.2).scale.y = 0.6; }
    const mayordomo = persona(11.6, 8, -2.2, 0x3a3a4a, 1, { tipo: 'escriba', lleva: 'jarra' }); vivos.push(t => { const f = (t * 0.05) % 1, k = f < 0.5 ? f * 2 : 2 - f * 2; mayordomo.g.position.z = 9 - k * 12; mayordomo.g.rotation.y = f < 0.5 ? Math.PI : 0; });
    // aparador con peltre, gavillas y trofeos
    const ax = AN / 2 - 1.6; caja(oscura, 2.2, 7, 9, ax, 0, -4); for (let f = 0; f < 3; f++) { caja(clara, 2.4, 0.2, 9, ax - 0.1, 2 + f * 1.8, -4); for (let i = 0; i < 6; i++) cil(mat(0xc9c2b0, { metalness: 0.5, roughness: 0.4 }), 0.35, f === 1 ? 0.7 : 0.1, ax - 0.4, 2.2 + f * 1.8, -7.6 + i * 1.5, undefined, 10); }
    for (let i = 0; i < 4; i++) { const gv = pieza(new THREE.ConeGeometry(0.8, 2.6, 7), mat(0xd2aa4e, { roughness: 1 }), AN / 2 - 3 - (i % 2) * 1.6, 1.3, 6 + i * 1.5); gv.rotation.z = (i % 2 - 0.5) * 0.3; }
    barril(AN / 2 - 3, 11.6); barril(AN / 2 - 5, 12.2);
    for (const z of [-7, 7]) { caja(mat(0xe8dfc8), 0.8, 0.9, 1.0, -AN / 2 + 3.4, 7.4, z); for (const d of [-1, 1]) { const c = pieza(new THREE.ConeGeometry(0.14, 1.9, 5), mat(0xe8dfc8), -AN / 2 + 3.5, 8.5, z + d * 0.9); c.rotation.x = d * 0.7; } }
    alfombra(0x5a3a22, 9, 6, -9, 0); lampara(6, 3);
    rotulo('Sitial del señor', 6, AL + 1.5, -FO / 2 + 2.6); rotulo('Mesa larga', 6, 6, 5); rotulo('Hogar', hx + 2, 8, hz); rotulo('Aparador', ax - 1, 9, -4);
  }

  /* ================= capitanía del puerto ================= */
  function capitania() {
    caja3(0x8a6a48, 0xd9d2c2, [-14, 0, 14]);
    cristal.color.set(0x2a5a7a);
    // mesa de cartas con la bahía, el compás y un modelo de barco
    const mx = -4, mz = 3;
    mesa(mx, mz, 12, 7); caja(mat(0xe3d6b0, { roughness: 1 }), 10, 0.05, 5.6, mx, 2.56, mz); caja(mat(0x3f6f90), 4.4, 0.06, 3, mx + 1.6, 2.58, mz + 0.6); for (let i = 0; i < 5; i++) pieza(new THREE.CircleGeometry(0.4 + (i % 2) * 0.3, 8), mat(0x7a8a5a), mx - 3.6 + i * 0.9, 2.62, mz - 1.6 + (i % 3) * 0.7).rotation.x = -Math.PI / 2;
    const rosa = cil(oro, 0.8, 0.06, mx - 3.4, 2.6, mz + 1.6, undefined, 16); for (let i = 0; i < 4; i++) { const p = caja(hierro, 1.5, 0.04, 0.08, mx - 3.4, 2.66, mz + 1.6); p.rotation.y = i * Math.PI / 4; }
    const barquito = new THREE.Group(); barquito.position.set(mx + 3.6, 2.9, mz - 1.4); escena.add(barquito); pieza(new THREE.CapsuleGeometry(0.3, 1.6, 3, 6), madera, 0, 0, 0, barquito).rotation.z = Math.PI / 2; caja(oscura, 0.06, 1.6, 0.06, 0, 0, 0, barquito); caja(mat(0xe8dfc8), 0.04, 0.9, 0.9, 0.05, 0.6, 0, barquito);
    for (const [x, z, m, c] of [[mx - 2, mz + 4.6, Math.PI, 0x2f4f6f], [mx + 2.4, mz + 4.6, Math.PI, 0x6a2f2a], [mx - 7, mz, Math.PI / 2, 0x5a6b3a]]) persona(x, z, m, c, 1, { tipo: c === 0x5a6b3a ? 'mercader' : 'marino', estado: { brazos: c === 0x6a2f2a ? 'escucha' : 'senala' } });
    // despacho del capitán de puerto, en alto y frente al ventanal
    caja(madera, 14, 0.8, 6, 6, 0, -FO / 2 + 3.4); mesa(6, -FO / 2 + 4.2, 7, 2.6, mat(0x5a4030), 2.2, 0.8); for (let i = 0; i < 3; i++) caja(mat([0x5a2a22, 0x2f3f5a, 0x3a4a2a][i]), 1.4, 0.22, 1.0, 4 + i * 1.8, 3.38, -FO / 2 + 4.2);
    persona(6, -FO / 2 + 2.6, 0, 0x1f2f4a, 1.02, { tipo: 'noble', largo: 0.5, capa: null, tocado: 'sombrero', colorTocado: 0x1a1f2a, ala: 0.21, barba: 0.6, carga: ['vaina'], estado: { brazos: 'jarras' } }).g.position.y = 0.8;
    estandarte(6, 5.2, -FO / 2 + 0.3, pendon, 3, 4.6);
    const catalejo = new THREE.Group(); catalejo.position.set(13.6, 1.2, -FO / 2 + 3); escena.add(catalejo); for (let i = 0; i < 3; i++) { const p = cil(oscura, 0.07, 3.4, Math.cos(i * 2.094) * 0.6, -0.4, Math.sin(i * 2.094) * 0.6, catalejo, 5); p.rotation.set(Math.sin(i * 2.094) * 0.2, 0, -Math.cos(i * 2.094) * 0.2); } const tubo = cil(oro, 0.16, 2.6, 0, 2.1, -0.4, catalejo, 8); tubo.rotation.x = Math.PI / 2 - 0.25;
    // registro de buques: casilleros hasta el techo
    const rx = AN / 2 - 1.4; caja(oscura, 2, 9, 16, rx, 0, 1); for (let f = 0; f < 5; f++) for (let i = 0; i < 9; i++) if ((f * 3 + i) % 5) caja(mat([0x7a3b2e, 0x2f4f6f, 0x5a6b3a, 0x8a7a55, 0xc9b06a][(f + i) % 5], { roughness: 1 }), 0.5, 1.3, 1.3, rx - 0.9, 0.4 + f * 1.7, -6 + i * 1.75);
    for (let f = 1; f < 5; f++) caja(clara, 2.2, 0.14, 16, rx - 0.1, f * 1.7 + 0.2, 1);
    persona(rx - 3.2, 4, Math.PI / 2, 0x3a3a4a, 0.95, { tipo: 'escriba', estado: { brazos: 'senala' } });
    // banderas de señales, pizarra de mareas, arca y cabos
    const bx = -AN / 2 + 0.5; for (let i = 0; i < 6; i++) { const b = caja(mat([0xb23a2e, 0xe0c040, 0x2f6aa0, 0xf0ead8, 0x3f8a54, 0x1a1a1a][i], { roughness: 1 }), 1.5, 1.0, 0.08, bx, 6.2 - (i % 2) * 1.5, -10 + i * 1.9); b.rotation.y = Math.PI / 2; } caja(oscura, 0.2, 0.2, 12, bx, 7.4, -5.2);
    caja(mat(0x20262a), 0.14, 4, 6, bx, 2.2, 7).rotation.y = 0; for (let i = 0; i < 5; i++) caja(mat(0xe8e8e0), 0.16, 0.08, 2.4 + (i % 3) * 0.9, bx + 0.06, 3 + i * 0.6, 7);
    caja(hierro, 3.4, 2.0, 2.2, -AN / 2 + 3.4, 0, -FO / 2 + 2.6); for (let i = 0; i < 3; i++) caja(acero, 3.5, 0.12, 2.3, -AN / 2 + 3.4, 0.4 + i * 0.6, -FO / 2 + 2.6); caja(oro, 0.5, 0.6, 0.1, -AN / 2 + 3.4, 0.8, -FO / 2 + 3.75); guardia(-AN / 2 + 6.4, -FO / 2 + 3, 0.3, 0x2f4f6f);
    for (let i = 0; i < 3; i++) { const c = pieza(new THREE.TorusGeometry(0.9 - i * 0.08, 0.2, 6, 14), mat(0xa8905c, { roughness: 1 }), -AN / 2 + 4, 0.2 + i * 0.38, 12); c.rotation.x = Math.PI / 2; } barril(-AN / 2 + 7, 12.4); barril(15, 11.6);
    const ancla = new THREE.Group(); ancla.position.set(16.5, 0, 9.4); ancla.rotation.z = 0.25; escena.add(ancla); caja(hierro, 0.3, 4, 0.3, 0, 0.4, 0, ancla); caja(hierro, 2.6, 0.3, 0.3, 0, 0.5, 0, ancla); caja(oscura, 0.26, 0.26, 2.2, 0, 3.8, 0, ancla);
    lampara(-4, 3); lampara(8, -4, 6);
    rotulo('Mesa de cartas', mx, 6.5, mz); rotulo('Despacho del capitán de puerto', 6, AL + 1.5, -FO / 2 + 3); rotulo('Registro de buques', rx - 1, AL + 0.5, 1); rotulo('Arca de derechos', -AN / 2 + 3.4, 5, -FO / 2 + 2.6); rotulo('Banderas de señales', bx + 1, 9, -5);
  }

  ({ herreria, cuartel, lonja, trono, homenaje, consejo, senor, capitania })[tipo]();

  const claro = ['lonja', 'consejo', 'capitania', 'trono', 'senor'].includes(tipo);
  const ambiente = new THREE.HemisphereLight(tipo === 'homenaje' ? 0xb8d0e8 : 0xffe2b8, 0x2a1c12, claro ? 0.95 : 0.5); escena.add(ambiente);
  const deFuera = new THREE.DirectionalLight(0xbcd6ff, 0.6); deFuera.position.set(-10, 14, -30); escena.add(deFuera);
  const general = new THREE.PointLight(tipo === 'homenaje' ? 0xa8c8e8 : 0xffd9a0, claro ? 240 : 120, 80, 1.6); general.position.set(4, AL - 1, 6); escena.add(general);
  escena.background = new THREE.Color(0x0d0a08);

  function actualizar(t, luz, noche) {
    for (const f of vivos) f(t);
    cristal.emissiveIntensity = 0.06 + 0.9 * (1 - noche); deFuera.intensity = (claro ? 1.2 : 0.7) * (1 - noche);
  }
  const SONIDO = { herreria: { fuego: 0.9 }, cuartel: { fuego: 0.35, gentio: 0.2 }, lonja: { gentio: 0.8 }, trono: { gentio: 0.3 }, homenaje: { fuego: 0.6, viento: 0.35 }, consejo: { gentio: 0.45 }, senor: { fuego: 0.55, gentio: 0.3 }, capitania: { gentio: 0.3, mar: 0.3 } };
  return { escena, etiquetas, R: 30, minDist: 9, actualizar, sonido: SONIDO[tipo], vista: { pos: new THREE.Vector3(2, 30, 43), objetivo: new THREE.Vector3(0, 3, -1) }, limite: 20 };
}
