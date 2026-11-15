// master.js — la vista del máster: lo que los jugadores no deben ver.
// Nada de eso va en esta web. Es un archivo aparte que el máster carga desde su equipo y que se queda en su navegador;
// aquí solo está el lector. Sin archivo, esta parte no enseña nada, y con él se oculta y se muestra con la tecla M.
const CLAVE = 'alden-master';
const VERDAD = { cierto: 'Cierto', 'a medias': 'A medias', falso: 'Falso' };

export function crearMaster({ h, mundo, alCambiar }) {
  let datos = null, visible = false;
  try { const t = localStorage.getItem(CLAVE); if (t) datos = JSON.parse(t); } catch { /* sin almacenamiento, o lo guardado no vale */ }
  const marcar = () => { document.body.classList.toggle('master', visible && !!datos); alCambiar?.(); };
  const si = (...n) => n.flat().filter(Boolean);
  const lista = (cosas, ordenada) => cosas?.length ? h(ordenada ? 'ol' : 'ul', {}, ...cosas.map(c => h('li', {}, c))) : null;
  const dato = (titulo, texto) => texto ? h('p', {}, h('b', {}, titulo + ' '), texto) : null;

  const api = {
    get cargado() { return !!datos; }, get visible() { return visible && !!datos; },
    ver(v) { visible = !!v && !!datos; marcar(); },
    async cargar(archivo) {
      const d = JSON.parse(await archivo.text());
      if (!d || typeof d !== 'object' || !d.lugares || typeof d.lugares !== 'object') throw new Error('No parece un archivo de máster.');
      datos = d; visible = true;
      try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch { /* se queda solo hasta cerrar la pestaña */ }
      marcar();
    },
    quitar() { datos = null; visible = false; try { localStorage.removeItem(CLAVE); } catch { /* nada que borrar */ } marcar(); },

    // lo que se añade a la ficha de un lugar
    ficha(d) {
      const m = api.visible && datos.lugares[d.id]; if (!m) return [];
      const x = m.dentro;
      return [h('div', { class: 'lore master' }, ...si(
        h('h3', {}, 'Solo máster'),
        m.secreto && h('p', { class: 'secreto' }, m.secreto),
        m.rumores?.length && d.rumores?.length && [h('h4', {}, 'Qué hay de cierto'), h('ul', { class: 'verdades' }, ...d.rumores.map((r, i) => { const v = m.rumores[i] || {}; return h('li', {}, h('span', { class: 'verdad v-' + String(v.verdad).replace(/\s/g, '-') }, VERDAD[v.verdad] ?? '¿?'), ` «${r}» `, ...si(v.que && h('em', {}, v.que))); }))],
        m.gente && [h('h4', {}, 'Lo que calla cada uno'), ...Object.entries(m.gente).map(([nombre, que]) => dato(nombre + '.', que))],
        x && [h('h4', {}, 'Dentro'), x.que_es && h('p', {}, x.que_es), dato('Entrada.', x.entrada), lista(x.salas, true), dato('Lo que guarda.', x.guardian), dato('Lo que se saca.', x.premio), dato('Lo que cuesta.', x.consecuencia)],
        m.giro && [h('h4', {}, 'Para la mesa'), h('p', {}, m.giro)],
      ))];
    },

    // la pestaña del códice: el hilo, los frentes, lo que oculta cada facción y la reserva para improvisar
    paginas() {
      if (!api.visible) return [];
      const p = [], hilo = datos.hilo, R = datos.reserva || {};
      if (hilo) p.push(h('article', { class: 'ancho' }, ...si(h('h3', {}, hilo.titulo), h('p', {}, hilo.resumen),
        hilo.piezas?.length && h('dl', {}, ...hilo.piezas.flatMap(z => [h('dt', {}, `${z.nombre} · ${z.es}`), h('dd', {}, z.texto)])),
        hilo.ahora && [h('h4', {}, 'Qué pasa ahora'), h('p', {}, hilo.ahora)], hilo.quien_sabe && [h('h4', {}, 'Quién lo sabe'), h('p', {}, hilo.quien_sabe)],
        hilo.pistas?.length && [h('h4', {}, 'Tres pistas que lo unen'), lista(hilo.pistas)], hilo.palanca && [h('h4', {}, 'El punto débil'), h('p', {}, hilo.palanca)],
        hilo.finales?.length && [h('h4', {}, 'Cómo puede acabar'), lista(hilo.finales)],
        hilo.aldrian && [h('h4', {}, 'Aldrian'), dato('Propuesta.', hilo.aldrian.propuesta), dato('Alternativa.', hilo.aldrian.alternativa), hilo.aldrian.nota && h('p', { class: 'menor' }, hilo.aldrian.nota)])));
      for (const f of datos.frentes || []) p.push(h('article', {}, ...si(h('h3', {}, f.nombre), h('p', { class: 'lema' }, `Frente · ${f.quien || ''}`), lista(f.reloj, true), dato('Lo que lo frena.', f.frenos))));
      for (const f of mundo.facciones || []) { const s = datos.facciones?.[f.id]; if (s) p.push(h('article', {}, ...si(h('h3', {}, f.nombre), h('p', { class: 'lema' }, 'Lo que oculta'), h('p', {}, s.secreto), dato('Por dónde cogerla.', s.palanca)))); }
      if (R.pnj?.length) p.push(h('article', {}, h('h3', {}, 'Gente de reserva'), h('p', { class: 'lema' }, 'Para cuando haga falta alguien'), ...R.pnj.map(g => h('p', {}, h('b', {}, `${g.nombre}, ${g.papel}. `), g.voz))));
      if (R.giros?.length) p.push(h('article', {}, h('h3', {}, 'Giros de emergencia'), h('p', { class: 'lema' }, 'Cuando la sesión se para'), lista(R.giros)));
      if (R.atasco?.length || R.antes_de_cada_sesion?.length) p.push(h('article', {}, ...si(h('h3', {}, 'Mesa'), R.antes_de_cada_sesion?.length && [h('p', { class: 'lema' }, 'Antes de cada sesión'), lista(R.antes_de_cada_sesion)], R.atasco?.length && [h('p', { class: 'lema' }, 'Si se atasca'), lista(R.atasco)])));
      if (datos.meta) p.push(h('article', {}, ...si(h('h3', {}, 'Notas'), dato('Sistema.', datos.meta.sistema), dato('Tono.', datos.meta.tono))));
      return p;
    },
  };
  return api;
}
