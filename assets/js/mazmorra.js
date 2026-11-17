// mazmorra.js — levanta el interior de una ruina a partir de una planta: salas, pasos y lo que hay en cada una.
// Aquí solo está el constructor. Las plantas no van en esta web: vienen en el archivo del máster (master.js) y sin él no hay nada que ver.
//
// planta = { tono, salas: [...], pasos: [...] }   o, con varios niveles,   { tono, niveles: [{ nombre, tono, salas, pasos }, ...] }
//   tono:  { suelo, muro, luz, fondo, cielo, verdin, estilo: 'cripta' | 'hielo' | 'arenisca' | 'ahogada', antorcha: color | false }
//   sala:  { id, n, nombre, x, z, w, d, y, forma: 'ochava', arcos, antorchas, luz, voz, secreto, peligro, encuentro, texto, rasgos: [...] }
//   paso:  { de, a, ancho, puerta: 'losa' | 'reja' | 'oculta' | 'derrumbe' | 'cera', nota }
// Las salas son rectángulos centrados en (x, z); +z es hacia quien mira, y por ahí suele estar la entrada. «y» es la altura del suelo:
// si dos salas unidas están a distinta altura, el paso baja en escalones. Un rasgo es { tipo, x, z, ... } medido desde el centro de su
// sala; los tipos están en RASGOS, más abajo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { azarDe } from './ruido.js';
import { crearFigura } from './figuras.js';
import { matUtil, cantear, gCofre, gBanco, gPerro, gBarril, gPebetero, gBrasero, gPuesto } from './utileria.js';

const ALTO = 3.8, GRUESO = 0.8, PI = Math.PI;

