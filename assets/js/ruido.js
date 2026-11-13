// Ruido con semilla: siempre sale el mismo mundo. Valor interpolado + fbm + crestas (montañas).
export function crearRuido(semilla = 1337) {
  let s = semilla >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const azar = (ix, iy) => perm[(perm[ix & 255] + iy) & 255] / 255;

  function ruido(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    const a = azar(ix, iy), b = azar(ix + 1, iy), c = azar(ix, iy + 1), d = azar(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y, oct = 4) {
    let amp = 0.5, f = 1, suma = 0, norma = 0;
    for (let i = 0; i < oct; i++) {
      suma += amp * ruido(x * f + i * 17.1, y * f + i * 9.7);
      norma += amp; amp *= 0.5; f *= 2.03;
    }
    return suma / norma;
  }

  function crestas(x, y, oct = 5) {
    let amp = 0.5, f = 1, suma = 0, norma = 0;
    for (let i = 0; i < oct; i++) {
      const r = 1 - Math.abs(ruido(x * f + 31.7 + i * 5.3, y * f + 11.3 + i * 3.1) * 2 - 1);
      suma += amp * r * r;
      norma += amp; amp *= 0.5; f *= 2.1;
    }
    return suma / norma;
  }

  return { ruido, fbm, crestas, azar, rnd };
}

// Generador pequeño para variar cada lugar a partir de su id.
export function azarDe(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  let s = h >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
