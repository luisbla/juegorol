// modelos.js — sustituye los modelos generados por modelos 3D hechos por artistas (glTF), si se declaran en mundo.json.
// Sin nada declarado no se carga nada: el mapa funciona igual con los modelos generados.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function cargarModelos(cfg, lugares, barcos) {
  if (!cfg || (!Object.keys(cfg.lugares || {}).length && !cfg.barco)) return;
  const cargador = new GLTFLoader(), cache = new Map();
  const pedir = archivo => {
    if (!cache.has(archivo)) cache.set(archivo, cargador.loadAsync(cfg.carpeta + archivo).then(g => g.scene).catch(e => { console.warn(`No se pudo cargar el modelo ${archivo}:`, e.message); return null; }));
    return cache.get(archivo);
  };
  const normal = def => (typeof def === 'string' ? { archivo: def } : def);

  // Copia el modelo, lo centra, lo apoya en el suelo y lo escala para que su lado mayor mida "ancho".
  function preparar(base, ancho, giro = 0) {
    const m = base.clone(true), caja = new THREE.Box3().setFromObject(m), tam = caja.getSize(new THREE.Vector3()), centro = caja.getCenter(new THREE.Vector3());
    const k = ancho / Math.max(tam.x, tam.z, 0.001), g = new THREE.Group();
    m.position.set(-centro.x, -caja.min.y, -centro.z);
    g.add(m); g.scale.setScalar(k); g.rotation.y = giro * Math.PI / 180;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  for (const l of lugares.lista) {
    const def = normal(cfg.lugares?.[l.datos.id] ?? cfg.lugares?.[l.datos.tipo]);
    if (!def) continue;
    pedir(def.archivo).then(base => {
      if (!base) return;   // si falla, se queda el modelo generado
      const g = preparar(base, (def.ancho ?? l.radio * 1.3) / l.escala, def.giro);
      for (const hijo of [...l.grupo.children]) l.grupo.remove(hijo);
      l.grupo.add(g);
    });
  }

  if (cfg.barco) {
    const def = normal(cfg.barco);
    pedir(def.archivo).then(base => {
      if (!base) return;
      for (const b of barcos) {
        const escala = b.g.scale.x, g = preparar(base, (def.largo ?? 12) * (b.pequeno ? 0.5 : 1) / escala, def.giro ?? 90);
        for (const hijo of [...b.g.children]) if (!hijo.isSprite) b.g.remove(hijo);   // se conserva la estela
        b.g.add(g);
      }
    });
  }
}
