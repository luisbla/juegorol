// clima.js — el tiempo que hace, igual en el mapa, en las ciudades y en los parajes: chubascos que van y vienen sobre Valcoria y Astravan.
// Devuelve la fuerza de la lluvia (0 a 1) en una región en el instante t (segundos del reloj del mapa).
const suave = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const PRUEBA = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('lluvia') : null;   // …/?lluvia fuerza el chubasco y …/?lluvia=0 lo quita, para probar
export const lluvia = (t, region) => (region === 'valcoria' || region === 'astravan')
  ? PRUEBA !== null ? (PRUEBA === '0' ? 0 : 1) : suave(0.62, 0.86, Math.sin(t * 0.021 + (region === 'astravan' ? 2.1 : 0)) * 0.5 + 0.5 + 0.12 * Math.sin(t * 0.057)) : 0;
