// main.js — arranque, cámara, etiquetas, selección de lugares e interfaz.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { crearTerreno, suave } from './terreno.js';
import { crearLugares } from './lugares.js';
import { crearAmbiente } from './ambiente.js';
import { crearViajes } from './viaje.js';
import { crearCiudad } from './ciudad.js';
import { crearPartida } from './partida.js';
import { crearMusica } from './musica.js';
import { crearSonido } from './sonido.js';
import { crearRender } from './render.js';
import { crearCodice } from './codice.js';
import { crearMaster } from './master.js';
import { lluvia } from './clima.js';
import { crearInterior } from './interior.js';
import { crearSala } from './salas.js';
import { crearEntrada } from './ruinas.js';
import { cargarModelos } from './modelos.js';
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
  mina: 'Mina', mercado: 'Mercado flotante', palafitos: 'Aldea abandonada', pasarela: 'Calzada vieja', pecio: 'Pecio',
};
const SEG_POR_DIA = 240;   // un día entero dura 4 minutos

async function iniciar() {
  const lienzo = $('#lienzo'), carga = $('#carga');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'high-performance' });
  } catch {
    $('#cargaTexto').textContent = 'Este navegador no puede mostrar el mapa en 3D (WebGL no está disponible).';
    return;
  }
  // calidad: alta, media o baja; "auto" deja que decida el tamaño de pantalla. Se guarda en este navegador.
  let calidad = 'auto';
  try { calidad = localStorage.getItem('alden-calidad') || 'auto'; } catch { /* sin almacenamiento */ }
  // Tres clases de equipo: teléfono (pantalla pequeña), tableta (táctil y grande, como un iPad) y ordenador.
  // En automática, el teléfono va en baja; la tableta lleva todos los efectos con algo menos de resolución; el ordenador, todo.
  const tactil = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 1 && /Mac|iPad/.test(navigator.platform || ''));
  const pequena = Math.min(screen.width, screen.height) < 700 || matchMedia('(max-width: 720px)').matches, tableta = tactil && !pequena;
  document.body.classList.toggle('tactil', tactil);
  renderer.setPixelRatio(Math.min(devicePixelRatio, { alta: 2, media: 1.25, baja: 1 }[calidad] ?? (pequena || tableta ? 1.5 : 2)));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const movil = calidad === 'baja' || (calidad === 'auto' && pequena);
  const mundo = await (await fetch('assets/data/mundo.json')).json();
  await new Promise(r => setTimeout(r, 30));   // deja pintar el aviso de carga antes del cálculo

  const render = crearRender(renderer, calidad, movil, { muestras: tableta ? 2 : 4 });
  const escena = new THREE.Scene();
  const terreno = crearTerreno(mundo, { movil });
  escena.add(terreno.grupo);
  const lugares = crearLugares(mundo, terreno);
  escena.add(lugares.grupo);
  const ambiente = crearAmbiente(escena, renderer, mundo, terreno, lugares, { movil });
  const viajes = crearViajes(escena, mundo, terreno);
  if (calidad === 'baja') renderer.shadowMap.enabled = false;
  const musica = crearMusica(mundo.musica), sonido = crearSonido();
  cargarModelos(mundo.modelos, lugares, ambiente.barcos);
  // qué lugares tienen interior y cómo se llama el botón
  const INTERIOR = { capital: 'Entrar en la ciudad', puerto: 'Entrar en el puerto', taberna: 'Entrar en la taberna', ruina: 'Acercarse a la entrada',
    pueblo: 'Acercarse', posta: 'Acercarse', quemado: 'Acercarse', campamento: 'Acercarse', palafitos: 'Acercarse', pasarela: 'Acercarse', pecio: 'Acercarse', cabana: 'Acercarse', granja: 'Acercarse', faro: 'Acercarse', torre: 'Acercarse', mina: 'Acercarse', mercado: 'Acercarse' };
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
  const limite = { x: W / 2, z: H / 2 };   // hasta dónde puede irse la cámara (cambia al entrar en una ciudad)
  control.addEventListener('change', () => {
    control.target.x = THREE.MathUtils.clamp(control.target.x, -limite.x, limite.x);
    control.target.z = THREE.MathUtils.clamp(control.target.z, -limite.z, limite.z);
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
    renderer.setSize(w, a, false); render.ajustar(w, a);
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
    for (const e of (ciudad ? ciudad.etiquetas : etiquetas)) {
      v3.copy(e.pos).project(camara);
      let op = capas.nombres && v3.z < 1 && Math.abs(v3.x) < 1.15 && Math.abs(v3.y) < 1.15 ? 1 : 0;
      if (op) {
        if (e.oculta) op = 0;   // etiqueta de otra planta
        else if (e.clase === 'puerta' || e.clase === 'hito') op = suave(ciudad.R * 4.2, ciudad.R * 3.4, lejos);
        else if (e.clase === 'barrio') op = suave(ciudad.R * 1.3, ciudad.R * 2.0, lejos) * 0.9;   // los barrios se leen de lejos
        else if (e.clase === 'region') op = w < 720 ? 0 : suave(umbral * 0.8, umbral, lejos);
        else if (e.clase === 'geo') op = suave(170, 320, lejos);
        else if (e.clase === 'lugar' && e.lugar !== elegido) op = suave(umbral, umbral * 0.8, lejos);
        if (e.lugar?.tapado || (e.clase === 'geo' && partida.estado.niebla)) op = 0;   // bajo la niebla de guerra
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
  let elegido = null, dentro = null, ciudad = null, master = null;
  const ciudades = new Map(), velo = $('#velo'), titulo = $('.cabecera h1'), pista = $('#pista'), volver = $('#volver');
  const espera = ms => new Promise(r => setTimeout(r, reducir ? 0 : ms));
  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffd35c, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthTest: false }));
  anillo.rotation.x = -Math.PI / 2; anillo.visible = false; anillo.renderOrder = 4; escena.add(anillo);
  const ficha = $('#ficha');
  const porId = Object.fromEntries(lugares.lista.map(l => [l.datos.id, l]));
  const regionDe = l => mundo.regiones.find(r => r.id === l.datos.region)?.nombre ?? '';

  function seleccionar(id, acercar) {
    const l = porId[id];
    if (!l) return;
    if (elegido?.etiqueta) elegido.etiqueta.classList.remove('activa');
    elegido = l;
    l.etiqueta?.classList.add('activa');
    anillo.visible = true;
    anillo.position.set(l.base.x, Math.max(l.base.y, 0) + 0.8, l.base.z);
    anillo.userData.radio = l.radio * 0.95;
    viajes.limpiar();
    musica.ambiente(l.datos.tipo);
    pintarFicha();
    if (acercar) {
      const dir = camara.position.clone().sub(control.target), d = THREE.MathUtils.clamp(dir.length(), 150 + l.radio * 3, 380);
      volar(l.base.clone().add(dir.setLength(d)), l.base.clone());
    }
  }
  function cerrar() {
    if (dentro) { salir(); return; }
    if (elegido?.etiqueta) elegido.etiqueta.classList.remove('activa');
    elegido = null; anillo.visible = false; ficha.hidden = true; ficha.replaceChildren(); viajes.limpiar(); musica.ambiente(null);
  }
  // Escenas anidadas: mapa → ciudad o taberna → edificio de la ciudad. Cada nivel guarda cómo estaba la cámara para volver.
  const pila = [];
  let hito = null;   // edificio señalado dentro de una ciudad
  function montar(c, nombre, clave) {
    ciudad = c;
    for (const e of c.etiquetas) {
      e.el ??= e.clase === 'hito' || e.clase === 'ciudad'
        ? h('button', { class: `etq etq-${e.clase}`, type: 'button', onclick: () => senalar(e) }, e.nombre)
        : h('div', { class: `etq etq-${e.clase}` }, e.nombre);
      capaEtq.append(e.el);
    }
    control.minDistance = c.minDist ?? 20; control.maxDistance = c.R * 5; limite.x = limite.z = c.limite;
    titulo.textContent = nombre; pista.textContent = tactil ? 'Interior · arrastra para moverte, pellizca para acercar y girar' : `Interior · Esc para volver ${pila.length > 1 ? 'atrás' : 'al mapa'}`; pista.classList.remove('fuera');
    volver.textContent = `← Volver ${pila.length > 1 ? 'atrás' : 'al mapa'}`; volver.hidden = false;
    document.body.classList.add('en-ciudad'); musica.ambiente(clave);
  }
  async function abrir(c, nombre, clave, antes) {
    velo.classList.add('puesto'); await espera(360);
    pila.push({ c, nombre, clave, pos: antes?.pos ?? camara.position.clone(), objetivo: antes?.objetivo ?? control.target.clone(), min: control.minDistance, max: control.maxDistance, hito });
    vuelo++; viajes.limpiar(); hito = null;
    if (ciudad) for (const e of ciudad.etiquetas) e.el?.remove(); else for (const e of etiquetas) e.el.style.visibility = 'hidden';
    montar(c, nombre, clave);
    camara.position.copy(c.vista.pos); control.target.copy(c.vista.objetivo);
    pintarFicha(); velo.classList.remove('puesto');
  }
  // Entrar en un lugar con interior: se levanta una vez y luego se reutiliza.
  async function entrar(l) {
    if (dentro) return;
    dentro = l;
    if (!ciudades.has(l.datos.id)) ciudades.set(l.datos.id, l.datos.tipo === 'taberna' ? crearInterior(l.datos) : l.datos.tipo === 'capital' || l.datos.tipo === 'puerto' ? crearCiudad(l.datos, mundo, { movil }) : crearEntrada(l.datos));
    // la cámara se echa encima del lugar antes del fundido; al volver se recupera la vista que había
    const antes = { pos: camara.position.clone(), objetivo: control.target.clone() };
    if (!reducir) {
      const obj = l.base.clone(); obj.y = Math.max(obj.y, 0) + 2;
      volar(obj.clone().add(camara.position.clone().sub(control.target).setLength(Math.max(control.minDistance + 4, l.radio * 1.6))), obj, 950);
      await espera(680);
    }
    await abrir(ciudades.get(l.datos.id), l.datos.nombre, l.datos.tipo === 'capital' || l.datos.tipo === 'puerto' ? 'ciudad' : l.datos.tipo, antes);
  }
  // Entrar en un edificio de la ciudad (de momento, la posada).
  async function entrarEdificio(e) {
    const clave = `${dentro.datos.id}-${e.interior}`;
    if (!ciudades.has(clave)) ciudades.set(clave, e.interior === 'posada' ? crearInterior({ id: clave, trofeo: false }) : crearSala(e.interior, clave, { color: new THREE.Color(mundo.regiones.find(r => r.id === dentro.datos.region)?.color ?? '#7a2e2a').getHex() }));
    await abrir(ciudades.get(clave), `${e.nombre} · ${dentro.datos.nombre}`, e.interior === 'posada' ? 'taberna' : 'ciudad');
  }
  async function salir() {
    if (!pila.length) return;
    velo.classList.add('puesto'); await espera(360);
    for (const e of ciudad.etiquetas) e.el.remove();
    const nivel = pila.pop(); vuelo++;
    if (pila.length) { const padre = pila[pila.length - 1]; montar(padre.c, padre.nombre, padre.clave); hito = nivel.hito; }
    else {
      dentro = null; ciudad = null; hito = null;
      control.minDistance = nivel.min; control.maxDistance = nivel.max; limite.x = W / 2; limite.z = H / 2;
      titulo.textContent = mundo.meta.nombre; pista.classList.add('fuera'); volver.hidden = true;
      document.body.classList.remove('en-ciudad'); musica.ambiente(elegido ? elegido.datos.tipo : null);
    }
    camara.position.copy(nivel.pos); control.target.copy(nivel.objetivo);
    if (elegido) pintarFicha();
    velo.classList.remove('puesto');
  }
  // Señalar un edificio: la cámara se acerca a él y la ficha dice qué es.
  function senalar(e) {
    hito = e;
    // en la ciudad se mira el edificio de frente y algo desde arriba; en un interior, basta con acercarse
    const objetivo = e.frente ? new THREE.Vector3(e.suelo.x, 3, e.suelo.z) : new THREE.Vector3(e.pos.x, e.pos.y * 0.35, e.pos.z);
    let desde;
    if (e.frente) {
      // de frente, y más lejos cuanto más alto el edificio; si en ese sitio hay otro edificio singular, se mira en escorzo
      const alto = e.pos.y - 5, lejos = 22 + alto * 0.9, otros = ciudad.etiquetas.filter(o => o.suelo && o !== e);
      let mejor = -1;
      for (const giro of [0, 0.7, -0.7, 1.3, -1.3]) {
        const p = objetivo.clone().addScaledVector(e.frente.clone().applyAxisAngle(camara.up, giro), lejos);
        const libre = Math.min(99, ...otros.map(o => Math.min(o.suelo.distanceTo(p), o.suelo.distanceTo(p.clone().lerp(objetivo, 0.35)))));
        if (libre > mejor) { mejor = libre; desde = p; }
        if (libre > 17) break;
      }
      desde.y = e.picado ? lejos * 0.9 : 9 + alto * 0.55;   // los recintos amurallados se miran más desde arriba
    } else desde = objetivo.clone().add(camara.position.clone().sub(control.target).setLength(24));
    volar(desde, objetivo, 1100);
    pintarFicha();
  }

  // Lo que se sabe del lugar: quién anda por allí, qué se dice y qué se puede hacer. El rumor cambia con el día de la partida.
  let vueltaRumor = 0;
  function lore(d) {
    const n = [];
    if (d.gente?.length) n.push(h('div', { class: 'lore' }, h('h3', {}, 'Gente'), ...d.gente.map(g => h('div', { class: 'persona' }, h('b', {}, g.nombre), ' ', h('i', {}, g.papel), h('p', {}, g.voz)))));
    if (d.rumores?.length) {
      const cual = () => d.rumores[((partida.estado.dia || 1) + vueltaRumor + d.id.length) % d.rumores.length], texto = h('p', { class: 'rumor' }, `«${cual()}»`);
      n.push(h('div', { class: 'lore' }, h('h3', {}, 'Se dice'), texto, d.rumores.length > 1 ? h('button', { class: 'otro', type: 'button', onclick: () => { vueltaRumor++; texto.textContent = `«${cual()}»`; } }, 'Otro rumor') : null));
    }
    if (d.gancho) n.push(h('div', { class: 'lore' }, h('h3', {}, 'Qué hay que hacer aquí'), h('p', { class: 'gancho' }, d.gancho)));
    return n;
  }
  function pintarFicha() {
    const l = elegido, d = l.datos;
    const nodos = [
      h('button', { class: 'cerrar', type: 'button', 'aria-label': 'Cerrar ficha', onclick: cerrar }, '×'),
      h('p', { class: 'tipo' }, `${TIPOS[d.tipo] ?? d.tipo} · ${regionDe(l)}`),
      h('h2', {}, d.nombre),
      h('p', {}, d.desc),
    ];
    if (dentro === l) {
      const enEdificio = pila.length > 1;
      if (enEdificio) nodos.splice(1, 3, h('p', { class: 'tipo' }, d.nombre), h('h2', {}, pila[pila.length - 1].nombre));
      else if (d.gobierno) nodos.push(h('div', { class: 'gobierno' }, h('h3', {}, d.gobierno.titulo), h('p', {}, d.gobierno.texto)));
      if (hito) nodos.push(h('div', { class: 'gobierno' }, h('h3', {}, 'Estás mirando'), h('p', {}, hito.nombre)));
      if (hito?.interior && !enEdificio) nodos.push(h('button', { class: 'accion', type: 'button', onclick: () => entrarEdificio(hito) }, 'Ver por dentro'));
      if (ciudad.plantas) nodos.push(h('div', { class: 'plantas', role: 'group', 'aria-label': 'Planta' }, ...ciudad.plantas.map((p, i) =>
        h('button', { type: 'button', 'aria-pressed': String(ciudad.planta === i), onclick: () => { ciudad.verPlanta(i); hito = null; pintarFicha(); } }, p.nombre))));
      nodos.push(h('button', { class: 'accion', type: 'button', onclick: salir }, enEdificio ? `← Volver a ${d.nombre}` : '← Volver al mapa'));
      if (!enEdificio) nodos.push(...(master?.ficha(d) ?? []));
      ficha.replaceChildren(...nodos); ficha.hidden = false;
      return;
    }
    if (partida.estado.grupo === d.id) nodos.push(h('p', { class: 'aqui' }, `El grupo está aquí · día ${partida.estado.dia}`));
    // notas del grupo sobre este lugar: se leen siempre y se escriben en modo edición
    const nota = partida.estado.notas?.[d.id];
    if (partida.edicion) {
      const campo = h('textarea', { rows: '3', placeholder: 'Notas del grupo sobre este lugar…', 'aria-label': `Notas sobre ${d.nombre}` }); campo.value = nota || '';
      campo.addEventListener('change', () => partida.anotar(d.id, campo.value));
      nodos.push(h('div', { class: 'notas' }, h('h3', {}, 'Notas del grupo'), campo));
    } else if (nota) nodos.push(h('div', { class: 'notas' }, h('h3', {}, 'Notas del grupo'), h('p', {}, nota)));
    if (INTERIOR[d.tipo]) nodos.push(h('button', { class: 'accion', type: 'button', onclick: () => entrar(l) }, INTERIOR[d.tipo]));
    nodos.push(...lore(d), ...(master?.ficha(d) ?? []));
    if (partida.edicion && partida.estado.grupo !== d.id && !d.oculto) nodos.push(h('button', { class: 'accion', type: 'button', onclick: () => partida.ponerGrupo(d.id) }, 'Poner aquí al grupo'));
    if (!d.oculto) {
      const copiar = h('button', { class: 'enlace', type: 'button', onclick: async () => {
        const url = `${location.origin}${location.pathname}#lugar=${d.id}`;
        try { await navigator.clipboard.writeText(url); copiar.textContent = 'Enlace copiado'; } catch { history.replaceState(null, '', url); copiar.textContent = 'Enlace en la barra de direcciones'; }
      } }, 'Copiar enlace a este lugar');
      nodos.push(copiar);
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
        // con el modo edición y el grupo en el origen, el viaje se puede hacer de verdad: avanza el día, descubre y tira encuentros
        if (partida.edicion && partida.estado.grupo === d.id) {
          const destino = sel.value;
          res.append(h('button', { class: 'accion', type: 'button', onclick: () => {
            const inf = partida.viajar(r, d.id, destino);
            seleccionar(destino, false);
            const hueco = ficha.querySelector('.viaje');
            hueco.append(h('p', { class: 'resultado' }, `Viaje hecho: ${inf.dias} ${inf.dias === 1 ? 'día' : 'días'} de camino.`),
              inf.encuentros.length ? h('ul', { class: 'encuentros' }, ...inf.encuentros.map(e => h('li', {}, h('b', {}, `Día ${e.dia}, ${e.zona}: `), `${e.que} (tirada ${e.tirada})`))) : h('p', { class: 'nota' }, 'Sin encuentros.'),
              h('p', { class: 'nota' }, mundo.encuentros?.nota ?? ''));
          } }, 'Hacer este viaje con el grupo'));
        }
      });
      viaje.append(sel, res);
    }
    nodos.push(viaje);
    ficha.replaceChildren(...nodos);
    ficha.hidden = false;
  }

  const rayo = new THREE.Raycaster(), raton = new THREE.Vector2();
  function lugarEn(ev) {
    if (dentro) return null;
    raton.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    rayo.setFromCamera(raton, camara);
    return rayo.intersectObjects(lugares.dianas, false).map(i => i.object.userData.id).find(id => !porId[id].tapado) ?? null;
  }
  let ticSonido = 0, esperaPunto = null;   // esperaPunto: alguien aguarda a que se pulse un sitio del mapa
  const soltarPunto = p => { const si = esperaPunto; esperaPunto = null; lienzo.style.cursor = 'grab'; pista.classList.add('fuera'); volver.hidden = !pila.length; if (pila.length) volver.textContent = `← Volver ${pila.length > 1 ? 'atrás' : 'al mapa'}`; si?.(p); };
  volver.addEventListener('click', () => { if (esperaPunto) soltarPunto(null); else salir(); });
  const partida = await crearPartida({ mundo, terreno, lugares, escena, viajes, h, cuerpo: $('#partidaCuerpo'), pedirPunto: () => new Promise(si => { esperaPunto?.(null); esperaPunto = si; lienzo.style.cursor = 'crosshair'; $('#partida').open = false; pista.textContent = tactil ? 'Toca el mapa donde quieras clavar la marca' : 'Pulsa en el mapa donde quieras clavar la marca · Esc para dejarlo'; pista.classList.remove('fuera'); volver.textContent = 'Dejar la marca'; volver.hidden = false; }), alCambiar: () => { if (elegido?.tapado) cerrar(); else if (elegido && !dentro) pintarFicha(); } });
  const botonMusica = $('#musica');
  botonMusica.addEventListener('click', () => { musica.activar(!musica.activa); sonido.activar(musica.activa); botonMusica.setAttribute('aria-pressed', String(musica.activa)); botonMusica.title = musica.activa ? 'Quitar la música' : 'Poner música'; });
  // Un toque elige; arrastrar o usar dos dedos, no. El dedo tiembla más que el ratón, así que se le da más margen.
  let pulsado = null, dedos = 0;
  lienzo.addEventListener('pointerdown', ev => { dedos++; pulsado = dedos > 1 ? null : { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
  for (const fin of ['pointercancel', 'pointerleave']) lienzo.addEventListener(fin, () => { dedos = 0; pulsado = null; });
  lienzo.addEventListener('pointerup', ev => {
    dedos = Math.max(0, dedos - 1); const margen = ev.pointerType === 'mouse' ? 6 : 14, toque = pulsado; pulsado = null;
    if (!toque || dedos || Math.hypot(ev.clientX - toque.x, ev.clientY - toque.y) > margen || performance.now() - toque.t > 700) return;
    if (esperaPunto) { raton.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1); rayo.setFromCamera(raton, camara); const toque = rayo.intersectObject(terreno.malla, false)[0]; soltarPunto(toque ? [toque.point.x + terreno.cx, toque.point.z + terreno.cz] : null); return; }
    const id = lugarEn(ev);
    if (id) seleccionar(id, true);
  });
  // Girar retorciendo dos dedos, como en cualquier mapa. Los mandos de serie solo giran si los dos dedos se desplazan juntos
  // (eso sigue valiendo para inclinar la vista); el giro de muñeca se añade aquí.
  const yemas = new Map(), ejeGiro = new THREE.Vector3(0, 1, 0); let anguloYemas = null;
  const anguloDe = () => { const [a, b] = [...yemas.values()]; return Math.atan2(b.y - a.y, b.x - a.x); };
  lienzo.addEventListener('pointerdown', ev => { if (ev.pointerType !== 'touch') return; yemas.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); anguloYemas = yemas.size === 2 ? anguloDe() : null; });
  lienzo.addEventListener('pointermove', ev => {
    if (!yemas.has(ev.pointerId)) return; yemas.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (yemas.size !== 2 || anguloYemas === null || document.body.classList.contains('portada-activa')) return;
    const a = anguloDe(), d = Math.atan2(Math.sin(a - anguloYemas), Math.cos(a - anguloYemas)); anguloYemas = a;
    if (Math.abs(d) > 0.0004) camara.position.sub(control.target).applyAxisAngle(ejeGiro, d).add(control.target);
  });
  for (const fin of ['pointerup', 'pointercancel']) lienzo.addEventListener(fin, ev => { yemas.delete(ev.pointerId); anguloYemas = null; });
  let ultimoHover = 0;
  lienzo.addEventListener('pointermove', ev => {
    if (ev.pointerType !== 'mouse' || ev.buttons || esperaPunto || performance.now() - ultimoHover < 60) return;
    ultimoHover = performance.now();
    const id = lugarEn(ev);
    lienzo.style.cursor = id && !porId[id].datos.oculto ? 'pointer' : 'grab';
  });
  addEventListener('keydown', ev => { if (ev.key !== 'Escape') return; if (esperaPunto) soltarPunto(null); else if (elegido || dentro) cerrar(); });

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

  // códice
  // Vista de máster: sale de un archivo que solo tiene el máster y que se lee en este equipo; la web no lleva nada de eso.
  const mm = { cargar: $('#masterCargar'), archivo: $('#masterArchivo'), ver: $('#masterVer'), libro: $('#masterLibro'), quitar: $('#masterQuitar'), chip: $('#chipMaster') };
  let codice = null;
  master = crearMaster({ h, mundo, alCambiar: () => {
    mm.cargar.textContent = master.cargado ? 'Cambiar archivo de máster…' : 'Vista de máster…';
    mm.ver.hidden = mm.quitar.hidden = !master.cargado; mm.libro.hidden = mm.chip.hidden = !master.visible; mm.ver.querySelector('input').checked = master.visible;
    if (elegido) pintarFicha(); codice?.repintar();
  } });
  mm.cargar.addEventListener('click', () => mm.archivo.click());
  mm.archivo.addEventListener('change', async () => { const f = mm.archivo.files[0]; mm.archivo.value = ''; if (!f) return; try { await master.cargar(f); } catch (e) { mm.cargar.textContent = 'Ese archivo no vale'; setTimeout(() => master.ver(master.visible), 2200); console.warn(e); } });
  mm.ver.querySelector('input').addEventListener('change', ev => master.ver(ev.target.checked));
  mm.quitar.addEventListener('click', () => master.quitar());
  mm.libro.addEventListener('click', () => codice.abrir('Máster'));
  addEventListener('keydown', ev => { if ((ev.key === 'm' || ev.key === 'M') && master.cargado && !ev.target.matches('input, textarea, select') && !ev.ctrlKey && !ev.metaKey) master.ver(!master.visible); });
  codice = crearCodice({ mundo, h, master, visible: l => !l.oculto && !porId[l.id]?.tapado, ir: id => { if (dentro) return; seleccionar(id, true); } });
  master.ver(false);   // aunque el archivo esté guardado, al abrir no se enseña nada: hay que pedirlo
  $('#abrirCodice').addEventListener('click', () => codice.abrir());
  // modo foto: fuera la interfaz, y la imagen se puede guardar tal cual se ve
  let pedirFoto = false;
  const modoFoto = v => { document.body.classList.toggle('foto', v); $('#barraFoto').hidden = !v; if (!v) { render.foco = 0; $('#fotoMaqueta').checked = false; } };
  $('#modoFoto').addEventListener('click', () => { modoFoto(true); document.querySelector('.capas').open = false; });
  $('#fotoSalir').addEventListener('click', () => modoFoto(false)); $('#fotoMaqueta').addEventListener('change', ev => { render.foco = ev.target.checked ? 1 : 0; });
  $('#fotoGuardar').addEventListener('click', () => { pedirFoto = true; });
  addEventListener('keydown', ev => { if (ev.target.matches('input, textarea, select')) return; if (ev.key === 'f' || ev.key === 'F') modoFoto(!document.body.classList.contains('foto')); else if (ev.key === 'Escape' && document.body.classList.contains('foto')) modoFoto(false); });
  const selCalidad = $('#calidad'); selCalidad.value = calidad;
  selCalidad.addEventListener('change', () => { try { localStorage.setItem('alden-calidad', selCalidad.value); } catch { /* no se puede guardar */ } location.reload(); });
  // buscador: escribe el nombre de un lugar y el mapa vuela hasta él
  const buscar = $('#buscar'), sinTildes = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visibles = () => lugares.lista.filter(l => !l.datos.oculto && !l.tapado);
  buscar.addEventListener('focus', () => $('#lugaresLista').replaceChildren(...visibles().map(l => h('option', { value: l.datos.nombre }))));
  const irA = () => { const q = sinTildes(buscar.value.trim()); if (!q || dentro) return; const l = visibles().find(o => sinTildes(o.datos.nombre) === q) || visibles().find(o => sinTildes(o.datos.nombre).includes(q)); if (l) { seleccionar(l.datos.id, true); buscar.value = ''; buscar.blur(); } };
  buscar.addEventListener('change', irA); buscar.addEventListener('keydown', ev => { if (ev.key === 'Enter') irA(); });
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
    general: () => { const v = ciudad ? ciudad.vista : vistaGeneral(); volar(v.pos.clone(), v.objetivo.clone(), 1400); },
  };
  document.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => ACCIONES[b.dataset.cam]()));
  const aguja = $('#brujula span');
  if (tactil) $('#pista').textContent = 'Arrastra para moverte · pellizca con dos dedos para acercar y girar · toca un lugar para abrirlo';
  setTimeout(() => $('#pista')?.classList.add('fuera'), 9000);

  /* ---------- bucle ---------- */
  let antes = performance.now(), t = 0;
  function cuadro(ahora) {
    const dt = Math.min(0.1, (ahora - antes) / 1000); antes = ahora; t += dt;
    actualizarAnimaciones(ahora);
    if (sonido.activo && (ticSonido++ % 20) === 0) {   // ambiente sonoro: según el interior o, en el mapa, lo que haya bajo la cámara
      const noche = ambiente.estado.noche, dia = 1 - noche;
      if (ciudad) { const s = ciudad.sonido || {}, bajoTecho = !ciudad.escena.fog, agua = dentro ? lluvia(t, dentro.datos.region) * (bajoTecho ? 0.35 : 1) : 0; sonido.mezcla(s.calle ? { gentio: (s.gentio || 0) * dia * (1 - agua * 0.6), pajaros: (s.pajaros || 0) * dia * (1 - agua), grillos: noche * 0.5, mar: s.mar, viento: 0.12, lluvia: agua } : { ...s, pajaros: (s.pajaros || 0) * (1 - agua), lluvia: agua }); }
      else {
        const zona = terreno.zonaEn(control.target.x + terreno.cx, control.target.z + terreno.cz), alto = Math.min(1, camara.position.y / 260);
        sonido.mezcla(zona === 'mar' ? { mar: 0.9 - alto * 0.5, viento: 0.2 + alto * 0.4 } : zona === 'thraengarde' ? { viento: 0.75 + alto * 0.25 }
          : zona === 'marisma' ? { grillos: 0.4 + noche * 0.6, viento: 0.15 + alto * 0.4 } : { viento: 0.18 + alto * 0.5, pajaros: dia * (1 - alto) * 0.8 * (1 - (ambiente.estado.lluvia || 0)), grillos: noche * (1 - alto) * 0.6, lluvia: (ambiente.estado.lluvia || 0) * (1 - alto * 0.5) });
      }
    }
    if (corriendo) { hora = (hora + dt * 24 / SEG_POR_DIA) % 24; barra.value = hora; pintarHora(); }
    if (enPortada) { const a = t * 0.02; control.target.set(Math.sin(a * 0.7) * 260, 4, Math.cos(a) * 120 - 40); camara.position.set(control.target.x + Math.sin(a) * 330, 190, control.target.z + Math.cos(a) * 330); }
    control.update();
    if (camara.position.y < (ciudad ? 3 : 6)) camara.position.y = ciudad ? 3 : 6;
    aguja.style.transform = `rotate(${control.getAzimuthalAngle()}rad)`;
    if (ciudad) {
      ciudad.actualizar(t, ambiente.luz, ambiente.estado.noche);
      render.dibujar(ciudad.escena, camara, { noche: ambiente.estado.noche, lejos: camara.position.distanceTo(control.target), interior: !ciudad.escena.fog && ciudad.R <= 30 });
    } else {
      ambiente.actualizar(t, dt, camara, control.target);
      partida.actualizar(t);
      if (anillo.visible) { const r = anillo.userData.radio * (1 + 0.06 * Math.sin(t * 3)); anillo.scale.set(r, r, 1); }
      render.dibujar(escena, camara, { noche: ambiente.estado.noche, lejos: camara.position.distanceTo(control.target) });
    }
    if (pedirFoto) { pedirFoto = false; lienzo.toBlob(b => { if (!b) return; const a = h('a', { href: URL.createObjectURL(b), download: `tierras-de-alden-${Date.now()}.png` }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png'); }
    colocarEtiquetas();
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
  // Portada: el mapa gira despacio detrás del título hasta que se entra. El clic de entrada sirve además para poder sonar.
  const conEnlace = /(lugar|partida)=/.test(location.hash);
  let enPortada = !conEnlace && !reducir;
  const entrarAlMapa = conSonido => { enPortada = false; carga.classList.add('fuera'); document.body.classList.remove('portada-activa'); if (conSonido && !musica.activa) botonMusica.click(); vistaGeneral(true); lienzo.focus(); };
  if (enPortada) {
    document.body.classList.add('portada-activa'); carga.classList.add('lista'); $('#cargaTexto').textContent = 'Cuatro tierras, una frontera que arde y un invierno que llega pronto.'; $('#carga .entradas').hidden = false;
    $('#entrarSon').addEventListener('click', () => entrarAlMapa(true)); $('#entrarMudo').addEventListener('click', () => entrarAlMapa(false)); $('#entrarSon').focus();
    control.target.set(-250, 4, -160); camara.position.set(-250, 150, 120);
  } else carga.classList.add('fuera');
  // Para trastear desde la consola: mapa.seleccionar('faro'), mapa.ponerHora(22)…
  // enlace a un lugar: …/#lugar=id abre el mapa ya centrado en él
  const irAlEnlace = () => { const id = new URLSearchParams(location.hash.slice(1)).get('lugar'), l = id && porId[id]; if (l && !l.tapado && !l.datos.oculto && !dentro) seleccionar(id, true); };
  addEventListener('hashchange', irAlEnlace); irAlEnlace();
  window.mapa = { get interior() { return ciudad; },
    seleccionar, entrar: id => { seleccionar(id, false); return entrar(porId[id]); }, salir, camara, control, partida,
    ponerHora: v => { hora = v; ponerReloj(false); barra.value = v; pintarHora(); },
    equipo: { tactil, tableta, pequena, get nivel() { return render.nivel; }, get oclusion() { return render.oclusion; }, pixeles: renderer.getPixelRatio() },
    enPantalla: id => { const v = porId[id].base.clone().project(camara); return [(v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight]; },
  };
}

iniciar().catch(e => {
  console.error(e);
  document.querySelector('#cargaTexto').textContent = 'No se ha podido cargar el mapa. Recarga la página.';
});
