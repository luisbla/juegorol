// personajes.js — una página aparte: las doce clases y las nueve especies, combinables, en figura.
// No depende del mapa: solo de three, de las figuras y del generador de azar con semilla.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearFigura, personaje, CLASES, ESPECIES } from './figuras.js';
import { azarDe } from './ruido.js';

const ABAJO = '(max-width: 720px), (max-height: 520px), (orientation: portrait)';   // cuándo el panel va al pie: lo mismo que dice la hoja de estilos
const $ = s => document.querySelector(s), lienzo = $('#lienzo'), rotulos = $('#rotulos'), quien = $('#quien');
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches, q = new URLSearchParams(location.search);
const estado = { especie: ESPECIES.includes(q.get('e')) ? q.get('e') : ESPECIES[0], clase: CLASES.includes(q.get('c')) ? q.get('c') : CLASES[0], semilla: +(q.get('s') || 0), todas: q.get('todas') === '1', andar: false };

/* ---------- escena ---------- */
const render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: q.has('foto') });
render.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); render.shadowMap.enabled = true; render.shadowMap.type = THREE.PCFSoftShadowMap; render.toneMapping = THREE.ACESFilmicToneMapping;
const escena = new THREE.Scene(); escena.background = new THREE.Color(0x171a21); escena.fog = new THREE.Fog(0x171a21, 22, 46);
const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
const sol = new THREE.DirectionalLight(0xfff0dd, 2.6); sol.position.set(5, 11, 8); sol.castShadow = true; sol.shadow.mapSize.setScalar(2048); Object.assign(sol.shadow.camera, { left: -12, right: 12, top: 9, bottom: -9 }); sol.shadow.bias = -0.0005;
escena.add(sol, new THREE.HemisphereLight(0xbfd8ff, 0x4a4234, 1.05));
const suelo = new THREE.Mesh(new THREE.CylinderGeometry(13, 13.6, 0.4, 48), new THREE.MeshStandardMaterial({ color: 0x77725e, roughness: 1 })); suelo.position.y = -0.2; suelo.receiveShadow = true; escena.add(suelo);
{ // enlosado del estrado: anillos de losas pintados píxel a píxel (sin degradados de canvas)
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'), im = x.createImageData(N, N), h = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const u = (i + 0.5) / N * 2 - 1, v = (j + 0.5) / N * 2 - 1, r = Math.hypot(u, v) * 13, an = Math.atan2(v, u) + Math.PI, aro = Math.floor(r / 1.7), n = aro === 0 ? 1 : aro * 6, q = (an / 6.2832 * n + aro * 0.37) % n, losa = Math.floor(q), fr = r / 1.7 - aro, fq = q - losa;
    const junta = aro > 0 && (fr < 0.045 || fq * (6.2832 * r / n) < 0.07) || (aro === 0 && fr > 0.955), t = h(aro, losa), g = junta ? 0.5 : 0.84 + t * 0.22 + (h(i, j) - 0.5) * 0.05, o = (j * N + i) * 4;
    im.data[o] = 136 * g; im.data[o + 1] = 130 * g; im.data[o + 2] = 112 * g; im.data[o + 3] = 255; }
  x.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const losas = new THREE.Mesh(new THREE.CircleGeometry(13, 64), new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); losas.rotation.x = -Math.PI / 2; losas.position.y = 0.004; losas.receiveShadow = true; escena.add(losas);
  const borde = new THREE.Mesh(new THREE.CylinderGeometry(14.6, 15.2, 0.3, 48), new THREE.MeshStandardMaterial({ color: 0x5f5a4b, roughness: 1 })); borde.position.y = -0.45; borde.receiveShadow = true; escena.add(borde); }
const aro = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.33, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe0b85e, transparent: true, opacity: 0.7 })); aro.position.y = 0.012; escena.add(aro);
const control = new OrbitControls(camara, lienzo);
Object.assign(control, { enablePan: false, enableDamping: true, dampingFactor: 0.08, minPolarAngle: 0.5, maxPolarAngle: 1.52, minDistance: 3.2, maxDistance: 90 });