// levanta un nivel dentro del grupo «escena» y devuelve sus rótulos, su caja y lo que hay que mover en cada cuadro
function levantar(planta, id, escena) {
  const rnd = azarDe('mazmorra-' + id), etiquetas = [], vivos = [], tono = planta.tono || {}, estilo = tono.estilo || 'cripta';
  const tinte = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
  const lotes = [], conLote = m => { m.userData.lote = []; lotes.push(m); return m; };
  const canto = (color, alto = 1, largo = 1.6) => { const m = conLote(new THREE.MeshStandardMaterial({ color, roughness: 1, vertexColors: true })); m.userData.sillar = [alto, largo, tono.verdin ?? 0]; return m; };
  const liso = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra }), suelto = (color, extra) => conLote(liso(color, extra));
  const brillo = (color, fuerza = 1.6) => new THREE.MeshStandardMaterial({ color: 0x0c1014, emissive: color, emissiveIntensity: fuerza });
  const cSuelo = tono.suelo ?? 0x6a6a64, cMuro = tono.muro ?? 0x55554f;
  const suelo = canto(cSuelo), losas = canto(tinte(cSuelo, 1.22), 1.3, 1.3), muro = canto(cMuro), remate = canto(tinte(cMuro, 1.28), 0.6, 1.2);
  const hierro = suelto(0x2c2e34, { metalness: 0.5, roughness: 0.6 }), hueso = suelto(0xd8d2c0), negro = suelto(0x040506);
  const fuegoColor = tono.antorcha === undefined ? 0xffa040 : tono.antorcha, fuego = fuegoColor === false ? null : brillo(fuegoColor, 2.6);

  // Lo fijo se junta por material al final: una malla por piedra en vez de cientos. «piedra» trocea en sillares; «fijo» va tal cual.
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  const echar = (m, geo, x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const g = m.userData.sillar ? cantear(geo, m.userData.sillar) : (geo.index ? geo.toNonIndexed() : geo); g.applyMatrix4(M4.compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz))); m.userData.lote.push(g); };
  const tramos = (v, paso) => Math.max(1, Math.round(v / paso));
  const bloque = (m, w, h, d, x, y, z, ry = 0) => { if (w > 0.01 && h > 0.01 && d > 0.01) echar(m, m.userData.sillar ? new THREE.BoxGeometry(w, h, d, tramos(w, m.userData.sillar[1]), tramos(h, m.userData.sillar[0]), tramos(d, m.userData.sillar[1])) : new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, ry); };
  const tambor = (m, r0, r1, h, x, y, z, seg = 8) => echar(m, new THREE.CylinderGeometry(r0, r1, h, seg, m.userData.sillar ? tramos(h, 1.1) : 1), x, y + h / 2, z);
  // lo que se mueve o brilla va suelto, colgado del grupo de su sala (que ya está a la altura de su suelo)
  let destino = escena;
  const pieza = (geo, m, x, y, z, padre = destino) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; padre.add(o); return o; };
  const grupo = (x, z, ry = 0, y = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; destino.add(g); return g; };
  const luz = (x, y, z, color, fuerza = 60, alcance = 30) => { const l = new THREE.PointLight(color, fuerza, alcance, 1.7); l.position.set(x, y, z); destino.add(l); return l; };

  /* ---------- lo que puede haber en una sala ---------- */
  // Los rasgos fijos (columnas, lechos, urnas…) se echan al lote con la altura «b» del suelo de su sala; los vivos cuelgan de su grupo.
  let b = 0; const s0 = () => bSala;   // altura del suelo de la sala en curso
  let bSala = 0;
  const figura = (r, x, z) => { const f = crearFigura({ rnd: azarDe(`maz-${id}-${x}-${z}`), tipo: 'monje', talla: r.talla ?? 1, ...r.ropa }); Object.assign(f.estado, r.estado); f.grupo.position.set(x, r.y ?? 0, z); f.grupo.rotation.set(r.tumbado ? -PI / 2 : 0, r.mira ?? 0, 0); destino.add(f.grupo); if (!r.quieto) vivos.push(t => f.actualizar(t)); else f.actualizar(0); return f; };
  const llama = (x, y, z, k = 1) => { if (fuego) pieza(new THREE.ConeGeometry(0.11 * k, 0.42 * k, 5), fuego, x, y, z).castShadow = false; };
  const RASGOS = {
    columna: (r, x, z) => { const R = r.r ?? 0.6, h = r.rota ? 1.2 + rnd() * 1.2 : ALTO - b + 0.3; bloque(remate, R * 3, 0.35, R * 3, x, b, z); tambor(remate, R * 1.25, R * 1.35, 0.3, x, b + 0.35, z); tambor(muro, R, R, h, x, b + 0.65, z, 8);
      if (r.rota) { for (let i = 0; i < 3; i++) echar(muro, new THREE.CylinderGeometry(R, R, 1.1, 8, 1), x + 1.4 + i * 1.3 + rnd() * 0.3, b + R, z + (rnd() - 0.5) * 1.5, 0, PI / 2, rnd() * 3); } else { tambor(remate, R * 1.4, R * 1.1, 0.35, x, b + 0.65 + h, z); bloque(remate, R * 3.1, 0.3, R * 3.1, x, b + 1.0 + h, z); } },
    // lecho de piedra con su cuerpo; «vacio» lo deja sin él y «despierto» le abre los ojos
    yacente: (r, x, z) => { const ry = r.mira ?? 0, c = Math.cos(ry), s = Math.sin(ry); bloque(remate, 1.7, 0.25, 3.3, x, b, z, ry); bloque(muro, 1.35, 0.6, 2.95, x, b + 0.25, z, ry); bloque(remate, 1.1, 0.16, 0.7, x - s * 1.05, b + 0.85, z - c * 1.05, ry); if (r.vacio) return;
      const g = grupo(x, z, ry), m = liso(r.color ?? 0xd9d4c8); pieza(new THREE.CapsuleGeometry(0.34, 1.45, 3, 6), m, 0, 1.2, 0.2, g).rotation.x = PI / 2; pieza(new THREE.SphereGeometry(0.27, 7, 5), m, 0, 1.24, -1.0, g); pieza(new THREE.BoxGeometry(0.62, 0.16, 0.3), m, 0, 1.5, -0.15, g);
      if (r.despierto) for (const sx of [-1, 1]) pieza(new THREE.SphereGeometry(0.05, 5, 4), brillo(0xbfe6ff, 3), sx * 0.09, 1.43, -1.12, g); },
    sarcofago: (r, x, z) => { const ry = r.mira ?? 0; bloque(remate, 2.0, 0.3, 3.6, x, b, z, ry); bloque(muro, 1.6, 1.0, 3.2, x, b + 0.3, z, ry); const t = pieza(new THREE.BoxGeometry(1.75, 0.24, 3.35), liso(tinte(cMuro, 1.5)), x + (r.abierto ? 0.5 : 0), 1.42, z); t.rotation.y = ry + (r.abierto ? 0.22 : 0); },
    // una figura de piedra en su pedestal: sale del mismo molde que la gente, toda de un color
    estatua: (r, x, z) => { const c = r.color ?? tinte(cMuro, 1.6); bloque(remate, 1.5, 0.9, 1.5, x, b, z); figura({ ...r, y: 0.9, quieto: true, talla: r.talla ?? 1.25, ropa: { tipo: 'monje', tocado: 'capucha', piel: c, color: c, pelo: c, cuerda: false, ...r.ropa } }, x, z); },
    // boca a lo hondo: brocal, un tubo oscuro hacia abajo y, si brilla, la luz que sube
    pozo: (r, x, z) => { const R = r.r ?? 2, h = r.brillo ? Math.min(r.hondo ?? 7, R * 0.85) : r.hondo ?? 7; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; bloque(remate, 0.95 * R / 2 + 0.4, 0.5, 1.0, x + Math.cos(a) * (R + 0.45), b, z + Math.sin(a) * (R + 0.45), -a + PI / 2); }
      const t = pieza(new THREE.CylinderGeometry(R, R * 0.8, h, 16, 1, true), new THREE.MeshStandardMaterial({ color: tinte(cMuro, 0.6), roughness: 1, side: THREE.BackSide }), x, -h / 2 + 0.02, z); t.castShadow = false; pieza(new THREE.CircleGeometry(R * 0.8, 16), r.brillo ? brillo(r.brillo, 1.3) : liso(0x020304), x, -h + 0.05, z).rotation.x = -PI / 2;
      if (r.brillo) { const l = luz(x, -h * 0.3, z, r.brillo, 90, R * 9), n = pieza(new THREE.CylinderGeometry(R * 0.9, R * 0.75, h * 0.7, 16, 1, true), new THREE.MeshBasicMaterial({ color: r.brillo, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }), x, -h * 0.4, z); n.castShadow = false; vivos.push(t => { l.intensity = 80 + 25 * Math.sin(t * 0.9); n.material.opacity = 0.08 + 0.05 * Math.sin(t * 0.6); }); } },
    // eje: un huso de metal que gira despacio, con varas alrededor (las que falten se quedan en hueco)
    eje: (r, x, z) => { tambor(remate, 3.0, 3.2, 0.45, x, b, z, 12); tambor(remate, 2.4, 2.6, 0.3, x, b + 0.45, z, 12); const m = liso(0x8a8f96, { metalness: 0.7, roughness: 0.35 }), e = pieza(new THREE.CylinderGeometry(0.75, 0.75, 5.4, 8), m, x, 3.4, z), a1 = pieza(new THREE.TorusGeometry(1.0, 0.1, 5, 12), m, x, 2.2, z), a2 = pieza(new THREE.TorusGeometry(1.0, 0.1, 5, 12), m, x, 4.6, z); a1.rotation.x = a2.rotation.x = PI / 2; vivos.push(t => { e.rotation.y = t * 0.12; a1.rotation.z = -t * 0.12; a2.rotation.z = t * 0.2; });
      const n = r.varas ?? 9, faltan = r.faltan ?? []; for (let i = 0; i < n; i++) { const a = i / n * 6.283, vx = x + Math.cos(a) * 2.0, vz = z + Math.sin(a) * 2.0; tambor(negro, 0.24, 0.24, 0.05, vx, b + 0.75, vz, 6); if (!faltan.includes(i)) pieza(new THREE.CylinderGeometry(0.11, 0.13, 2.7, 6), liso(0xd9d4c8), vx, 2.1, vz); } },
    mesa: (r, x, z) => { const w = r.w ?? 2.6, d = r.d ?? 1.6; bloque(remate, w + 0.4, 0.25, d + 0.4, x, b, z); bloque(muro, w, 0.85, d, x, b + 0.25, z); pieza(new THREE.BoxGeometry(w - 0.4, 0.07, d - 0.4), r.brillo ? brillo(r.brillo, r.fuerza ?? 1.4) : liso(0x15171a, { roughness: 0.3 }), x, 1.13, z); if (r.brillo) luz(x, 2.2, z, r.brillo, 16, 9);
      if (r.escarcha) for (let i = 0; i < 6; i++) pieza(new THREE.ConeGeometry(0.09, 0.4 + rnd() * 0.5, 4), liso(0xdfeaf2, { emissive: 0x3a7aa8, emissiveIntensity: 0.4 }), x - w * 0.35 + rnd() * w * 0.7, 1.36, z - d * 0.3 + rnd() * d * 0.6); },
    altar: (r, x, z) => { bloque(remate, 4, 0.3, 2.8, x, b, z); bloque(remate, 3.2, 0.3, 2.0, x, b + 0.3, z); bloque(muro, 2.4, 0.9, 1.2, x, b + 0.6, z); bloque(remate, 2.7, 0.2, 1.5, x, b + 1.5, z); for (const sx of [-1, 1]) { pieza(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6), liso(0xe8dfc8), x + sx * 1.0, 1.95, z); llama(x + sx * 1.0, 2.38, z, 0.7); } },
    rueda: (r, x, z) => { const g = grupo(x, z, r.mira ?? 0); bloque(remate, 2.2, 0.3, 1.6, x, b, z, r.mira ?? 0); bloque(muro, 1.6, 0.6, 1.1, x, b + 0.3, z, r.mira ?? 0); pieza(new THREE.CylinderGeometry(1.35, 1.35, 0.42, 18), liso(0xcfc9bb), 0, 2.25, 0, g).rotation.x = PI / 2; pieza(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8), liso(0x8a8478), 0, 2.25, 0, g).rotation.x = PI / 2;
      const n = r.muescas ?? 5; for (let i = 0; i < n; i++) { const a = -0.9 + i * 1.8 / (n - 1); pieza(new THREE.BoxGeometry(0.18, 0.3, 0.48), liso(i === n - 1 ? 0x23262a : 0x7a7468), Math.sin(a) * 1.3, 2.25 + Math.cos(a) * 1.3, 0, g).rotation.z = -a; } },
    aro: (r, x, z) => { const a = pieza(new THREE.TorusGeometry(r.r ?? 1.5, 0.12, 6, 22), liso(0xb0b6bd, { metalness: 0.8, roughness: 0.3 }), x, 3.1, z); vivos.push(t => { a.rotation.y = Math.sin(t * 31) * 0.012; a.position.y = 3.1 + Math.sin(t * 47) * 0.008; }); for (const sx of [-1, 1]) bloque(remate, 0.5, 5.4, 0.5, x + sx * 2.3, b, z); bloque(remate, 5.1, 0.4, 0.5, x, b + 5.4, z); pieza(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4), hierro, x, 5.0, z); },
    raices: (r, x, z) => { for (let i = 0; i < (r.n ?? 9); i++) { const h = 2.2 + rnd() * 3.2; echar(raiz, new THREE.ConeGeometry(0.07, h, 4), x + (rnd() - 0.5) * (r.w ?? 8), ALTO + 3.2 - h / 2, z + (rnd() - 0.5) * (r.d ?? 6), 0, PI + (rnd() - 0.5) * 0.12); } },
    agua: (r, x, z, s) => { const a = pieza(new THREE.BoxGeometry(r.w ?? s.w, 0.1, r.d ?? s.d), liso(r.color ?? 0x1f5a78, { transparent: true, opacity: 0.74, roughness: 0.12, metalness: 0.3 }), x, r.y ?? 0.9, z); a.castShadow = false; vivos.push(t => { a.position.y = (r.y ?? 0.9) + Math.sin(t * 0.7) * 0.03; }); },
    hielo: (r, x, z) => { for (let i = 0; i < (r.n ?? 5); i++) { const h = 1 + rnd() * (r.alto ?? 2.2); echar(hieloM, new THREE.ConeGeometry(0.25 + rnd() * 0.3, h, 5), x + (rnd() - 0.5) * (r.w ?? 3), b + h / 2, z + (rnd() - 0.5) * (r.d ?? 3), 0, 0, (rnd() - 0.5) * 0.4); } },
    // bloques de hielo cortados y apilados
    bloques: (r, x, z) => { for (let i = 0; i < (r.n ?? 8); i++) { const c = i % 3, f = Math.floor(i / 3) % 2, y = Math.floor(i / 6); echar(hieloM, new THREE.BoxGeometry(1.5, 0.9, 1.0), x + (c - 1) * 1.6, b + 0.45 + y * 0.92, z + (f - 0.5) * 1.1, (rnd() - 0.5) * 0.08); } },
    escombro: (r, x, z) => { for (let i = 0; i < (r.n ?? 6); i++) echar(muro, new THREE.DodecahedronGeometry(0.4 + rnd() * (r.k ?? 0.6), 0), x + (rnd() - 0.5) * (r.w ?? 3), b + 0.25, z + (rnd() - 0.5) * (r.d ?? 3), rnd() * 3, rnd() * 3, 0, 1, 0.7, 1); },
    escalera: (r, x, z) => { const ry = r.mira ?? 0, w = r.w ?? 3; for (let i = 0; i < (r.n ?? 7); i++) bloque(losas, w, 0.45 * (i + 1), 0.9, x + Math.sin(ry) * i * 0.9, b, z + Math.cos(ry) * i * 0.9, ry); },
    losa: (r, x, z) => { const g = grupo(x, z, r.mira ?? 0), w = r.w ?? 3, m = liso(r.color ?? tinte(cMuro, 1.5)); if (r.partida) { pieza(new THREE.BoxGeometry(w * 0.48, ALTO - 0.4, 0.5), m, -w * 0.27, (ALTO - 0.4) / 2, 0, g).rotation.z = 0.06; pieza(new THREE.BoxGeometry(w * 0.48, ALTO - 0.9, 0.5), m, w * 0.27, (ALTO - 0.9) / 2, 0, g).rotation.z = -0.1; if (r.brillo) { pieza(new THREE.BoxGeometry(0.2, ALTO - 1, 0.2), brillo(r.brillo, 1.5), 0, (ALTO - 1) / 2, -0.1, g); luz(x, 2, z, r.brillo, 50, 16); } }
      else { pieza(new THREE.BoxGeometry(w, ALTO - 0.4, 0.5), m, 0, (ALTO - 0.4) / 2, 0, g); if (r.cera) pieza(new THREE.BoxGeometry(w * 0.7, 0.3, 0.58), liso(0x9a9c9e), 0, 1.55, 0, g); } },
    cofre: (r, x, z) => { pieza(gCofre(r.k ?? 1.3), matUtil, x, 0, z).rotation.y = r.mira ?? 0; },
    banco: (r, x, z) => { pieza(gBanco(r.w ?? 2.4), matUtil, x, 0, z).rotation.y = r.mira ?? 0; },
    barril: (r, x, z) => { for (let i = 0; i < (r.n ?? 1); i++) pieza(gBarril(0.5, 1.0), matUtil, x + (i % 2) * 1.1, 0, z + Math.floor(i / 2) * 1.1).rotation.y = i; },
    brasero: (r, x, z) => { pieza(r.alto ? gPebetero(2.0, 0.7) : gBrasero(0.8, 1.0), matUtil, x, 0, z); const c = r.color ?? fuegoColor ?? 0xffa040, m = brillo(c, 2.4); pieza(new THREE.CylinderGeometry(r.alto ? 0.58 : 0.66, 0.5, 0.12, 10), m, x, r.alto ? 2.34 : 0.92, z); const l = luz(x, 2.8, z, c, r.fuerza ?? 40, 16); vivos.push(t => { l.intensity = (r.fuerza ?? 40) * (0.85 + 0.15 * Math.sin(t * 9 + x) * Math.sin(t * 5.3)); }); },
    urna: (r, x, z) => { for (let i = 0; i < (r.n ?? 1); i++) { const ux = x + (i % 2) * 0.9, uz = z + Math.floor(i / 2) * 0.9, k = 0.8 + rnd() * 0.4; echar(barro, new THREE.SphereGeometry(0.36 * k, 8, 6), ux, b + 0.42 * k, uz, 0, 0, 0, 1, 1.25, 1); echar(barro, new THREE.CylinderGeometry(0.2 * k, 0.14 * k, 0.3 * k, 8), ux, b + 0.95 * k, uz); } },
    huesos: (r, x, z) => { for (let i = 0; i < (r.n ?? 7); i++) echar(hueso, new THREE.CylinderGeometry(0.04, 0.04, 0.4 + rnd() * 0.4, 5), x + (rnd() - 0.5) * (r.w ?? 2), b + 0.1, z + (rnd() - 0.5) * (r.d ?? 2), 0, PI / 2, rnd() * 6); echar(hueso, new THREE.SphereGeometry(0.16, 6, 5), x, b + 0.14, z, 0, 0, 0, 1, 0.9, 1.15); },
    // estante de varas o de armas contra un muro: «n» en pie y «faltan» en hueco
    astillero: (r, x, z) => { const ry = r.mira ?? 0, n = r.n ?? 6, c = Math.cos(ry), s = Math.sin(ry); bloque(remate, n * 0.55 + 0.4, 0.3, 0.6, x, b, z, ry); bloque(remate, n * 0.55 + 0.4, 0.14, 0.3, x, b + 2.0, z, ry); for (let i = 0; i < n; i++) if (!(r.faltan ?? []).includes(i)) { const o = (i - (n - 1) / 2) * 0.55; echar(hueso, new THREE.CylinderGeometry(0.07, 0.09, 2.6, 6), x + c * o, b + 1.6, z - s * o); } },
    // placa de trampa: una losa hundida. El cerco rojizo es para quien dirige; los jugadores no ven esta pantalla
    trampa: (r, x, z) => { bloque(negro, r.w ?? 1.8, 0.04, r.d ?? 1.8, x, b + 0.03, z); pieza(new THREE.RingGeometry(0.9, 1.05, 4, 1), new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), x, 0.09, z).rotation.set(-PI / 2, 0, PI / 4); },
    // marca: un círculo en el suelo con dos líneas cruzadas y, si se pide, un sector encendido
    marca: (r, x, z) => { const R = r.r ?? 1.6; pieza(new THREE.RingGeometry(R - 0.14, R, 28), liso(0x23262a), x, 0.07, z).rotation.x = -PI / 2; for (const a of [0, PI / 2]) pieza(new THREE.BoxGeometry(R * 2, 0.03, 0.12), liso(0x23262a), x, 0.07, z).rotation.y = a; if (r.cuarto !== undefined) { const q = pieza(new THREE.CircleGeometry(R - 0.2, 10, r.cuarto * PI / 2, PI / 2), brillo(r.brillo ?? 0x9fd0ff, 0.9), x, 0.06, z); q.rotation.x = -PI / 2; vivos.push(t => { q.material.emissiveIntensity = 0.7 + 0.3 * Math.sin(t * 1.3); }); } },
    canal: (r, x, z) => { const w = r.w ?? 1, d = r.d ?? 6; bloque(negro, w, 0.04, d, x, b + 0.02, z); const a = pieza(new THREE.BoxGeometry(w - 0.2, 0.05, d - 0.1), liso(r.color ?? 0x1f5a78, { transparent: true, opacity: 0.8, roughness: 0.1 }), x, 0.07, z); a.castShadow = false; },
    puente: (r, x, z) => { const ry = r.mira ?? 0, L = r.largo ?? 8; bloque(losas, r.w ?? 1.8, 0.3, L, x, b - 0.05, z, ry); },
    reja: (r, x, z) => { const ry = r.mira ?? 0, w = r.w ?? 3, c = Math.cos(ry), s = Math.sin(ry); for (let i = 0; i < 7; i++) { const o = (i - 3) * w / 7; echar(hierro, new THREE.CylinderGeometry(0.05, 0.05, 2.8, 5), x + c * o, b + 1.4, z - s * o); } for (const y of [0.5, 2.4]) echar(hierro, new THREE.BoxGeometry(w, 0.1, 0.1), x, b + y, z, ry); },
    // boca de calor o de frío en el suelo: aro de piedra, reja y lo que brilla debajo; «tapada» la deja con su losa
    tobera: (r, x, z) => { const R = r.r ?? 0.9, c = r.brillo ?? 0xff8a3a; tambor(remate, R + 0.35, R + 0.45, 0.3, x, b, z, 10); if (r.tapada) { tambor(muro, R, R, 0.2, x, b + 0.3, z, 10); return; } pieza(new THREE.CylinderGeometry(R, R, 0.1, 10), brillo(c, r.fuerza ?? 1.6), x, 0.26, z).castShadow = false; for (const a of [0, PI / 2]) echar(hierro, new THREE.BoxGeometry(R * 2, 0.07, 0.09), x, b + 0.34, z, a); luz(x, 1.4, z, c, r.luz ?? 9, 7); },
    // estante de piedra contra un muro, con tablillas
    estante: (r, x, z) => { const ry = r.mira ?? 0, w = r.w ?? 3.4, c = Math.cos(ry), s = Math.sin(ry); for (const k of [-1, 1]) bloque(remate, 0.3, 2.9, 0.7, x + c * k * w / 2, b, z - s * k * w / 2, ry); for (let i = 0; i < 4; i++) { bloque(remate, w, 0.14, 0.7, x, b + 0.3 + i * 0.82, z, ry); if (!(r.vacios ?? []).includes(i)) for (let j = 0; j < 6; j++) { const o = (j - 2.5) * w / 6.6; echar(barro, new THREE.BoxGeometry(0.36, 0.5 + rnd() * 0.12, 0.09), x + c * o, b + 0.72 + i * 0.82, z - s * o, ry + (rnd() - 0.5) * 0.5); } } },
    puesto: (r, x, z) => { const o = pieza(gPuesto(r.color ?? 0x7a8a8c, false), matUtil, x, 0, z); o.rotation.y = r.mira ?? 0; o.scale.setScalar(r.k ?? 1.25); },
    monedas: (r, x, z) => { for (let i = 0; i < (r.n ?? 14); i++) { const a = rnd() * 6.283, d = rnd() * (r.r ?? 0.8); echar(oro, new THREE.CylinderGeometry(0.13, 0.13, 0.04, 8), x + Math.cos(a) * d, b + 0.04 + Math.max(0, 0.5 - d) * rnd() * 0.9, z + Math.sin(a) * d, 0, (rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.5); } },
    // alguien helado de pie: una figura quieta dentro de un prisma de hielo
    helado: (r, x, z) => { figura({ ...r, quieto: true, ropa: { tipo: 'aldeano', piel: 0xb8c8d4, color: 0x7f93a6, pelo: 0xd8e4ec, ...r.ropa } }, x, z); const h = pieza(new THREE.CylinderGeometry(0.62, 0.8, 2.5, 6), liso(0xcfe6f4, { transparent: true, opacity: 0.38, roughness: 0.1 }), x, 1.25, z); h.castShadow = false; },
    // llave de paso: un volante de hierro sobre su vástago; «rota» la deja vencida, con una raja que gotea luz
    valvula: (r, x, z) => { tambor(remate, 1.6, 1.8, 0.5, x, b, z, 10); tambor(muro, 0.5, 0.6, 1.4, x, b + 0.5, z, 8); const v = pieza(new THREE.TorusGeometry(1.3, 0.13, 6, 16), liso(0x4a4f58, { metalness: 0.6, roughness: 0.5 }), x, 2.05, z); v.rotation.set(PI / 2 + (r.rota ? 0.28 : 0), 0, 0); for (const a of [0, PI / 2]) { const c = pieza(new THREE.BoxGeometry(2.6, 0.1, 0.12), v.material, x, 2.05, z); c.rotation.set(r.rota ? 0.28 : 0, a, 0); } if (r.rota) { pieza(new THREE.BoxGeometry(0.1, 1.2, 0.5), brillo(r.brillo ?? 0x58b8ff, 1.4), x + 0.45, 1.2, z + 0.2).rotation.z = 0.3; luz(x, 1.6, z + 1, r.brillo ?? 0x58b8ff, 14, 9); } },
    // algo grande medio enterrado: el lomo de placas que asoma entre losas levantadas, respirando
    arador: (r, x, z) => { const g = grupo(x, z, r.mira ?? 0), m = liso(r.color ?? 0xd9cdbf), k = r.k ?? 1; g.scale.setScalar(k); const lomo = pieza(new THREE.SphereGeometry(1.7, 10, 6, 0, PI * 2, 0, PI / 2), m, 0, 0, 0, g); lomo.scale.set(1, 0.72, 1.9);
      for (let i = 0; i < 6; i++) pieza(new THREE.ConeGeometry(0.34 - Math.abs(i - 2.5) * 0.04, 0.9 - Math.abs(i - 2.5) * 0.12, 4), liso(0xa89c8c), 0, 1.25 - Math.abs(i - 2.5) * 0.16, -2.2 + i * 0.9, g).rotation.x = -0.3;
      pieza(new THREE.SphereGeometry(0.8, 8, 6, 0, PI * 2, 0, PI / 2), m, 0, 0, 3.3, g).scale.set(1, 0.7, 1.3); for (const s of [-1, 1]) pieza(new THREE.ConeGeometry(0.1, 0.5, 5), liso(0xf2ead8), s * 0.45, 0.2, 4.1, g).rotation.x = PI / 2;
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283; echar(losas, new THREE.BoxGeometry(1.3, 0.22, 0.9), x + Math.cos(a) * 2.6 * k, s0() + 0.2, z + Math.sin(a) * 3.6 * k, a, 0.35, 0); }
      vivos.push(t => { lomo.scale.y = 0.72 + Math.sin(t * 0.8) * 0.03; }); },
    // agua con forma: una columna que gira sobre sí misma
    riada: (r, x, z) => { const g = grupo(x, z), m = liso(0x3f8fb8, { transparent: true, opacity: 0.6, roughness: 0.08, metalness: 0.2, emissive: 0x1a4a6a, emissiveIntensity: 0.5 }); const c = [pieza(new THREE.ConeGeometry(1.5, 2.2, 9, 1, true), m, 0, 1.5, 0, g), pieza(new THREE.SphereGeometry(1.15, 9, 7), m, 0, 3.1, 0, g), pieza(new THREE.TorusGeometry(1.5, 0.22, 5, 14), m, 0, 2.2, 0, g), pieza(new THREE.TorusGeometry(0.9, 0.16, 5, 12), m, 0, 4.0, 0, g)];
      c[0].rotation.x = PI; c[2].rotation.x = c[3].rotation.x = PI / 2; for (const o of c) o.castShadow = false; for (const s of [-1, 1]) pieza(new THREE.SphereGeometry(0.5, 7, 5), m, s * 1.5, 2.7, 0.4, g).scale.set(1, 1.6, 1); luz(x, 3, z, 0x58b8ff, 20, 12);
      vivos.push(t => { g.rotation.y = t * 0.9; c[2].position.y = 2.2 + Math.sin(t * 2) * 0.25; c[3].position.y = 4.0 + Math.sin(t * 2.6 + 1) * 0.2; g.position.y = Math.sin(t * 1.3) * 0.12; }); },
    figura,
    bestia: (r, x, z) => { const o = pieza(gPerro(r.color ?? 0xe6dfd6), matUtil, x, 0, z); o.rotation.y = r.mira ?? rnd() * 6; o.scale.setScalar(r.k ?? 1.5); const f = rnd() * 6; vivos.push(t => { o.rotation.x = Math.sin(t * 1.3 + f) * 0.05; o.rotation.y += Math.sin(t * 0.4 + f) * 0.0015; }); },
    nido: (r, x, z) => { for (let i = 0; i < (r.n ?? 6); i++) echar(hueso, new THREE.SphereGeometry(0.3 + rnd() * 0.15, 7, 5), x + (rnd() - 0.5) * 2.2, b + 0.3, z + (rnd() - 0.5) * 2.2, 0, 0, 0, 1, 1.25, 1); echar(raiz, new THREE.TorusGeometry(1.6, 0.3, 5, 12), x, b + 0.2, z, 0, PI / 2); },
    // escarcha: un puñado de esquirlas que se mecen y una luz azul
    escarcha: (r, x, z) => { const g = grupo(x, z), m = liso(0xdff0fa, { roughness: 0.15, emissive: 0x58b8ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }), k = r.k ?? 1; g.scale.setScalar(k); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, h = 1.2 + rnd() * 1.6; pieza(new THREE.ConeGeometry(0.2 + rnd() * 0.15, h, 4), m, Math.cos(a) * 0.45, 0.4 + h / 2, Math.sin(a) * 0.45, g).rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); } pieza(new THREE.OctahedronGeometry(0.5), m, 0, 1.3, 0, g); const l = luz(x, 2, z, 0x8fd0ff, 30, 14); vivos.push(t => { g.rotation.y = t * 0.3 + x; g.position.y = 0.15 + Math.sin(t * 1.1 + z) * 0.12; l.intensity = 26 + 8 * Math.sin(t * 2 + x); }); },
    nota: (r, x, z) => { etiquetas.push({ nombre: r.nombre, texto: r.texto, secreto: r.secreto, pos: new THREE.Vector3(x, b + (r.y ?? 2.8), z), clase: 'hito' }); },
  };
  const oro = suelto(0xd9b24e, { metalness: 0.7, roughness: 0.35 }), raiz = suelto(0xcdbf8e), hieloM = suelto(0xcfe6f4, { roughness: 0.2, emissive: 0x2a6a9a, emissiveIntensity: 0.3 }), barro = suelto(0x8a5a3c), verde = suelto(0x3f5a36), charco = suelto(0x3f7088, { roughness: 0.15, transparent: true, opacity: 0.55 }), escarchaM = suelto(0x9fb8cc, { roughness: 0.6 }), arena = suelto(tinte(cSuelo, 1.3));

  /* ---------- pasos: suelo, escalones si cambia la altura, muros, marcos y puerta ---------- */
  const salas = new Map((planta.salas || []).map(s => [s.id, { y: 0, ...s, huecos: { n: [], s: [], e: [], o: [] } }]));
  const muroCon = (w, d, x, y, z) => { const h = ALTO - y, alo = w > d; bloque(muro, w, h, d, x, y, z); bloque(remate, w + (alo ? 0 : 0.3), 0.45, d + (alo ? 0.3 : 0), x, y, z); bloque(remate, w + (alo ? 0 : 0.34), 0.24, d + (alo ? 0.34 : 0), x, ALTO, z); };
  function tramo(x0, z0, y0, x1, z1, y1, an) {
    const hor = Math.abs(x1 - x0) > Math.abs(z1 - z0), L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.05) return;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ymin = Math.min(y0, y1), n = Math.abs(y1 - y0) < 0.05 ? 1 : Math.max(2, Math.ceil(Math.abs(y1 - y0) / 0.3));
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, y = n === 1 ? y0 : y0 + (y1 - y0) * (i + (y1 < y0 ? 0 : 1)) / n; bloque(n === 1 ? suelo : losas, hor ? L / n : an, y - ymin + 0.5, hor ? an : L / n, x0 + (x1 - x0) * t, ymin - 0.5, z0 + (z1 - z0) * t); }
    for (const s of [-1, 1]) muroCon(hor ? L : GRUESO, hor ? GRUESO : L, cx + (hor ? 0 : s * (an + GRUESO) / 2), ymin, cz + (hor ? s * (an + GRUESO) / 2 : 0));
    // los pasillos largos llevan fajas de piedra de lado a lado y, a media altura, antorchas alternas
    const nf = Math.floor(L / 4.5); for (let i = 1; i <= nf; i++) { const t = i / (nf + 1), fx = x0 + (x1 - x0) * t, fz = z0 + (z1 - z0) * t, lado = i % 2 ? 1 : -1;
      bloque(remate, hor ? 0.5 : an + GRUESO * 2, 0.36, hor ? an + GRUESO * 2 : 0.5, fx, ALTO - 0.12, fz);
      for (const k of [-1, 1]) bloque(remate, hor ? 0.5 : 0.26, ALTO - Math.max(y0, y1), hor ? 0.26 : 0.5, fx + (hor ? 0 : k * (an / 2 - 0.13)), Math.max(y0, y1), fz + (hor ? k * (an / 2 - 0.13) : 0));
      if (fuego) { const tx = fx + (hor ? 0.5 : lado * (an / 2 - 0.36)), tz = fz + (hor ? lado * (an / 2 - 0.36) : 0.5), yy = y0 + (y1 - y0) * t; echar(hierro, new THREE.CylinderGeometry(0.05, 0.03, 0.7, 5), tx, yy + 2.3, tz); destino = escena; llama(tx, yy + 2.86, tz); } }
  }
  // marco de puerta en el muro de una sala: dos jambas, dintel hasta lo alto del muro y dos ménsulas
  function marco(x, z, y, an, hor) {
    const ry = hor ? PI / 2 : 0, c = Math.cos(ry), s = Math.sin(ry), prof = GRUESO + 0.36;
    for (const k of [-1, 1]) { bloque(remate, 0.42, 3.0, prof, x + c * k * (an / 2 - 0.21), y, z - s * k * (an / 2 - 0.21), ry); bloque(remate, 0.5, 0.45, prof, x + c * k * (an / 2 - 0.62), y + 2.55, z - s * k * (an / 2 - 0.62), ry); }
    bloque(remate, an + 0.7, Math.max(0.3, ALTO - y - 3.0), prof, x, y + 3.0, z, ry);
  }
  function puerta(p, x, z, y, an, hor) {
    const ry = hor ? PI / 2 : 0, w = an - 0.84; destino = escena;   // «escena» aquí es el grupo del nivel
    if (p.puerta === 'losa' || p.puerta === 'cera') { const g = grupo(x, z, ry + (p.abierta ? 0.5 : 0), y); pieza(new THREE.BoxGeometry(w, 2.9, 0.34), liso(tinte(cMuro, 1.55)), 0, 1.45, 0, g); pieza(new THREE.BoxGeometry(w * 0.5, 0.5, 0.4), liso(tinte(cMuro, 1.1)), 0, 1.7, 0, g); if (p.puerta === 'cera') pieza(new THREE.BoxGeometry(w + 0.2, 0.3, 0.42), liso(0x9a9c9e), 0, 1.2, 0, g); }
    else if (p.puerta === 'reja') { b = y; RASGOS.reja({ mira: ry, w }, x, z); }
    else if (p.puerta === 'oculta') { bloque(muro, hor ? GRUESO : an, ALTO - y, hor ? an : GRUESO, x, y, z); pieza(new THREE.BoxGeometry(hor ? 0.3 : an * 0.8, 0.06, hor ? an * 0.8 : 0.3), new THREE.MeshBasicMaterial({ color: 0xc58cff }), x, ALTO + 0.28, z); }
    else if (p.puerta === 'derrumbe') { b = y; RASGOS.escombro({ n: 9, w: hor ? 1.6 : an, d: hor ? an : 1.6, k: 0.9 }, x, z); }
    if (p.nota || p.puerta === 'oculta') etiquetas.push({ nombre: p.puerta === 'oculta' ? 'Paso oculto' : p.nombre ?? 'Paso', secreto: p.nota, pos: new THREE.Vector3(x, ALTO + 1.6, z), clase: 'hito' });
  }
  for (const p of planta.pasos || []) {
    const A = salas.get(p.de), B = salas.get(p.a), an = p.ancho ?? 3, oculta = p.puerta === 'oculta'; if (!A || !B) continue;
    const sx = Math.max(A.x - A.w / 2, B.x - B.w / 2), ex = Math.min(A.x + A.w / 2, B.x + B.w / 2), sz = Math.max(A.z - A.d / 2, B.z - B.d / 2), ez = Math.min(A.z + A.d / 2, B.z + B.d / 2);
    if (ex - sx >= an) {   // una encima de otra: paso de norte a sur
      const x = (sx + ex) / 2, [N, Sr] = A.z < B.z ? [A, B] : [B, A], za = N.z + N.d / 2, zb = Sr.z - Sr.d / 2;
      N.huecos.s.push([x, an]); Sr.huecos.n.push([x, an]); tramo(x, za, N.y, x, zb, Sr.y, an); if (!oculta) { marco(x, za + GRUESO / 2, N.y, an, false); marco(x, zb - GRUESO / 2, Sr.y, an, false); } puerta(p, x, N.y >= Sr.y ? za + GRUESO / 2 : zb - GRUESO / 2, Math.max(N.y, Sr.y), an, false);
    } else if (ez - sz >= an) {   // lado a lado
      const z = (sz + ez) / 2, [O, Es] = A.x < B.x ? [A, B] : [B, A], xa = O.x + O.w / 2, xb = Es.x - Es.w / 2;
      O.huecos.e.push([z, an]); Es.huecos.o.push([z, an]); tramo(xa, z, O.y, xb, z, Es.y, an); if (!oculta) { marco(xa + GRUESO / 2, z, O.y, an, true); marco(xb - GRUESO / 2, z, Es.y, an, true); } puerta(p, O.y >= Es.y ? xa + GRUESO / 2 : xb - GRUESO / 2, z, Math.max(O.y, Es.y), an, true);
    } else {   // en diagonal: sale de A por un lado y entra en B por arriba o por abajo, con un codo a la altura de A
      const der = B.x > A.x, bajo = A.z > B.z, x0 = A.x + (der ? 1 : -1) * A.w / 2, z1 = B.z + (bajo ? 1 : -1) * B.d / 2;
      A.huecos[der ? 'e' : 'o'].push([A.z, an]); B.huecos[bajo ? 's' : 'n'].push([B.x, an]);
      tramo(x0, A.z, A.y, B.x + (der ? -1 : 1) * an / 2, A.z, A.y, an); tramo(B.x, A.z + (bajo ? -1 : 1) * an / 2, A.y, B.x, z1, B.y, an);
      bloque(suelo, an, 0.5, an, B.x, A.y - 0.5, A.z); muroCon(GRUESO, an + GRUESO * 2, B.x + (der ? 1 : -1) * (an + GRUESO) / 2, A.y, A.z); muroCon(an, GRUESO, B.x, A.y, A.z + (bajo ? 1 : -1) * (an + GRUESO) / 2);
      if (!oculta) { marco(x0 + (der ? 1 : -1) * GRUESO / 2, A.z, A.y, an, true); marco(B.x, z1 + (bajo ? 1 : -1) * GRUESO / 2, B.y, an, false); } puerta(p, x0 + (der ? 1 : -1) * GRUESO / 2, A.z, A.y, an, true);
    }
  }

  /* ---------- salas: suelo con su cenefa, muros con zócalo y remate, pilastras, antorchas y aderezo ---------- */
  const lienzo = (a, c, huecos, pon) => { let desde = a; for (const [m, an] of [...huecos].sort((p, q) => p[0] - q[0])) { if (m - an / 2 > desde) pon(desde, m - an / 2); desde = Math.max(desde, m + an / 2); } if (c > desde) pon(desde, c); };
  const libre = (v, huecos, margen = 0.9) => huecos.every(([m, an]) => Math.abs(v - m) > an / 2 + margen);
  for (const s of salas.values()) {
    const y = b = s.y, x0 = s.x - s.w / 2, x1 = s.x + s.w / 2, z0 = s.z - s.d / 2, z1 = s.z + s.d / 2, G = GRUESO, H = s.huecos;
    destino = new THREE.Group(); destino.position.y = y; escena.add(destino);
    // el suelo: una losa entera con su cenefa, salvo donde hay un pozo, que se abre de verdad (tiras alrededor y baldosas hasta el borde)
    const boca = (s.rasgos || []).find(r => r.tipo === 'pozo');
    if (!boca) { bloque(suelo, s.w, 0.5, s.d, s.x, y - 0.5, s.z); if (s.w > 5 && s.d > 5) bloque(losas, s.w - 2.2, 0.06, s.d - 2.2, s.x, y, s.z); }
    else { const px = s.x + (boca.x ?? 0), pz = s.z + (boca.z ?? 0), R = boca.r ?? 2, t = Math.max(0.6, R / 4.5), n = Math.ceil((R + 1) / t), Q = n * t, xa = Math.max(x0, px - Q), xb = Math.min(x1, px + Q), za = Math.max(z0, pz - Q), zb = Math.min(z1, pz + Q);
      bloque(suelo, s.w, 0.5, za - z0, s.x, y - 0.5, (z0 + za) / 2); bloque(suelo, s.w, 0.5, z1 - zb, s.x, y - 0.5, (zb + z1) / 2); bloque(suelo, xa - x0, 0.5, zb - za, (x0 + xa) / 2, y - 0.5, (za + zb) / 2); bloque(suelo, x1 - xb, 0.5, zb - za, (xb + x1) / 2, y - 0.5, (za + zb) / 2);
      for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) { const tx = px + (i + 0.5) * t, tz = pz + (j + 0.5) * t; if (Math.hypot(tx - px, tz - pz) > R + 0.1 && tx > x0 && tx < x1 && tz > z0 && tz < z1) bloque(losas, t, 0.5, t, tx, y - 0.5, tz); } }
    lienzo(x0 - G, x1 + G, H.n, (a, c) => muroCon(c - a, G, (a + c) / 2, y, z0 - G / 2)); lienzo(x0 - G, x1 + G, H.s, (a, c) => muroCon(c - a, G, (a + c) / 2, y, z1 + G / 2));
    lienzo(z0, z1, H.o, (a, c) => muroCon(G, c - a, x0 - G / 2, y, (a + c) / 2)); lienzo(z0, z1, H.e, (a, c) => muroCon(G, c - a, x1 + G / 2, y, (a + c) / 2));
    // rincones en chaflán: un machón girado en cada esquina
    const ch = s.forma === 'ochava' ? s.chaflan ?? Math.min(s.w, s.d) * 0.22 : 0;
    if (ch) for (const [ex, ez] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { bloque(muro, ch * 1.414, ALTO - y, ch * 1.414, ex, y, ez, PI / 4); bloque(remate, ch * 1.414 + 0.3, 0.24, ch * 1.414 + 0.3, ex, ALTO, ez, PI / 4); }
    // pilastras por la cara de dentro, cada cinco pasos o así, y una antorcha en una de cada dos
    const lados = [['n', x0, x1, v => [v, z0 + 0.16], 0], ['s', x0, x1, v => [v, z1 - 0.16], PI], ['o', z0, z1, v => [x0 + 0.16, v], PI / 2], ['e', z0, z1, v => [x1 - 0.16, v], -PI / 2]];
    let nPil = 0;
    for (const [lado, a, c, donde, ry] of lados) { const L = c - a - ch * 2, n = Math.round(L / 5.5); for (let i = 0; i <= n; i++) { const v = a + ch + (n ? L * i / n : L / 2); if (!n && L < 4) continue; if (!libre(v, H[lado])) continue; if ((i === 0 || i === n) && n && !ch) continue;
        const [px, pz] = donde(v); bloque(remate, 0.7, ALTO - y, 0.32, px, y, pz, ry); bloque(remate, 0.95, 0.3, 0.5, px, ALTO - 0.3, pz, ry);
        if (fuego && s.antorchas !== false && nPil++ % 2 === 0 && lado !== 's') { const tx = px + Math.sin(ry) * 0.36, tz = pz + Math.cos(ry) * 0.36; echar(hierro, new THREE.CylinderGeometry(0.05, 0.03, 0.7, 5), tx, y + 2.3, tz, 0, Math.cos(ry) * 0.35, -Math.sin(ry) * 0.35); llama(tx + Math.sin(ry) * 0.12, 2.86, tz + Math.cos(ry) * 0.12); } } }
    // arcos fajones: vigas de piedra de muro a muro, a lo corto de la sala
    for (let i = 0; i < (s.arcos ?? 0); i++) { const t = (i + 1) / (s.arcos + 1); if (s.w <= s.d) bloque(remate, s.w, 0.4, 0.55, s.x, ALTO - 0.16, z0 + s.d * t); else bloque(remate, 0.55, 0.4, s.d, x0 + s.w * t, ALTO - 0.16, s.z); }
    const fl = s.luz === false ? null : luz(s.x, ALTO - y + 2.2, s.z, s.luz ?? tono.luz ?? 0xffd9a0, 22 + Math.max(s.w, s.d) * 3.4, Math.max(s.w, s.d) * 2.2);
    if (fl && fuego && s.antorchas !== false) { const f0 = fl.intensity, fase = rnd() * 9; vivos.push(t => { fl.intensity = f0 * (0.9 + 0.1 * Math.sin(t * 7 + fase) * Math.sin(t * 3.1 + fase)); }); }
    etiquetas.push({ nombre: (s.n ? s.n + '. ' : '') + s.nombre, texto: s.texto, voz: s.voz, secreto: s.secreto, peligro: s.peligro, encuentro: s.encuentro, pos: new THREE.Vector3(s.x, ALTO + 3, s.z), clase: 'hito' });
    aderezo(s, x0, x1, z0, z1, y);
    for (const r of s.rasgos || []) { b = bSala = y; RASGOS[r.tipo]?.(r, s.x + (r.x ?? 0), s.z + (r.z ?? 0), s); }
  }
  // Lo que el tiempo ha dejado en cada sala, según la ruina: cascotes en todas; verdín, huesos, carámbanos, raíces o charcos según el estilo.
  function aderezo(s, x0, x1, z0, z1, y) {
    const boca = (s.rasgos || []).find(r => r.tipo === 'pozo'), enBoca = (x, z) => boca && Math.hypot(x - s.x - (boca.x ?? 0), z - s.z - (boca.z ?? 0)) < (boca.r ?? 2) + 1.4;
    const area = s.w * s.d, en = () => { for (let i = 0; i < 6; i++) { const x = x0 + 0.8 + rnd() * (s.w - 1.6), z = z0 + 0.8 + rnd() * (s.d - 1.6); if (!enBoca(x, z)) return [x, z]; } return [x0 + 0.8, z0 + 0.8]; }, pared = () => { const k = Math.floor(rnd() * 3), t = rnd(); return k === 0 ? [x0 + 0.5 + t * (s.w - 1), z0 + 0.25, 0] : k === 1 ? [x0 + 0.25, z0 + 0.5 + t * (s.d - 1), PI / 2] : [x1 - 0.25, z0 + 0.5 + t * (s.d - 1), -PI / 2]; };
    const disco = (m, r, x, z, sx = 1) => echar(m, new THREE.CircleGeometry(r, 9), x, y + 0.075 + rnd() * 0.01, z, 0, -PI / 2, rnd() * 3, sx, 1, 1);   // tumbado; el giro, sobre sí mismo
    for (let i = 0; i < area / 55; i++) { const [x, z] = pared(); echar(muro, new THREE.DodecahedronGeometry(0.2 + rnd() * 0.3, 0), x, y + 0.14, z, rnd() * 3, rnd() * 3, 0, 1, 0.7, 1); }
    for (let i = 0; i < area / 70; i++) { const [x, z] = en(); echar(negro, new THREE.BoxGeometry(0.04, 0.02, 0.5 + rnd() * 0.8), x, y + 0.075, z, rnd() * 3); }   // grietas
    if (estilo === 'hielo') { for (let i = 0; i < area / 9; i++) { const [x, z] = pared(), h = 0.5 + rnd() * 1.5; echar(hieloM, new THREE.ConeGeometry(0.09 + rnd() * 0.08, h, 4), x, ALTO - h / 2, z, 0, PI); } for (let i = 0; i < area / 45; i++) { const [x, z] = pared(); disco(escarchaM, 0.4 + rnd() * 0.6, x, z, 1 + rnd() * 0.6); } for (const [ex, ez] of [[x0, z0], [x1, z0]]) echar(escarchaM, new THREE.SphereGeometry(1.1, 8, 5), ex + (ex < s.x ? 0.7 : -0.7), y, ez + 0.7, 0, 0, 0, 1, 0.3, 1); }
    else if (estilo === 'arenisca') { for (let i = 0; i < area / 14; i++) { const [x, z] = pared(), h = 1.2 + rnd() * 2.2; echar(raiz, new THREE.ConeGeometry(0.05, h, 4), x, ALTO - h / 2 + 0.2, z, 0, PI + (rnd() - 0.5) * 0.2); } for (let i = 0; i < area / 60; i++) { const [x, z] = pared(); echar(arena, new THREE.SphereGeometry(0.9 + rnd() * 0.8, 8, 5), x, y, z, 0, 0, 0, 1, 0.22, 1); } }
    else if (estilo === 'ahogada') { for (let i = 0; i < area / 40; i++) { const [x, z] = rnd() < 0.7 ? pared() : en(); disco(charco, 0.35 + rnd() * 0.55, x, z, 1 + rnd() * 0.6); } lienzo(x0, x1, s.huecos.n, (a, c) => echar(verde, new THREE.BoxGeometry(c - a, 0.8, 0.06), (a + c) / 2, y + 0.4, z0 + 0.04)); lienzo(z0, z1, s.huecos.o, (a, c) => echar(verde, new THREE.BoxGeometry(0.06, 0.8, c - a), x0 + 0.04, y + 0.4, (a + c) / 2)); lienzo(z0, z1, s.huecos.e, (a, c) => echar(verde, new THREE.BoxGeometry(0.06, 0.8, c - a), x1 - 0.04, y + 0.4, (a + c) / 2)); }
    else { for (let i = 0; i < area / 28; i++) { const [x, z] = rnd() < 0.6 ? pared() : en(); disco(verde, 0.4 + rnd() * 0.8, x, z, 1 + rnd()); } }
  }

  /* ---------- se junta la piedra, y luego luz, niebla, motas y encuadre ---------- */
  for (const m of lotes) if (m.userData.lote.length) { const o = new THREE.Mesh(mergeGeometries(m.userData.lote), m); o.castShadow = o.receiveShadow = true; escena.add(o); m.userData.lote = null; }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const s of salas.values()) { x0 = Math.min(x0, s.x - s.w / 2); x1 = Math.max(x1, s.x + s.w / 2); z0 = Math.min(z0, s.z - s.d / 2); z1 = Math.max(z1, s.z + s.d / 2); }
  if (!salas.size) x0 = x1 = z0 = z1 = 0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = Math.max(18, Math.hypot(x1 - x0, z1 - z0) / 2), fondo = tono.fondo ?? 0x07080a;
  escena.add(new THREE.HemisphereLight(tono.cielo ?? 0x8a94a8, 0x14100c, 0.55)); const alta = new THREE.DirectionalLight(0xbcd0ff, 0.55); alta.position.set(cx - 12, 30, cz + 16); escena.add(alta);
  // motas en el aire: nieve fina en el hielo, polvo en lo demás
  const N = 220, pos = new Float32Array(N * 3), cae = estilo === 'hielo'; const dentro = [...salas.values()]; for (let i = 0; i < N; i++) { const q = dentro[Math.floor(rnd() * dentro.length)] ?? { x: 0, z: 0, w: 1, d: 1 }; pos[i * 3] = q.x + (rnd() - 0.5) * q.w; pos[i * 3 + 1] = -1 + rnd() * 6; pos[i * 3 + 2] = q.z + (rnd() - 0.5) * q.d; }   // solo dentro de las salas
  const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motas = new THREE.Points(gm, new THREE.PointsMaterial({ color: cae ? 0xe8f4ff : estilo === 'arenisca' ? 0xffd9a0 : 0xc8d0d0, size: cae ? 0.12 : 0.06, transparent: true, opacity: cae ? 0.7 : 0.3, depthWrite: false })); motas.frustumCulled = false; escena.add(motas);
  let antes = 0;
  const actualizar = t => { const dt = Math.min(0.1, Math.max(0, t - antes)); antes = t; for (const f of vivos) f(t);
    for (let i = 0; i < N; i++) { let y = pos[i * 3 + 1] + (cae ? -0.5 : 0.07) * dt; if (y < -1) y = 5; else if (y > 5) y = -1; pos[i * 3 + 1] = y; pos[i * 3] += Math.sin(t * 0.3 + i) * 0.004; } gm.attributes.position.needsUpdate = true;
    if (fuego) fuego.emissiveIntensity = 2.3 + 0.5 * Math.sin(t * 11) * Math.sin(t * 4.7); };
  return { etiquetas, actualizar, R, fondo, centro: [cx, cz], sonido: planta.sonido };
}

