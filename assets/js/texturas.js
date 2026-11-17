// texturas.js — borrones blandos para humo, nubes, brillos y llamas, calculados píxel a píxel.
// Antes salían de degradados de <canvas>. Un canvas guarda el color ya multiplicado por la transparencia, y al deshacer esa cuenta
// en las zonas casi transparentes cada canal redondea por su lado: en Safari (iPad) eso deja motas de color —moradas, sobre todo—
// en el borde de cada borrón. Aquí el color es el mismo en toda la textura y solo cambia la transparencia, así que no hay nada que redondear.
import * as THREE from 'three';

function deDatos(w, h, pinta) {
  const d = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pinta(x + 0.5, h - y - 0.5), i = (y * w + x) * 4; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = Math.round(Math.min(1, Math.max(0, p[3])) * 255); }   // la fila 0 es la de abajo
  const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
const rgb = color => typeof color === 'string' ? color.split(',').map(Number) : color;
// valor en t (0–1) de una lista de paradas [posición, valor]
const entre = (paradas, t) => { if (t <= paradas[0][0]) return paradas[0][1]; for (let i = 1; i < paradas.length; i++) if (t <= paradas[i][0]) { const [a, va] = paradas[i - 1], [b, vb] = paradas[i]; return va + (vb - va) * (t - a) / (b - a); } return paradas[paradas.length - 1][1]; };

// borrón redondo: opaco en el centro (o en un núcleo de radio «nucleo»), a 0,45 a media distancia y transparente en el borde
export function suave(nucleo = 0, color = [255, 255, 255], tam = 128) {
  const c = rgb(color), R = tam / 2, r0 = R * nucleo, paradas = [[0, 1], [0.45, 0.45], [1, 0]];
  return deDatos(tam, tam, (x, y) => { const d = Math.hypot(x - R, y - R); return [c[0], c[1], c[2], d >= R ? 0 : entre(paradas, Math.max(0, (d - r0) / (R - r0)))]; });
}
// borrón redondo que se apaga en línea recta desde «alfa» en el centro
export function blanda(alfa = 1, tam = 64) { const R = tam / 2; return deDatos(tam, tam, (x, y) => [255, 255, 255, alfa * Math.max(0, 1 - Math.hypot(x - R, y - R) / R)]); }
// nube: dieciséis borrones solapados, para que no sea un óvalo perfecto. Gasta el azar igual que antes: tres tiradas por borrón.
export function nube(rnd) {
  const B = []; for (let i = 0; i < 16; i++) B.push([50 + rnd() * 156, 50 + rnd() * 34, 22 + rnd() * 30]);
  return deDatos(256, 128, (x, y) => { let hueco = 1; for (const [px, py, r] of B) { const d = Math.hypot(x - px, y - py); if (d < r) hueco *= 1 - 0.55 * (1 - d / r); } return [255, 255, 255, 1 - hueco]; });
}
// llama: blanca en el corazón, ámbar a un tercio y roja y transparente en el borde, con el corazón algo bajo
export function llama() {
  const P = [[0, [255, 255, 255, 1]], [0.35, [255, 210, 110, 0.9]], [1, [255, 90, 20, 0]]];
  return deDatos(64, 64, (x, y) => { const t = Math.min(1, Math.hypot(x - 32, y - 38) / 30); return [0, 1, 2, 3].map(k => entre(P.map(([p, v]) => [p, v[k]]), t)); });
}
