// codice.js — el libro del mundo: regiones, facciones, gente y crónica, sacados de mundo.json.
// Con la niebla de guerra puesta solo aparece la gente de los lugares ya descubiertos.
export function crearCodice({ mundo, h, visible, ir }) {
  const dlg = h('dialog', { id: 'codice', 'aria-label': 'Códice de las Tierras de Alden' });
  document.body.append(dlg);
  const region = id => mundo.regiones.find(r => r.id === id)?.nombre ?? '';
  const PESTANAS = {
    Regiones: () => mundo.regiones.map(r => h('article', {}, h('h3', {}, r.nombre), h('p', { class: 'lema' }, r.lema || ''), h('p', {}, r.texto || ''),
      h('p', { class: 'menor' }, 'Lugares: ', ...mundo.lugares.filter(l => l.region === r.id && visible(l)).flatMap((l, i) => [i ? ', ' : '', h('button', { type: 'button', class: 'vinculo', onclick: () => { dlg.close(); ir(l.id); } }, l.nombre)])))),
    Facciones: () => (mundo.facciones || []).map(f => h('article', {}, h('h3', {}, f.nombre), h('p', { class: 'lema' }, region(f.region)),
      h('dl', {}, h('dt', {}, 'Quiere'), h('dd', {}, f.quiere), h('dt', {}, 'Su problema'), h('dd', {}, f.problema), h('dt', {}, 'Qué ofrece'), h('dd', {}, f.gancho)))),
    Gente: () => mundo.lugares.filter(l => visible(l) && l.gente?.length).flatMap(l => l.gente.map(g => h('article', { class: 'persona' }, h('h3', {}, g.nombre), h('p', { class: 'lema' }, `${g.papel} · `, h('button', { type: 'button', class: 'vinculo', onclick: () => { dlg.close(); ir(l.id); } }, l.nombre)), h('p', {}, g.voz)))),
    Rumores: () => mundo.lugares.filter(l => visible(l) && l.rumores?.length).map(l => h('article', {}, h('h3', {}, h('button', { type: 'button', class: 'vinculo', onclick: () => { dlg.close(); ir(l.id); } }, l.nombre)), h('ul', {}, ...l.rumores.map(r => h('li', {}, r))))),
    'Crónica': () => [h('ol', { class: 'cronica' }, ...(mundo.cronica || []).map(c => h('li', {}, h('b', {}, c.cuando), h('span', {}, c.que))))],
  };
  let actual = 'Regiones', filtro = '';
  function pintar() {
    const cuerpo = h('div', { class: 'cuerpo' }, ...PESTANAS[actual]().filter(n => !filtro || n.textContent.toLowerCase().includes(filtro)));
    if (!cuerpo.children.length) cuerpo.append(h('p', { class: 'menor' }, 'Nada con ese nombre.'));
    const buscar = h('input', { type: 'search', placeholder: 'Buscar en el códice…', 'aria-label': 'Buscar en el códice' }); buscar.value = filtro;
    buscar.addEventListener('input', () => { filtro = buscar.value.trim().toLowerCase(); pintar(); dlg.querySelector('input').focus(); });
    dlg.replaceChildren(
      h('header', {}, h('h2', {}, 'Códice'), h('button', { type: 'button', class: 'cerrar', 'aria-label': 'Cerrar el códice', onclick: () => dlg.close() }, '×')),
      h('nav', { role: 'tablist' }, ...Object.keys(PESTANAS).map(n => h('button', { type: 'button', role: 'tab', 'aria-selected': String(n === actual), onclick: () => { actual = n; filtro = ''; pintar(); } }, n))),
      buscar, cuerpo,
      h('p', { class: 'menor pie' }, 'Lo que aquí se cuenta es lo que se sabe o se dice en estas tierras. No todo tiene por qué ser verdad.'));
  }
  dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });
  return { abrir() { pintar(); dlg.showModal(); }, get abierto() { return dlg.open; } };
}
