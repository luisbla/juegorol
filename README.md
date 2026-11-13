# Tierras de Alden · mapa en relieve

Mapa interactivo en 3D de las Tierras de Alden. Web estática: sin servidor, sin compilación y sin dependencias de red.

## Qué hace

- Relieve generado por código a partir de `assets/data/mundo.json` (siempre sale igual: el ruido lleva semilla fija).
- Sol con sombras reales, cielo y bruma según la hora; ciclo de día y noche con control manual.
- Mar, lagos, ríos con corriente y puentes donde los cruza un camino, y marisma con juncos y fuegos fatuos; barcos, faro, humo, nubes con su sombra, nieve en Thraengarde, niebla en la Marisma Callada, pájaros, banderas y árboles mecidos por el viento.
- Ventanas que se encienden al anochecer.
- Ficha de cada lugar al pulsarlo. En las capitales, «Entrar en la ciudad» abre su interior en 3D (calles, plaza del mercado, muralla con una puerta por cada camino que llega, gente por las calles) y solo allí muestra quién gobierna.
- «Viajar desde aquí»: ruta por los caminos, kilómetros y días a pie.
- Capas conmutables: nombres, fronteras, caminos y clima.

## Estructura

```
index.html
assets/
  data/mundo.json      regiones, costa, lagos, marisma, ríos, lugares, caminos, rutas de barcos
  js/main.js           arranque, cámara, etiquetas, fichas, mandos
  js/terreno.js        alturas, textura, agua, ríos, puentes, caminos, fronteras, árboles
  js/lugares.js        modelos y texturas de cada tipo de lugar
  js/ciudad.js         interior de las capitales, generado a partir de los caminos que llegan a cada una
  js/ambiente.js       cielo, sombras, nubes, nieve, niebla, humo, barcos, pájaros, faro, luces de noche
  js/viaje.js          rutas y viajero
  js/anim.js, ruido.js utilidades
  css/app.css
  img/icono.svg
  vendor/three/        three.js r169 (licencia MIT, incluida)
```

## Cambiar el mundo

Todo se edita en `assets/data/mundo.json`. Las coordenadas van en una rejilla de 1536 × 1024 (x hacia el este, y hacia el sur); una unidad son `kmPorUnidad` kilómetros.

- **Mover o añadir un lugar**: entrada en `lugares` con `id`, `nombre`, `tipo`, `region`, `x`, `y`, `desc`. Tipos: `capital`, `pueblo`, `posta`, `ruina`, `quemado`, `campamento`, `granja`, `taberna`, `cabana`, `faro`, `puerto`, `palafitos`, `pasarela`, `pecio`, `torre`. El terreno se allana solo bajo cada lugar.
- **`tamano`**: escala del modelo (1 por defecto). Así Valcoria es la ciudad más grande.
- **`suelo`**: `agua` (medio sumergido en un lago), `marisma` (a ras de charca) o `islote` (levanta un peñón en el mar). Sin este campo, tierra firme.
- **`oculto: true`**: el lugar se ve pero no lleva nombre ni sale en la lista de destinos; solo aparece su ficha si se pulsa encima.
- **`gobierno`**: texto que solo se muestra dentro de la ciudad. El interior se genera solo: su tamaño sale de `tamano` y sus puertas, de los caminos que llegan a esa capital.
- **Caminos**: `de`, `a` (ids de lugares o de `cruces`), `tipo` (`camino`, `senda` o `barca`) y `puntos` intermedios. Se suavizan solos y el terreno abre paso. Los de tipo `barca` no se dibujan: solo cuentan para las rutas.
- **Ríos**: lista `rios`, cada uno con `puntos` y `ancho`. Excavan su cauce; dentro de un lago o del mar no se dibujan.
- **Lagos, marisma, costa y fronteras**: elipses y listas de puntos; el relieve y el agua se recalculan al recargar.
- **Ritmo de viaje**: `kmPorDia`.

Ojo: el repositorio es público. Lo que se escriba en `mundo.json` lo puede leer cualquiera, aunque en el mapa no se vea.

## Probar en local

Hace falta servirlo por HTTP (los módulos y el JSON no cargan con `file://`):

```
python3 -m http.server 8000
```

y abrir `http://localhost:8000`.

## Publicar en GitHub Pages

Subir `index.html`, `README.md` y la carpeta `assets` entera a la raíz del repositorio y activar Pages (Settings → Pages → Deploy from a branch → `main` / root).

## Controles

- Ratón: arrastrar mueve, rueda acerca, botón derecho gira.
- Táctil: un dedo mueve, dos dedos acercan y giran.
- Teclado: Tab recorre los nombres, Intro abre la ficha, Esc la cierra; con el mapa enfocado, las flechas lo desplazan.
