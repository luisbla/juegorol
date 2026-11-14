// partida.js — estado de la campaña: día, dónde está el grupo, qué se ha descubierto y el diario de viajes.
// La base es assets/data/partida.json (lo que ve todo el mundo). Los cambios hechos aquí se guardan en este
// navegador como borrador; para compartirlos hay que descargar el archivo y subirlo al repositorio.
import * as THREE from 'three';

const CLAVE = 'alden-partida';
const VACIA = { niebla: false, dia: 1, grupo: null, descubiertos: [], diario: [], notas: {}, marcas: [] };

export async function crearPartida({ mundo, terreno, lugares, escena, viajes, h, cuerpo, alCambiar, centro }) {
  const { W, H, cx, cz } = terreno;
  let base = VACIA;
  try { const r = await fetch('assets/data/partida.json', { cache: 'no-store' }); if (r.ok) base = { ...VACIA, ...(await r.json()) }; } catch { /* sin archivo: partida vacía */ }
  const huella = JSON.stringify(base);
  let estado = structuredClone(base), borrador = false, edicion = false;
  try {   // el borrador solo vale si se hizo sobre la misma base que hay publicada
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (g && g.huella === huella) { estado = { ...VACIA, ...g.estado }; borrador = true; }
  } catch { /* almacenamiento no disponible */ }
  const porId = Object.fromEntries(lugares.lista.map(l => [l.datos.id, l]));
  const nombre = id => porId[id]?.datos.nombre ?? id;

  /* ---------- niebla de guerra: un mar de nubes con claros sobre lo descubierto ---------- */
  const lienzo = document.createElement('canvas'); lienzo.width = 512; lienzo.height = Math.round(512 * H / W);
  const ctx = lienzo.getContext('2d'), k = lienzo.width / W;
  const mascara = new THREE.CanvasTexture(lienzo); mascara.minFilter = mascara.magFilter = THREE.LinearFilter;
  const nubes = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.ShaderMaterial({
    uniforms: { uMascara: { value: mascara }, uTiempo: terreno.uniformes.uTiempo, uLuz: terreno.uniformes.uLuz },
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; varying vec2 vP; void main(){ vUv = uv; vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; varying vec2 vP; uniform sampler2D uMascara; uniform float uTiempo, uLuz;
      float hN(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float rN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hN(i), hN(i+vec2(1,0)), f.x), mix(hN(i+vec2(0,1)), hN(i+vec2(1,1)), f.x), f.y); }
      float fN(vec2 p){ return rN(p)*0.55 + rN(p*2.1+7.3)*0.3 + rN(p*4.3+1.7)*0.15; }
      void main(){
        float claro = texture2D(uMascara, vUv).r;
        float deriva = fN(vP * 0.012 + vec2(uTiempo * 0.012, 0.0));
        float tapa = smoothstep(0.78, 0.3, claro + (deriva - 0.5) * 0.55);       // borde deshilachado y que se mueve
        if (tapa < 0.01) discard;
        float bulto = fN(vP * 0.03 - vec2(uTiempo * 0.02, uTiempo * 0.008));
        vec3 col = mix(vec3(0.56, 0.60, 0.67), vec3(0.94, 0.95, 0.97), bulto) * (0.22 + 0.78 * uLuz);
        gl_FragColor = vec4(col, tapa * 0.985);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  nubes.rotation.x = -Math.PI / 2; nubes.position.y = 38; nubes.renderOrder = 9;
  escena.add(nubes);

  function pintarMascara() {
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.globalCompositeOperation = 'lighter';
    const claro = (x, y, r) => {
      const g = ctx.createRadialGradient(x * k, y * k, r * 0.3 * k, x * k, y * k, r * k);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect((x - r) * k, (y - r) * k, 2 * r * k, 2 * r * k);
    };
    for (const id of estado.descubiertos) { const l = porId[id]; if (l) claro(l.datos.x, l.datos.y, l.datos.tipo === 'capital' ? 125 : 90); }
    for (const e of estado.diario) { const r = viajes.ruta(e.de, e.a); if (r) for (let i = 0; i < r.trazo.length; i += 5) claro(r.trazo[i][0], r.trazo[i][1], 58); }
    mascara.needsUpdate = true;
  }

  /* ---------- el grupo y el camino recorrido ---------- */
  const grupo = new THREE.Group(), oro = new THREE.MeshBasicMaterial({ color: 0xffd35c, side: THREE.DoubleSide });
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 20, 6), new THREE.MeshBasicMaterial({ color: 0x2a2018 })); asta.position.y = 10;
  const gPendon = new THREE.PlaneGeometry(9, 5, 8, 1); gPendon.translate(4.5, 0, 0);
  const pendon = new THREE.Mesh(gPendon, oro); pendon.position.y = 17;
  const aro = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.4, 32), oro); aro.rotation.x = -Math.PI / 2; aro.position.y = 0.6;
  grupo.add(asta, pendon, aro); grupo.visible = false; escena.add(grupo);
  const rastro = new THREE.Group(); escena.add(rastro);
  const matRastro = new THREE.MeshBasicMaterial({ color: 0xb8402f, transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide });

  function pintarRastro() {
    for (const m of [...rastro.children]) { rastro.remove(m); m.geometry.dispose(); }
    for (const e of estado.diario) {
      const r = viajes.ruta(e.de, e.a); if (!r) continue;
      const pts = r.trazo.map(([x, y]) => terreno.aMundo(x, y, Math.max(terreno.alturaEn(x, y), 0.2) + 1.3)), p = [], ix = [];
      pts.forEach((v, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1;
        p.push(v.x - tz / l * 1.1, v.y, v.z + tx / l * 1.1, v.x + tz / l * 1.1, v.y, v.z - tx / l * 1.1);
        if (i < pts.length - 1 && i % 3 !== 2) { const q = i * 2; ix.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }   // a trazos
      });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(ix);
      const m = new THREE.Mesh(g, matRastro); m.renderOrder = 5; rastro.add(m);
    }
  }

  /* ---------- marcas libres sobre el mapa: un banderín y su rótulo ---------- */
  const marcas = new THREE.Group(); escena.add(marcas);
  const rotuloDe = texto => {
    const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = '600 34px Georgia, serif'; c.width = Math.ceil(x.measureText(texto).width) + 36; c.height = 56;
    x.font = '600 34px Georgia, serif'; x.fillStyle = 'rgba(14,16,21,0.82)'; x.beginPath(); x.roundRect(0, 0, c.width, c.height, 28); x.fill(); x.fillStyle = '#ffe9b0'; x.textBaseline = 'middle'; x.fillText(texto, 18, 30);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(c.width / 15, c.height / 15, 1); s.renderOrder = 8; return s;
  };
  function pintarMarcas() {
    for (const m of [...marcas.children]) { marcas.remove(m); m.traverse(o => { o.material?.map?.dispose(); o.material?.dispose?.(); }); }
    for (const m of estado.marcas) {
      const g = new THREE.Group(), y = Math.max(terreno.alturaEn(m.x, m.y), 0);
      const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 11, 6), new THREE.MeshBasicMaterial({ color: 0x2a2018 })); palo.position.y = 5.5;
      const tela = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 3), new THREE.MeshBasicMaterial({ color: 0xc8402f })); tela.rotation.z = -Math.PI / 2; tela.position.set(2.5, 9.2, 0); tela.scale.z = 0.12;
      const r = rotuloDe(m.texto); r.position.y = 15;
      g.add(palo, tela, r); g.position.set(m.x - cx, y, m.y - cz); marcas.add(g);
    }
  }
  const anotar = (id, texto) => { if (texto.trim()) estado.notas[id] = texto.trim(); else delete estado.notas[id]; cambiar(); };
  const marcar = texto => { const [x, y] = centro(); estado.marcas.push({ x: Math.round(x), y: Math.round(y), texto: texto.trim().slice(0, 60) }); cambiar(); };

  function aplicar() {
    nubes.visible = estado.niebla;
    for (const l of lugares.lista) {
      l.tapado = estado.niebla && !estado.descubiertos.includes(l.datos.id);
      l.grupo.visible = !l.tapado;
    }
    const l = porId[estado.grupo];
    grupo.visible = !!l;
    if (l) grupo.position.set(l.base.x + l.radio * 0.8 + 4, Math.max(l.base.y, 0), l.base.z + l.radio * 0.5);
    marcas.visible = true; pintarMarcas();
    pintarMascara(); pintarRastro(); pintarPanel();
    alCambiar?.();
  }
  function cambiar() {
    borrador = true;
    try { localStorage.setItem(CLAVE, JSON.stringify({ huella, estado })); } catch { /* sin almacenamiento: vale para esta visita */ }
    aplicar();
  }

  /* ---------- acciones ---------- */
  function ponerGrupo(id) {
    estado.grupo = id || null;
    if (id && !estado.descubiertos.includes(id)) estado.descubiertos.push(id);
    cambiar();
  }
  // El grupo recorre una ruta: pasan los días, se descubre lo que queda junto al camino y se tira por encuentros.
  function viajar(r, de, a) {
    const dias = Math.max(1, Math.ceil(r.dias - 0.15)), encuentros = [], cfg = mundo.encuentros;
    if (cfg) for (let d = 0; d < dias; d++) {
      const p = r.trazo[Math.min(r.trazo.length - 1, Math.floor((d + 0.5) / dias * r.trazo.length))], zona = terreno.zonaEn(p[0], p[1]), z = cfg.zonas[zona];
      if (!z) continue;
      const tirada = 1 + Math.floor(Math.random() * 20);
      if (tirada >= z.umbral) encuentros.push({ dia: estado.dia + d, zona: z.nombre, tirada, que: z.tabla[Math.floor(Math.random() * z.tabla.length)] });
    }
    const vistos = lugares.lista.filter(l => !l.datos.oculto && r.trazo.some(p => Math.hypot(p[0] - l.datos.x, p[1] - l.datos.y) < 34)).map(l => l.datos.id);
    estado.descubiertos = [...new Set([...estado.descubiertos, de, a, ...vistos])];
    estado.diario.push({ dia: estado.dia, de, a, km: Math.round(r.km), dias, encuentros: encuentros.map(e => ({ dia: e.dia, zona: e.zona, que: e.que })) });
    estado.dia += dias; estado.grupo = a;
    cambiar();
    return { dias, encuentros };
  }
  function descargar() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(estado, null, 2) + '\n'], { type: 'application/json' }));
    const a = h('a', { href: url, download: 'partida.json' }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function descartar() { try { localStorage.removeItem(CLAVE); } catch { /* nada que borrar */ } estado = structuredClone(base); borrador = false; aplicar(); }

  /* ---------- panel ---------- */
  function pintarPanel() {
    const sel = h('select', { 'aria-label': 'Dónde está el grupo', onchange: ev => ponerGrupo(ev.target.value) }, h('option', { value: '' }, '— sin colocar —'));
    for (const r of mundo.regiones) {
      const g = h('optgroup', { label: r.nombre });
      for (const l of lugares.lista) if (!l.datos.oculto && l.datos.region === r.id) g.append(h('option', { value: l.datos.id, selected: l.datos.id === estado.grupo ? '' : null }, l.datos.nombre));
      sel.append(g);
    }
    const marca = (texto, puesto, alCambiarla) => h('label', {}, h('input', { type: 'checkbox', checked: puesto ? '' : null, onchange: ev => alCambiarla(ev.target.checked) }), ' ' + texto);
    const diario = estado.diario.slice(-4).reverse().map(e => h('li', {}, `Día ${e.dia}: ${nombre(e.de)} → ${nombre(e.a)} · ${e.km} km, ${e.dias} ${e.dias === 1 ? 'día' : 'días'}${e.encuentros?.length ? ` · ${e.encuentros.length} encuentro${e.encuentros.length > 1 ? 's' : ''}` : ''}`));
    cuerpo.replaceChildren(...[
      h('div', { class: 'fila' }, h('span', {}, `Día ${estado.dia} de campaña`),
        h('button', { type: 'button', 'aria-label': 'Un día menos', onclick: () => { estado.dia = Math.max(1, estado.dia - 1); cambiar(); } }, '−'),
        h('button', { type: 'button', 'aria-label': 'Un día más', onclick: () => { estado.dia++; cambiar(); } }, '+')),
      h('p', { class: 'rotulo' }, 'El grupo está en'), sel,
      marca('Niebla de guerra', estado.niebla, v => { estado.niebla = v; cambiar(); }),
      marca('Modo edición (viajar y colocar desde las fichas)', edicion, v => { edicion = v; alCambiar?.(); }),
      diario.length ? h('p', { class: 'rotulo' }, 'Diario') : null, diario.length ? h('ul', {}, ...diario) : null,
      estado.marcas.length || edicion ? h('p', { class: 'rotulo' }, 'Marcas en el mapa') : null,
      estado.marcas.length ? h('ul', { class: 'marcas' }, ...estado.marcas.map((m, i) => h('li', {}, m.texto, edicion ? h('button', { type: 'button', 'aria-label': `Quitar la marca «${m.texto}»`, onclick: () => { estado.marcas.splice(i, 1); cambiar(); } }, '×') : null))) : null,
      edicion ? (() => { const campo = h('input', { type: 'text', maxlength: '60', placeholder: 'Aquí nos emboscaron…', 'aria-label': 'Texto de la marca' }); const poner = () => { if (campo.value.trim()) marcar(campo.value); }; campo.addEventListener('keydown', ev => { if (ev.key === 'Enter') poner(); }); return h('div', { class: 'fila' }, campo, h('button', { type: 'button', class: 'ancho', onclick: poner }, 'Marcar el centro')); })() : null,
      h('button', { type: 'button', class: 'ancho', onclick: descargar }, 'Descargar partida.json'),
      borrador ? h('button', { type: 'button', class: 'ancho', onclick: descartar }, 'Descartar mis cambios') : null,
      h('p', { class: 'nota' }, borrador ? 'Hay cambios guardados solo en este navegador. Para que los vea el resto, sube el archivo descargado a assets/data/. Ojo: notas y marcas van dentro y las leerá cualquiera que abra el mapa.' : 'Mostrando la partida publicada.'),
    ].filter(Boolean));
  }

  function actualizar(t) {
    if (!grupo.visible) return;
    const p = gPendon.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 0.8 - t * 5) * 0.12 * x); }
    p.needsUpdate = true;
    aro.scale.setScalar(1 + 0.12 * Math.sin(t * 3));
  }

  aplicar();
  return { get estado() { return estado; }, get edicion() { return edicion; }, ponerGrupo, viajar, actualizar, anotar };
}
