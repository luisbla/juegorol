// campo.js — matas instanciadas que se mecen con el viento: trigo (cañas con espiga) y hierba (briznas).
// Un solo dibujo para todo el campo; el vaivén va en el sombreador, más fuerte cuanto más alto el punto, en oleadas.
import * as THREE from 'three';

const TIPOS = {
  trigo: { alto: 2.5, ancho: [1.5, 2.2], colores: [0x8a8a3a, 0xd2b04a, 0xe8cc70] },
  hierba: { alto: 0.75, ancho: [1.3, 2.3], colores: [0x3f6a2e, 0x6a9a44, 0x8ab85a] },
};

export function crearMatas({ tipo = 'trigo', n, rnd, hueco = () => false, desde = 0, hasta = 95, alto, altura = () => 0, colores, fuerza = 1 }) {
  const T = TIPOS[tipo], [h0, h1, h2] = (colores || T.colores).map(c => new THREE.Color(c)), c = new THREE.Color();
  const pos = [], col = [], nor = [];
  const mete = (g, f) => { const q = g.index ? g.toNonIndexed() : g, p = q.attributes.position, nn = q.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(nn.getX(i), nn.getY(i), nn.getZ(i)); f(p.getY(i)); col.push(c.r, c.g, c.b); } };
  const inclinada = (k, total, abre) => { const a = k / total * 6.28 + rnd(), d = k ? 0.2 + rnd() * 0.5 : 0, inc = abre * (0.4 + rnd() * 0.6); return new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.cos(a) * inc, rnd() * 3, -Math.sin(a) * inc)).setPosition(Math.cos(a) * d, 0, Math.sin(a) * d); };
  if (tipo === 'trigo') for (let k = 0; k < 7; k++) {
    const h = 0.82 + rnd() * 0.18, M = inclinada(k, 7, 0.26);
    mete(new THREE.CylinderGeometry(0.012, 0.022, h * 0.84, 3).translate(0, h * 0.42, 0).applyMatrix4(M), y => c.copy(h0).lerp(h1, Math.min(1, y / 0.6)));
    mete(new THREE.CylinderGeometry(0.018, 0.05, h * 0.2, 4).translate(0, h * 0.92, 0).applyMatrix4(M), () => c.copy(h2));
    mete(new THREE.ConeGeometry(0.016, h * 0.12, 3).translate(0, h * 1.06, 0).applyMatrix4(M), () => c.copy(h2).multiplyScalar(1.05));   // aristas
  } else for (let k = 0; k < 9; k++) {
    const h = 0.55 + rnd() * 0.45, M = inclinada(k, 9, 0.5);
    mete(new THREE.ConeGeometry(0.05, h, 3).scale(1, 1, 0.35).translate(0, h / 2, 0).applyMatrix4(M), y => c.copy(h0).lerp(y > 0.6 ? h2 : h1, Math.min(1, y / 0.7)));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const tiempo = { value: 0 }, m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => { sh.uniforms.uT = tiempo; sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    float ola = instanceMatrix[3].x * 0.09 + instanceMatrix[3].z * 0.05;
    float empuje = (sin(uT * 1.5 + ola) * 0.7 + sin(uT * 3.7 + ola * 2.3) * 0.3) * position.y * position.y;
    transformed.x += empuje * ${(0.2 * fuerza).toFixed(3)}; transformed.z += empuje * ${(0.08 * fuerza).toFixed(3)};`); };
  const malla = new THREE.InstancedMesh(g, m, n), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), eje = new THREE.Vector3(0, 1, 0), tinte = new THREE.Color(), A = alto ?? T.alto;
  let k = 0;
  for (let i = 0; i < n * 5 && k < n; i++) {
    const a = rnd() * 6.283, r = desde + Math.pow(rnd(), 1.5) * (hasta - desde), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (hueco(x, z)) continue;
    const ancho = T.ancho[0] + rnd() * (T.ancho[1] - T.ancho[0]);
    M.compose(new THREE.Vector3(x, altura(x, z), z), Q.setFromAxisAngle(eje, rnd() * 6.283), new THREE.Vector3(ancho, A * (0.8 + rnd() * 0.4), ancho));
    malla.setMatrixAt(k, M); malla.setColorAt(k++, tinte.setScalar(0.84 + rnd() * 0.22));
  }
  malla.count = k; malla.receiveShadow = true; malla.frustumCulled = false;
  return { malla, actualizar: t => { tiempo.value = t; } };
}
