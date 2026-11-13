// terreno.js — el relieve entero sale de mundo.json + ruido con semilla.
// Nada está pintado a mano: si mueves un lago o un lugar en los datos, el terreno se rehace solo.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { crearRuido } from './ruido.js';

export const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mezcla = (a, b, t) => a + (b - a) * t;

const NX = 481, NY = 321;        // malla del relieve
const GW = 193, GH = 129;        // rejilla de pesos de región
const DW = 241, DH = 161;        // rejilla de distancias (caminos, lugares, ríos)

function dentroDe(pol, x, y) {
  let c = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + dx * t - px, y = ay + dy * t - py;
  return Math.sqrt(x * x + y * y);
}

// Catmull-Rom en 2D: convierte unos pocos puntos de control en un trazo suave.
export function suavizar(pts, paso = 5) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / paso));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

function bilineal(arr, gw, gh, u, v) {
  const x = Math.max(0, Math.min(gw - 1.001, u)), y = Math.max(0, Math.min(gh - 1.001, v));
  const ix = x | 0, iy = y | 0, fx = x - ix, fy = y - iy, i = iy * gw + ix;
  return (arr[i] * (1 - fx) + arr[i + 1] * fx) * (1 - fy) + (arr[i + gw] * (1 - fx) + arr[i + gw + 1] * fx) * fy;
}

// Radio del llano que necesita cada lugar (las capitales grandes, más).
export const radioDe = l => (l.tipo === 'capital' ? 15 * (l.tamano || 1) : 9);