/* ---------- figuras ---------- */
let figuras = [];   // { f, clase }
function soltar() { for (const { f } of figuras) { escena.remove(f.grupo); f.malla.geometry.dispose(); f.grupo.traverse(o => { if (o.isMesh && o !== f.malla) o.geometry.dispose(); }); } figuras = []; rotulos.replaceChildren(); }
function poner(clase, x, z, ry) {
  const f = crearFigura(personaje(clase, estado.especie, azarDe(`pj-${clase}-${estado.especie}-${estado.semilla}`)));
  f.grupo.position.set(x, 0, z); f.grupo.rotation.y = ry; escena.add(f.grupo); figuras.push({ f, clase }); return f;
}
function levantar() {
  soltar();
  if (estado.todas) {
    // las doce en arco, mirando al centro; cada una con su rótulo
    // las doce en filas, de cara; cuántas por fila depende de lo ancho que sea lo que se ve
    const { cols, filas, paso } = hueco();
    CLASES.forEach((c, i) => { const f = Math.floor(i / cols), k = i % cols; poner(c, (k - (cols - 1) / 2) * 1.9, (f - (filas - 1) / 2) * paso, 0); const s = document.createElement('span'); s.textContent = c; rotulos.append(s); });
    aro.visible = false; control.autoRotate = false;
  } else {
    poner(estado.clase, 0, 0, 0.35);
    aro.visible = true; control.autoRotate = !quieto && !estado.andar; control.autoRotateSpeed = 1.1;
  }
  caminar(); encuadrar();
  quien.textContent = estado.todas ? `Las doce clases · ${estado.especie}` : `${estado.clase} · ${estado.especie}`;
  lienzo.setAttribute('aria-label', estado.todas ? `Las doce clases como ${estado.especie}` : `Figura: ${estado.clase}, ${estado.especie}`);
}
// Qué parte de la pantalla queda libre del panel y, con eso, a qué distancia cabe lo que hay que enseñar.
function hueco() {
  const w = innerWidth, h = innerHeight, abajo = matchMedia(ABAJO).matches, p = $('.panel').getBoundingClientRect();
  const vw = abajo ? w : w - p.width - 12, vh = abajo ? h - p.height - 8 : h, forma = vw / vh;
  const cols = forma > 1.1 ? 6 : forma > 0.62 ? 4 : 3, filas = Math.ceil(CLASES.length / cols), hondo = filas > 2;
  // con más de dos filas, se separan más y se miran desde más arriba para que ninguna tape a la de detrás
  return { w, h, vw, vh, abajo, p, cols, filas, paso: hondo ? 4.2 : 3.1, alza: hondo ? 0.7 : 0.52 };
}
function encuadrar() {
  const { w, h, vw, vh, cols, filas, paso, alza } = hueco(), t = 2 * Math.tan(camara.fov * Math.PI / 360);
  const alto = estado.todas ? (filas - 1) * paso * Math.sin(alza) + 3.3 * Math.cos(alza) + 1.8 : 3.9, ancho = estado.todas ? cols * 1.9 + 1.2 : 3.2;
  const d = Math.max(alto / (t * vh / h), ancho / (t * (w / h) * vw / w));
  if (estado.todas) { control.target.set(0, 1.4, 0); camara.position.set(0, 1.4 + d * Math.sin(alza), d * Math.cos(alza)); }
  else { control.target.set(0, 1.3, 0); camara.position.set(d * 0.38, 1.3 + d * 0.16, d * 0.91); }
  control.update();
}
function caminar() { for (const { f } of figuras) { f.estado.camina = estado.andar ? 1.5 : 0; if (!estado.andar) f.marcha = 0; } if (!estado.todas) control.autoRotate = !quieto && !estado.andar; }

/* ---------- panel ---------- */
function fichas(caja, lista, clave) {
  const bs = lista.map(n => { const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.addEventListener('click', () => { estado[clave] = n; if (clave === 'clase' && estado.todas) { estado.todas = false; $('#todas').setAttribute('aria-pressed', 'false'); } pintar(); levantar(); }); caja.append(b); return b; });
  return () => bs.forEach(b => b.setAttribute('aria-pressed', String(b.textContent === estado[clave] && !(clave === 'clase' && estado.todas))));
}
const marcas = [fichas($('#especies'), ESPECIES, 'especie'), fichas($('#clases'), CLASES, 'clase')], pintar = () => marcas.forEach(m => m());
$('#otra').addEventListener('click', () => { estado.semilla++; levantar(); });
$('#andar').addEventListener('click', e => { estado.andar = !estado.andar; e.currentTarget.setAttribute('aria-pressed', String(estado.andar)); caminar(); });
$('#todas').addEventListener('click', e => { estado.todas = !estado.todas; e.currentTarget.setAttribute('aria-pressed', String(estado.todas)); pintar(); levantar(); });
$('#todas').setAttribute('aria-pressed', String(estado.todas));

/* ---------- medidas y bucle ---------- */
function medir() {
  const w = innerWidth, h = innerHeight; render.setSize(w, h, false); camara.aspect = w / h;
  // el panel tapa un lado (o el pie): se desplaza el encuadre para que la figura quede en lo que se ve
  const abajo = matchMedia(ABAJO).matches, p = $('.panel').getBoundingClientRect();
  camara.setViewOffset(w, h, abajo ? 0 : p.width / 2, abajo ? p.height / 2 : 0, w, h); camara.updateProjectionMatrix();
}
let forma = 0;
addEventListener('resize', () => { medir(); const c = hueco().cols; if (estado.todas && c !== forma) levantar(); else encuadrar(); forma = c; });
const v = new THREE.Vector3(), reloj = new THREE.Clock();
function cuadro() {
  const t = reloj.getElapsedTime();
  for (const { f } of figuras) f.actualizar(t);
  control.update(); render.render(escena, camara);
  if (estado.todas) figuras.forEach(({ f }, i) => { const s = rotulos.children[i]; if (!s) return; v.set(f.grupo.position.x, 2.3 * (f.opciones.talla ?? 1) + 0.5, f.grupo.position.z).project(camara); s.style.left = `${(v.x * 0.5 + 0.5) * innerWidth}px`; s.style.top = `${(-v.y * 0.5 + 0.5) * innerHeight}px`; s.style.visibility = v.z < 1 ? 'visible' : 'hidden'; });
  requestAnimationFrame(cuadro);
}
medir(); pintar(); levantar(); cuadro();
window.personajes = { estado, get listo() { return figuras.length > 0; } };
