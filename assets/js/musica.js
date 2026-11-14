// musica.js — una pista en bucle según dónde se esté, con fundido entre pistas.
// Los archivos van en la carpeta que diga mundo.json (musica.carpeta). Si falta alguno, esa zona queda en silencio.
export function crearMusica(cfg) {
  if (!cfg) return { activar() {}, ambiente() {}, get activa() { return false; } };
  const pistas = new Map(), rotas = new Set(), VOLUMEN = 0.7, FUNDIDO = 1400;
  let activa = false, actual = null, pedida = cfg.mapa || null, reloj = 0;   // de entrada, la pista del mapa

  function pista(archivo) {
    if (!pistas.has(archivo)) {
      const a = new Audio(cfg.carpeta + archivo);
      a.loop = true; a.volume = 0; a.preload = 'none';
      a.addEventListener('error', () => rotas.add(archivo));
      pistas.set(archivo, a);
    }
    return pistas.get(archivo);
  }

  // Fundido con temporizador propio (no depende del ritmo de dibujo del mapa).
  function fundir() {
    clearInterval(reloj);
    let antes = performance.now();
    reloj = setInterval(() => {
      const ahora = performance.now(), d = (ahora - antes) / FUNDIDO * VOLUMEN; antes = ahora;
      let quedan = false;
      for (const [archivo, a] of pistas) {
        const meta = activa && archivo === actual ? VOLUMEN : 0, falta = meta - a.volume;
        if (Math.abs(falta) <= d) { a.volume = meta; if (meta === 0 && !a.paused) a.pause(); }
        else { a.volume += Math.sign(falta) * d; quedan = true; }
      }
      if (!quedan) clearInterval(reloj);
    }, 40);
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
    ambiente(clave) { pedida = (clave && (cfg.tipos?.[clave] || (clave === 'ciudad' && cfg.ciudad))) || cfg.mapa || null; if (pedida !== actual) sonar(); },
  };
}
