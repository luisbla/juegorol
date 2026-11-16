// interior.js — interior de un edificio suelto. De momento, la sala común de una taberna:
// una maqueta abierta por delante, con barra, chimenea, mesas, parroquianos y una escalera a las habitaciones.
import * as THREE from 'three';
import { azarDe } from './ruido.js';
import { crearFigura } from './figuras.js';
import { matUtil, acabado, cajaSala, gBarril, gTonel, gCajon, gBanco, gMesa, gMesaRedonda, gTaburete, gJarra, gCama, gCofre } from './utileria.js';

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
  // dos plantas: se ve una u otra. Todo lo que se construye va a la planta que marque "destino".
  const baja = new THREE.Group(), alta = new THREE.Group(); escena.add(baja, alta); alta.visible = false;
  let destino = baja;
  const pieza = (geo, m, x, y, z, padre = destino) => { const o = new THREE.Mesh(acabado(geo, m), m); o.position.set(x, y, z); padre.add(o); return o; };
  const caja = (m, w, h, d, x, y, z, padre) => pieza(cajaSala(w, h, d, m), m, x, y + h / 2, z, padre);
  // enseres de utileria.js, a la escala de la sala (el doble largo de la de fuera)
  const jarraBarra = gJarra(5), jarraMesa = gJarra(2.8), mesaRedonda = gMesaRedonda(2.5, 1.714, 2.2), mesaLarga = gMesa(6.2, 2.8, 1.692, 2.2), taburete = gTaburete(0.6, 1.1, 2.2), banco = gBanco(3.16);
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
  for (const dz of [-1.2, 0.2, 1.4]) { const leño = cil(oscura, 0.42, 3.2, hx + 2.0, 0.6, hz + dz, undefined, 8); leño.rotation.x = Math.PI / 2; leño.rotation.z = (rnd() - 0.5) * 0.5; }
  const llamas = [], texLlama = lienzo(64, 64, (x) => { const g = x.createRadialGradient(32, 40, 0, 32, 36, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,210,110,0.9)'); g.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  for (let i = 0; i < 5; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLlama, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffa040 })); s.position.set(hx + 2.3, 1.8, hz - 1.6 + i * 0.8); s.userData.f = rnd() * 6; llamas.push(s); baja.add(s); }
  const lumbre = new THREE.PointLight(0xff9a45, 260, 70, 1.8); lumbre.position.set(hx + 4, 3, hz); baja.add(lumbre);
  const jabali = new THREE.Group(); jabali.position.set(hx + 2.0, 8.0, hz); jabali.rotation.y = Math.PI / 2; baja.add(jabali); jabali.visible = l.trofeo !== false;
  caja(oscura, 3.4, 3.8, 0.3, 0, -1.9, -0.3, jabali);   // tabla del trofeo
  const cabeza = pieza(new THREE.SphereGeometry(1.25, 12, 10), mat(0x4a3526), 0, 0, 0.5, jabali); cabeza.scale.set(1, 0.95, 1.2);
  const morro = pieza(new THREE.CylinderGeometry(0.5, 0.7, 1.4, 10), mat(0x5a4230), 0, -0.25, 1.9, jabali); morro.rotation.x = Math.PI / 2;
  pieza(new THREE.CylinderGeometry(0.52, 0.52, 0.12, 10), mat(0x8a6a5a), 0, -0.25, 2.62, jabali).rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    const colmillo = pieza(new THREE.ConeGeometry(0.14, 0.9, 6), mat(0xeee6d2), s * 0.5, 0.0, 2.2, jabali); colmillo.rotation.z = -s * 0.5;
    const oreja = pieza(new THREE.ConeGeometry(0.4, 0.8, 5), mat(0x4a3526), s * 0.85, 1.05, 0.2, jabali); oreja.rotation.z = -s * 0.5;
    pieza(new THREE.SphereGeometry(0.13, 6, 6), mat(0x0c0a08, { roughness: 0.2 }), s * 0.55, 0.35, 1.45, jabali);
  }
  etiquetas.push({ nombre: 'Chimenea', pos: new THREE.Vector3(hx + 3, 12.5, hz), clase: 'hito', planta: 0 });

  /* ---------- barra, estantes y toneles ---------- */
  const bx = 11, bz = -FO / 2 + 6;
  caja(madera, 18, 2.75, 2.0, bx, 0, bz); caja(clara, 19, 0.35, 2.8, bx, 2.75, bz); caja(oscura, 18, 0.5, 2.1, bx, 0, bz);
  for (let i = 0; i < 2; i++) caja(oscura, 17, 0.3, 1.3, bx, 5.6 + i * 2.2, -FO / 2 + 0.9);
  const VIDRIO = [0x3f6a4a, 0x7a4a2a, 0x8a2f2f, 0x4a5a7a, 0xb09a4a];
  for (let i = 0; i < 26; i++) cil(mat(VIDRIO[i % 5], { roughness: 0.25 }), 0.22, 0.8 + rnd() * 0.5, bx - 8 + (i % 13) * 1.3 + rnd() * 0.2, 5.9 + Math.floor(i / 13) * 2.2, -FO / 2 + 0.9, undefined, 8);
  for (let i = 0; i < 4; i++) pieza(jarraBarra, matUtil, bx - 6 + i * 3.6 + rnd(), 3.1, bz + 0.3).rotation.y = i * 2.1;   // jarras en la barra
  for (let i = 0; i < 3; i++) {   // toneles tumbados en su caballete
    const tx = 19.5, tz = -FO / 2 + 3 + i * 3.4; pieza(gTonel(1.45, 3.0), matUtil, tx, 0.88, tz);
    caja(oscura, 3.2, 1.0, 0.4, tx, 0, tz - 1.0); caja(oscura, 3.2, 1.0, 0.4, tx, 0, tz + 1.0);
  }
  etiquetas.push({ nombre: 'Barra', pos: new THREE.Vector3(bx, 9.5, bz), clase: 'hito', planta: 0 });

  /* ---------- escalera y galería de las habitaciones ---------- */
  for (let i = 0; i < 9; i++) caja(clara, 3.6, 0.35, 1.3, AN / 2 - 2.6, 0.45 + i * 0.78, FO / 2 - 3 - i * 1.25);
  caja(oscura, 0.4, 7.4, 0.4, AN / 2 - 4.6, 0, FO / 2 - 2.4);
  caja(clara, 5, 0.4, 5, AN / 2 - 3, 7.2, FO / 2 - 16.5);   // rellano: de aquí se sube a las habitaciones
  etiquetas.push({ nombre: 'Escalera a las habitaciones', pos: new THREE.Vector3(AN / 2 - 4, 11, FO / 2 - 12), clase: 'hito', planta: 0 });

  /* ---------- mesas y parroquianos ---------- */
  const ROPA = [0x7a3b2e, 0x2f4f6f, 0x5a6b3a, 0x8a7a55, 0x4a3a5a, 0xb09a6a, 0x6a2f3a, 0x3f5a52];
  const gente = [];
  // parroquianos: figuras con esqueleto (figuras.js). Sentados, beben, comen o escuchan; de pie, lo que diga "estado".
  function persona(x, z, mira, sentado, { estado, ...ropa } = {}) {
    const color = ROPA[Math.floor(rnd() * ROPA.length)]; rnd(); rnd(); const jarra = rnd() > 0.35, fase = rnd() * 6.28, n = gente.length;   // el mismo gasto de azar de siempre
    const f = crearFigura({ rnd: azarDe(`taberna-${l.id}-${n}`), color, talla: 2.05, tipo: ['aldeano', 'aldeano', 'aldeana', 'mercader', 'marino'][n % 5], lleva: sentado && jarra ? 'jarra' : undefined, ...ropa });
    Object.assign(f.estado, { fase }, sentado ? { piernas: 'sentado', brazos: jarra ? 'bebe' : ['come', 'escucha', 'habla'][n % 3] } : null, estado);
    f.grupo.position.set(x, sentado ? 0.14 : 0, z); f.grupo.rotation.y = mira; destino.add(f.grupo);
    const p = { g: f.grupo, f }; gente.push(p); return p;
  }
  const MESAS = [[-11, -6, 1], [-2, -2, 0], [-12, 7, 0], [-1, 8.5, 1], [8, 5, 0], [10, -4.5, 1]];
  for (const [mx, mz, redonda] of MESAS) {
    pieza(redonda ? mesaRedonda : mesaLarga, matUtil, mx, 0, mz);
    const n = redonda ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const a = redonda ? i / n * 6.283 + rnd() : 0, sx = redonda ? mx + Math.cos(a) * 3.5 : mx - 2 + (i % 3) * 2, sz = redonda ? mz + Math.sin(a) * 3.5 : mz + (i < 3 ? -2.3 : 2.3);
      if (redonda) pieza(taburete, matUtil, sx, 0, sz).rotation.y = a; else if (i % 3 === 0) pieza(banco, matUtil, mx, 0, sz).scale.setScalar(1.9);
      if (rnd() > 0.28) persona(sx, sz, Math.atan2(mx - sx, mz - sz), true);
    }
    for (let i = 0; i < 3; i++) pieza(jarraMesa, matUtil, mx + (rnd() - 0.5) * 3, 2.0, mz + (rnd() - 0.5) * 1.4).rotation.y = i * 2.1 + mx;
    if (rnd() > 0.4) { cil(mat(0xe8dcc0), 0.09, 0.6, mx, 2.0, mz, undefined, 6); pieza(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd98a }), mx, 2.7, mz); }   // vela
  }
  persona(bx - 2, bz - 2.6, 0, false, { tipo: 'aldeano', tocado: null, barriga: 0.06, delantal: 0xf0e8d4, estado: { brazos: 'remueve', ritmo: 0.5 } });   // quien atiende la barra
  persona(bx - 6, bz + 2.5, Math.PI, false, { estado: { brazos: 'acodado' } }); persona(bx + 3, bz + 2.5, Math.PI + 0.2, false, { lleva: 'jarra', estado: { brazos: 'bebe' } });   // acodados
  const moza = persona(0, 0, 0, false, { tipo: 'aldeana', delantal: 0xf0e8d4, lleva: 'jarra', llevaI: 'jarra', estado: { brazos: 'fuego' } });   // va y viene entre la barra y las mesas
  const ronda = [[bx - 4, bz + 3.4], [3, 3], [-8, 2], [-9, -2], [-2, -5.5], [6, -1]].map(p => new THREE.Vector3(p[0], 0, p[1]));

  /* ---------- lámpara de rueda, alfombra y trastos ---------- */
  const lampara = new THREE.Group(); lampara.position.set(-3, AL - 0.6, 2); baja.add(lampara);
  caja(hierro, 0.12, 3.6, 0.12, 0, -3.6, 0, lampara);
  const rueda = pieza(new THREE.TorusGeometry(3.0, 0.2, 6, 20), oscura, 0, -3.8, 0, lampara); rueda.rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) { const r = caja(oscura, 6, 0.18, 0.18, 0, -3.9, 0, lampara); r.rotation.y = i * Math.PI / 4; }
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; cil(mat(0xe8dcc0), 0.1, 0.55, Math.cos(a) * 3, -3.65, Math.sin(a) * 3, lampara, 6); pieza(new THREE.SphereGeometry(0.13, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd98a }), Math.cos(a) * 3, -2.95, Math.sin(a) * 3, lampara); }
  const velas = new THREE.PointLight(0xffc878, 170, 60, 1.7); velas.position.set(0, -3.2, 0); lampara.add(velas);
  const candil = new THREE.PointLight(0xffc878, 110, 45, 1.8); candil.position.set(bx, 8.5, bz + 3); baja.add(candil);
  pieza(new THREE.BoxGeometry(11, 0.08, 6.5), mat(0x6a2f2a, { roughness: 1 }), -2.5, 0.05, 3.2);
  for (let i = 0; i < 5; i++) pieza(gBarril(0.95, 1.9), matUtil, -AN / 2 + 3 + (i % 3) * 2.2, i > 2 ? 1.9 : 0, FO / 2 - 3 - (i > 2 ? 0.5 : 0)).rotation.y = i;
  for (let i = 0; i < 3; i++) pieza(gCajon(1.8), matUtil, AN / 2 - 9 + i * 0.4, i * 1.53, FO / 2 - 2.6).rotation.y = rnd();

  /* ---------- planta alta: pasillo, cuatro habitaciones, dormitorio común y aseo ---------- */
  destino = alta;
  const AT = 6.5, tabique = mat(0xbfa983, { roughness: 1 }), COLCHAS = [0x7a3b2e, 0x2f4f6f, 0x5a6b3a, 0x6a2f5a, 0x8a6a2e];
  pieza(new THREE.BoxGeometry(AN, 1, FO), new THREE.MeshStandardMaterial({ map: tablas, roughness: 0.9 }), 0, -0.5, 0);
  caja(pared, AN, AT, 1, 0, 0, -FO / 2 - 0.5); caja(pared, 1, AT, FO, -AN / 2 - 0.5, 0, 0); caja(pared, 1, AT, FO, AN / 2 + 0.5, 0, 0);
  // tabique con hueco de puerta: dos paños y un dintel
  const conPuerta = (x0, x1, z, puerta) => { caja(tabique, puerta - 1.5 - x0, AT, 0.5, (x0 + puerta - 1.5) / 2, 0, z); caja(tabique, x1 - puerta - 1.5, AT, 0.5, (x1 + puerta + 1.5) / 2, 0, z); caja(oscura, 3.4, 0.5, 0.6, puerta, AT - 1.6, z); };
  function cama(x, z, doble, color, ocupada) {
    const an = doble ? 4.6 : 2.7;
    pieza(gCama(an, 6.4, color), matUtil, x, 0, z);
    if (ocupada) { const bulto = pieza(new THREE.CapsuleGeometry(0.55, 2.6, 4, 8), mat(color, { roughness: 1 }), x, 1.75, z + 0.6); bulto.rotation.x = Math.PI / 2; pieza(new THREE.SphereGeometry(0.4, 10, 8), mat(PIEL_DORMIDO, { roughness: 0.9 }), x, 1.9, z - 2.0); }
  }
  const PIEL_DORMIDO = 0xd9b08c, arcon = gCofre(2.6), mesilla = gMesaRedonda(1.0, 1.992, 1.6);
  const ancho = AN / 4, fondoHab = 15;   // cuatro habitaciones contra la pared del fondo
  for (let i = 0; i < 4; i++) {
    const x0 = -AN / 2 + i * ancho, xc = x0 + ancho / 2, z0 = -FO / 2;
    if (i) caja(tabique, 0.5, AT, fondoHab, x0, 0, z0 + fondoHab / 2);
    conPuerta(x0, x0 + ancho, z0 + fondoHab, xc + 2.5);
    cama(xc - 2.2, z0 + 4.2, i === 3, COLCHAS[i], i === 1);
    pieza(arcon, matUtil, xc + 3.2, 0, z0 + 2.0);                                                                              // arcón
    pieza(mesilla, matUtil, xc + 2.6, 0, z0 + 9.5);                                                                            // mesilla
    cil(mat(0xe8dcc0), 0.09, 0.6, xc + 2.6, 2.2, z0 + 9.5, undefined, 6); pieza(new THREE.SphereGeometry(0.13, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd98a }), xc + 2.6, 2.95, z0 + 9.5);
    pieza(taburete, matUtil, xc + 0.6, 0, z0 + 10.5);                                                                          // taburete
    pieza(new THREE.BoxGeometry(5, 0.06, 3), mat([0x6a2f2a, 0x2f4a5a, 0x4a5a2f, 0x5a2f4a][i], { roughness: 1 }), xc - 0.5, 0.04, z0 + 9.5);
    caja(oscura, 3.6, 3.6, 0.3, xc + 1.5, 2.2, z0 + 0.25); caja(cristal, 3.0, 3.0, 0.2, xc + 1.5, 2.5, z0 + 0.42);            // ventana
    const vela = new THREE.PointLight(0xffc878, 38, 22, 1.8); vela.position.set(xc + 2.6, 3.4, z0 + 9.5); alta.add(vela);
  }
  persona(-AN / 2 + ancho * 2.5 + 0.6, -FO / 2 + 10.5, Math.PI / 2 + 0.45, true, { tipo: 'escriba', lleva: 'pluma', estado: { brazos: 'escribe' } });   // alguien escribiendo en su cuarto
  // dormitorio común: catres en fila
  const zd = FO / 2 - 8;
  conPuerta(-AN / 2, 4, zd, -3); caja(tabique, 0.5, AT, 8, 4, 0, zd + 4);
  for (let i = 0; i < 5; i++) cama(-AN / 2 + 3 + i * 5.1, zd + 4.3, false, COLCHAS[(i + 2) % 5], i === 0 || i === 3);
  // aseo: tina, cubos y un banco
  conPuerta(4, AN / 2 - 7, zd, 8.5);
  const tina = cil(clara, 2.0, 2.0, 9, 0, zd + 4.2, undefined, 14); cil(mat(0x3f6f80, { roughness: 0.2 }), 1.8, 0.1, 9, 1.7, zd + 4.2, undefined, 14);
  for (let i = 0; i < 3; i++) pieza(gBarril(0.5, 0.9), matUtil, 12.5 + i * 0.3, 0, zd + 2 + i * 1.5).rotation.y = i;
  // hueco de la escalera, con su barandilla
  pieza(new THREE.BoxGeometry(6, 0.1, 13), mat(0x0d0a08), AN / 2 - 3.2, 0.06, FO / 2 - 6.6);
  for (let i = 0; i < 7; i++) caja(oscura, 0.25, 2.2, 0.25, AN / 2 - 6.6, 0, FO / 2 - 12.6 + i * 2);
  caja(oscura, 0.3, 0.25, 12.6, AN / 2 - 6.6, 2.2, FO / 2 - 6.6);
  persona(-6, 3.5, 0.6, false, { estado: { brazos: 'habla' } }); persona(-4.2, 5.6, 0.6 + Math.PI, false, { estado: { brazos: 'escucha' } }); persona(6, 4.2, -2.2, false, { tipo: 'mercader', lleva: 'farol' });   // huéspedes en el pasillo
  const farol = new THREE.PointLight(0xffc878, 120, 55, 1.7); farol.position.set(0, 5.5, 4); alta.add(farol);
  const farol2 = new THREE.PointLight(0xffc878, 90, 45, 1.8); farol2.position.set(-12, 5, zd + 4); alta.add(farol2);
  etiquetas.push({ nombre: 'Habitaciones', pos: new THREE.Vector3(-6, 9.5, -FO / 2 + 7), clase: 'hito', planta: 1 });
  etiquetas.push({ nombre: 'Habitación grande', pos: new THREE.Vector3(AN / 2 - ancho / 2, 9.5, -FO / 2 + 7), clase: 'hito', planta: 1 });
  etiquetas.push({ nombre: 'Dormitorio común', pos: new THREE.Vector3(-10, 8.5, zd + 4), clase: 'hito', planta: 1 });
  etiquetas.push({ nombre: 'Aseo', pos: new THREE.Vector3(9, 8.5, zd + 4), clase: 'hito', planta: 1 });
  destino = baja;
  const plantas = [{ nombre: 'Sala común' }, { nombre: 'Habitaciones' }];
  let plantaActual = 0;
  function verPlanta(i) { plantaActual = i; baja.visible = i === 0; alta.visible = i === 1; for (const e of etiquetas) e.oculta = (e.planta ?? 0) !== i; }
  verPlanta(0);

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
    for (const p of gente) if (p.g.parent.visible) p.f.actualizar(t);
    const ciclo = (t * 0.12) % ronda.length, i = Math.floor(ciclo), a = ronda[i], b = ronda[(i + 1) % ronda.length], f = Math.min(1, (ciclo - i) * 1.6);   // anda y se para un momento en cada mesa
    v.lerpVectors(a, b, f); moza.g.position.set(v.x, 0, v.z);
    if (f < 1) moza.g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  }

  return {
    escena, etiquetas, R: 30, minDist: 9, actualizar, sonido: { fuego: 0.55, gentio: 0.7 }, plantas, verPlanta, get planta() { return plantaActual; },
    vista: { pos: new THREE.Vector3(2, 31, 44), objetivo: new THREE.Vector3(0, 3, -1) },
    limite: 20,
  };
}