export function crearTerreno(mundo, { movil = false } = {}) {
  const W = mundo.meta.ancho, H = mundo.meta.alto, cx = W / 2, cz = H / 2;
  const TW = movil ? 1024 : 1344, TH = Math.round(TW * H / W);   // textura de color
  const R = crearRuido(20261113);
  const { fbm, ruido, crestas, azar } = R;
  const porId = Object.fromEntries([...mundo.lugares, ...mundo.cruces].map(l => [l.id, l]));

  /* ---------- trazos de caminos y ríos ---------- */
  for (const c of mundo.caminos) {
    const a = porId[c.de], b = porId[c.a];
    c.trazo = suavizar([[a.x, a.y], ...(c.puntos || []), [b.x, b.y]], 5);
    c.largo = 0;
    for (let i = 1; i < c.trazo.length; i++) c.largo += Math.hypot(c.trazo[i][0] - c.trazo[i - 1][0], c.trazo[i][1] - c.trazo[i - 1][1]);
  }
  const rios = (mundo.rios || []).map(r => ({ ancho: r.ancho || 4, trazo: suavizar(r.puntos, 5) }));

  /* ---------- pesos de región (suavizados: de ahí salen las transiciones) ---------- */
  const ids = mundo.regiones.map(r => r.id);
  const pesos = ids.map(() => new Float32Array(GW * GH));
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = i * W / (GW - 1), y = j * H / (GH - 1);
    for (let r = 0; r < ids.length; r++) if (dentroDe(mundo.regiones[r].poligono, x, y)) { pesos[r][j * GW + i] = 1; break; }
  }
  const tmp = new Float32Array(GW * GH);
  for (const p of pesos) for (let pasada = 0; pasada < 9; pasada++) {
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      let s = 0, n = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di, b = j + dj;
        if (a >= 0 && b >= 0 && a < GW && b < GH) { s += p[b * GW + a]; n++; }
      }
      tmp[j * GW + i] = s / n;
    }
    p.set(tmp);
  }
  const iVal = ids.indexOf('valcoria'), iThr = ids.indexOf('thraengarde'), iMar = ids.indexOf('marendol'), iAst = ids.indexOf('astravan');
  const peso = (r, x, y) => bilineal(pesos[r], GW, GH, x / W * (GW - 1), y / H * (GH - 1));

  /* ---------- distancias a caminos, lugares y ríos ---------- */
  const dCam = new Float32Array(DW * DH), dLug = new Float32Array(DW * DH), dRio = new Float32Array(DW * DH);
  const segs = [], segsRio = [];
  for (const c of mundo.caminos) {
    if (c.tipo === 'barca') continue;
    for (let i = 1; i < c.trazo.length; i += 2) {
      const a = c.trazo[i - 1], b = c.trazo[Math.min(c.trazo.length - 1, i + 1)];
      segs.push(a[0], a[1], b[0], b[1]);
    }
  }
  for (const r of rios) for (let i = 1; i < r.trazo.length; i++) segsRio.push(r.trazo[i - 1][0], r.trazo[i - 1][1], r.trazo[i][0], r.trazo[i][1]);
  const lugaresSecos = mundo.lugares.filter(l => !l.suelo);
  const cercaDe = (lista, x, y, tope) => {
    let m = tope;
    for (let k = 0; k < lista.length; k += 4) {
      if (Math.min(lista[k], lista[k + 2]) - x > tope || x - Math.max(lista[k], lista[k + 2]) > tope) continue;
      if (Math.min(lista[k + 1], lista[k + 3]) - y > tope || y - Math.max(lista[k + 1], lista[k + 3]) > tope) continue;
      const d = distSeg(x, y, lista[k], lista[k + 1], lista[k + 2], lista[k + 3]);
      if (d < m) m = d;
    }
    return m;
  };
  for (let j = 0; j < DH; j++) for (let i = 0; i < DW; i++) {
    const x = i * W / (DW - 1), y = j * H / (DH - 1), k = j * DW + i;
    dCam[k] = cercaDe(segs, x, y, 60);
    dRio[k] = cercaDe(segsRio, x, y, 60);
    let m = 90;   // distancia al borde del llano del lugar más cercano (negativa = dentro)
    for (const l of lugaresSecos) { const d = Math.hypot(l.x - x, l.y - y) - radioDe(l); if (d < m) m = d; }
    dLug[k] = m;
  }
  const distCamino = (x, y) => bilineal(dCam, DW, DH, x / W * (DW - 1), y / H * (DH - 1));
  const distLugar = (x, y) => bilineal(dLug, DW, DH, x / W * (DW - 1), y / H * (DH - 1));
  const distRio = (x, y) => bilineal(dRio, DW, DH, x / W * (DW - 1), y / H * (DH - 1));

  /* ---------- costa, lagos, marisma, islotes ---------- */
  const costa = mundo.costa;
  function costaEn(x) {
    let k = 0;
    while (k < costa.length - 2 && costa[k + 1][0] < x) k++;
    const [x0, y0] = costa[k], [x1, y1] = costa[k + 1];
    const t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0)));
    return mezcla(y0, y1, t * t * (3 - 2 * t));
  }
  // > 0 tierra adentro, < 0 mar
  const haciaCosta = (x, y) => costaEn(x) + (fbm(x * 0.02, 3.7 + y * 0.004, 3) - 0.5) * 22 - y;

  const pesoLagos = (x, y) => {
    let m = 9;
    const desv = (fbm(x * 0.022 + 40, y * 0.022 + 12, 3) - 0.5) * 0.6;
    for (const l of mundo.lagos) {
      const d = Math.hypot((x - l.x) / l.rx, (y - l.y) / l.ry) + desv;
      if (d < m) m = d;
    }
    return m; // < 1 dentro
  };
  const ma = mundo.marisma;
  const pesoMarisma = (x, y) => suave(1.15, 0.72, Math.hypot((x - ma.x) / ma.rx, (y - ma.y) / ma.ry) + (fbm(x * 0.03 + 7, y * 0.03 + 3, 3) - 0.5) * 0.5);
  const islotes = mundo.lugares.filter(l => l.suelo === 'islote');
  const pesoIslote = (x, y) => {
    let m = 0;
    for (const l of islotes) m = Math.max(m, suave(19, 6, Math.hypot(x - l.x, y - l.y) + (ruido(x * 0.045, y * 0.045) - 0.5) * 8));
    return m;
  };

  /* ---------- altura ---------- */
  function alturaCruda(x, y) {
    const wT = peso(iThr, x, y), wV = peso(iVal, x, y), wM = peso(iMar, x, y), wA = peso(iAst, x, y);
    const fuera = Math.max(0, 1 - wT - wV - wM - wA);
    const base = 2.4 + fbm(x * 0.006, y * 0.006, 3) * 3.6 + wT * 7;
    let h = base + (fbm(x * 0.022 + 9, y * 0.022, 4) - 0.35) * (2.2 + wV * 3.8 + wA * 2.6 + fuera * 9 - wM * 1.0);
    // montañas de Thraengarde
    const mont = Math.pow(wT, 2.1);
    h += mont * (6 + crestas(x * 0.0105, y * 0.0105, 5) * 70 * (0.55 + fbm(x * 0.004 + 3, y * 0.004 + 8, 2) * 0.9));
    // ríos: cauce
    h -= 1.6 * suave(11, 2, distRio(x, y));
    // lagos
    const dl = pesoLagos(x, y);
    h = mezcla(h, Math.min(h, 1.0), suave(1.7, 1.1, dl));
    h = mezcla(h, -3.6, suave(1.08, 0.8, dl));
    // marisma: casi a ras de agua, con charcas
    const wMa = pesoMarisma(x, y);
    h = mezcla(h, 0.14 + (fbm(x * 0.07 + 5, y * 0.07 + 9, 3) - 0.5) * 2.0, wMa);
    // llano bajo lugares y caminos (valles en la montaña, explanadas en el resto); el lago y la marisma mandan
    const llano = Math.max(suave(20, 2, distLugar(x, y)), suave(12, 4, distCamino(x, y))) * suave(0.9, 1.2, dl) * (1 - wMa * 0.85);
    if (llano > 0) h = mezcla(h, Math.max(1.3, base + mont * 3), llano);
    // mar
    const dc = haciaCosta(x, y);
    h = dc < 0 ? Math.max(-8, -0.5 + dc * 0.11) : mezcla(0.12, h, suave(0, 30, dc));
    // peñones
    const isl = pesoIslote(x, y);
    if (isl > 0) h = Math.max(h, -2 + isl * (8.5 + ruido(x * 0.2, y * 0.2) * 2.5));
    return h;
  }

  const alturas = new Float32Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) alturas[j * NX + i] = alturaCruda(i * W / (NX - 1), j * H / (NY - 1));
  const alturaEn = (x, y) => bilineal(alturas, NX, NY, x / W * (NX - 1), y / H * (NY - 1));
  const paso = W / (NX - 1);
  const pendienteEn = (x, y) => {
    const a = alturaEn(x + paso, y) - alturaEn(x - paso, y), b = alturaEn(x, y + paso) - alturaEn(x, y - paso);
    return Math.sqrt(a * a + b * b) / (2 * paso);
  };

  /* ---------- textura de color ---------- */
  const lienzo = document.createElement('canvas');
  lienzo.width = TW; lienzo.height = TH;
  const ctx = lienzo.getContext('2d');
  const img = ctx.createImageData(TW, TH), px = img.data;
  const CAMPOS = [[204, 168, 78], [192, 156, 70], [212, 182, 98], [176, 158, 76], [184, 144, 66], [160, 152, 78], [198, 172, 90]];
  const cs = Math.cos(0.42), sn = Math.sin(0.42);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const x = (i + 0.5) * W / TW, y = (j + 0.5) * H / TH;
    const h = alturaEn(x, y), p = pendienteEn(x, y);
    const wT = peso(iThr, x, y), wV = peso(iVal, x, y), wM = peso(iMar, x, y), wA = peso(iAst, x, y);
    const fuera = Math.max(0, 1 - wT - wV - wM - wA);
    const n = fbm(x * 0.03, y * 0.03, 3), g = ruido(x * 0.33, y * 0.33), g2 = ruido(x * 0.9 + 40, y * 0.9 + 7);
    let r, v, b;
    if (h < 0) {
      // fondo: arena clara cerca de la orilla, oscuro en lo hondo
      const f = Math.min(1, -h / 5);
      r = mezcla(168, 44, f); v = mezcla(160, 66, f); b = mezcla(124, 78, f);
      const lodo = pesoMarisma(x, y);   // en la marisma el fondo es fango, no arena
      r = mezcla(r, 58, lodo); v = mezcla(v, 60, lodo); b = mezcla(b, 42, lodo);
    } else {
      // campos de Marendol: parcelas giradas con lindes
      const dx = (fbm(x * 0.006 + 3, y * 0.006 + 8, 2) - 0.5) * 38, dy = (fbm(x * 0.006 + 21, y * 0.006 + 5, 2) - 0.5) * 38;
      const u = (x + dx) * cs - (y + dy) * sn, w = (x + dx) * sn + (y + dy) * cs;
      const cu = u / 23, cw = w / 15;
      const c = CAMPOS[Math.floor(azar(Math.floor(cu), Math.floor(cw)) * CAMPOS.length) % CAMPOS.length];
      const fu = cu - Math.floor(cu), fw = cw - Math.floor(cw);
      const linde = (fu < 0.08 || fw < 0.12) ? 0.7 : 1;
      const surco = 0.93 + 0.07 * Math.sin((azar(Math.floor(cu) + 9, Math.floor(cw)) > 0.5 ? u : w) * 2.6);
      const prado = suave(0.56, 0.7, fbm(x * 0.012 + 50, y * 0.012 + 30, 3));   // manchas de pasto entre los cultivos
      const mr = mezcla(c[0] * linde * surco, 96 + n * 30, prado), mv = mezcla(c[1] * linde * surco, 124 + n * 26, prado), mb = mezcla(c[2] * linde * surco, 58 + n * 14, prado);
      // roca y nieve de Thraengarde
      const nieve = suave(4, 12, h + n * 7) * (1 - suave(0.7, 1.45, p) * 0.85);
      const roca = 88 + n * 40 + g2 * 18;
      const tr = mezcla(roca, 240, nieve), tv = mezcla(roca + 2, 244, nieve), tb = mezcla(roca + 10, 250, nieve);
      // claros de hierba dentro del bosque
      const claro = suave(0.42, 0.62, fbm(x * 0.017 + 11, y * 0.017 + 70, 3));
      r = wV * (52 + n * 34 + claro * 26) + wA * (46 + n * 28 + claro * 20) + wM * mr + wT * tr + fuera * (112 + n * 38);
      v = wV * (86 + n * 32 + claro * 24) + wA * (98 + n * 32 + claro * 16) + wM * mv + wT * tv + fuera * (110 + n * 30);
      b = wV * (40 + n * 16 + claro * 4) + wA * (58 + n * 22) + wM * mb + wT * tb + fuera * (78 + n * 18);
      // tundra en la franja Valcoria–Thraengarde
      const tundra = suave(0.06, 0.38, wT) * suave(0.8, 0.42, wT) * 0.85;
      r = mezcla(r, 158 + n * 20, tundra); v = mezcla(v, 152 + n * 16, tundra); b = mezcla(b, 118 + n * 10, tundra);
      // roca en pendientes y en los peñones
      const rk = Math.max(suave(0.45, 1.1, p) * (1 - wT), pesoIslote(x, y) * suave(0.2, 1.2, h));
      r = mezcla(r, 126 + g2 * 22, rk); v = mezcla(v, 118 + g2 * 20, rk); b = mezcla(b, 106 + g2 * 18, rk);
      // marisma
      const wMa = pesoMarisma(x, y);
      r = mezcla(r, 54 + n * 26, wMa); v = mezcla(v, 68 + n * 24, wMa); b = mezcla(b, 42 + n * 10, wMa);
      // ribera de los ríos
      const rib = suave(10, 3, distRio(x, y)) * 0.55 * (1 - nieve * wT);
      r = mezcla(r, 74, rib); v = mezcla(v, 98, rib); b = mezcla(b, 60, rib);
      // arena en la costa
      const arena = suave(1.5, 0.35, h) * suave(60, 20, haciaCosta(x, y)) * (1 - wMa);
      r = mezcla(r, 214, arena); v = mezcla(v, 198, arena); b = mezcla(b, 156, arena);
      // tierra pisada en los lugares
      const pisado = suave(8, -4, distLugar(x, y)) * 0.6 * (1 - nieve * wT);
      r = mezcla(r, 150, pisado); v = mezcla(v, 132, pisado); b = mezcla(b, 98, pisado);
    }
    const k = 0.9 + g * 0.14 + g2 * 0.08, o = (j * TW + i) * 4;
    px[o] = Math.min(255, r * k); px[o + 1] = Math.min(255, v * k); px[o + 2] = Math.min(255, b * k); px[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const mapa = new THREE.CanvasTexture(lienzo);
  mapa.colorSpace = THREE.SRGBColorSpace;
  mapa.flipY = false;
  mapa.anisotropy = 8;

  /* ---------- malla ---------- */
  const grupo = new THREE.Group();
  const pos = new Float32Array(NX * NY * 3), uv = new Float32Array(NX * NY * 2);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i;
    pos[k * 3] = i * W / (NX - 1) - cx; pos[k * 3 + 1] = alturas[k]; pos[k * 3 + 2] = j * H / (NY - 1) - cz;
    uv[k * 2] = i / (NX - 1); uv[k * 2 + 1] = j / (NY - 1);
  }
  const indices = new Uint32Array((NX - 1) * (NY - 1) * 6);
  let q = 0;
  for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
    indices[q++] = a; indices[q++] = c; indices[q++] = b; indices[q++] = b; indices[q++] = c; indices[q++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeVertexNormals();

  // uniformes compartidos por terreno, árboles y ríos
  const uniformes = { uTiempo: { value: 0 }, uNubes: { value: 1 }, uLuz: { value: 1 } };
  const RUIDO_GLSL = `
    float hN(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float rN(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(hN(i), hN(i+vec2(1,0)), f.x), mix(hN(i+vec2(0,1)), hN(i+vec2(1,1)), f.x), f.y); }
    float fN(vec2 p){ return rN(p)*0.55 + rN(p*2.1+7.3)*0.3 + rN(p*4.3+1.7)*0.15; }`;
  // Sombras de nube (un ruido que se desliza) y grano fino que disimula la textura al acercarse.
  const material = new THREE.MeshStandardMaterial({ map: mapa, roughness: 0.96, metalness: 0 });
  material.onBeforeCompile = sh => {
    sh.uniforms.uTiempo = uniformes.uTiempo; sh.uniforms.uNubes = uniformes.uNubes;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSuelo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSuelo = position.xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vSuelo; uniform float uTiempo; uniform float uNubes;${RUIDO_GLSL}`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float sombraNube = smoothstep(0.52, 0.72, fN(vSuelo * 0.0042 + vec2(uTiempo * 0.012, uTiempo * 0.004)));
        diffuseColor.rgb *= 1.0 - 0.34 * uNubes * sombraNube;
        diffuseColor.rgb *= 0.84 + 0.2 * fN(vSuelo * 0.85) + 0.12 * rN(vSuelo * 3.7);`);
  };
  const malla = new THREE.Mesh(geo, material);
  malla.castShadow = true; malla.receiveShadow = true;
  grupo.add(malla);

  /* ---------- canto de la maqueta ---------- */
  {
    const borde = [];
    for (let i = 0; i < NX; i++) borde.push([i, 0]);
    for (let j = 1; j < NY; j++) borde.push([NX - 1, j]);
    for (let i = NX - 2; i >= 0; i--) borde.push([i, NY - 1]);
    for (let j = NY - 2; j >= 0; j--) borde.push([0, j]);
    borde.push([0, 0]);
    const p = [], c = [], ix = [], FONDO = -16;
    borde.forEach(([i, j], n) => {
      const h = alturas[j * NX + i], x = i * W / (NX - 1) - cx, z = j * H / (NY - 1) - cz;
      const agua = h < 0;
      p.push(x, Math.max(h, 0), z, x, FONDO, z);
      if (agua) c.push(0.10, 0.30, 0.42, 0.03, 0.10, 0.17); else c.push(0.34, 0.27, 0.19, 0.13, 0.10, 0.08);
      if (n < borde.length - 1) { const k = n * 2; ix.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    grupo.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide })));
    const base = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ color: 0x0b0a09 }));
    base.rotation.x = Math.PI / 2; base.position.y = FONDO;
    grupo.add(base);
  }

  /* ---------- agua (mar, lagos y charcas comparten una lámina a cota 0) ---------- */
  // R = profundidad, G = cuánto de marisma (agua turbia y sin espuma)
  const prof = new Uint8Array(NX * NY * 2);
  for (let k = 0; k < NX * NY; k++) {
    prof[k * 2] = alturas[k] < 0 ? Math.min(255, -alturas[k] / 6 * 255) : 0;
    prof[k * 2 + 1] = pesoMarisma((k % NX) * W / (NX - 1), Math.floor(k / NX) * H / (NY - 1)) * 255;
  }
  const texProf = new THREE.DataTexture(prof, NX, NY, THREE.RGFormat, THREE.UnsignedByteType);
  texProf.minFilter = texProf.magFilter = THREE.LinearFilter;
  texProf.needsUpdate = true;
  const uAgua = {
    uTiempo: uniformes.uTiempo, uProf: { value: texProf },
    uSol: { value: new THREE.Vector3(0.4, 0.8, 0.3) }, uColorSol: { value: new THREE.Color(1, 1, 1) },
    uLuz: uniformes.uLuz, uCielo: { value: new THREE.Color(0.6, 0.75, 0.9) }, uBruma: { value: 0.00016 },
  };
  const agua = new THREE.Mesh(new THREE.PlaneGeometry(W, H, 1, 1), new THREE.ShaderMaterial({
    uniforms: uAgua, transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; varying vec3 vMundo;
      void main(){ vUv = vec2(uv.x, 1.0 - uv.y); vec4 m = modelMatrix * vec4(position, 1.0); vMundo = m.xyz; gl_Position = projectionMatrix * viewMatrix * m; }`,
    fragmentShader: `
      varying vec2 vUv; varying vec3 vMundo;
      uniform sampler2D uProf; uniform float uTiempo, uLuz, uBruma; uniform vec3 uSol, uColorSol, uCielo;
      ${RUIDO_GLSL}
      float olas(vec2 p){ return rN(p*0.11 + vec2(uTiempo*0.20, uTiempo*0.13)) * 0.5 + rN(p*0.27 - vec2(uTiempo*0.31, uTiempo*0.17)) * 0.32 + rN(p*0.71 + vec2(uTiempo*0.5, -uTiempo*0.4)) * 0.18; }
      void main(){
        vec2 dato = texture2D(uProf, vUv).rg;
        float d = dato.r, turbia = dato.g;
        if (d < 0.004) discard;
        vec2 p = vMundo.xz;
        float e = 0.7;
        vec3 n = normalize(vec3((olas(p - vec2(e, 0.0)) - olas(p + vec2(e, 0.0))) * 1.8, 1.0, (olas(p - vec2(0.0, e)) - olas(p + vec2(0.0, e))) * 1.8));
        vec3 haciaOjo = cameraPosition - vMundo;
        float lejos = length(haciaOjo);
        vec3 v = haciaOjo / lejos;
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 somero = vec3(0.14, 0.44, 0.46), hondo = vec3(0.02, 0.12, 0.24);
        vec3 col = mix(somero, hondo, smoothstep(0.0, 0.55, d));
        col = mix(col, vec3(0.030, 0.050, 0.028), turbia * 0.92);   // agua de turbera (valores lineales)
        col = mix(col, uCielo, fres * 0.6 * (1.0 - turbia * 0.5)) * uLuz;
        float brillo = pow(max(dot(reflect(-normalize(uSol), n), v), 0.0), 120.0);
        col += uColorSol * brillo * 0.9;
        // espuma que llega a la orilla en ondas
        float orilla = smoothstep(0.06, 0.0, d) * (1.0 - turbia);
        float onda = sin(d * 95.0 - uTiempo * 1.5 + rN(p * 0.08) * 6.0) * 0.5 + 0.5;
        float espuma = orilla * smoothstep(0.55, 0.9, onda + orilla * 0.5) * (0.5 + 0.5 * rN(p * 0.6 + uTiempo * 0.1));
        col = mix(col, vec3(0.93, 0.96, 0.97) * (0.35 + 0.65 * uLuz), espuma * 0.6);
        col = mix(col, uCielo, 1.0 - exp(-lejos * lejos * uBruma * uBruma));
        gl_FragColor = vec4(col, mix(0.62, 0.96, max(smoothstep(0.0, 0.3, d), turbia)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  agua.rotation.x = -Math.PI / 2;
  agua.renderOrder = 1;
  grupo.add(agua);

  /* ---------- cintas sobre el terreno: ríos, caminos y fronteras ---------- */
  function cinta(trazo, ancho, elev, suelo = 0, soloTierra = false) {
    const p = [], uvs = [], ix = [], n = trazo.length;
    let largo = 0;
    for (let i = 0; i < n; i++) {
      const a = trazo[Math.max(0, i - 1)], b = trazo[Math.min(n - 1, i + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
      const nx = -ty / l * ancho / 2, ny = tx / l * ancho / 2, [x, y] = trazo[i];
      if (i) largo += Math.hypot(x - trazo[i - 1][0], y - trazo[i - 1][1]);
      const hc = Math.max(suelo, alturaEn(x, y), alturaEn(x + nx, y + ny), alturaEn(x - nx, y - ny)) + elev;
      p.push(x + nx - cx, hc, y + ny - cz, x - nx - cx, hc, y - ny - cz);
      uvs.push(0, largo, 1, largo);
      // sobre el agua no se dibuja: una senda que acaba en un lago se queda en la orilla
      const seco = !soloTierra || (alturaEn(x, y) > -0.05 && alturaEn(b[0], b[1]) > -0.05);
      if (i < n - 1 && seco) { const k = i * 2; ix.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(ix);
    g.computeVertexNormals();
    return g;
  }

  // el agua del río corre: vetas de ruido que bajan por la cinta
  const matRio = new THREE.ShaderMaterial({
    uniforms: { uTiempo: uniformes.uTiempo, uLuz: uniformes.uLuz, uCielo: uAgua.uCielo },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uTiempo, uLuz; uniform vec3 uCielo;
      ${RUIDO_GLSL}
      void main(){
        float borde = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
        float veta = rN(vec2(vUv.x * 5.0, vUv.y * 0.35 - uTiempo * 1.1)) * 0.6 + rN(vec2(vUv.x * 11.0, vUv.y * 0.9 - uTiempo * 1.9)) * 0.4;
        vec3 col = mix(vec3(0.07, 0.27, 0.36), vec3(0.16, 0.42, 0.50), veta);
        col = mix(col, uCielo, 0.18) * uLuz + vec3(0.85, 0.92, 0.95) * smoothstep(0.78, 0.95, veta) * 0.35 * uLuz;
        gl_FragColor = vec4(col, borde * 0.92);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  for (const r of rios) { const m = new THREE.Mesh(cinta(r.trazo, r.ancho, 0.22, 0, true), matRio); m.renderOrder = 2; grupo.add(m); }

  const caminos = new THREE.Group();
  const matCamino = new THREE.MeshStandardMaterial({ color: 0xc2ad84, roughness: 1, side: THREE.DoubleSide });
  const matSenda = new THREE.MeshStandardMaterial({ color: 0xa08c66, roughness: 1, side: THREE.DoubleSide });
  for (const c of mundo.caminos) {
    if (c.tipo === 'barca') continue;
    const m = new THREE.Mesh(cinta(c.trazo, c.tipo === 'senda' ? 1.5 : 2.6, 0.32, 0.1, true), c.tipo === 'senda' ? matSenda : matCamino);
    m.receiveShadow = true; m.renderOrder = 3;
    caminos.add(m);
  }
  grupo.add(caminos);

  const fronteras = new THREE.Group();
  mundo.regiones.forEach((reg, n) => {
    const cerrado = [...reg.poligono, reg.poligono[0]], fino = [];
    for (let i = 1; i < cerrado.length; i++) {
      const a = cerrado[i - 1], b = cerrado[i], pasos = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
      for (let k = 0; k < pasos; k++) fino.push([mezcla(a[0], b[0], k / pasos), mezcla(a[1], b[1], k / pasos)]);
    }
    fino.push(cerrado[cerrado.length - 1]);
    const m = new THREE.Mesh(cinta(fino, 1.5, 1.1 + n * 0.12, 0), new THREE.MeshBasicMaterial({ color: reg.color, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }));
    m.userData.color = new THREE.Color(reg.color);
    fronteras.add(m);
  });
  grupo.add(fronteras);

  /* ---------- árboles ---------- */
  const arboles = new THREE.Group();
  {
    const hojas = [], pinos = [], secos = [];
    const paso = movil ? 8.2 : 6.2;
    for (let y = 6; y < H - 6; y += paso) for (let x = 6; x < W - 6; x += paso) {
      const jx = x + (azar(x | 0, y | 0) - 0.5) * paso * 1.3, jy = y + (azar((y | 0) + 91, x | 0) - 0.5) * paso * 1.3;
      const h = alturaEn(jx, jy);
      if (h < 0.35) continue;
      const lugarCerca = distLugar(jx, jy), camCerca = distCamino(jx, jy);
      if (camCerca < 5 || distRio(jx, jy) < 5) continue;
      const wT = peso(iThr, jx, jy), wV = peso(iVal, jx, jy), wM = peso(iMar, jx, jy), wA = peso(iAst, jx, jy);
      const fuera = Math.max(0, 1 - wT - wV - wM - wA);
      const wMa = pesoMarisma(jx, jy);
      const mancha = fbm(jx * 0.014 + 20, jy * 0.014 + 4, 3);
      const dado = azar((jx * 3.1) | 0, (jy * 2.7) | 0);
      const esc = 0.75 + azar((jx * 1.7) | 0, (jy * 5.3) | 0) * 0.6;
      if (wMa > 0.45) { if (dado < 0.22) secos.push([jx, h, jy, esc]); continue; }
      if (lugarCerca < 8) continue;
      if (haciaCosta(jx, jy) < 9 || pendienteEn(jx, jy) > 1.1 || pesoIslote(jx, jy) > 0.05) continue;
      const densidad = wV * suave(0.2, 0.55, mancha) * 0.95 + wA * suave(0.25, 0.6, mancha) * 0.85 + wM * suave(0.66, 0.8, mancha) * 0.4
        + fuera * suave(0.3, 0.6, mancha) * 0.5 + wT * suave(30, 12, h) * suave(0.45, 0.7, mancha) * 0.45;
      if (dado > densidad) continue;
      const conifera = wT * 1.6 + wA * 0.35 + fuera * 0.3 > azar((jx * 7.7) | 0, (jy * 1.3) | 0);
      const tundra = suave(0.06, 0.38, wT) * suave(0.8, 0.42, wT);
      (conifera ? pinos : hojas).push([jx, h, jy, esc * (1 - tundra * 0.4), wT, wA]);
    }
    // bosque cerrado alrededor de la torre oculta
    const torre = mundo.lugares.find(l => l.oculto);
    if (torre) for (let k = 0; k < 110; k++) {
      const a = azar(k, 77) * Math.PI * 2, d = 7 + azar(k, 13) * 34, x = torre.x + Math.cos(a) * d, y = torre.y + Math.sin(a) * d;
      const h = alturaEn(x, y);
      if (h > 0.5) (k % 3 ? hojas : pinos).push([x, h, y, 1 + azar(k, 5) * 0.5, 0, 1]);
    }

    // geometrías: copa de varias masas con tronco (hoja), tres pisos de ramas (pino), tronco pelado (seco)
    const tintar = (g, fn) => {
      const p = g.attributes.position, c = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const [r, v, b] = fn(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = r; c[i * 3 + 1] = v; c[i * 3 + 2] = b; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      g.deleteAttribute('uv');
      return g;
    };
    const masa = (r, x, y, z, s, detalle = 0) => {
      const g = new THREE.IcosahedronGeometry(r, detalle), p = g.attributes.position, nrm = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i), l = Math.hypot(vx, vy, vz);
        const k = 1 + (ruido(vx * 1.9 + s, vy * 1.9 + vz * 1.3) - 0.5) * 0.42;   // bultos
        p.setXYZ(i, vx * k, vy * k * 0.9, vz * k);
        nrm.setXYZ(i, vx / l, vy / l, vz / l);                                   // sombreado suave
      }
      g.translate(x, y, z);
      return tintar(g, (_, py) => { const t = suave(y - r, y + r, py); return [0.55 + t * 0.45, 0.55 + t * 0.45, 0.55 + t * 0.45]; });
    };
    const tronco = (r, alto, color) => {
      const g = new THREE.CylinderGeometry(r * 0.6, r, alto, 6).toNonIndexed(); g.translate(0, alto / 2, 0);
      return tintar(g, () => color);
    };
    const piso = (r, alto, y) => {
      const g = new THREE.ConeGeometry(r, alto, 8).toNonIndexed(); g.translate(0, y + alto / 2, 0);
      return tintar(g, (px, py) => { const t = suave(y, y + alto, py), dentro = 1 - Math.hypot(px, 0) / (r * 2); return [0.6 + t * 0.4, 0.6 + t * 0.4 + dentro * 0, 0.6 + t * 0.4]; });
    };
    const MADERA = [0.42, 0.3, 0.2];
    const gHoja = mergeGeometries([tronco(0.34, 2.4, MADERA), masa(2.0, 0, 3.6, 0, 1, 1), masa(1.45, 1.25, 2.9, 0.5, 7), masa(1.5, -1.05, 3.0, -0.6, 13), masa(1.2, 0.1, 4.7, 0.7, 21)]);
    const gPino = mergeGeometries([tronco(0.3, 1.6, MADERA), piso(1.9, 2.9, 1.0), piso(1.5, 2.6, 2.5), piso(1.0, 2.4, 4.0)]);
    const rama = (ry, rz, y) => { const g = new THREE.CylinderGeometry(0.06, 0.13, 2.0, 4).toNonIndexed(); g.translate(0, 1.0, 0); g.rotateZ(rz); g.rotateY(ry); g.translate(0, y, 0); return tintar(g, () => [1, 1, 1]); };
    const gSeco = mergeGeometries([tronco(0.28, 5, [1, 1, 1]), rama(0.4, 0.9, 2.6), rama(2.6, -0.8, 3.3), rama(4.4, 0.7, 3.9)]);

    // el viento mece las copas: más cuanto más arriba, y cada árbol a su compás
    const matArbol = () => {
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
      m.onBeforeCompile = sh => {
        sh.uniforms.uTiempo = uniformes.uTiempo;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTiempo;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            #ifdef USE_INSTANCING
              float fase = instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.23;
              float alto = max(position.y - 1.6, 0.0);
              transformed.x += sin(uTiempo * 1.4 + fase) * 0.035 * alto * alto;
              transformed.z += cos(uTiempo * 1.1 + fase * 1.3) * 0.025 * alto * alto;
            #endif`);
      };
      return m;
    };
    const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), col = new THREE.Color();
    const eje = new THREE.Vector3(0, 1, 0);
    function instanciar(lista, geo, colorFn) {
      const im = new THREE.InstancedMesh(geo, matArbol(), lista.length);
      lista.forEach((a, i) => {
        tmpQ.setFromAxisAngle(eje, azar(i, 3) * 6.28);
        const an = 0.85 + azar(i, 41) * 0.3;
        tmpS.set(a[3] * an * 0.85, a[3] * 0.85, a[3] * an * 0.85); tmpP.set(a[0] - cx, a[1] - 0.2, a[2] - cz);
        im.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
        im.setColorAt(i, colorFn(a, i));
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = !movil; im.receiveShadow = true;
      return im;
    }
    arboles.add(instanciar(hojas, gHoja, (a, i) => {
      const t = azar(i, 9), otono = azar(i, 55) > 0.93 ? 0.16 : 0;   // algún árbol que amarillea
      return col.setRGB(0.17 + t * 0.10 + otono, 0.33 + t * 0.13, 0.12 + t * 0.05 + a[5] * 0.05, THREE.SRGBColorSpace).clone();
    }));
    arboles.add(instanciar(pinos, gPino, (a, i) => {
      const t = azar(i, 21), nv = a[4] * 0.42; // nieve en los pinos del norte
      return col.setRGB(0.10 + t * 0.06 + nv, 0.24 + t * 0.10 + nv, 0.17 + t * 0.05 + nv, THREE.SRGBColorSpace).clone();
    }));
    arboles.add(instanciar(secos, gSeco, (a, i) => col.setRGB(0.24 + azar(i, 2) * 0.1, 0.21, 0.16, THREE.SRGBColorSpace).clone()));
  }
  grupo.add(arboles);

  const aMundo = (x, y, h = alturaEn(x, y)) => new THREE.Vector3(x - cx, h, y - cz);

  return {
    grupo, malla, agua, caminos, fronteras, arboles,
    alturaEn, pendienteEn, distCamino, distLugar, aMundo,
    uniformes, uAgua, W, H, cx, cz, porId,
  };
}
