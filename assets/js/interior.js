// interior.js — interior de un edificio suelto. De momento, la sala común de una taberna:
// una maqueta abierta por delante, con barra, chimenea, mesas, parroquianos y una escalera a las habitaciones.
import * as THREE from 'three';
import { azarDe } from './ruido.js';

function lienzo(w, h, pintar, repetir) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; pintar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repetir) t.repeat.set(...repetir);
  return t;
}

export function crearInterior(l) {
  const rnd = azarDe('interior-' + l.id), escena = new THREE.Scene(), etiquetas = [];
  const AN = 46, FO = 30, AL = 12;   // ancho (x), fondo (z), alto de la sala
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
  const madera = mat(0x6b4f35), oscura = mat(0x3d2c1e), clara = mat(0x9a7a55), piedra = mat(0x7d766c, { roughness: 1 }), hierro = mat(0x2b2b2e, { roughness: 0.6, metalness: 0.4 });
  const pieza = (geo, m, x, y, z, padre = escena) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); padre.add(o); return o; };
  const caja = (m, w, h, d, x, y, z, padre) => pieza(new THREE.BoxGeometry(w, h, d), m, x, y + h / 2, z, padre);
  const cil = (m, r, h, x, y, z, padre, seg = 14) => pieza(new THREE.CylinderGeometry(r, r, h, seg), m, x, y + h / 2, z, padre);

  /* ---------- caja de la sala ---------- */
  const tablas = lienzo(256, 256, (x, w, h) => {
    x.fillStyle = '#6a4d33'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { x.fillStyle = `rgba(${rnd() > 0.5 ? '255,220,170' : '0,0,0'},${0.05 + rnd() * 0.12})`; x.fillRect(0, i * 32, w, 31); x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, i * 32 + 31, w, 1.5); x.fillRect(rnd() * w, i * 32, 1.5, 32); }
    for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(0,0,0,${rnd() * 0.12})`; x.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 14, 1); }
  }, [5, 4]);
  const suelo = pieza(new THREE.BoxGeometry(AN, 1, FO), new THREE.MeshStandardMaterial({ map: tablas, roughness: 0.9 }), 0, -0.5, 0);
  const enlucido = lienzo(128, 128, (x, w, h) => { x.fillStyle = '#c9b48c'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${rnd() * 0.08})` : `rgba(60,40,10,${rnd() * 0.12})`; x.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 5, 2 + rnd() * 5); } const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(40,25,10,0.35)'); g.addColorStop(0.4, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, [4, 1]);
  const pared = new THREE.MeshStandardMaterial({ map: enlucido, roughness: 1 });
  caja(pared, AN, AL, 1, 0, 0, -FO / 2 - 0.5); caja(pared, 1, AL, FO, -AN / 2 - 0.5, 0, 0); caja(pared, 1, AL, FO, AN / 2 + 0.5, 0, 0);
  // entramado visto: pies derechos, zócalo y vigas del techo
  for (let x = -AN / 2 + 0.3; x <= AN / 2; x += AN / 6 - 0.1) caja(oscura, 0.9, AL, 0.5, x, 0, -FO / 2 + 0.2);
  for (const lado of [-1, 1]) for (let z = -FO / 2 + 1; z <= FO / 2; z += FO / 4 - 0.3) caja(oscura, 0.5, AL, 0.9, lado * (AN / 2 - 0.2), 0, z);
  caja(oscura, AN, 0.9, 0.5, 0, AL * 0.55, -FO / 2 + 0.2); caja(oscura, AN, 0.7, 0.5, 0, 0, -FO / 2 + 0.2);
  for (let z = -FO / 2 + 3; z < -2; z += 6) caja(oscura, AN + 1, 0.9, 1.0, 0, AL - 0.6, z);   // vigas solo al fondo: delante taparían la vista
  // ventanas al fondo: dejan pasar la luz de fuera
  const cristal = new THREE.MeshStandardMaterial({ color: 0x1a2028, emissive: 0xbcd6ff, emissiveIntensity: 0.8 });
  for (const x of [-15, -6]) { caja(oscura, 4.6, 5.0, 0.3, x, 4.2, -FO / 2 + 0.25); caja(cristal, 3.8, 4.2, 0.2, x, 4.6, -FO / 2 + 0.42); caja(oscura, 0.25, 4.2, 0.25, x, 4.6, -FO / 2 + 0.5); caja(oscura, 3.8, 0.25, 0.25, x, 6.6, -FO / 2 + 0.5); }

  /* ---------- chimenea, con la cabeza del jabalí encima ---------- */
  const hx = -AN / 2 + 1.6, hz = 2;
  caja(piedra, 3.2, AL, 9, hx, 0, hz); caja(piedra, 4.2, 1.0, 10.4, hx + 0.4, 4.6, hz); caja(mat(0x141210), 1.2, 3.6, 5.4, hx + 1.3, 0.3, hz);
  caja(piedra, 4.6, 0.5, 11, hx + 0.6, 0, hz);
  for (const dz of [-1.2, 0.2, 1.4]) { const leño = cil(oscura, 0.42, 3.2, hx + 2.0, 0.6, hz + dz, escena, 8); leño.rotation.x = Math.PI / 2; leño.rotation.z = (rnd() - 0.5) * 0.5; }
  const llamas = [], texLlama = lienzo(64, 64, (x) => { const g = x.createRadialGradient(32, 40, 0, 32, 36, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,210,110,0.9)'); g.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  for (let i = 0; i < 5; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLlama, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffa040 })); s.position.set(hx + 2.3, 1.8, hz - 1.6 + i * 0.8); s.userData.f = rnd() * 6; llamas.push(s); escena.add(s); }
  const lumbre = new THREE.PointLight(0xff9a45, 260, 70, 1.8); lumbre.position.set(hx + 4, 3, hz); escena.add(lumbre);
  const jabali = new THREE.Group(); jabali.position.set(hx + 2.0, 8.0, hz); jabali.rotation.y = Math.PI / 2; escena.add(jabali);
  caja(oscura, 3.4, 3.8, 0.3, 0, -1.9, -0.3, jabali);   // tabla del trofeo
  const cabeza = pieza(new THREE.SphereGeometry(1.25, 12, 10), mat(0x4a3526), 0, 0, 0.5, jabali); cabeza.scale.set(1, 0.95, 1.2);
  const morro = pieza(new THREE.CylinderGeometry(0.5, 0.7, 1.4, 10), mat(0x5a4230), 0, -0.25, 1.9, jabali); morro.rotation.x = Math.PI / 2;
  pieza(new THREE.CylinderGeometry(0.52, 0.52, 0.12, 10), mat(0x8a6a5a), 0, -0.25, 2.62, jabali).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    const colmillo = pieza(new THREE.ConeGeometry(0.14, 0.9, 6), mat(0xeee6d2), s * 0.5, 0.0, 2.2, jabali); colmillo.rotation.z = -s * 0.5;
    const oreja = pieza(new THREE.ConeGeometry(0.4, 0.8, 5), mat(0x4a3526), s * 0.85, 1.05, 0.2, jabali); oreja.rotation.z = -s * 0.5;
    pieza(new THREE.SphereGeometry(0.13, 6, 6), mat(0x0c0a08, { roughness: 0.2 }), s * 0.55, 0.35, 1.45, jabali);
  }
  etiquetas.push({ nombre: 'Chimenea', pos: new THREE.Vector3(hx + 3, 12.5, hz), clase: 'hito' });

  /* ---------- barra, estantes y toneles ---------- */
  const bx = 11, bz = -FO / 2 + 6;
  caja(madera, 18, 3.3, 2.0, bx, 0, bz); caja(clara, 19, 0.35, 2.8, bx, 3.3, bz); caja(oscura, 18, 0.5, 2.1, bx, 0, bz);
  for (let i = 0; i < 2; i++) caja(oscura, 17, 0.3, 1.3, bx, 5.6 + i * 2.2, -FO / 2 + 0.9);
  const VIDRIO = [0x3f6a4a, 0x7a4a2a, 0x8a2f2f, 0x4a5a7a, 0xb09a4a];
  for (let i = 0; i < 26; i++) cil(mat(VIDRIO[i % 5], { roughness: 0.25 }), 0.22, 0.8 + rnd() * 0.5, bx - 8 + (i % 13) * 1.3 + rnd() * 0.2, 5.9 + Math.floor(i / 13) * 2.2, -FO / 2 + 0.9, escena, 8);
  for (let i = 0; i < 4; i++) cil(mat(0xc9b06a, { roughness: 0.5 }), 0.3, 0.75, bx - 6 + i * 3.6 + rnd(), 3.65, bz + 0.3, escena, 10);   // jarras en la barra
  for (let i = 0; i < 3; i++) {   // toneles tumbados en su caballete
    const tx = 19.5, tz = -FO / 2 + 3 + i * 3.4, t = cil(mat(0x7a5a3a), 1.45, 3.0, tx, 1.0, tz, escena, 14); t.rotation.z = Math.PI / 2; t.position.y = 2.45;
    for (const dx of [-1.0, 1.0]) { const aro = cil(hierro, 1.5, 0.18, tx + dx, 0, tz, escena, 14); aro.rotation.z = Math.PI / 2; aro.position.y = 2.45; }
    caja(oscura, 3.2, 1.0, 0.4, tx, 0, tz - 1.0); caja(oscura, 3.2, 1.0, 0.4, tx, 0, tz + 1.0);
  }
  etiquetas.push({ nombre: 'Barra', pos: new THREE.Vector3(bx, 9.5, bz), clase: 'hito' });

  /* ---------- escalera y galería de las habitaciones ---------- */
  for (let i = 0; i < 9; i++) caja(clara, 3.6, 0.35, 1.3, AN / 2 - 2.6, 0.45 + i * 0.78, FO / 2 - 3 - i * 1.25);
  caja(oscura, 0.4, 7.4, 0.4, AN / 2 - 4.6, 0, FO / 2 - 2.4);
  caja(clara, 16, 0.4, 5, AN / 2 - 8.5, 7.2, -FO / 2 + 2.5 + 11.5);   // rellano
  caja(clara, 5, 0.4, 12, AN / 2 - 3, 7.2, -FO / 2 + 6.5);
  for (let i = 0; i < 9; i++) caja(oscura, 0.25, 1.8, 0.25, AN / 2 - 16.2 + i * 1.9, 7.6, -FO / 2 + 16.3);
  caja(oscura, 16, 0.25, 0.3, AN / 2 - 8.5, 9.3, -FO / 2 + 16.3);
  for (let i = 0; i < 3; i++) { caja(mat(0x4a3526), 2.6, 4.2, 0.3, AN / 2 - 0.3 - 0.1, 7.6, -FO / 2 + 3 + i * 4.2).rotation.y = Math.PI / 2; }   // puertas
  etiquetas.push({ nombre: 'Habitaciones', pos: new THREE.Vector3(AN / 2 - 6, 13.5, -FO / 2 + 10), clase: 'hito' });

  /* ---------- mesas y parroquianos ---------- */
  const ROPA = [0x7a3b2e, 0x2f4f6f, 0x5a6b3a, 0x8a7a55, 0x4a3a5a, 0xb09a6a, 0x6a2f3a, 0x3f5a52], PIEL = [0xd9b08c, 0xc49a78, 0xe6c3a2, 0xa87a5a];
  const gente = [];
  function persona(x, z, mira, sentado) {
    const g = new THREE.Group(); g.position.set(x, sentado ? 0.95 : 0, z); g.rotation.y = mira; escena.add(g);
    const ropa = mat(ROPA[Math.floor(rnd() * ROPA.length)], { roughness: 1 }), piel = mat(PIEL[Math.floor(rnd() * PIEL.length)], { roughness: 0.9 });
    pieza(new THREE.CylinderGeometry(0.42, sentado ? 0.6 : 0.52, sentado ? 1.5 : 2.3, 8), ropa, 0, sentado ? 0.85 : 1.15, 0, g);
    pieza(new THREE.SphereGeometry(0.4, 10, 8), piel, 0, sentado ? 1.95 : 2.7, 0, g);
    if (sentado) { const piernas = pieza(new THREE.BoxGeometry(0.9, 0.45, 1.1), ropa, 0, 0.25, 0.55, g); piernas.material = mat(0x3a3028); }
    const brazo = new THREE.Group(); brazo.position.set(0.48, sentado ? 1.35 : 2.0, 0.1); g.add(brazo);
    pieza(new THREE.CylinderGeometry(0.13, 0.13, 0.95, 6), ropa, 0, -0.3, 0.3, brazo).rotation.x = -1.0;
    const jarra = rnd() > 0.35 ? pieza(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 8), mat(0xc9b06a, { roughness: 0.5 }), 0, -0.5, 0.75, brazo) : null;
    const p = { g, brazo, f: rnd() * 6.28, bebe: !!jarra && sentado, y: g.position.y }; gente.push(p); return p;
  }
  const MESAS = [[-11, -6, 1], [-2, -2, 0], [-12, 7, 0], [-1, 8.5, 1], [8, 5, 0], [10, -4.5, 1]];
  for (const [mx, mz, redonda] of MESAS) {
    if (redonda) { cil(clara, 2.5, 0.3, mx, 2.3, mz); cil(oscura, 0.4, 2.3, mx, 0, mz, escena, 8); cil(oscura, 1.2, 0.2, mx, 0, mz, escena, 10); }
    else { caja(clara, 6.2, 0.3, 2.8, mx, 2.3, mz); for (const dx of [-2.6, 2.6]) for (const dz of [-1.0, 1.0]) caja(oscura, 0.3, 2.3, 0.3, mx + dx, 0, mz + dz); }
    const n = redonda ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const a = redonda ? i / n * 6.283 + rnd() : 0, sx = redonda ? mx + Math.cos(a) * 3.5 : mx - 2 + (i % 3) * 2, sz = redonda ? mz + Math.sin(a) * 3.5 : mz + (i < 3 ? -2.3 : 2.3);
      if (redonda) cil(madera, 0.6, 1.1, sx, 0, sz, escena, 8); else if (i % 3 === 0) caja(madera, 6, 0.3, 0.9, mx, 0.9, sz);
      if (rnd() > 0.28) persona(sx, sz, Math.atan2(mx - sx, mz - sz), true);
    }
    for (let i = 0; i < 3; i++) cil(mat(0xc9b06a, { roughness: 0.5 }), 0.2, 0.42, mx + (rnd() - 0.5) * 3, 2.6, mz + (rnd() - 0.5) * 1.4, escena, 8);
    if (rnd() > 0.4) { cil(mat(0xe8dcc0), 0.09, 0.6, mx, 2.6, mz, escena, 6); pieza(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd98a }), mx, 3.3, mz); }   // vela
  }
  persona(bx - 2, bz - 2.4, 0, false);                      // quien atiende la barra
  persona(bx - 6, bz + 2.6, Math.PI, false); persona(bx + 3, bz + 2.6, Math.PI + 0.3, false);   // acodados
  const moza = persona(0, 0, 0, false);                     // va y viene entre la barra y las mesas
  const ronda = [[bx - 4, bz + 3.4], [3, 3], [-8, 2], [-9, -2], [-2, -5.5], [6, -1]].map(p => new THREE.Vector3(p[0], 0, p[1]));

  /* ---------- lámpara de rueda, alfombra y trastos ---------- */
  const lampara = new THREE.Group(); lampara.position.set(-3, AL - 0.6, 2); escena.add(lampara);
  caja(hierro, 0.12, 3.6, 0.12, 0, -3.6, 0, lampara);
  const rueda = pieza(new THREE.TorusGeometry(3.0, 0.2, 6, 20), oscura, 0, -3.8, 0, lampara); rueda.rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) { const r = caja(oscura, 6, 0.18, 0.18, 0, -3.9, 0, lampara); r.rotation.y = i * Math.PI / 4; }
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; cil(mat(0xe8dcc0), 0.1, 0.55, Math.cos(a) * 3, -3.65, Math.sin(a) * 3, lampara, 6); pieza(new THREE.SphereGeometry(0.13, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd98a }), Math.cos(a) * 3, -2.95, Math.sin(a) * 3, lampara); }
  const velas = new THREE.PointLight(0xffc878, 170, 60, 1.7); velas.position.set(0, -3.2, 0); lampara.add(velas);
  const candil = new THREE.PointLight(0xffc878, 110, 45, 1.8); candil.position.set(bx, 8.5, bz + 3); escena.add(candil);
  pieza(new THREE.BoxGeometry(11, 0.08, 6.5), mat(0x6a2f2a, { roughness: 1 }), -2.5, 0.05, 3.2);
  for (let i = 0; i < 5; i++) cil(mat(0x7a5a3a), 0.95, 1.9, -AN / 2 + 3 + (i % 3) * 2.2, i > 2 ? 1.9 : 0, FO / 2 - 3 - (i > 2 ? 0.5 : 0), escena, 12);
  for (let i = 0; i < 3; i++) caja(mat(0x8a6a48), 1.8, 1.5, 1.8, AN / 2 - 9 + i * 0.4, i * 1.5, FO / 2 - 2.6).rotation.y = rnd();

  /* ---------- luz ---------- */
  const ambiente = new THREE.HemisphereLight(0xffe2b8, 0x2a1c12, 0.55); escena.add(ambiente);
  const deFuera = new THREE.DirectionalLight(0xbcd6ff, 0.6); deFuera.position.set(-10, 14, -30); escena.add(deFuera);
  escena.background = new THREE.Color(0x0d0a08);

  const v = new THREE.Vector3();
  function actualizar(t, luz, noche) {
    const parpadeo = 0.85 + 0.1 * Math.sin(t * 11) + 0.07 * Math.sin(t * 23.7) + 0.05 * Math.sin(t * 5.3);
    lumbre.intensity = 260 * parpadeo; velas.intensity = 170 * (0.92 + 0.08 * Math.sin(t * 17 + 2));
    llamas.forEach((s, i) => { const k = 0.7 + 0.3 * Math.sin(t * (7 + i) + s.userData.f); s.scale.set(1.6 + k, 2.4 + k * 1.8, 1); s.position.y = 1.5 + k * 0.6; s.material.opacity = 0.75 + 0.25 * k; });
    lampara.rotation.z = Math.sin(t * 0.6) * 0.015; lampara.rotation.x = Math.cos(t * 0.47) * 0.012;
    cristal.emissiveIntensity = 0.06 + 0.9 * (1 - noche); deFuera.intensity = 0.7 * (1 - noche);
    for (const p of gente) {
      p.g.position.y = p.y + Math.sin(t * 1.3 + p.f) * 0.03;
      p.g.rotation.z = Math.sin(t * 0.7 + p.f) * 0.03;
      if (p.bebe) p.brazo.rotation.x = -Math.max(0, Math.sin(t * 0.5 + p.f) - 0.55) * 2.6;   // de vez en cuando, un trago
    }
    const ciclo = (t * 0.12) % ronda.length, i = Math.floor(ciclo), a = ronda[i], b = ronda[(i + 1) % ronda.length], f = Math.min(1, (ciclo - i) * 1.6);   // anda y se para un momento en cada mesa
    v.lerpVectors(a, b, f); moza.g.position.set(v.x, moza.y + (f < 1 ? Math.abs(Math.sin(t * 7)) * 0.1 : 0), v.z);
    if (f < 1) moza.g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  }

  return {
    escena, etiquetas, R: 30, minDist: 9, actualizar,
    vista: { pos: new THREE.Vector3(2, 31, 44), objetivo: new THREE.Vector3(0, 3, -1) },
    limite: 20,
  };
}
