// viaje.js — rutas por la red de caminos (Dijkstra) y un viajero que las recorre.
import * as THREE from 'three';
import { animar, ease } from './anim.js';

export function crearViajes(escena, mundo, terreno) {
  const vecinos = new Map();
  const anotar = (a, b, camino, alReves) => { if (!vecinos.has(a)) vecinos.set(a, []); vecinos.get(a).push({ a: b, camino, alReves }); };
  for (const c of mundo.caminos) { anotar(c.de, c.a, c, false); anotar(c.a, c.de, c, true); }

  function ruta(desde, hasta) {
    if (!vecinos.has(desde) || !vecinos.has(hasta)) return null;
    const dist = new Map([[desde, 0]]), previo = new Map(), pendientes = new Set(vecinos.keys());
    while (pendientes.size) {
      let u = null, mejor = Infinity;
      for (const n of pendientes) { const d = dist.get(n) ?? Infinity; if (d < mejor) { mejor = d; u = n; } }
      if (u === null || u === hasta) break;
      pendientes.delete(u);
      for (const v of vecinos.get(u)) {
        const d = mejor + v.camino.largo;
        if (d < (dist.get(v.a) ?? Infinity)) { dist.set(v.a, d); previo.set(v.a, { de: u, v }); }
      }
    }
    if (!previo.has(hasta)) return null;
    const tramos = [];
    for (let n = hasta; n !== desde; n = previo.get(n).de) tramos.unshift(previo.get(n).v);
    const trazo = [];
    for (const t of tramos) { const p = t.alReves ? [...t.camino.trazo].reverse() : t.camino.trazo; trazo.push(...(trazo.length ? p.slice(1) : p)); }
    const km = dist.get(hasta) * mundo.meta.kmPorUnidad;
    return { trazo, km, dias: km / mundo.meta.kmPorDia, sendas: tramos.some(t => t.camino.tipo === 'senda'), barca: tramos.some(t => t.camino.tipo === 'barca') };
  }

  const grupo = new THREE.Group(); escena.add(grupo);
  const matLinea = new THREE.MeshBasicMaterial({ color: 0xffd35c, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide });
  const viajero = new THREE.Mesh(new THREE.SphereGeometry(2.6, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff3c4, depthTest: false }));
  viajero.renderOrder = 6; viajero.visible = false; grupo.add(viajero);
  let linea = null, turno = 0;

  function limpiar() {
    turno++;
    if (linea) { grupo.remove(linea); linea.geometry.dispose(); linea = null; }
    viajero.visible = false;
  }

  function mostrar(r) {
    limpiar();
    const mio = turno, pts = r.trazo.map(([x, y]) => terreno.aMundo(x, y, Math.max(terreno.alturaEn(x, y), 0.2) + 1.6));
    const p = [], ix = [];
    pts.forEach((v, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1, nx = -tz / l * 1.7, nz = tx / l * 1.7;
      p.push(v.x + nx, v.y, v.z + nz, v.x - nx, v.y, v.z - nz);
      if (i < pts.length - 1) { const k = i * 2; ix.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(ix);
    linea = new THREE.Mesh(g, matLinea); linea.renderOrder = 5; grupo.add(linea);
    g.setDrawRange(0, 0);
    viajero.visible = true; viajero.position.copy(pts[0]);
    const dur = Math.min(9000, 2200 + r.km * 9);
    return animar(dur, t => {
      if (mio !== turno) return;
      const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f));
      viajero.position.lerpVectors(pts[i], pts[i + 1], f - i);
      g.setDrawRange(0, Math.max(0, i) * 6);
    }, ease.lineal);
  }

  function caja(r) {
    const b = new THREE.Box3();
    for (const [x, y] of r.trazo) b.expandByPoint(terreno.aMundo(x, y, 0));
    return b;
  }

  return { ruta, mostrar, limpiar, caja, alcanzable: id => vecinos.has(id) };
}
