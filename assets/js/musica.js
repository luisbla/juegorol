// musica.js — una pista en bucle según dónde se esté, con fundido entre pistas.
// Los archivos van en la carpeta que diga mundo.json (musica.carpeta). Si falta alguno, esa zona queda en silencio.
export function crearMusica(cfg) {
  if (!cfg) return { activar() {}, ambiente() {}, get activa() { return false; } };
  const pistas = new Map(), rotas = new Set(), VOLUMEN = 0.7, FUNDIDO = 1400;
  let activa = false, actual = null, pedida = null, reloj = 0;

  function pista(archivo) {
    if (!pistas.has(archivo)) {
      const a = new Audio(cfg.carpeta + archivo);
      a.loop = true; a.volume = 0; a.preload = 'none';
      a.addEventListener('error', () => rotas.add(archivo));
      pistas.set(archivo, a);
    }
    return pistas.get(archivo);
  }

  function fundir() {
    cancelAnimationFrame(reloj);
    let antes = performance.now();
    const paso = ahora => {
      const d = (ahora - antes) / FUNDIDO * VOLUMEN; antes = ahora;
      let quedan = false;
      for (const [archivo, a] of pistas) {
        const meta = activa && archivo === actual ? VOLUMEN : 0;
        if (Math.abs(a.volume - meta) > 0.005) { a.volume = Math.min(1, Math.max(0, a.volume + Math.sign(meta - a.volume) * Math.min(d, Math.abs(meta - a.volume)))); quedan = true; }
        else { a.volume = meta; if (meta === 0 && !a.paused) a.pause(); }
      }
      if (quedan) reloj = requestAnimationFrame(paso);
    };
    reloj = requestAnimationFrame(paso);
  }

  function sonar() {
    const archivo = pedida && !rotas.has(pedida) ? pedida : null;
    actual = archivo;
    if (activa && archivo) pista(archivo).play().catch(() => rotas.add(archivo));   // sin archivo o sin permiso: silencio
    fundir();
  }

  return {
    get activa() { return activa; },
    activar(v) { activa = v; sonar(); },
    // clave: tipo de lugar, 'ciudad' o null (mapa general)
    ambiente(clave) { pedida = (clave && (cfg.tipos?.[clave] || cfg[clave])) || cfg.mapa || null; if (pedida !== actual) sonar(); },
  };
}