export function crearMazmorra(planta, id = 'x') {
  const escena = new THREE.Scene(), defs = planta.niveles?.length ? planta.niveles : [planta];
  const niveles = defs.map((d, i) => { const raiz = new THREE.Group(); escena.add(raiz); const n = levantar({ ...d, tono: { ...planta.tono, ...d.tono } }, `${id}-${i}`, raiz);
    raiz.position.set(-n.centro[0], 0, -n.centro[1]); for (const e of n.etiquetas) { e.pos.x -= n.centro[0]; e.pos.z -= n.centro[1]; e.planta = i; }   // cada nivel, centrado: el mismo encuadre vale para todos
    return { ...n, raiz, nombre: d.nombre ?? `Nivel ${i + 1}` }; });
  const etiquetas = niveles.flatMap(n => n.etiquetas), R = Math.max(...niveles.map(n => n.R));
  let actual = 0;
  // cada nivel tiene su encuadre: el visor vuela a «vista» al cambiar de planta
  const encuadre = r => ({ pos: new THREE.Vector3(r * 0.1, r * 1.66, r * 1.56), objetivo: new THREE.Vector3(0, 0, r * 0.14) });
  function verPlanta(i) { actual = i; niveles.forEach((n, k) => { n.raiz.visible = k === i; }); for (const e of etiquetas) e.oculta = e.planta !== i; escena.background = new THREE.Color(niveles[i].fondo); escena.fog = new THREE.Fog(niveles[i].fondo, R * 2.2, R * 6.5); api.vista = encuadre(niveles[i].R); }
  const api = { escena, etiquetas, R, minDist: 6, actualizar: t => niveles[actual].actualizar(t), sonido: planta.sonido ?? niveles[0].sonido ?? { viento: 0.25 }, limite: R * 1.1,
    vista: null, vuelaAlCambiar: true, get planta() { return actual; } };
  verPlanta(0);
  if (niveles.length > 1) { api.plantas = niveles.map(n => ({ nombre: n.nombre })); api.verPlanta = verPlanta; }
  return api;
}
