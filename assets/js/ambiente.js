// ambiente.js — todo lo que se mueve: cielo y luz del día, sombras, bruma, nubes, nieve, niebla, humo,
// barcos, pájaros, banderas, faro y luces de noche.
import * as THREE from 'three';
import { suave, suavizar } from './terreno.js';
import { crearRuido } from './ruido.js';
import { crearBarcoModelo } from './barco.js';
import { lluvia } from './clima.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { azarDe } from './ruido.js';
import { hornear, materialMultitud, viva } from './figuras.js';
import { gCarroDeBueyes, gOveja, gVaca } from './utileria.js';

function texturaSuave(nucleo = 0.0, color = '255,255,255') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 64 * nucleo, 64, 64, 64);
  g.addColorStop(0, `rgba(${color},1)`); g.addColorStop(0.45, `rgba(${color},0.45)`); g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Nube: varios borrones solapados, para que no sea un óvalo perfecto.
function texturaNube(rnd) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  for (let i = 0; i < 16; i++) {
    const px = 50 + rnd() * 156, py = 50 + rnd() * 34, r = 22 + rnd() * 30;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function crearAmbiente(escena, renderer, mundo, terreno, lugares, { movil = false } = {}) {
  const R = crearRuido(99), { W, H, cx, cz } = terreno;
  const blanda = texturaSuave(0), punto = texturaSuave(0.05);

  /* ---------- luz, sombras y cielo ---------- */
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const sol = new THREE.DirectionalLight(0xffffff, 2.5);
  sol.castShadow = true;
  sol.shadow.mapSize.setScalar(movil ? 1024 : 2048);
  sol.shadow.bias = -0.0004; sol.shadow.normalBias = 1.2;
  sol.shadow.camera.near = 50; sol.shadow.camera.far = 3600;
  const luna = new THREE.DirectionalLight(0x8fa8ff, 0);
  const luzCielo = new THREE.HemisphereLight(0xbfd8ff, 0x4a4030, 0.8);
  escena.add(sol, sol.target, luna, luna.target, luzCielo);
  escena.fog = new THREE.FogExp2(0x9cc4e8, 0.00016);

  // bóveda: degradado del horizonte al cénit y resplandor alrededor del sol
  const uCielo = { uArriba: { value: new THREE.Color() }, uHorizonte: { value: new THREE.Color() }, uSol: { value: new THREE.Vector3(0, 1, 0) }, uColorSol: { value: new THREE.Color() }, uLuna: { value: new THREE.Vector3(0, 1, 0) }, uNoche: { value: 0 } };
  const boveda = new THREE.Mesh(new THREE.SphereGeometry(7000, 32, 16), new THREE.ShaderMaterial({
    uniforms: uCielo, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vDir; uniform vec3 uArriba, uHorizonte, uSol, uColorSol, uLuna; uniform float uNoche;
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y * 1.15 + 0.12, 0.0, 1.0);
        vec3 col = mix(uHorizonte, uArriba, pow(h, 0.55));
        float c = max(dot(d, normalize(uSol)), 0.0);
        col += uColorSol * (pow(c, 6.0) * 0.22 + pow(c, 420.0) * 3.0) * (1.0 - uNoche);
        col += vec3(0.75, 0.82, 1.0) * pow(max(dot(d, normalize(uLuna)), 0.0), 900.0) * 1.6 * uNoche;   // luna
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  boveda.renderOrder = -10; boveda.frustumCulled = false;
  escena.add(boveda);

  const estrellas = (() => {
    const n = 900, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = R.rnd() * Math.PI * 2, e = R.rnd() * 1.2 + 0.05, r = 6400;
      p[i * 3] = Math.cos(a) * Math.cos(e) * r; p[i * 3 + 1] = Math.sin(e) * r; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    escena.add(m); return m;
  })();

  const CENIT_DIA = new THREE.Color(0x3f7fc8), CENIT_NOCHE = new THREE.Color(0x03060f), HORIZ_DIA = new THREE.Color(0xa9cdee), HORIZ_TARDE = new THREE.Color(0xf0a060), HORIZ_NOCHE = new THREE.Color(0x0c1426);
  const SOL_ALTO = new THREE.Color(0xfff4e0), SOL_BAJO = new THREE.Color(0xff9a52), LUZ_LUNA = new THREE.Color(0.06, 0.08, 0.13);
  const dirSol = new THREE.Vector3(), dirLuna = new THREE.Vector3();
  const estado = { hora: 10, noche: 0, dia: 1, clima: true };

  function ponerHora(hora) {
    estado.hora = hora;
    const a = (hora - 6) / 12 * Math.PI, alto = Math.sin(a);      // amanece a las 6, anochece a las 18
    const dia = suave(-0.08, 0.25, alto), ocaso = suave(0.5, 0.0, Math.abs(alto)) * suave(-0.3, 0.0, alto);
    estado.dia = dia; estado.noche = 1 - suave(-0.18, 0.12, alto);
    dirSol.set(Math.cos(a), Math.max(alto, 0.04), 0.42).normalize();
    dirLuna.set(-Math.cos(a) * 0.5, 0.75, -0.4).normalize();
    sol.intensity = 2.9 * dia;
    sol.color.copy(SOL_BAJO).lerp(SOL_ALTO, suave(0.0, 0.5, alto));
    sol.castShadow = dia > 0.04;
    luna.intensity = 0.9 * estado.noche;
    luzCielo.intensity = 0.3 + 0.55 * dia;
    uCielo.uArriba.value.copy(CENIT_NOCHE).lerp(CENIT_DIA, dia);
    uCielo.uHorizonte.value.copy(HORIZ_NOCHE).lerp(HORIZ_DIA, dia).lerp(HORIZ_TARDE, ocaso * 0.75);
    uCielo.uSol.value.copy(dirSol); uCielo.uLuna.value.copy(dirLuna); uCielo.uColorSol.value.copy(sol.color); uCielo.uNoche.value = estado.noche;
    escena.fog.color.copy(uCielo.uHorizonte.value);
    estrellas.material.opacity = estado.noche * 0.9;
    const u = terreno.uAgua;
    u.uSol.value.copy(estado.noche > 0.6 ? dirLuna : dirSol);
    u.uColorSol.value.copy(sol.color).multiplyScalar(dia).lerp(LUZ_LUNA, estado.noche);
    terreno.uniformes.uLuz.value = 0.16 + 0.84 * dia;
    u.uCielo.value.copy(uCielo.uHorizonte.value).lerp(uCielo.uArriba.value, 0.35);
    for (const m of lugares.ventanas) m.emissiveIntensity = estado.noche * 1.5;
  }

  /* ---------- nubes ---------- */
  const clima = new THREE.Group(); escena.add(clima);
  const nubes = [], matsNube = [0, 1, 2].map(() => new THREE.SpriteMaterial({ map: texturaNube(R.rnd), transparent: true, opacity: 0.36, depthWrite: false, fog: false }));
  for (let i = 0; i < 13; i++) {
    const s = new THREE.Sprite(matsNube[i % 3]);
    const t = 190 + R.rnd() * 170;
    s.scale.set(t, t * 0.5, 1);
    s.position.set((R.rnd() - 0.5) * (W + 400), 150 + R.rnd() * 60, (R.rnd() - 0.5) * H);
    s.userData.v = 5 + R.rnd() * 5;
    nubes.push(s); clima.add(s);
  }

  /* ---------- nieve sobre Thraengarde ---------- */
  const thr = mundo.regiones.find(r => r.id === 'thraengarde');
  let nieve = null;
  if (thr) {
    const xs = thr.poligono.map(p => p[0]), ys = thr.poligono.map(p => p[1]);
    const caja = { x0: Math.min(...xs) + 20, x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) - 25 };
    const n = movil ? 1500 : 3200, p = new Float32Array(n * 3), v = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      p[i * 3] = caja.x0 + R.rnd() * (caja.x1 - caja.x0) - cx; p[i * 3 + 1] = R.rnd() * 120; p[i * 3 + 2] = caja.y0 + R.rnd() * (caja.y1 - caja.y0) - cz;
      v[i] = 7 + R.rnd() * 7;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    nieve = new THREE.Points(g, new THREE.PointsMaterial({ map: punto, color: 0xffffff, size: 1.7, transparent: true, opacity: 0.85, depthWrite: false }));
    nieve.userData = { v, caja };
    nieve.frustumCulled = false;
    clima.add(nieve);
  }

  /* ---------- lluvia: chubascos sobre Valcoria y Astravan, alrededor de donde se mira ---------- */
  // Las gotas viven en un cubo unidad que se coloca delante de la cámara y se estira con la distancia a la que se mira:
  // así llenan la vista a cualquier zoom y nunca se ve el borde del cubo. Caen con el reloj real, no con el del mapa.
  const NG = movil ? 700 : 1800, pg = new Float32Array(NG * 6), semG = new Float32Array(NG * 3), frenteG = new THREE.Vector3();
  for (let i = 0; i < NG; i++) semG.set([R.rnd() - 0.5, R.rnd(), R.rnd() - 0.5], i * 3);
  const gotas = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pg, 3)), new THREE.LineBasicMaterial({ color: 0xc8d6e4, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  gotas.frustumCulled = false; gotas.visible = false; clima.add(gotas);

  /* ---------- niebla de la marisma ---------- */
  const niebla = [];
  const ma = mundo.marisma;
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blanda, transparent: true, opacity: 0.22, depthWrite: false, color: 0xd8e0d4 }));
    const a = R.rnd() * 6.28, d = Math.sqrt(R.rnd()) * 0.8;
    s.userData = { x: ma.x + Math.cos(a) * ma.rx * d, y: ma.y + Math.sin(a) * ma.ry * d, f: R.rnd() * 6.28, t: 80 + R.rnd() * 70 };
    s.scale.set(s.userData.t, s.userData.t * 0.3, 1);
    niebla.push(s); clima.add(s);
  }

  /* ---------- fuegos fatuos: luces frías que vagan por la marisma al caer la tarde ---------- */
  const fatuos = [];
  const texFatuo = texturaSuave(0.02, '150,255,215');
  for (let i = 0; i < (movil ? 7 : 12); i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFatuo, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
    const a = R.rnd() * 6.28, d = Math.sqrt(R.rnd()) * 0.7;
    s.userData = { x: ma.x + Math.cos(a) * ma.rx * d, y: ma.y + Math.sin(a) * ma.ry * d, f: R.rnd() * 6.28, v: 0.15 + R.rnd() * 0.2, r: 6 + R.rnd() * 12 };
    fatuos.push(s); escena.add(s);
  }

  /* ---------- humo ---------- */
  const humos = [];
  const matHumoClaro = new THREE.SpriteMaterial({ map: blanda, transparent: true, depthWrite: false, color: 0xd9d4cc });
  const matHumoOscuro = new THREE.SpriteMaterial({ map: blanda, transparent: true, depthWrite: false, color: 0x2a2725 });
  for (const l of lugares.lista) for (const h of l.info.humos) {
    const origen = new THREE.Vector3(h[0], h[1], h[2]).multiplyScalar(l.escala).add(l.grupo.position);
    const n = l.info.humoOscuro ? 10 : 7;
    for (let k = 0; k < n; k++) {
      const s = new THREE.Sprite((l.info.humoOscuro ? matHumoOscuro : matHumoClaro).clone());
      s.userData = { origen, fase: k / n, oscuro: !!l.info.humoOscuro, dx: R.rnd() - 0.5 };
      humos.push(s); escena.add(s);
    }
  }

  /* ---------- luces de noche y brillo de las ruinas ---------- */
  const luces = [];
  const texCalida = texturaSuave(0, '255,196,110'), texFria = texturaSuave(0, '170,120,255');
  for (const l of lugares.lista) {
    if (l.info.luz > 0) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texCalida, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
      const t = (14 + l.info.luz * 30) * l.escala / 1.5;
      s.scale.set(t, t, 1);
      s.position.copy(l.base); s.position.y += (l.info.luzAlta ?? 2) * l.escala;
      if (l.info.luzAlta) s.scale.set(9, 9, 1);
      s.userData = { fuerza: 0.1 + l.info.luz * 0.16, fase: R.rnd() * 6 };   // suave: el resplandor del posproceso ya pone el resto
      luces.push(s); escena.add(s);
    }
    if (l.info.brillo) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFria, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
      s.scale.set(20, 20, 1); s.position.copy(l.base); s.position.y = Math.max(l.base.y, 0) + 4;
      s.userData = { fuerza: 0.5, fase: R.rnd() * 6, ruina: true };
      luces.push(s); escena.add(s);
    }
  }

  /* ---------- haz del faro ---------- */
  let haz = null;
  const faro = lugares.lista.find(l => l.info.faro);
  if (faro) {
    haz = new THREE.Group();
    const geo = new THREE.ConeGeometry(12, 150, 16, 1, true); geo.translate(0, -75, 0); geo.rotateZ(-Math.PI / 2 - 0.05);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    haz.add(m, m.clone());
    haz.children[1].rotation.y = Math.PI;
    haz.position.copy(faro.base); haz.position.y += faro.info.faro * faro.escala;
    escena.add(haz);
  }

  /* ---------- barcos ---------- */
  const barcos = [];
  const crearBarco = pequeno => crearBarcoModelo(pequeno
    ? { eslora: 5.4, palos: 1, velas: 'dadas', lona: 0xd9cfb8, color: 0x6a4a2e }
    : { eslora: 11, palos: 3, velas: 'dadas' });
  (mundo.rutasBarcos || []).forEach((ruta, n) => {
    const trazo = suavizar([...ruta.puntos, ruta.puntos[0]], 4).slice(0, -1);   // circuito cerrado
    const acum = [0];
    for (let i = 1; i <= trazo.length; i++) { const a = trazo[i - 1], b = trazo[i % trazo.length]; acum.push(acum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const g = crearBarco(ruta.en === 'lago');
    // estela
    const estela = new THREE.Sprite(new THREE.SpriteMaterial({ map: blanda, transparent: true, opacity: 0.35, depthWrite: false })); estela.scale.set(ruta.en === 'lago' ? 7 : 14, ruta.en === 'lago' ? 2.2 : 4.4, 1); estela.position.set(ruta.en === 'lago' ? -3.4 : -7, 0.1, 0); g.add(estela);
    escena.add(g);
    barcos.push({ g, trazo, acum, total: acum[acum.length - 1], v: ruta.en === 'lago' ? 3.2 : 7.5, desfase: n * 137, pequeno: ruta.en === 'lago' });
  });
  function puntoEn(b, s) {
    s = ((s % b.total) + b.total) % b.total;
    let i = 1; while (i < b.acum.length - 1 && b.acum[i] < s) i++;
    const a = b.trazo[i - 1], c = b.trazo[i % b.trazo.length], t = (s - b.acum[i - 1]) / Math.max(1e-6, b.acum[i] - b.acum[i - 1]);
    return [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t];
  }

  // el decorado también echa humo: las aldeas vivas, claro; las recién arrasadas, negro
  {
    const vivos = (terreno.decorado || []).filter(d => !d.arrasado && ['aldea', 'cortijo', 'granja', 'fuerte', 'campamento', 'arrabal', 'acena'].includes(d.tipo)).filter((d, i) => i % (movil ? 4 : 2) === 0).slice(0, movil ? 10 : 30);
    const quemados = (terreno.decorado || []).filter(d => d.arrasado && d.tipo !== 'atalaya' && d.tipo !== 'casafuerte').filter((d, i) => i % 3 === 0).slice(0, 3);
    for (const [lista, oscuro, n] of [[vivos, false, 4], [quemados, true, 8]]) for (const d of lista) {
      const origen = new THREE.Vector3(d.x - cx, terreno.alturaEn(d.x, d.y) + (oscuro ? 1.5 : 3.2), d.y - cz);
      for (let k = 0; k < n; k++) { const sp = new THREE.Sprite((oscuro ? matHumoOscuro : matHumoClaro).clone()); sp.userData = { origen, fase: k / n + R.rnd(), oscuro, dx: R.rnd() - 0.5, flojo: !oscuro }; humos.push(sp); escena.add(sp); }
    }
  }

  /* ---------- vida en los caminos y en el campo ---------- */
  // Caminantes y carros que van y vuelven por los caminos, y rebaños que pastan junto a granjas y aldeas.
  // Todo instanciado: cada tipo es una sola llamada de dibujo.
  const une = gs => mergeGeometries(gs.map(g => { const q = g.index ? g.toNonIndexed() : g; q.deleteAttribute('uv'); return q; }));
  const tinte = (g, hex) => { const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  const B = (w, h, d, x, y, z, hex) => tinte(new THREE.BoxGeometry(w, h, d).translate(x, y, z), hex), C = (r0, r1, h, x, y, z, hex, seg = 7) => tinte(new THREE.CylinderGeometry(r0, r1, h, seg).translate(x, y, z), hex), E = (r, x, y, z, hex, sx = 1, sy = 1, sz = 1) => tinte(new THREE.SphereGeometry(r, 8, 6).scale(sx, sy, sz).translate(x, y, z), hex);
  const matVida = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  // Caminante: una figura de figuras.js horneada a media zancada, con cayado y zurrón; ropa, pelo y piel se tiñen por persona.
  // Carro de bueyes con su boyero sentado, y rebaños de utileria.js (en blanco, para teñir cada res).
  const conZona = g => { g.setAttribute('zona', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1)); return g; };
  const tintes = (g, n) => { for (const a of ['iRopa', 'iPelo', 'iPiel']) g.setAttribute(a, new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, n) * 3), 3)); return g; };
  const gCaminante = hornear({ rnd: azarDe('caminante'), tipo: 'aldeano', tocado: 'capucha', lleva: 'cayado', carga: ['zurron'], brazos: 'guardia' }, 4).andar[1];
  const boyero = hornear({ rnd: azarDe('boyero'), tipo: 'aldeano', tocado: 'sombrero', colorTocado: 0xe2c56e, piernas: 'sentado', brazos: 'preside' }, 1).quieto.scale(0.8, 0.8, 0.8).translate(0, 0.72, -0.42);
  const gCarro = mergeGeometries([conZona(gCarroDeBueyes()), boyero]);
  const viajeros = [], reses = [];
  let mCaminantes = null, mCarros = null, mOvejas = null, mVacas = null;
  {
    const CAPAS = [0x7a3b2e, 0x2f4f6f, 0x5a6b3a, 0x8a7a55, 0x4a3a5a, 0x6a5a4a], col = new THREE.Color();
    const vias = mundo.caminos.filter(c => c.tipo === 'camino' && c.trazo?.length > 8).map(c => { const acum = [0]; for (let i = 1; i < c.trazo.length; i++) acum.push(acum[i - 1] + Math.hypot(c.trazo[i][0] - c.trazo[i - 1][0], c.trazo[i][1] - c.trazo[i - 1][1])); return { trazo: c.trazo, acum, largo: acum[acum.length - 1] }; });
    const caminantes = [], carros = [];
    for (const v of vias) { const n = Math.max(1, Math.round(v.largo / (movil ? 150 : 70))); for (let k = 0; k < n; k++) { const carro = (k + caminantes.length) % 3 === 0, e = { via: v, f: R.rnd(), v: (carro ? 2.2 : 1.5) + R.rnd() * 0.6, lado: (R.rnd() - 0.5) * 2.2, carro, talla: 1.25 + R.rnd() * 0.25 }; (carro ? carros : caminantes).push(e); viajeros.push(e); } }
    const matGente = materialMultitud(), PIELES = [0xf4c7a1, 0xe9b48c, 0xd29a6f], PELOS = [0x2a1f18, 0x5a3a22, 0x9a6a2e];
    mCaminantes = new THREE.InstancedMesh(tintes(gCaminante, caminantes.length), matGente, Math.max(1, caminantes.length)); mCarros = new THREE.InstancedMesh(tintes(gCarro, carros.length), matGente, Math.max(1, carros.length));
    for (const [lista, m] of [[caminantes, mCaminantes], [carros, mCarros]]) lista.forEach((e, i) => { e.i = i; const g = m.geometry.attributes; col.setHex(viva(CAPAS[i % CAPAS.length])).toArray(g.iRopa.array, i * 3); col.setHex(PELOS[i % 3]).toArray(g.iPelo.array, i * 3); col.setHex(PIELES[(i * 7) % 3]).toArray(g.iPiel.array, i * 3); });
    mCaminantes.count = caminantes.length; mCarros.count = carros.length;
    // rebaños: ovejas en Valcoria y Thraengarde, vacas en Marendol y Astravan
    const pastos = (terreno.decorado || []).filter(d => !d.arrasado && ['granja', 'cortijo', 'aldea', 'almiar'].includes(d.tipo)).filter((d, i) => i % 2 === 0).slice(0, movil ? 5 : 16);
    for (const d of pastos) { const vacas = d.region === 'marendol' || d.region === 'astravan', a0 = R.rnd() * 6.28, n = vacas ? 5 : 9; for (let k = 0; k < n; k++) reses.push({ x: d.x + Math.cos(a0) * 11 + (R.rnd() - 0.5) * 9, y: d.y + Math.sin(a0) * 11 + (R.rnd() - 0.5) * 9, f: R.rnd() * 6.28, giro: R.rnd() * 6.28, talla: vacas ? 2.3 + R.rnd() * 0.4 : 1.25 + R.rnd() * 0.3, vaca: vacas }); }
    const ovejas = reses.filter(r => !r.vaca), vacas = reses.filter(r => r.vaca);
    mOvejas = new THREE.InstancedMesh(gOveja(null), matVida(), Math.max(1, ovejas.length)); mOvejas.count = ovejas.length; mVacas = new THREE.InstancedMesh(gVaca(null), matVida(), Math.max(1, vacas.length)); mVacas.count = vacas.length;
    ovejas.forEach((r, i) => { r.i = i; r.malla = mOvejas; r.talla *= 0.66; mOvejas.setColorAt(i, col.setHex([0xf4efe4, 0xe6dece, 0xd8d0c0, 0x5a5048][i % 9 === 8 ? 3 : i % 3])); });
    vacas.forEach((r, i) => { r.i = i; r.malla = mVacas; r.talla *= 0.45; mVacas.setColorAt(i, col.setHex([0x9a5a36, 0x4a3228, 0xe8dcc8, 0xa87a50][i % 4])); });
    for (const m of [mCaminantes, mCarros, mOvejas, mVacas]) { m.castShadow = true; m.frustumCulled = false; escena.add(m); }
  }
  const mVida = new THREE.Matrix4(), qVida = new THREE.Quaternion(), pVida = new THREE.Vector3(), eVida = new THREE.Vector3(), ejeArriba = new THREE.Vector3(0, 1, 0), oculto = new THREE.Vector3(0, 0, 0);
  const enVia = (v, s) => { let i = 1; while (i < v.acum.length - 1 && v.acum[i] < s) i++; const k = (s - v.acum[i - 1]) / (v.acum[i] - v.acum[i - 1] || 1), a = v.trazo[i - 1], b = v.trazo[i]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, b[0] - a[0], b[1] - a[1]]; };

  /* ---------- pájaros: bandadas que giran sobre el agua y el bosque ---------- */
  const pajaros = [];
  {
    const gAla = new THREE.BufferGeometry();
    gAla.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.35, 0, 0, 0.35, 1.5, 0, 0.05], 3));
    const mat = new THREE.MeshBasicMaterial({ color: 0x2c2c33, side: THREE.DoubleSide });
    const centros = [[1150, 630, 46], [900, 930, 40], [430, 320, 58], [770, 480, 34], [1295, 815, 38]];
    centros.forEach(([x, y, alto], b) => {
      for (let k = 0; k < (movil ? 4 : 7); k++) {
        const g = new THREE.Group(), izq = new THREE.Mesh(gAla, mat), der = new THREE.Mesh(gAla, mat);
        der.scale.x = -1; g.add(izq, der); g.scale.setScalar(0.34 + R.rnd() * 0.18);
        g.userData = { x: x - cx, z: y - cz, alto: alto + R.rnd() * 14, r: 30 + R.rnd() * 45, f: R.rnd() * 6.28 + b, v: (0.16 + R.rnd() * 0.1) * (b % 2 ? 1 : -1), izq, der };
        pajaros.push(g); escena.add(g);
      }
    });
  }

  /* ---------- bucle ---------- */
  const tmp = new THREE.Vector3();
  function actualizar(t, dt, camara, objetivo) {
    const distancia = camara.position.distanceTo(objetivo);
    boveda.position.copy(camara.position); estrellas.position.copy(camara.position);
    terreno.uniformes.uTiempo.value = t;
    terreno.uniformes.uNubes.value = estado.clima ? 1 - estado.noche * 0.7 : 0;
    clima.visible = estado.clima;
    const luzDia = 1 - estado.noche * 0.82;

    // el sol y su sombra siguen al punto que se mira: nítida de cerca, amplia de lejos
    const medio = THREE.MathUtils.clamp(distancia * 0.75, 110, 1050), c = sol.shadow.camera;
    if (Math.abs(c.right - medio) > 1) { c.left = -medio; c.right = medio; c.top = medio; c.bottom = -medio; c.updateProjectionMatrix(); }
    sol.target.position.copy(objetivo);
    sol.position.copy(objetivo).addScaledVector(dirSol, 1700);
    luna.target.position.copy(objetivo);
    luna.position.copy(objetivo).addScaledVector(dirLuna, 1700);
    escena.fog.density = terreno.uAgua.uBruma.value = 0.00013 + estado.noche * 0.00005;

    for (const m of matsNube) m.color.setScalar(0.25 + 0.75 * luzDia);
    for (const f of terreno.fronteras.children) f.material.color.copy(f.userData.color).multiplyScalar(0.3 + 0.7 * luzDia);
    if (estado.clima) {
      for (const n of nubes) { n.position.x += n.userData.v * dt; if (n.position.x > W / 2 + 320) n.position.x = -W / 2 - 320; }
      if (nieve) {
        const p = nieve.geometry.attributes.position, { v, caja } = nieve.userData;
        for (let i = 0; i < v.length; i++) {
          let y = p.getY(i) - v[i] * dt, x = p.getX(i) + Math.sin(t * 0.7 + i) * 2.2 * dt + 3 * dt;
          if (y < 0) y += 120;
          if (x > caja.x1 - cx) x = caja.x0 - cx;
          p.setY(i, y); p.setX(i, x);
        }
        p.needsUpdate = true;
        nieve.material.opacity = 0.35 + 0.5 * luzDia;
      }
      for (const s of niebla) {
        const u = s.userData, x = u.x + Math.sin(t * 0.05 + u.f) * 22, y = u.y + Math.cos(t * 0.04 + u.f * 1.7) * 12;
        s.position.set(x - cx, 4.5 + Math.sin(t * 0.2 + u.f) * 1.2, y - cz);
        s.material.opacity = (0.16 + 0.1 * Math.sin(t * 0.13 + u.f)) * (0.55 + 0.45 * luzDia) + estado.noche * 0.06;
      }
    }
    // viajeros: van hasta el final del camino y vuelven; de noche se recogen
    for (const e of viajeros) {
      const ciclo = (t * e.v / e.via.largo * 0.5 + e.f) % 1, ida = ciclo < 0.5, s = (ida ? ciclo * 2 : 2 - ciclo * 2) * e.via.largo;
      const [x, y, dx, dy] = enVia(e.via, Math.max(6, Math.min(e.via.largo - 6, s))), l = Math.hypot(dx, dy) || 1, sx = ida ? 1 : -1;
      const px = x - dy / l * e.lado * sx, py = y + dx / l * e.lado * sx, fuera = estado.noche > 0.6 || terreno.alturaEn(px, py) < 0.15;
      pVida.set(px - cx, Math.max(terreno.alturaEn(px, py), 0) + (e.carro ? 0 : Math.abs(Math.sin(t * 7 + e.f * 40)) * 0.08), py - cz);
      mVida.compose(pVida, qVida.setFromAxisAngle(ejeArriba, Math.atan2(dx * sx, dy * sx)), fuera ? oculto : eVida.setScalar(e.talla * (e.carro ? 1 : 0.9)));
      (e.carro ? mCarros : mCaminantes).setMatrixAt(e.i, mVida);
    }
    mCaminantes.instanceMatrix.needsUpdate = true; mCarros.instanceMatrix.needsUpdate = true;
    // rebaños: pacen despacio alrededor de su sitio
    reses.forEach((r, i) => {
      const paso = t * 0.05 + r.f, x = r.x + Math.sin(paso) * 3 + Math.sin(paso * 2.3) * 1.2, y = r.y + Math.cos(paso * 1.4) * 3, h = terreno.alturaEn(x, y);
      pVida.set(x - cx, h, y - cz); mVida.compose(pVida, qVida.setFromAxisAngle(ejeArriba, r.giro + Math.sin(paso * 0.7) * 2), h < 0.3 ? oculto : eVida.setScalar(r.talla)); r.malla.setMatrixAt(r.i, mVida);
    });
    mOvejas.instanceMatrix.needsUpdate = true; mVacas.instanceMatrix.needsUpdate = true;
    // lluvia donde se está mirando, si allí hay chubasco
    const agua = estado.clima ? lluvia(t, terreno.zonaEn(objetivo.x + cx, objetivo.z + cz)) : 0; estado.lluvia = agua; gotas.visible = agua > 0.02;
    if (gotas.visible) {
      const lejos = Math.min(camara.position.distanceTo(objetivo), 500), ahora = performance.now() / 1000;
      gotas.position.copy(camara.position).addScaledVector(camara.getWorldDirection(frenteG), lejos * 0.55); gotas.scale.set(lejos * 1.9, lejos * 1.3, lejos * 1.9);
      gotas.material.opacity = agua * 0.42 * (0.5 + 0.5 * luzDia);
      for (let i = 0; i < NG; i++) { const x = semG[i * 3], z = semG[i * 3 + 2], y = ((semG[i * 3 + 1] - ahora * (0.75 + (i % 7) * 0.05)) % 1 + 1) % 1 - 0.5; pg[i * 6] = x; pg[i * 6 + 1] = y; pg[i * 6 + 2] = z; pg[i * 6 + 3] = x + 0.006; pg[i * 6 + 4] = y - 0.03; pg[i * 6 + 5] = z; }
      gotas.geometry.attributes.position.needsUpdate = true;
    }
    for (const s of humos) {
      const u = s.userData, k = (t * (u.oscuro ? 0.09 : 0.14) + u.fase) % 1, alto = u.oscuro ? 34 : u.flojo ? 9 : 15;
      const deriva = k * k * (u.oscuro ? 22 : 10);   // el viento lo tumba según sube
      s.position.set(u.origen.x + deriva + u.dx * k * 5 + Math.sin(t * 0.8 + u.fase * 9) * k * 1.2, u.origen.y + k * alto, u.origen.z + u.dx * k * 4);
      const tam = (u.oscuro ? 4 : 2.0) + k * (u.oscuro ? 16 : 8);
      s.scale.set(tam, tam, 1);
      s.material.opacity = Math.sin(k * Math.PI) * (u.oscuro ? 0.5 : 0.45) * (0.4 + 0.6 * luzDia);
    }
    for (const s of luces) {
      const u = s.userData;
      s.material.opacity = u.ruina
        ? (0.12 + estado.noche * 0.5) * (0.6 + 0.4 * Math.sin(t * 0.8 + u.fase))
        : estado.noche * u.fuerza * (0.88 + 0.12 * Math.sin(t * 5 + u.fase));
    }
    for (const s of fatuos) {
      const u = s.userData, parpadeo = 0.55 + 0.45 * Math.sin(t * 2.3 + u.f * 7) * Math.sin(t * 0.37 + u.f);
      s.position.set(u.x + Math.cos(t * u.v + u.f) * u.r - cx, 2.2 + Math.sin(t * 0.9 + u.f) * 0.9, u.y + Math.sin(t * u.v * 1.3 + u.f) * u.r * 0.7 - cz);
      s.material.opacity = suave(0.25, 0.75, estado.noche) * Math.max(0, parpadeo) * 0.9;
      const tam = 3.2 + parpadeo * 1.6; s.scale.set(tam, tam, 1);
    }
    if (haz) {
      haz.rotation.y = t * 0.55;
      for (const m of haz.children) m.material.opacity = 0.02 + estado.noche * 0.3;
    }
    for (const b of barcos) {
      const s = t * b.v + b.desfase, [x, y] = puntoEn(b, s), [x2, y2] = puntoEn(b, s + 3);
      b.g.position.set(x - cx, 0.1 + Math.sin(t * 1.3 + b.desfase) * 0.2, y - cz);
      b.g.rotation.set(Math.sin(t * 1.1 + b.desfase) * 0.06, Math.atan2(-(y2 - y), x2 - x), Math.sin(t * 0.9 + b.desfase) * 0.05, 'YXZ');
    }
    // banderas al viento: una onda que recorre la tela
    for (const b of lugares.banderas) {
      const p = b.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 3.2 - t * 6) * 0.16 * x); }
      p.needsUpdate = true;
    }
    for (const g of pajaros) {
      const u = g.userData, a = u.f + t * u.v;
      g.visible = estado.noche < 0.5;
      g.position.set(u.x + Math.cos(a) * u.r, u.alto + Math.sin(a * 2.3 + u.f) * 4, u.z + Math.sin(a) * u.r * 0.7);
      tmp.set(-Math.sin(a) * u.r, 0, Math.cos(a) * u.r * 0.7).multiplyScalar(Math.sign(u.v));
      g.rotation.y = Math.atan2(tmp.x, tmp.z);
      const aleteo = Math.sin(t * 9 + u.f * 5) * 0.75;
      u.izq.rotation.z = aleteo; u.der.rotation.z = -aleteo;
    }
  }

  ponerHora(estado.hora);
  return { estado, ponerHora, actualizar, sol, barcos, luz: { sol, luna, luzCielo, dirSol, dirLuna, horizonte: uCielo.uHorizonte.value, arriba: uCielo.uArriba.value } };
}
