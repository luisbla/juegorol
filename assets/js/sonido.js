// sonido.js — ambiente sonoro sin archivos: viento, mar, gentío, fuego, grillos y pájaros hechos con Web Audio
// (ruido filtrado y osciladores). Va por debajo de la música y se enciende con el mismo botón.
// Cada capa tiene un nivel de 0 a 1 que el mapa va cambiando según dónde esté la cámara.
export function crearSonido() {
  let ctx = null, maestro = null, activo = false, reloj = 0;
  const capas = {}, nivel = { viento: 0, mar: 0, gentio: 0, fuego: 0, grillos: 0, pajaros: 0 }, TECHO = { viento: 0.5, mar: 0.55, gentio: 0.3, fuego: 0.4, grillos: 0.07, pajaros: 0.1 };

  function montar() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    maestro = ctx.createGain(); maestro.gain.value = 0; maestro.connect(ctx.destination);
    // dos segundos de ruido blanco en bucle: de aquí salen el viento, el mar, el gentío y el fuego
    const n = ctx.sampleRate * 2, bufer = ctx.createBuffer(1, n, ctx.sampleRate), d = bufer.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const ruido = () => { const s = ctx.createBufferSource(); s.buffer = bufer; s.loop = true; s.start(0, Math.random() * 2); return s; };
    const filtro = (tipo, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q; return b; };
    const gan = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const vaiven = (hz, hondo, destino) => { const o = ctx.createOscillator(), g = gan(hondo); o.frequency.value = hz; o.connect(g); g.connect(destino); o.start(); };   // un oscilador lento que mece un parámetro
    const capa = (nombre, ...cadena) => { const sal = gan(0); cadena.reduce((a, b) => (a.connect(b), b)).connect(sal); sal.connect(maestro); capas[nombre] = sal; return cadena; };

    // viento: ruido en una banda grave-media que sube y baja de tono y de fuerza
    { const f = filtro('bandpass', 380, 0.6), g = gan(0.7); capa('viento', ruido(), f, g); vaiven(0.07, 160, f.frequency); vaiven(0.11, 0.28, g.gain); vaiven(0.031, 0.2, g.gain); }
    // mar: ruido grave que rompe en oleadas lentas
    { const f = filtro('lowpass', 650, 0.4), g = gan(0.55); capa('mar', ruido(), f, g); vaiven(0.12, 0.42, g.gain); vaiven(0.047, 260, f.frequency); }
    // gentío: murmullo en la banda de la voz, con altibajos rápidos
    { const f = filtro('bandpass', 520, 0.9), g = gan(0.6); capa('gentio', ruido(), f, g); vaiven(1.7, 0.16, g.gain); vaiven(2.9, 0.12, g.gain); vaiven(0.23, 0.18, g.gain); vaiven(0.4, 140, f.frequency); }
    // fuego: un fondo grave y chasquidos sueltos
    { const grave = filtro('lowpass', 240, 0.5), gg = gan(0.8); capa('fuego', ruido(), grave, gg); vaiven(3.1, 0.2, gg.gain);
      const agudo = filtro('highpass', 2200, 0.5), chasq = gan(0); const r = ruido(); r.connect(agudo); agudo.connect(chasq); chasq.connect(capas.fuego);
      capas.chasquido = chasq; }
    // grillos: un pitido agudo troceado
    { const o = ctx.createOscillator(), trozo = gan(0), g = gan(1); o.frequency.value = 4300; o.connect(trozo); trozo.connect(g); const sal = gan(0); g.connect(sal); sal.connect(maestro); capas.grillos = sal; o.start();
      const cuadro = ctx.createOscillator(), gc = gan(0.5); cuadro.type = 'square'; cuadro.frequency.value = 17; cuadro.connect(gc); gc.connect(trozo.gain); trozo.gain.value = 0.5; cuadro.start(); vaiven(0.55, 0.5, g.gain); }
    // pájaros: trinos sueltos, programados al azar mientras la capa suene
    { const sal = gan(0); sal.connect(maestro); capas.pajaros = sal; }
    reloj = setInterval(() => {
      if (!activo || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      if (nivel.fuego > 0.02 && Math.random() < 0.5) { capas.chasquido.gain.cancelScheduledValues(t); capas.chasquido.gain.setValueAtTime(0.5 + Math.random() * 0.9, t); capas.chasquido.gain.exponentialRampToValueAtTime(0.001, t + 0.03 + Math.random() * 0.05); }
      if (nivel.pajaros > 0.02 && Math.random() < 0.16) {
        const notas = 2 + Math.floor(Math.random() * 4), base = 2200 + Math.random() * 1800;
        for (let i = 0; i < notas; i++) { const o = ctx.createOscillator(), g = gan(0), t0 = t + i * (0.09 + Math.random() * 0.05); o.frequency.setValueAtTime(base * (1 + Math.random() * 0.2), t0); o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.5), t0 + 0.07); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.5, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08); o.connect(g); g.connect(capas.pajaros); o.start(t0); o.stop(t0 + 0.1); }
      }
    }, 120);
  }

  return {
    get activo() { return activo; },
    activar(v) {
      activo = v;
      if (v && !ctx) { try { montar(); } catch { activo = false; return; } }
      if (!ctx) return;
      if (v) ctx.resume();
      maestro.gain.setTargetAtTime(v ? 0.55 : 0, ctx.currentTime, 0.4);
    },
    // niveles: { viento, mar, gentio, fuego, grillos, pajaros }, cada uno de 0 a 1; lo que no se nombre, calla
    mezcla(niveles) {
      for (const k of Object.keys(nivel)) nivel[k] = Math.max(0, Math.min(1, niveles[k] || 0));
      if (!ctx) return;
      for (const k of Object.keys(nivel)) capas[k].gain.setTargetAtTime(nivel[k] * TECHO[k], ctx.currentTime, 0.9);
    },
  };
}
