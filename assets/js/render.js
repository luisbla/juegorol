// render.js — el último tramo del dibujo: oclusión ambiental (las esquinas y los pies de las cosas se oscurecen),
// resplandor de lo que brilla (ventanas, fuegos, sol en el agua), curva de color y viñeta.
// Con calidad baja no hay nada de esto: se dibuja directo. En automática, si el equipo no llega, la oclusión se apaga sola.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// Etalonaje final, ya en color de pantalla: contraste suave, algo más de color, sombras frías y luces cálidas, viñeta.
const Etalonaje = {
  uniforms: { tDiffuse: { value: null }, uVineta: { value: 0.28 }, uSaturacion: { value: 1.1 }, uContraste: { value: 1.06 }, uNoche: { value: 0 }, uFoco: { value: 0 }, uPaso: { value: new THREE.Vector2(1 / 1024, 1 / 768) } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uVineta, uSaturacion, uContraste, uNoche, uFoco; uniform vec2 uPaso; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      if (uFoco > 0.0) {   // maqueta: arriba y abajo se desenfocan, el centro queda nítido
        float lejos = smoothstep(0.14, 0.5, abs(vUv.y - 0.52)) * uFoco;
        vec3 s = c; float n = 1.0;
        // 24 muestras en espiral (ángulo áureo): desenfoque redondo y sin dibujo de rejilla
        for (int i = 1; i <= 24; i++) { float fi = float(i), r = sqrt(fi / 24.0) * 9.0 * lejos, a = fi * 2.39996; s += texture2D(tDiffuse, vUv + vec2(cos(a), sin(a)) * r * uPaso).rgb; n += 1.0; }
        c = s / n;
      }
      float luz = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(luz), c, uSaturacion);
      c = (c - 0.5) * uContraste + 0.5;
      c += vec3(-0.012, 0.0, 0.02) * (1.0 - luz) + vec3(0.02, 0.008, -0.014) * luz;   // sombras frías, luces cálidas
      c = mix(c, c * vec3(0.9, 0.96, 1.1), uNoche * 0.35);
      vec2 p = vUv - 0.5; c *= 1.0 - uVineta * smoothstep(0.25, 0.95, dot(p, p) * 2.2);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export function crearRender(renderer, calidad, movil) {
  const nivel = calidad === 'baja' || (calidad === 'auto' && movil) ? 0 : calidad === 'media' ? 1 : 2;   // 0 directo · 1 resplandor y color · 2 además oclusión
  const api = { nivel, foco: 0, oclusion: nivel === 2, ajustar() {}, dibujar: (escena, camara) => renderer.render(escena, camara) };
  if (!nivel) return api;
  let composer, base, ao, resplandor, etalonaje;
  try {
    const t = renderer.getDrawingBufferSize(new THREE.Vector2());
    const lienzo = new THREE.WebGLRenderTarget(t.x, t.y, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, lienzo);
    base = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    composer.addPass(base);
    if (nivel === 2) { ao = new GTAOPass(base.scene, base.camera, t.x, t.y); ao.blendIntensity = 0.9; composer.addPass(ao); }
    resplandor = new UnrealBloomPass(new THREE.Vector2(t.x, t.y), 0.32, 0.55, 1.0);
    composer.addPass(resplandor);
    composer.addPass(new OutputPass());
    etalonaje = new ShaderPass(Etalonaje);
    composer.addPass(etalonaje);
  } catch (e) { console.warn('Sin posproceso:', e); api.nivel = 0; api.oclusion = false; return api; }

  let lentos = 0, medidos = 0, ultimo = 0;
  api.ajustar = (ancho, alto) => { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(ancho, alto); const t = renderer.getDrawingBufferSize(new THREE.Vector2()); etalonaje.uniforms.uPaso.value.set(1 / t.x, 1 / t.y); };
  api.dibujar = (escena, camara, { noche = 0, lejos = 100, interior = false } = {}) => {
    base.scene = escena; base.camera = camara;
    if (ao) {
      ao.enabled = api.oclusion; ao.scene = escena; ao.camera = camara;
      const radio = Math.min(9, Math.max(interior ? 0.9 : 1.4, lejos * 0.03));
      if (ao.enabled && Math.abs(radio - (ao._radio || 0)) > 0.05) { ao._radio = radio; ao.updateGtaoMaterial({ radius: radio, distanceExponent: 1.2, thickness: 1.4, scale: 1.15, samples: 12 }); }
    }
    resplandor.strength = 0.26 + noche * 0.2; resplandor.threshold = 1.0 - noche * 0.12;
    etalonaje.uniforms.uNoche.value = interior ? 0 : noche; etalonaje.uniforms.uFoco.value = api.foco;
    composer.render();
    // en automática, si los cuadros se alargan, se suelta la oclusión (lo más caro) y se sigue sin ella
    if (calidad === 'auto' && api.oclusion) {
      const ahora = performance.now(); if (ultimo) { medidos++; if (ahora - ultimo > 34) lentos++; }
      ultimo = ahora;
      if (medidos >= 180) { if (lentos > 110) { api.oclusion = false; console.info('Oclusión ambiental desactivada: el equipo no llega a 30 cuadros.'); } medidos = lentos = 0; }
    }
  };
  return api;
}
