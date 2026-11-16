// mazmorra.js — levanta el interior de una ruina a partir de una planta: salas, pasos y lo que hay en cada una.
// Aquí solo está el constructor. Las plantas no van en esta web: vienen en el archivo del máster (master.js) y sin él no hay nada que ver.
//
// planta = { tono: { suelo, muro, luz, fondo }, salas: [{ id, nombre, x, z, w, d, texto, luz, rasgos: [...] }], pasos: [{ de, a, ancho }] }
// Las salas son rectángulos centrados en (x, z); +z es hacia quien mira, y por ahí suele estar la entrada. Un rasgo es { tipo, x, z, ... }
// con x, z medidos desde el centro de su sala: columna, yacente, pozo, eje, mesa, rueda, aro, raices, agua, hielo, escombro, escalera, losa,
// cofre, banco, figura, bestia, escarcha y nota (un rótulo con texto, sin nada debajo).
import * as THREE from 'three';
import { azarDe } from './ruido.js';
import { crearFigura } from './figuras.js';
import { matUtil, cantear, gCofre, gBanco, gPerro } from './utileria.js';

const ALTO = 3.4, GRUESO = 0.7;

export function crearMazmorra(planta, id = 'x') {
  const rnd = azarDe('mazmorra-' + id), escena = new THREE.Scene(), etiquetas = [], vivos = [], tono = planta.tono || {};
  const canto = (color, verdin = 0) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 1, vertexColors: true }); m.userData.sillar = [1, 1.6, verdin]; return m; };
  const suelo = canto(tono.suelo ?? 0x6a6a64, tono.verdin ?? 0), muro = canto(tono.muro ?? 0x55554f, tono.verdin ?? 0), liso = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const brillo = (color, fuerza = 1.6) => new THREE.MeshStandardMaterial({ color: 0x0c1014, emissive: color, emissiveIntensity: fuerza });
  const pieza = (geo, m, x, y, z, padre = escena) => { const o = new THREE.Mesh(m.userData.sillar ? cantear(geo, m.userData.sillar) : geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; padre.add(o); return o; };
  const tramos = (v, paso) => Math.max(1, Math.round(v / paso));
  const caja = (m, w, h, d, x, y, z, padre) => pieza(m.userData.sillar ? new THREE.BoxGeometry(w, h, d, tramos(w, 1.6), tramos(h, 1), tramos(d, 1.6)) : new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, padre);
  const cil = (m, r, h, x, y, z, seg = 10, padre) => pieza(new THREE.CylinderGeometry(r, r, h, seg, m.userData.sillar ? tramos(h, 1.2) : 1), m, x, y + h / 2, z, padre);
  const luz = (x, y, z, color, fuerza = 60, alcance = 30) => { const l = new THREE.PointLight(color, fuerza, alcance, 1.7); l.position.set(x, y, z); escena.add(l); return l; };

  /* ---------- lo que hay dentro ---------- */
  function figura(r, x, z) { const f = crearFigura({ rnd: azarDe(`maz-${id}-${x}-${z}`), tipo: 'monje', ...r.ropa }); Object.assign(f.estado, r.estado); f.grupo.position.set(x, r.y ?? 0, z); f.grupo.rotation.set(r.tumbado ? -Math.PI / 2 : 0, r.mira ?? 0, 0); escena.add(f.grupo); if (!r.quieto) vivos.push(t => f.actualizar(t)); else f.actualizar(0); return f; }
  const RASGOS = {
    columna: (r, x, z) => { caja(muro, 1.7, 0.4, 1.7, x, 0, z); cil(muro, r.r ?? 0.6, r.alto ?? ALTO + 1.4, x, 0.4, z); },
    // un cuerpo de piedra tendido en su lecho; "despierto" lo deja con los ojos abiertos: una luz tenue encima
    yacente: (r, x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r.mira ?? 0; escena.add(g); caja(muro, 1.3, 0.7, 2.9, 0, 0, 0, g); const c = pieza(new THREE.CapsuleGeometry(0.33, 1.5, 3, 6), liso(r.color ?? 0xd9d4c8), 0, 0.98, 0.15, g); c.rotation.x = Math.PI / 2; pieza(new THREE.SphereGeometry(0.27, 7, 5), liso(r.color ?? 0xd9d4c8), 0, 1.02, -1.05, g); if (r.despierto) { pieza(new THREE.SphereGeometry(0.05, 5, 4), brillo(0xbfe6ff, 3), 0.09, 1.2, -1.2, g); pieza(new THREE.SphereGeometry(0.05, 5, 4), brillo(0xbfe6ff, 3), -0.09, 1.2, -1.2, g); } },
    pozo: (r, x, z) => { const R = r.r ?? 2; cil(muro, R + 0.5, 0.6, x, 0, z, 14); cil(liso(0x050607), R, 0.62, x, 0, z, 14); if (r.brillo) { cil(brillo(r.brillo, 1.2), R * 0.82, 0.64, x, 0, z, 14); const l = luz(x, 2.2, z, r.brillo, 90, R * 9); vivos.push(t => { l.intensity = 80 + 25 * Math.sin(t * 0.9); }); } },
    // eje: un huso de metal que gira despacio, con varas alrededor (las que falten se quedan en hueco)
    eje: (r, x, z) => { cil(muro, 2.6, 0.5, x, 0, z, 12); const e = cil(liso(0x8a8f96, { metalness: 0.7, roughness: 0.35 }), 0.7, 5.2, x, 0.5, z, 8); vivos.push(t => { e.rotation.y = t * 0.12; }); const n = r.varas ?? 9, faltan = r.faltan ?? []; for (let i = 0; i < n; i++) { const a = i / n * 6.283, vx = x + Math.cos(a) * 2.1, vz = z + Math.sin(a) * 2.1; cil(liso(0x050607), 0.22, 0.52, vx, 0, vz, 6); if (!faltan.includes(i)) cil(liso(0xd9d4c8), 0.12, 2.6, vx, 0.5, vz, 6); } },
    mesa: (r, x, z) => { caja(muro, r.w ?? 2.6, 1.1, r.d ?? 1.6, x, 0, z); if (r.brillo) caja(brillo(r.brillo, r.fuerza ?? 1.4), (r.w ?? 2.6) - 0.5, 0.06, (r.d ?? 1.6) - 0.5, x, 1.1, z); else caja(liso(0x1a1c1e), (r.w ?? 2.6) - 0.5, 0.05, (r.d ?? 1.6) - 0.5, x, 1.1, z); if (r.escarcha) for (let i = 0; i < 5; i++) pieza(new THREE.ConeGeometry(0.1, 0.5 + rnd() * 0.4, 4), liso(0xdfeaf2, { emissive: 0x3a7aa8, emissiveIntensity: 0.4 }), x - 0.8 + rnd() * 1.6, 1.4, z - 0.5 + rnd()); },
    rueda: (r, x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r.mira ?? 0; escena.add(g); caja(muro, 1.6, 0.8, 1.2, 0, 0, 0, g); const w = pieza(new THREE.CylinderGeometry(1.3, 1.3, 0.4, 16), liso(0xcfc9bb), 0, 2.1, 0, g); w.rotation.x = Math.PI / 2; for (let i = 0; i < (r.muescas ?? 5); i++) { const a = -0.9 + i * 0.45; pieza(new THREE.BoxGeometry(0.16, 0.3, 0.46), liso(i === (r.muescas ?? 5) - 1 ? 0x2a2c30 : 0x7a7468), Math.sin(a) * 1.25, 2.1 + Math.cos(a) * 1.25, 0, g).rotation.z = -a; } },
    aro: (r, x, z) => { const a = pieza(new THREE.TorusGeometry(r.r ?? 1.5, 0.12, 6, 20), liso(0xb0b6bd, { metalness: 0.8, roughness: 0.3 }), x, 3.2, z); vivos.push(t => { a.rotation.y = Math.sin(t * 31) * 0.012; a.position.y = 3.2 + Math.sin(t * 47) * 0.008; }); cil(liso(0x33363a), 0.05, 2.2, x, 4.7, z, 4); },
    raices: (r, x, z) => { for (let i = 0; i < (r.n ?? 9); i++) { const h = 2.5 + rnd() * 3, c = pieza(new THREE.ConeGeometry(0.07, h, 4), liso(0xcdbf8e), x + (rnd() - 0.5) * (r.w ?? 8), ALTO + 3.6 - h / 2, z + (rnd() - 0.5) * (r.d ?? 6)); c.rotation.x = Math.PI; } },
    agua: (r, x, z, s) => { const a = pieza(new THREE.BoxGeometry(r.w ?? s.w, 0.1, r.d ?? s.d), liso(r.color ?? 0x1f5a78, { transparent: true, opacity: 0.72, roughness: 0.15, metalness: 0.3 }), x, r.y ?? 0.9, z); a.castShadow = false; vivos.push(t => { a.position.y = (r.y ?? 0.9) + Math.sin(t * 0.7) * 0.03; }); },
    hielo: (r, x, z) => { for (let i = 0; i < (r.n ?? 5); i++) { const h = 1 + rnd() * 2.2; pieza(new THREE.ConeGeometry(0.25 + rnd() * 0.3, h, 5), liso(0xcfe6f4, { roughness: 0.2, emissive: 0x2a6a9a, emissiveIntensity: 0.3 }), x + (rnd() - 0.5) * (r.w ?? 3), h / 2, z + (rnd() - 0.5) * (r.d ?? 3)).rotation.z = (rnd() - 0.5) * 0.4; } },
    escombro: (r, x, z) => { for (let i = 0; i < (r.n ?? 6); i++) { const o = pieza(new THREE.DodecahedronGeometry(0.4 + rnd() * 0.6, 0), muro, x + (rnd() - 0.5) * (r.w ?? 3), 0.3, z + (rnd() - 0.5) * (r.d ?? 3)); o.rotation.set(rnd() * 3, rnd() * 3, 0); o.scale.y = 0.7; } },
    escalera: (r, x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r.mira ?? 0; escena.add(g); for (let i = 0; i < (r.n ?? 7); i++) caja(suelo, r.w ?? 3, 0.45, 0.9, 0, i * 0.45, i * 0.9, g); },
    losa: (r, x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r.mira ?? 0; escena.add(g); if (r.partida) { caja(liso(0x8a8478), (r.w ?? 3) * 0.48, ALTO - 0.4, 0.5, -(r.w ?? 3) * 0.27, 0, 0, g).rotation.z = 0.06; caja(liso(0x8a8478), (r.w ?? 3) * 0.48, ALTO - 0.9, 0.5, (r.w ?? 3) * 0.27, 0, 0, g).rotation.z = -0.1; if (r.brillo) { caja(brillo(r.brillo, 1.5), 0.18, ALTO - 1, 0.2, 0, 0, -0.1, g); luz(x, 2, z, r.brillo, 50, 16); } } else { caja(liso(r.color ?? 0x8a8478), r.w ?? 3, ALTO - 0.4, 0.5, 0, 0, 0, g); if (r.cera) caja(liso(0x9a9c9e), (r.w ?? 3) * 0.7, 0.3, 0.56, 0, 1.4, 0, g); } },
    cofre: (r, x, z) => { const o = pieza(gCofre(r.k ?? 1.3), matUtil, x, 0, z); o.rotation.y = r.mira ?? 0; },
    banco: (r, x, z) => { const o = pieza(gBanco(r.w ?? 2.4), matUtil, x, 0, z); o.rotation.y = r.mira ?? 0; },
    figura,
    bestia: (r, x, z) => { const o = pieza(gPerro(r.color ?? 0xe6dfd6), matUtil, x, 0, z); o.rotation.y = r.mira ?? rnd() * 6; o.scale.setScalar(r.k ?? 1.5); vivos.push(t => { o.rotation.x = Math.sin(t * 1.3 + x) * 0.05; }); },
    // escarcha: frío con forma. Un puñado de esquirlas que se mecen y una luz azul
    escarcha: (r, x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); escena.add(g); const m = liso(0xdff0fa, { roughness: 0.15, emissive: 0x58b8ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, h = 1.2 + rnd() * 1.6; pieza(new THREE.ConeGeometry(0.2 + rnd() * 0.15, h, 4), m, Math.cos(a) * 0.45, 0.9 + h / 2 - 0.5, Math.sin(a) * 0.45, g).rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); } pieza(new THREE.OctahedronGeometry(0.5), m, 0, 1.3, 0, g); const l = luz(x, 2, z, 0x8fd0ff, 30, 14); vivos.push(t => { g.rotation.y = t * 0.3 + x; g.position.y = 0.15 + Math.sin(t * 1.1 + z) * 0.12; l.intensity = 26 + 8 * Math.sin(t * 2 + x); }); },
    nota: (r, x, z) => { etiquetas.push({ nombre: r.nombre, texto: r.texto, pos: new THREE.Vector3(x, r.y ?? 2.6, z), clase: 'hito' }); },
  };

  /* ---------- salas y pasos ---------- */
  const salas = new Map((planta.salas || []).map(s => [s.id, { ...s, huecos: { n: [], s: [], e: [], o: [] } }]));
  // un paso sale recto si las salas se solapan en un eje; si no, hace un codo. Cada tramo deja su hueco en el muro que cruza.
  const tramo = (x0, z0, x1, z1, ancho) => {
    const horizontal = Math.abs(x1 - x0) > Math.abs(z1 - z0), largo = Math.hypot(x1 - x0, z1 - z0); if (largo < 0.05) return;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    caja(suelo, horizontal ? largo : ancho, 0.5, horizontal ? ancho : largo, cx, -0.5, cz);
    for (const s of [-1, 1]) caja(muro, horizontal ? largo : GRUESO, ALTO, horizontal ? GRUESO : largo, cx + (horizontal ? 0 : s * (ancho + GRUESO) / 2), 0, cz + (horizontal ? s * (ancho + GRUESO) / 2 : 0));
  };
  for (const p of planta.pasos || []) {
    const A = salas.get(p.de), B = salas.get(p.a), an = p.ancho ?? 3; if (!A || !B) continue;
    const sx = Math.max(A.x - A.w / 2, B.x - B.w / 2), ex = Math.min(A.x + A.w / 2, B.x + B.w / 2), sz = Math.max(A.z - A.d / 2, B.z - B.d / 2), ez = Math.min(A.z + A.d / 2, B.z + B.d / 2);
    if (ex - sx >= an) {   // una encima de otra: paso de norte a sur
      const x = (sx + ex) / 2, [arriba, abajo] = A.z < B.z ? [A, B] : [B, A];
      arriba.huecos.s.push([x, an]); abajo.huecos.n.push([x, an]); tramo(x, arriba.z + arriba.d / 2, x, abajo.z - abajo.d / 2, an);
    } else if (ez - sz >= an) {   // lado a lado
      const z = (sz + ez) / 2, [izq, der] = A.x < B.x ? [A, B] : [B, A];
      izq.huecos.e.push([z, an]); der.huecos.o.push([z, an]); tramo(izq.x + izq.w / 2, z, der.x - der.w / 2, z, an);
    } else {   // en diagonal: sale de A por un lado y entra en B por arriba o por abajo
      const aDer = B.x > A.x, bAbajo = A.z > B.z, x0 = A.x + (aDer ? 1 : -1) * A.w / 2, z1 = B.z + (bAbajo ? 1 : -1) * B.d / 2;
      A.huecos[aDer ? 'e' : 'o'].push([A.z, an]); B.huecos[bAbajo ? 's' : 'n'].push([B.x, an]);
      tramo(x0, A.z, B.x + (aDer ? 1 : -1) * an / 2, A.z, an); tramo(B.x, A.z + (bAbajo ? -1 : 1) * an / 2, B.x, z1, an);
      caja(suelo, an, 0.5, an, B.x, -0.5, A.z);
    }
  }
  // muro con huecos: de a hasta b sobre un eje, saltándose cada hueco [centro, ancho]
  const lienzo = (a, b, huecos, pon) => { let desde = a; for (const [c, an] of [...huecos].sort((p, q) => p[0] - q[0])) { if (c - an / 2 > desde) pon(desde, c - an / 2); desde = Math.max(desde, c + an / 2); } if (b > desde) pon(desde, b); };
  for (const s of salas.values()) {
    const x0 = s.x - s.w / 2, x1 = s.x + s.w / 2, z0 = s.z - s.d / 2, z1 = s.z + s.d / 2, G = GRUESO;
    caja(suelo, s.w, 0.5, s.d, s.x, -0.5, s.z);
    lienzo(x0 - G, x1 + G, s.huecos.n, (a, b) => caja(muro, b - a, ALTO, G, (a + b) / 2, 0, z0 - G / 2)); lienzo(x0 - G, x1 + G, s.huecos.s, (a, b) => caja(muro, b - a, ALTO, G, (a + b) / 2, 0, z1 + G / 2));
    lienzo(z0, z1, s.huecos.o, (a, b) => caja(muro, G, ALTO, b - a, x0 - G / 2, 0, (a + b) / 2)); lienzo(z0, z1, s.huecos.e, (a, b) => caja(muro, G, ALTO, b - a, x1 + G / 2, 0, (a + b) / 2));
    if (s.luz !== false) luz(s.x, ALTO + 2.5, s.z, s.luz ?? tono.luz ?? 0xffd9a0, 22 + Math.max(s.w, s.d) * 3.4, Math.max(s.w, s.d) * 2.2);
    etiquetas.push({ nombre: s.nombre, texto: s.texto, pos: new THREE.Vector3(s.x, ALTO + 3, s.z), clase: 'hito' });
    for (const r of s.rasgos || []) RASGOS[r.tipo]?.(r, s.x + (r.x ?? 0), s.z + (r.z ?? 0), s);
  }

  /* ---------- luz, encuadre y vuelta ---------- */
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const s of salas.values()) { x0 = Math.min(x0, s.x - s.w / 2); x1 = Math.max(x1, s.x + s.w / 2); z0 = Math.min(z0, s.z - s.d / 2); z1 = Math.max(z1, s.z + s.d / 2); }
  if (!salas.size) x0 = x1 = z0 = z1 = 0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = Math.max(18, Math.hypot(x1 - x0, z1 - z0) / 2);
  escena.add(new THREE.HemisphereLight(tono.cielo ?? 0x8a94a8, 0x14100c, 0.5)); const alta = new THREE.DirectionalLight(0xbcd0ff, 0.5); alta.position.set(cx - 12, 30, cz + 16); escena.add(alta);
  escena.background = new THREE.Color(tono.fondo ?? 0x07080a);
  const actualizar = t => { for (const f of vivos) f(t); };
  return { escena, etiquetas, R, minDist: 6, actualizar, sonido: planta.sonido ?? { viento: 0.25 }, vista: { pos: new THREE.Vector3(cx + R * 0.12, R * 1.5, cz + R * 1.38), objetivo: new THREE.Vector3(cx, 0, cz + R * 0.08) }, limite: R * 1.1 };
}
