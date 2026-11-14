// ruinas.js — lo que se ve al acercarse a una ruina: el paraje y la entrada, nunca el interior.
// Cada una se cuenta con lo que la gente del lugar cree de ella; lo que haya dentro no es cosa de este mapa.
import * as THREE from 'three';
import { azarDe } from './ruido.js';
import { crearBarcoModelo } from './barco.js';

export function crearEntrada(l) {
  const rnd = azarDe('entrada-' + l.id), escena = new THREE.Scene(), etiquetas = [], vivos = [];
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra });
  const pieza = (geo, m, x, y, z, padre = escena) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; padre.add(o); return o; };
  const caja = (m, w, h, d, x, y, z, ry = 0, padre) => { const o = pieza(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, padre); o.rotation.y = ry; return o; };
  const cil = (m, r0, r1, h, x, y, z, padre, seg = 10) => pieza(new THREE.CylinderGeometry(r0, r1, h, seg), m, x, y + h / 2, z, padre);
  const roca = (m, r, x, y, z, sy = 0.7) => { const o = pieza(new THREE.DodecahedronGeometry(r, 0), m, x, y, z); o.scale.set(1 + rnd() * 0.4, sy, 1 + rnd() * 0.4); o.rotation.set(rnd(), rnd() * 6, rnd()); return o; };
  const rotulo = (nombre, x, y, z) => etiquetas.push({ nombre, pos: new THREE.Vector3(x, y, z), clase: 'hito' });
  const suelo = (color, radio = 90) => { const o = pieza(new THREE.CircleGeometry(radio, 48), mat(color), 0, 0, 0); o.rotation.x = -Math.PI / 2; o.castShadow = false; return o; };
  const arbol = (x, z, s, copa, seco) => { cil(mat(0x3a2a1c), 0.25 * s, 0.4 * s, 3 * s, x, 0, z, undefined, 6); if (seco) { for (let i = 0; i < 4; i++) { const r = cil(mat(0x3a2a1c), 0.06 * s, 0.14 * s, 2.2 * s, x, 2.6 * s, z, undefined, 5); r.rotation.set(0.7 + rnd() * 0.5, i * 1.6 + rnd(), 0); } } else { roca(mat(copa), 2.2 * s, x, 4.6 * s, z, 0.9); roca(mat(copa), 1.5 * s, x + 0.9 * s, 5.8 * s, z - 0.5 * s, 0.9); } };
  const pino = (x, z, s, c = 0x3f5a45) => { cil(mat(0x3a2a1c), 0.2 * s, 0.3 * s, 1.6 * s, x, 0, z, undefined, 6); for (let i = 0; i < 3; i++) pieza(new THREE.ConeGeometry((1.9 - i * 0.45) * s, 2.6 * s, 7), mat(c), x, (2.6 + i * 1.5) * s, z); };
  const figura = (x, z, ry, color) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; escena.add(g); cil(mat(color), 0.22, 0.34, 1.1, 0, 0.7, 0, g, 8); caja(mat(color), 0.62, 0.18, 0.3, 0, 1.72, 0, 0, g); for (const s of [-0.13, 0.13]) cil(mat(0x3a3028), 0.1, 0.09, 0.75, s, 0, 0, g, 6); pieza(new THREE.SphereGeometry(0.19, 10, 8), mat(0xd9b08c), 0, 2.1, 0, g); pieza(new THREE.SphereGeometry(0.2, 10, 6, 0, 6.3, 0, 1.7), mat(0x3a2a1c), 0, 2.15, -0.03, g); return g; };
  let cielo = null, bruma = 0.006;

  const PARAJES = {
    // Las Criptas Silentes: una puerta de piedra en un otero del bosque. Está cerrada.
    criptas() {
      suelo(0x4f5f3a); const sillar = mat(0x7b7f72), musgo = mat(0x5a6a42), losa = mat(0x60645c);
      const o = pieza(new THREE.SphereGeometry(20, 24, 12, 0, 6.3, 0, 1.5), mat(0x55653c), 0, -9, -16); o.scale.set(1.3, 0.75, 1);
      for (const s of [-1, 1]) { caja(sillar, 1.6, 6.4, 2.2, s * 2.9, 0, -3.4); caja(musgo, 1.7, 0.3, 2.3, s * 2.9, 6.4, -3.4); for (let i = 0; i < 4; i++) caja(sillar, 2.2, 1.6 - i * 0.2, 5 + i, s * (5 + i * 1.6), 0, -4.4 - i * 0.5, s * 0.25); }
      caja(sillar, 8.2, 1.5, 2.6, 0, 6.6, -3.4); caja(musgo, 8.4, 0.25, 2.8, 0, 8.1, -3.4); caja(losa, 4.2, 6.2, 0.6, 0, 0.2, -3.9); caja(mat(0x4a4e48), 0.12, 6.2, 0.7, 0, 0.2, -3.86);   // dos hojas de piedra, sin tirador
      for (let i = 0; i < 4; i++) caja(sillar, 7 + i * 1.2, 0.35, 1.3, 0, -0.05 + (3 - i) * 0.0, -1.6 + i * 1.3 - 0.0).position.y = 0.18 + (3 - i) * 0.35 - 0.35;
      const c1 = cil(sillar, 0.6, 0.7, 5.5, 6.5, 0.6, 3.5); c1.rotation.z = Math.PI / 2 - 0.1; c1.rotation.y = 0.5; cil(sillar, 0.7, 0.75, 1.6, 4.4, 0, 1.2); cil(sillar, 0.7, 0.75, 2.6, -5, 0, 1.6);
      for (let i = 0; i < 14; i++) roca(i % 3 ? sillar : musgo, 0.4 + rnd() * 0.6, (rnd() - 0.5) * 22, 0.25, 1 + rnd() * 12, 0.6);
      // la gente del reino deja avisos y no pasa de aquí
      for (let i = 0; i < 6; i++) { const x = -9 + i * 3.6, z = 12 + Math.sin(i) * 1.2, p = cil(mat(0x4a3a2a), 0.1, 0.13, 2.6, x, 0, z, undefined, 5); p.rotation.z = (rnd() - 0.5) * 0.3; const t = caja(mat(i % 2 ? 0x8a2a22 : 0xd8d0c0), 0.7, 0.9, 0.04, x + 0.3, 1.5, z); vivos.push(tt => { t.rotation.y = Math.sin(tt * 2 + i) * 0.5; }); }
      for (let i = 0; i < 22; i++) { const a = rnd() * 6.28, d = 20 + rnd() * 40, x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.abs(x) < 9 && z > 0) continue; arbol(x, z, 1.3 + rnd() * 0.8, [0x2f4a2a, 0x3a5a30, 0x4a5a2a][i % 3], i % 7 === 0); }
      arbol(-11, -1, 1.5, 0, true); arbol(12, 3, 1.2, 0, true);
      for (let i = 0; i < 3; i++) { const g = new THREE.Group(); g.position.set(-2.4 + i * 2.6, 8.4, -3.2); escena.add(g); pieza(new THREE.SphereGeometry(0.28, 6, 5), mat(0x15151a), 0, 0, 0, g).scale.set(1, 0.9, 1.6); pieza(new THREE.ConeGeometry(0.07, 0.25, 4), mat(0x15151a), 0, 0.05, 0.5, g).rotation.x = Math.PI / 2; vivos.push(t => { g.rotation.y = Math.sin(t * 0.5 + i * 2) * 1.2; }); }   // cuervos sobre el dintel
      rotulo('La puerta', 0, 11, -3.4); rotulo('Estacas de aviso', 0, 5, 12);
      return { pos: [10, 13, 34], objetivo: [0, 4, 0], cielo: 0x6a7a6a };
    },
    // La Cuna de los Demonios: una grieta en la roca, en un circo de nieve. Los clanes la guardan como suelo sagrado.
    cuna() {
      suelo(0xe6ecf2); bruma = 0.012; const basalto = mat(0x2e3138), hielo = mat(0xcfe6f4, { roughness: 0.2, emissive: 0x2a6a9a, emissiveIntensity: 0.25 });
      for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + (i / 15 - 0.5) * 2.6, d = 22 + rnd() * 6, r = roca(basalto, 8 + rnd() * 5, Math.cos(a) * d, 5 + rnd() * 5, Math.sin(a) * d - 2, 1.4 + rnd() * 0.8); }   // el circo
      for (const s of [-1, 1]) { const p = roca(basalto, 5, s * 6.6, 5, -9.5, 2.0); p.rotation.set(0, s * 0.4, s * 0.12); }
      caja(mat(0x08090c), 3.2, 9, 3, 0, 0, -9.5); const d = caja(basalto, 9, 1.6, 3.4, 0, 9, -8.6); d.rotation.z = 0.06;   // la grieta, negra, bajo una laja atravesada
      for (let i = 0; i < 9; i++) { const c = pieza(new THREE.ConeGeometry(0.25 + rnd() * 0.25, 1.5 + rnd() * 2, 5), hielo, -3.6 + i * 0.9, 8.3 - rnd() * 0.4, -7.2 + rnd() * 0.6); c.rotation.x = Math.PI; }
      // lo que dejan los clanes: postes con tiras, pieles, astas y dos pebeteros que no se apagan
      for (const s of [-1, 1]) {
        cil(mat(0x2b2b2e), 0.22, 0.3, 2.2, s * 5.4, 0, 1.5, undefined, 6); cil(mat(0x2b2b2e), 0.9, 0.6, 0.5, s * 5.4, 2.2, 1.5); const b = cil(new THREE.MeshStandardMaterial({ color: 0x0a1420, emissive: 0x58b8ff, emissiveIntensity: 2.2 }), 0.75, 0.75, 0.14, s * 5.4, 2.65, 1.5);
        const f = pieza(new THREE.ConeGeometry(0.5, 1.6, 6), new THREE.MeshBasicMaterial({ color: 0xa8dcff, transparent: true, opacity: 0.8 }), s * 5.4, 3.5, 1.5); vivos.push(t => { f.scale.y = 0.8 + 0.3 * Math.sin(t * 8 + s); b.material.emissiveIntensity = 2 + 0.4 * Math.sin(t * 3 + s); });
        const luz = new THREE.PointLight(0x8fd0ff, 120, 40, 1.7); luz.position.set(s * 5.4, 4, 1.5); escena.add(luz);
        for (let i = 0; i < 4; i++) { const x = s * (7 + i * 2.6), z = 5 + i * 3.4; cil(mat(0x3a3028), 0.1, 0.14, 4.4, x, 0, z, undefined, 5); for (let k = 0; k < 3; k++) { const t = caja(mat([0x7a2e2a, 0x2f4a6a, 0xd8d0c0][(i + k) % 3]), 0.9, 0.28, 0.03, x + 0.45, 3.8 - k * 0.5, z); vivos.push(tt => { t.rotation.y = Math.sin(tt * 3 + i + k) * 0.6; t.position.x = x + Math.cos(t.rotation.y) * 0.45; t.position.z = z - Math.sin(t.rotation.y) * 0.45; }); } }
      }
      caja(basalto, 4.4, 0.9, 2.2, 0, 0, 2.6); for (let i = 0; i < 4; i++) roca(mat(0x7a6a56), 0.5, -1.4 + i * 0.95, 1.2, 2.6, 0.5); for (const s of [-1, 1]) { const a = pieza(new THREE.ConeGeometry(0.14, 2.0, 5), mat(0xe8dfc8), s * 1.9, 1.7, 2.9); a.rotation.z = -s * 0.5; }
      for (let i = 0; i < 12; i++) roca(mat(0xf2f6fa), 1 + rnd() * 1.6, (rnd() - 0.5) * 44, 0.3, 6 + rnd() * 26, 0.45);
      for (let i = 0; i < 7; i++) pino(-26 + rnd() * 8 + (i % 2) * 44, 14 + rnd() * 20, 1.1 + rnd() * 0.5, 0x3a5046);
      // nieve que cae
      const n = 600, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (rnd() - 0.5) * 80; p[i * 3 + 1] = rnd() * 30; p[i * 3 + 2] = (rnd() - 0.5) * 70; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const copos = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, transparent: true, opacity: 0.85 })); escena.add(copos);
      vivos.push(t => { for (let i = 0; i < n; i++) { p[i * 3 + 1] -= 0.06; p[i * 3] += 0.03; if (p[i * 3 + 1] < 0) { p[i * 3 + 1] = 30; p[i * 3] = (Math.sin(i * 12.9) * 0.5) * 80; } } g.attributes.position.needsUpdate = true; });
      rotulo('La grieta', 0, 12.5, -8.6); rotulo('Ofrendas de los clanes', 0, 4, 2.6); rotulo('Postes de oración', 12, 6.5, 9);
      return { pos: [12, 12, 36], objetivo: [0, 4.5, -2], cielo: 0x9aa8b8 };
    },
    // El Sagrario del Surco: piedras viejas que asoman en un trigal. Las encontró un arado.
    sagrario() {
      suelo(0xc9a84a); const arenisca = mat(0xbfae8a), tierra = mat(0x6a4e32);
      const calva = pieza(new THREE.CircleGeometry(15, 32), tierra, 0, 0.04, -2); calva.rotation.x = -Math.PI / 2; calva.scale.set(1.2, 0.8, 1);
      // mies alrededor de la calva que nadie siembra
      const gMies = new THREE.ConeGeometry(0.42, 1.8, 5), mies = new THREE.InstancedMesh(gMies, mat(0xd9b84e), 2400), M = new THREE.Matrix4(); let k = 0;
      for (let i = 0; i < 6000 && k < 2400; i++) { const x = (rnd() - 0.5) * 120, z = (rnd() - 0.5) * 100; if ((x / 18) ** 2 + ((z + 2) / 12) ** 2 < 1.1 || (Math.abs(x - 6) < 2.4 && z > 6)) continue; M.makeScale(1, 0.8 + rnd() * 0.5, 1).setPosition(x, 0.8, z); mies.setMatrixAt(k++, M); }
      mies.count = k; mies.receiveShadow = true; escena.add(mies); vivos.push(t => { mies.rotation.z = Math.sin(t * 0.8) * 0.012; });
      // las piedras: losas redondeadas, medio tumbadas, y un hueco oscuro entre dos
      for (const [x, z, w, h, ry, rz] of [[-3.6, -3, 3.2, 4.6, 0.2, 0.12], [3.2, -3.4, 3.4, 5.4, -0.15, -0.1], [-7.4, -0.6, 2.6, 2.8, 0.6, 0.3], [7, 0, 2.4, 2.2, -0.5, -0.35], [0, -6.4, 4.4, 3.2, 0, 0.05], [-1, 1.4, 2.2, 1.0, 1.2, 1.3]]) { const o = pieza(new THREE.CapsuleGeometry(w * 0.32, h, 4, 8), arenisca, x, h * 0.42, z); o.scale.set(1, 1, 0.45); o.rotation.set(0, ry, rz); }
      const t = pieza(new THREE.CapsuleGeometry(1.1, 6.4, 4, 8), arenisca, -0.2, 5.6, -3.2); t.scale.set(1, 1, 0.5); t.rotation.z = Math.PI / 2 + 0.05;
      caja(mat(0x0c0a08), 3.2, 3.4, 1.2, -0.2, 0, -3.8); for (let i = 0; i < 3; i++) caja(arenisca, 3.6 - i * 0.3, 0.3, 1.0, -0.2, -0.05 - i * 0.02, -2.4 + i * 0.9).position.y = 0.15 - i * 0.12;
      for (let i = 0; i < 12; i++) roca(i % 2 ? arenisca : tierra, 0.3 + rnd() * 0.5, (rnd() - 0.5) * 20, 0.2, -6 + rnd() * 12, 0.6);
      // el arado que dio con ellas, y el surco que se quedó a medias
      const ar = new THREE.Group(); ar.position.set(6, 0, 7); ar.rotation.y = 0.2; escena.add(ar); caja(mat(0x5a4633), 0.2, 0.2, 4.4, 0, 0.8, 0.6, 0, ar).rotation.x = 0.16; caja(mat(0x2b2b2e), 0.12, 1.1, 0.8, 0, 0, -1.3, 0, ar).rotation.x = 0.5; for (const s of [-0.4, 0.4]) caja(mat(0x5a4633), 0.1, 1.6, 0.1, s, 0.7, -2.1, 0, ar).rotation.x = -0.7; const rd = cil(mat(0x3a2a1c), 0.55, 0.55, 0.12, 0, 0, 2.4, ar, 12); rd.rotation.z = Math.PI / 2;
      caja(tierra, 1.1, 0.25, 40, 6, 0, 28).rotation.y = 0.0;
      // el espino de las cintas y las gavillas que dejan los labradores
      cil(mat(0x3a2a1c), 0.3, 0.45, 2.6, -11, 0, 5, undefined, 6); roca(mat(0x5a6a3a), 2.4, -11, 3.8, 5, 0.8); roca(mat(0x6a7a42), 1.6, -9.8, 4.8, 4.4, 0.8);
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, c = caja(mat([0xb23a2e, 0xe0c040, 0x2f6aa0, 0xf0ead8][i % 4]), 0.12, 1.1, 0.03, -11 + Math.cos(a) * 2.2, 2.4 + (i % 3) * 0.5, 5 + Math.sin(a) * 2.2); vivos.push(tt => { c.rotation.z = Math.sin(tt * 2.5 + i) * 0.4; }); }
      for (let i = 0; i < 5; i++) { const g = pieza(new THREE.ConeGeometry(0.5, 1.7, 7), mat(0xd9b24e), -4 + i * 1.6, 0.85, 4.6 + (i % 2) * 0.5); g.rotation.z = (i % 2 - 0.5) * 0.25; }
      for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28; if (Math.sin(a) > 0.9) continue; roca(mat(0xa89a7a), 0.5, Math.cos(a) * 19, 0.25, -2 + Math.sin(a) * 12.5, 0.7); }   // linde de piedras de labrantío
      figura(13, 12, -2.2, 0x8a6a48);
      rotulo('Las piedras', 0, 9, -3.4); rotulo('El arado', 6, 4, 7); rotulo('Espino de las cintas', -11, 8, 5);
      return { pos: [14, 13, 36], objetivo: [0, 2.5, 0], cielo: 0xbcd0e0 };
    },
    // La Ciudad Ahogada: torres rotas que asoman de un lago. Los pescadores no faenan cerca.
    ahogada() {
      const fondo = suelo(0x25586e, 140); fondo.material = new THREE.MeshStandardMaterial({ color: 0x1f5a78, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.94 }); fondo.position.y = 0; bruma = 0.011;
      vivos.push(t => { fondo.material.roughness = 0.13 + 0.05 * Math.sin(t * 0.8); });
      const cal = mat(0xb9b6ac), verdin = mat(0x5a6a52), hueco = mat(0x0a0d10);
      // torres: unas enteras hasta media altura, otras desmochadas, alguna vencida
      for (const [x, z, r, h, vencida] of [[0, -10, 3.4, 15, 0], [-10, -16, 2.6, 9, 0.12], [9, -18, 2.8, 12, -0.08], [-4, -26, 2.2, 6, 0], [16, -8, 2.0, 4.5, 0.25], [-18, -6, 2.2, 3.2, -0.2], [5, -32, 3.0, 8, 0.05]]) {
        const g = new THREE.Group(); g.position.set(x, -1, z); g.rotation.z = vencida; escena.add(g);
        cil(cal, r, r * 1.08, h, 0, 0, 0, g, 14); cil(verdin, r * 1.1, r * 1.12, 1.6, 0, 0, 0, g, 14);
        for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; if ((i * 7) % 3 === 0) continue; caja(cal, r * 0.5, 0.8 + ((i * 5) % 3) * 0.9, r * 0.35, Math.cos(a) * r * 0.92, h, Math.sin(a) * r * 0.92, -a + Math.PI / 2, g); }   // coronación mellada
        for (let k = 0; k < Math.floor(h / 4); k++) for (let i = 0; i < 3; i++) { const a = i * 2.1 + k; caja(hueco, 0.7, 1.5, 0.3, Math.sin(a) * r * 0.98, 3 + k * 3.6, Math.cos(a) * r * 0.98, a, g); }
      }
      for (const [x0, z0, x1, z1] of [[0, -10, -10, -16], [0, -10, 9, -18], [9, -18, 5, -32]]) { const d = Math.hypot(x1 - x0, z1 - z0); caja(cal, d - 5, 2.4, 1.2, (x0 + x1) / 2, -1.2, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0)); }   // lienzos de muralla a ras de agua
      for (let i = 0; i < 10; i++) roca(i % 2 ? cal : verdin, 0.8 + rnd() * 1.2, -20 + rnd() * 44, 0.1, -34 + rnd() * 30, 0.5);
      // orilla de los pescadores, lejos de las torres
      const orilla = pieza(new THREE.CircleGeometry(46, 40), mat(0x8a8a62), 0, 0.12, 58); orilla.rotation.x = -Math.PI / 2;
      const playa = pieza(new THREE.CircleGeometry(48, 40), mat(0xb8ac84), 0, 0.06, 58); playa.rotation.x = -Math.PI / 2;
      for (const [x, z, ry, rz] of [[-7, 17, 0.4, 0], [-2, 18.5, 0.1, 0], [6, 17.4, -0.3, Math.PI]]) { const b = crearBarcoModelo({ eslora: 5, palos: 1, velas: 'ninguna' }); b.position.set(x, rz ? 1.0 : 0.5, z); b.rotation.set(0, ry + Math.PI / 2, rz); escena.add(b); }
      for (let i = 0; i < 3; i++) { const x = 11 + i * 3.4; for (const s of [-1.4, 1.4]) cil(mat(0x4a3a2a), 0.08, 0.1, 2.6, x + s, 0.1, 20, undefined, 5); caja(mat(0x4a3a2a), 3, 0.1, 0.1, x, 2.6, 20); const r = caja(mat(0x5a6a5a, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 2.8, 2.0, 0.04, x, 0.6, 20); }
      for (let i = 0; i < 4; i++) cil(mat(0x6a4a2e), 0.45, 0.45, 0.9, -12 - (i % 2) * 1.1, 0.1, 19 + i * 0.6);
      caja(mat(0x8a7a66), 4, 2.4, 3, -16, 0.1, 24, 0.3); const tj = pieza(new THREE.ConeGeometry(3.4, 1.8, 4), mat(0x6a6a5a), -16, 3.4, 24); tj.rotation.y = Math.PI / 4 + 0.3;
      const pescador = figura(1.5, 15.2, Math.PI, 0x4a5a6a); vivos.push(t => { pescador.rotation.y = Math.PI + Math.sin(t * 0.3) * 0.25; });
      // boyas: hasta aquí llegan las redes
      for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.2, x = Math.sin(a) * 30, z = 6 - Math.cos(a) * 6, b = pieza(new THREE.SphereGeometry(0.5, 8, 6), mat(i % 2 ? 0xb23a2e : 0xe8e0d0), x, 0.2, z); vivos.push(t => { b.position.y = 0.2 + Math.sin(t * 1.4 + i) * 0.12; }); }
      // jirones de niebla sobre el agua
      const c = document.createElement('canvas'); c.width = c.height = 64; const cx2 = c.getContext('2d'), gr = cx2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx2.fillStyle = gr; cx2.fillRect(0, 0, 64, 64); const tex = new THREE.CanvasTexture(c);
      for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.5 })), x0 = -40 + rnd() * 80, z = -40 + rnd() * 34; s.scale.set(26, 7, 1); s.position.set(x0, 2 + rnd() * 2, z); escena.add(s); vivos.push(t => { s.position.x = x0 + Math.sin(t * 0.05 + i) * 12; }); }
      rotulo('Torres rotas', 0, 17.5, -10); rotulo('Varadero de los pescadores', -2, 5, 18); rotulo('Boyas: hasta aquí las redes', 0, 3.5, 2);
      return { pos: [16, 12, 44], objetivo: [0, 4, -2], cielo: 0x8aa0b0 };
    },
  };
  const v = (PARAJES[l.id] || PARAJES.criptas)();

  /* ---------- luz del día, la misma hora que en el mapa ---------- */
  const sol = new THREE.DirectionalLight(0xffffff, 2); sol.castShadow = true; sol.shadow.mapSize.setScalar(1024);
  Object.assign(sol.shadow.camera, { left: -50, right: 50, top: 50, bottom: -50, near: 10, far: 400 }); sol.shadow.bias = -0.0006;
  const luna = new THREE.DirectionalLight(0x9db4e8, 0), luzCielo = new THREE.HemisphereLight(0xcfe0ff, 0x4a4436, 0.8);
  escena.add(sol, sol.target, luna, luzCielo);
  escena.background = new THREE.Color(v.cielo); escena.fog = new THREE.FogExp2(v.cielo, bruma);
  const tinte = new THREE.Color(v.cielo);
  function actualizar(t, luz, noche) {
    sol.position.copy(luz.dirSol).multiplyScalar(150); sol.intensity = luz.sol.intensity; sol.color.copy(luz.sol.color); sol.castShadow = luz.sol.castShadow;
    luna.position.copy(luz.dirLuna).multiplyScalar(150); luna.intensity = luz.luna.intensity * 1.2; luzCielo.intensity = luz.luzCielo.intensity;
    escena.background.copy(luz.horizonte).lerp(luz.arriba, 0.3).lerp(tinte, 0.35 * (1 - noche)); escena.fog.color.copy(escena.background);
    for (const f of vivos) f(t);
  }
  const SONIDO = { criptas: { viento: 0.4, pajaros: 0.15 }, cuna: { viento: 0.95 }, sagrario: { viento: 0.3, pajaros: 0.6 }, ahogada: { mar: 0.55, viento: 0.3 } };
  return { escena, etiquetas, R: 34, minDist: 8, actualizar, sonido: SONIDO[l.id] || { viento: 0.4 }, vista: { pos: new THREE.Vector3(...v.pos), objetivo: new THREE.Vector3(...v.objetivo) }, limite: 34 };
}
