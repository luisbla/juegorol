// Animaciones con promesas: animar(ms, fn) llama a fn(t) con t de 0 a 1.
export const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const ease = {
  lineal: t => t,
  suave: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  salida: t => 1 - Math.pow(1 - t, 3),
};

const activas = new Set();

export function animar(ms, fn, e = ease.suave) {
  const dur = reducir ? Math.min(ms, 120) : ms;
  return new Promise(res => activas.add({ t0: performance.now(), dur, fn, e, res }));
}

export function actualizarAnimaciones(ahora) {
  for (const a of activas) {
    const p = Math.min(1, Math.max(0, (ahora - a.t0) / a.dur));
    a.fn(a.e(p), p);
    if (p === 1) { activas.delete(a); a.res(); }
  }
}

export function cancelarAnimaciones() { activas.clear(); }
