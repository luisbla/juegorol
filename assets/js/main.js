// main.js — arranque, cámara, etiquetas, selección de lugares e interfaz.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearTerreno, suave } from './terreno.js';
import { crearLugares } from './lugares.js';
import { crearAmbiente } from './ambiente.js';
import { crearViajes } from './viaje.js';
import { animar, actualizarAnimaciones, reducir, ease } from './anim.js';

const $ = s => document.querySelector(s);
const h = (tag, attrs = {}, ...hijos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  e.append(...hijos.filter(x => x != null && x !== false));
  return e;
};

const TIPOS = {
  capital: 'Capital', pueblo: 'Pueblo', posta: 'Posta', ruina: 'Ruinas antiguas', quemado: 'Puesto de vigía', campamento: 'Campamento',
  granja: 'Granja', taberna: 'Taberna', cabana: 'Cabaña', faro: 'Faro', puerto: 'Puerto', torre: 'Torre',
};
const SEG_POR_DIA = 240;   // un día entero dura 4 minutos

async function iniciar() {
  const lienzo = $('#lienzo'), carga = $('#carga');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
  } catch {
    carga.querySelector('p').textContent = 'Este navegador no puede mostrar el mapa en 3D (WebGL no está disponible).';
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(max-width: 720px)').matches ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const movil = matchMedia('(max-width: 720px), (pointer: coarse)').matches;
  const mundo = await (await fetch('assets/data/mundo.json')).json();
  await new Promise(r => setTimeout(r, 30));   // deja pintar el aviso de carga antes del cálculo

  const escena = new THREE.Scene();
  const terreno = crearTerreno(mundo, { movil });
  escena.add(terreno.grupo);
  const lugares = crearLugares(mundo, terreno);
  escena.add(lugares.grupo);
  const ambiente = crearAmbiente(escena, renderer, mundo, terreno, lugares, { movil });
  const viajes = crearViajes(escena, mundo, terreno);
  const { W, H } = terreno;

  /* ---------- cámara ---------- */
  const camara = new THREE.PerspectiveCamera(38, 1, 4, 16000);
  const control = new OrbitControls(camara, lienzo);
  control.enableDamping = true; control.dampingFactor = 0.09;
  control.screenSpacePanning = false;
  control.minDistance = 45; control.maxDistance = 5600; control.maxPolarAngle = 1.38;
  control.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  control.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  control.zoomToCursor = true;
  control.listenToKeyEvents(lienzo);
  control.keyPanSpeed = 28;
  control.addEventListener('change', () => {
    control.target.x = THREE.MathUtils.clamp(control.target.x, -W / 2, W / 2);
    control.target.z = THREE.MathUtils.clamp(control.target.z, -H / 2, H / 2);
    control.target.y = THREE.MathUtils.clamp(control.target.y, 0, 40);
  });

  function vistaGeneral() {
    const t = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
    // en vertical no cabe a lo ancho: se encuadra más cerca y se recorre arrastrando
    const d = Math.max(W * (camara.aspect < 1 ? 0.3 : 0.54) / (t * camara.aspect), H * 0.66 / t), polar = 0.66;
    return { objetivo: new THREE.Vector3(0, 0, 20), pos: new THREE.Vector3(0, Math.cos(polar) * d, 20 + Math.sin(polar) * d) };
  }
  let vuelo = 0;
  function volar(pos, objetivo, ms = 1300) {
    const mio = ++vuelo, p0 = camara.position.clone(), o0 = control.target.clone();
    return animar(ms, t => {
      if (mio !== vuelo) return;
      camara.position.lerpVectors(p0, pos, t); control.target.lerpVectors(o0, objetivo, t);
    }, ease.suave);
  }
  lienzo.addEventListener('pointerdown', () => { vuelo++; });
  lienzo.addEventListener('wheel', () => { vuelo++; }, { passive: true });

  function ajustar() {
    const w = innerWidth, a = innerHeight;
    renderer.setSize(w, a, false);
    camara.aspect = w / a; camara.updateProjectionMatrix();
  }
  addEventListener('resize', ajustar);
  ajustar();
  { const v = vistaGeneral(); camara.position.copy(v.pos); control.target.copy(v.objetivo); control.update(); }

  /* ---------- etiquetas ---------- */
  const capaEtq = $('#etiquetas'), etiquetas = [];
  for (const l of lugares.lista) {
    if (l.datos.oculto) continue;   // la torre no lleva nombre: solo aparece si alguien da con ella
    const b = h('button', { class: `etq etq-${l.datos.tipo}`, type: 'button', onclick: () => seleccionar(l.datos.id, true) }, l.datos.nombre);
    capaEtq.append(b);
    etiquetas.push({ el: b, pos: l.ancla, clase: l.datos.tipo === 'capital' ? 'capital' : 'lugar', lugar: l });
    l.etiqueta = b;
  }
  for (const r of mundo.regiones) {
    const e = h('div', { class: 'etq etq-region' }, h('b', {}, r.nombre), h('i', {}, r.lema));
    capaEtq.append(e);
    etiquetas.push({ el: e, pos: terreno.aMundo(r.etiqueta[0], r.etiqueta[1], 46), clase: 'region' });
  }
  for (const g of [mundo.marisma, mundo.mar]) {
    const e = h('div', { class: 'etq etq-geo' }, g.nombre);
    capaEtq.append(e);
    etiquetas.push({ el: e, pos: terreno.aMundo(g.etiqueta[0], g.etiqueta[1], 10), clase: 'geo' });
  }
  const capas = { nombres: true, fronteras: true, caminos: true, clima: true };
  const v3 = new THREE.Vector3();
  function colocarEtiquetas() {
    const w = innerWidth, a = innerHeight, lejos = camara.position.distanceTo(control.target);
    const umbral = w < 720 ? 620 : 1350;
    for (const e of etiquetas) {
      v3.copy(e.pos).project(camara);
      let op = capas.nombres && v3.z < 1 && Math.abs(v3.x) < 1.15 && Math.abs(v3.y) < 1.15 ? 1 : 0;
      if (op) {
        if (e.clase === 'region') op = w < 720 ? 0 : suave(umbral * 0.8, umbral, lejos);
        else if (e.clase === 'geo') op = suave(170, 320, lejos);
        else if (e.clase === 'lugar' && e.lugar !== elegido) op = suave(umbral, umbral * 0.8, lejos);
      }
      e.el.style.opacity = op;
      e.el.style.visibility = op < 0.02 ? 'hidden' : 'visible';
      if (op >= 0.02) {
        const x = (v3.x * 0.5 + 0.5) * w, y = (-v3.y * 0.5 + 0.5) * a;
        e.el.style.transform = `translate(-50%, ${e.clase === 'region' || e.clase === 'geo' ? '-50%' : '-100%'}) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    }
  }

  /* ---------- selección ---------- */
  let elegido = null, dentro = null, dentroListo = false;
  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffd35c, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthTest: false }));
  anillo.rotation.x = -Math.PI / 2; anillo.visible = false; anillo.renderOrder = 4; escena.add(anillo);
  const ficha = $('#ficha');
  const porId = Object.fromEntries(lugares.lista.map(l => [l.datos.id, l]));
  const regionDe = l => mundo.regiones.find(r => r.id === l.datos.region)?.nombre ?? '';

  function seleccionar(id, acercar) {
    const l = porId[id];
    if (!l) return;
    if (elegido?.etiqueta) elegido.etiqueta.classList.remove('activa');
    elegido = l; dentro = null;
    l.etiqueta?.classList.add('activa');
    anillo.visible = true;
    anillo.position.set(l.base.x, Math.max(l.base.y, 0) + 0.8, l.base.z);
    anillo.userData.radio = l.radio * 0.95;
    viajes.limpiar();
    pintarFicha();
    if (acercar) {
      const dir = camara.position.clone().sub(control.target), d = THREE.MathUtils.clamp(dir.length(), 150 + l.radio * 3, 380);
      volar(l.base.clone().add(dir.setLength(d)), l.base.clone());
    }
  }
  function cerrar() {
    if (elegido?.etiqueta) elegido.etiqueta.classList.remove('activa');
    elegido = null; dentro = null; anillo.visible = false; ficha.hidden = true; ficha.replaceChildren(); viajes.limpiar();
  }
  function entrar(l) {
    dentro = l; dentroListo = false;
    const az = control.getAzimuthalAngle(), polar = 1.0, d = l.radio * 4.2;
    const pos = new THREE.Vector3(Math.sin(az) * Math.sin(polar) * d, Math.cos(polar) * d, Math.cos(az) * Math.sin(polar) * d).add(l.base);
    volar(pos, l.base.clone().setY(l.base.y + 5), 1700).then(() => { dentroListo = true; });
    pintarFicha();
    ficha.querySelector('.gobierno')?.focus?.();
  }

  function pintarFicha() {
    const l = elegido, d = l.datos;
    const nodos = [
      h('button', { class: 'cerrar', type: 'button', 'aria-label': 'Cerrar ficha', onclick: cerrar }, '×'),
      h('p', { class: 'tipo' }, `${TIPOS[d.tipo] ?? d.tipo} · ${regionDe(l)}`),
      h('h2', {}, d.nombre),
      h('p', {}, d.desc),
    ];
    if (d.gobierno) {
      nodos.push(dentro === l
        ? h('div', { class: 'gobierno', tabindex: -1 }, h('h3', {}, d.gobierno.titulo), h('p', {}, d.gobierno.texto))
        : h('button', { class: 'accion', type: 'button', onclick: () => entrar(l) }, 'Entrar en la ciudad'));
    }
    const viaje = h('div', { class: 'viaje' }, h('h3', {}, 'Viajar desde aquí'));
    if (!viajes.alcanzable(d.id)) {
      viaje.append(h('p', { class: 'nota' }, 'No hay camino conocido hasta este lugar.'));
    } else {
      const sel = h('select', { 'aria-label': `Destino desde ${d.nombre}` }, h('option', { value: '' }, 'Elige destino…'));
      for (const r of mundo.regiones) {
        const grupo = h('optgroup', { label: r.nombre });
        for (const o of lugares.lista) if (o !== l && o.datos.region === r.id && viajes.alcanzable(o.datos.id)) grupo.append(h('option', { value: o.datos.id }, o.datos.nombre));
        if (grupo.children.length) sel.append(grupo);
      }
      const res = h('div', { 'aria-live': 'polite' });
      sel.addEventListener('change', () => {
        res.replaceChildren();
        if (!sel.value) { viajes.limpiar(); return; }
        const r = viajes.ruta(d.id, sel.value);
        if (!r) { res.append(h('p', { class: 'nota' }, 'No hay ruta por caminos conocidos.')); return; }
        const dias = r.dias < 1 ? 'menos de un día' : `${r.dias.toFixed(1).replace('.', ',')} días`;
        res.append(
          h('p', { class: 'resultado' }, h('b', {}, `${Math.round(r.km)} km`), ' · ', h('b', {}, dias), ' a pie'),
          h('p', { class: 'nota' }, `${mundo.meta.kmPorDia.toString().replace('.', ',')} km al día (${mundo.meta.notaRitmo}).${r.sendas ? ' Parte del trayecto va por sendas.' : ''}${r.barca ? ' Incluye un tramo en barca, contado como si se anduviera.' : ''}`),
        );
        // encuadra la ruta y la recorre
        const caja = viajes.caja(r), centro = caja.getCenter(new THREE.Vector3()), tam = caja.getSize(new THREE.Vector3());
        const t = Math.tan(THREE.MathUtils.degToRad(camara.fov / 2));
        const dist = Math.max(260, Math.max(tam.x * 0.7 / (t * camara.aspect), tam.z * 0.9 / t));
        volar(new THREE.Vector3(centro.x, Math.cos(0.6) * dist, centro.z + Math.sin(0.6) * dist), centro, 1100).then(() => viajes.mostrar(r));
      });
      viaje.append(sel, res);
    }
    nodos.push(viaje);
    ficha.replaceChildren(...nodos);
    ficha.hidden = false;
  }

  const rayo = new THREE.Raycaster(), raton = new THREE.Vector2();
  function lugarEn(ev) {
    raton.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    rayo.setFromCamera(raton, camara);
    return rayo.intersectObjects(lugares.dianas, false)[0]?.object.userData.id ?? null;
  }
  let pulsado = null;
  lienzo.addEventListener('pointerdown', ev => { pulsado = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
  lienzo.addEventListener('pointerup', ev => {
    if (!pulsado || Math.hypot(ev.clientX - pulsado.x, ev.clientY - pulsado.y) > 6 || performance.now() - pulsado.t > 600) return;
    const id = lugarEn(ev);
    if (id) seleccionar(id, true);
  });
  let ultimoHover = 0;
  lienzo.addEventListener('pointermove', ev => {
    if (ev.pointerType !== 'mouse' || ev.buttons || performance.now() - ultimoHover < 60) return;
    ultimoHover = performance.now();
    const id = lugarEn(ev);
    lienzo.style.cursor = id && !porId[id].datos.oculto ? 'pointer' : 'grab';
  });
  addEventListener('keydown', ev => { if (ev.key === 'Escape' && elegido) cerrar(); });

  /* ---------- mandos ---------- */
  const reloj = $('#reloj'), barra = $('#hora'), texto = $('#horaTexto');
  let corriendo = !reducir, hora = Number(barra.value);
  function pintarHora() {
    const hh = Math.floor(hora) % 24, mm = Math.floor((hora % 1) * 60);
    texto.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    ambiente.ponerHora(hora);
  }
  function ponerReloj(v) { corriendo = v; reloj.textContent = v ? 'Pausar' : 'Reanudar'; reloj.setAttribute('aria-pressed', String(v)); }
  reloj.addEventListener('click', () => ponerReloj(!corriendo));
  barra.addEventListener('input', () => { hora = Number(barra.value); ponerReloj(false); pintarHora(); });
  ponerReloj(corriendo); pintarHora();

  document.querySelectorAll('[data-capa]').forEach(c => c.addEventListener('change', () => {
    capas[c.dataset.capa] = c.checked;
    terreno.fronteras.visible = capas.fronteras;
    terreno.caminos.visible = capas.caminos;
    ambiente.estado.clima = capas.clima;
  }));

  const esf = new THREE.Spherical();
  function orbitar(dAz, factor) {
    esf.setFromVector3(camara.position.clone().sub(control.target));
    esf.theta += dAz; esf.radius = THREE.MathUtils.clamp(esf.radius * factor, control.minDistance, control.maxDistance);
    volar(new THREE.Vector3().setFromSpherical(esf).add(control.target), control.target.clone(), 450);
  }
  const ACCIONES = {
    mas: () => orbitar(0, 0.65), menos: () => orbitar(0, 1.5), izq: () => orbitar(-0.5, 1), der: () => orbitar(0.5, 1),
    norte: () => orbitar(-control.getAzimuthalAngle(), 1),
    general: () => { const v = vistaGeneral(); volar(v.pos, v.objetivo, 1400); },
  };
  document.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => ACCIONES[b.dataset.cam]()));
  const aguja = $('#brujula span');
  if (matchMedia('(pointer: coarse)').matches) $('#pista').textContent = 'Arrastra para moverte · pellizca para acercar y girar';
  setTimeout(() => $('#pista')?.classList.add('fuera'), 9000);

  /* ---------- bucle ---------- */
  let antes = performance.now(), t = 0;
  function cuadro(ahora) {
    const dt = Math.min(0.1, (ahora - antes) / 1000); antes = ahora; t += dt;
    actualizarAnimaciones(ahora);
    if (corriendo) { hora = (hora + dt * 24 / SEG_POR_DIA) % 24; barra.value = hora; pintarHora(); }
    control.update();
    if (camara.position.y < 6) camara.position.y = 6;
    ambiente.actualizar(t, dt, camara, control.target);
    if (anillo.visible) { const r = anillo.userData.radio * (1 + 0.06 * Math.sin(t * 3)); anillo.scale.set(r, r, 1); }
    if (dentro && dentroListo && camara.position.distanceTo(dentro.base) > dentro.radio * 9) { dentro = null; pintarFicha(); }
    aguja.style.transform = `rotate(${control.getAzimuthalAngle()}rad)`;
    renderer.render(escena, camara);
    colocarEtiquetas();
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  carga.classList.add('fuera');
  // Para trastear desde la consola: mapa.seleccionar('faro'), mapa.ponerHora(22)…
  window.mapa = {
    seleccionar, entrar: id => entrar(porId[id]), camara, control,
    ponerHora: v => { hora = v; ponerReloj(false); barra.value = v; pintarHora(); },
    enPantalla: id => { const v = porId[id].base.clone().project(camara); return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]; },
  };
}

iniciar().catch(e => {
  console.error(e);
  document.querySelector('#carga p').textContent = 'No se ha podido cargar el mapa. Recarga la página.';
});
