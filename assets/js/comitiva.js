// La comitiva: las figuras del grupo de jugadores, a escala de mapa. Las usa la partida (plantadas junto al lugar)
// y los viajes (andando en fila por el camino). Cada miembro es [clase, especie]; lo que no exista se salta.
import * as THREE from 'three';
import { crearFigura, personaje, CLASES, ESPECIES } from './figuras.js';
import { azarDe } from './ruido.js';

export const HEROES_BASE = [['Guerrero', 'Humano'], ['Mago', 'Elfo'], ['Clérigo', 'Enano'], ['Pícaro', 'Mediano'], ['Explorador', 'Humano']];
export const MAX_HEROES = 6;
export { CLASES, ESPECIES };

export function crearComitiva(heroes = HEROES_BASE, escala = 3.4) {
  const grupo = new THREE.Group(), figuras = [];
  (Array.isArray(heroes) ? heroes : HEROES_BASE).slice(0, MAX_HEROES).forEach((par, i) => {
    const [clase, especie] = Array.isArray(par) ? par : [];
    if (!CLASES.includes(clase) || !ESPECIES.includes(especie)) return;
    const f = crearFigura(personaje(clase, especie, azarDe(`heroe-${i}-${clase}-${especie}`)));
    f.grupo.scale.setScalar(escala); grupo.add(f.grupo); figuras.push(f);
  });
  return {
    grupo, figuras, escala,
    // plantados en corro abierto alrededor de un punto, mirando hacia fuera
    enCorro(radio = 5.5) {
      figuras.forEach((f, i) => { const a = -0.9 + (figuras.length > 1 ? i / (figuras.length - 1) : 0.5) * 2.6; f.grupo.position.set(Math.sin(a) * radio, 0, Math.cos(a) * radio); f.grupo.rotation.y = a; f.estado.camina = 0; f.marcha = 0; f.actualizar(0.016 * (i + 1)); });
    },
    // andando: cada uno con su zancada, aunque el mapa los lleve más deprisa de lo que pisan
    andar(si) { for (const f of figuras) f.estado.camina = si ? 2.25 * escala * (f.opciones.talla ?? 1) : 0; if (!si) for (const f of figuras) f.marcha = 0; },
    actualizar(t) { for (const f of figuras) f.actualizar(t); },
    soltar() { for (const f of figuras) { f.malla.geometry.dispose(); f.grupo.traverse(o => { if (o.isMesh && o !== f.malla) o.geometry.dispose(); }); } grupo.clear(); figuras.length = 0; },
  };
}
