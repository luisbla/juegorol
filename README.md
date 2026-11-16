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
- **Partida**: día de campaña, posición del grupo, diario de viajes y niebla de guerra (un mar de nubes que solo se abre sobre lo descubierto). Con el «modo edición», desde la ficha de un lugar se puede colocar al grupo o hacer un viaje: avanza el día, descubre lo que queda junto al camino y tira por encuentros.
- **Música**: el botón ♪ pone una pista en bucle según el sitio (mapa, taberna, ruinas, ciudad…), con fundido al cambiar.

## Estructura

```
index.html
assets/
  data/mundo.json      regiones, costa, lagos, marisma, ríos, lugares, caminos, rutas de barcos, música y encuentros
  data/partida.json    estado publicado de la partida (opcional; si falta, partida vacía)
  audio/               pistas de música (ver LEEME.txt)
  modelos/             modelos glTF opcionales (ver LEEME.txt)
  js/main.js           arranque, cámara, etiquetas, fichas, mandos
  js/terreno.js        alturas, textura, agua, ríos, puentes, caminos, fronteras, árboles
  js/lugares.js        modelos y texturas de cada tipo de lugar
  js/ciudad.js         interior de las capitales y del puerto: barrios, muralla, puertas según los caminos reales
  js/interior.js       interior de la taberna y de las posadas (sala común y planta de habitaciones)
  js/salas.js          interior de herrerías, cuarteles y lonjas de las ciudades
  js/edificios.js      exterior detallado de los edificios singulares (posada, cuartel, herrería, establos, molino, lonja...)
  js/barco.js          el velero (casco, castillos, arboladura y velas) que usan el mar, el puerto y las ciudades
  js/ruinas.js         parajes: la vista de cerca de ruinas (solo el exterior y la entrada), pueblos, postas, faro, torre...
  js/sonido.js         ambiente sonoro sin archivos: viento, mar, gentío, fuego, grillos y pájaros
  js/campo.js          trigo y hierba: matas instanciadas que se mecen con el viento
  js/clima.js          chubascos sobre Valcoria y Astravan, los mismos en el mapa y en los parajes
  js/render.js         posproceso: oclusión ambiental, resplandor, etalonaje y viñeta; modo maqueta para las fotos
  js/codice.js         el códice: regiones, facciones, gente, rumores y crónica, leídos de mundo.json
  js/figuras.js        la gente: figuras con esqueleto (una malla continua con huesos), oficios, posturas y lo que llevan en la mano
  js/utileria.js       enseres y animales del mismo estilo que la gente: barriles, cajones, carros, puestos, pozo, muebles, gallinas, perros, ovejas, vacas, caballos
  js/mazmorra.js       levanta el interior de una ruina a partir de una planta que solo viene en el archivo del máster
  js/master.js         lector de la vista de máster; los datos van en un archivo aparte que no está en el repositorio
  js/modelos.js        carga opcional de modelos glTF de artista
  js/ambiente.js       cielo, sombras, nubes, nieve, niebla, humo, barcos, pájaros, faro, luces de noche
  js/viaje.js          rutas y viajero
  js/partida.js        día, grupo, diario, niebla de guerra y encuentros
  js/musica.js         pistas por zona
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
- **Notas y marcas**: en el panel Partida, con el modo edición puesto, cada ficha tiene un cuadro de notas y se pueden clavar marcas en el centro de la vista. Se guardan en `partida.json` con lo demás: si lo subes, las lee cualquiera.
- **Partida por enlace**: «Copiar partida como enlace» mete la partida entera en la dirección (`…/#partida=…`). Quien lo abra la ve tal cual, sin subir nada al repositorio.
- **Enlace a un lugar**: `…/#lugar=id` abre el mapa centrado en él; la ficha tiene un botón que lo copia.
- **`gente`, `rumores`, `gancho`** (en cada lugar): quién anda por allí (`nombre`, `papel`, `voz`), lo que se dice y lo que se puede hacer. Salen en la ficha y en el códice.
- **`facciones`** y **`cronica`**: los bandos (`quiere`, `problema`, `gancho`) y la historia conocida, para el códice.
- **Calidad**: en Capas. Alta lleva todo el posproceso; media quita la oclusión ambiental; baja dibuja directo y sin sombras. En automática, un teléfono va en baja, una tableta (iPad) lleva todos los efectos con algo menos de resolución, y un ordenador lo lleva todo; si el equipo no llega, la oclusión se apaga sola.
- **Modo foto**: tecla F. Quita la interfaz y guarda la vista en PNG.
- **`decorado`**: ambiente sin nombre ni ficha (aldeas, atalayas, casas fuertes, fuertes, minas, almenaras...). Por región, una lista de `[tipo, cuántos, { junto, tamano }]`; el mapa lo reparte solo donde el terreno lo permite. Para quitarlo de una región, borra su línea.
- **`gobierno`**: texto que solo se muestra dentro de la ciudad. El interior se genera solo: su tamaño sale de `tamano` y sus puertas, de los caminos que llegan a esa capital.
- **Caminos**: `de`, `a` (ids de lugares o de `cruces`), `tipo` (`camino`, `senda` o `barca`) y `puntos` intermedios. Se suavizan solos y el terreno abre paso. Los de tipo `barca` no se dibujan: solo cuentan para las rutas.
- **Ríos**: lista `rios`, cada uno con `puntos` y `ancho`. Excavan su cauce; dentro de un lago o del mar no se dibujan.
- **Lagos, marisma, costa y fronteras**: elipses y listas de puntos; el relieve y el agua se recalculan al recargar.
- **Ritmo de viaje**: `kmPorDia`.
- **Música**: `musica` asigna un archivo de `assets/audio/` al mapa, a las ciudades y a cada tipo de lugar.
- **Modelos de artista**: `modelos.lugares` asigna un glTF a un lugar o a un tipo de lugar, y `modelos.barco` a los barcos. Formato y packs recomendados, en `assets/modelos/LEEME.txt`.
- **Encuentros**: `encuentros.zonas` tiene, por región, el umbral del d20 y la tabla. Es una regla casera; cámbiala o borra el apartado para no tirar.

## La partida

El panel «Partida» guarda los cambios solo en el navegador de quien los hace. Para publicarlos: «Descargar partida.json» y subir ese archivo a `assets/data/`. Al cargar, el mapa usa el archivo publicado; un borrador local solo se conserva si se hizo sobre esa misma versión.

La niebla de guerra es una capa visual, no un secreto: `partida.json` y `mundo.json` son públicos.

Ojo: el repositorio es público. Lo que se escriba en `mundo.json` lo puede leer cualquiera, aunque en el mapa no se vea.

## La gente

Todas las personas salen de `js/figuras.js`: un cuerpo de una pieza con esqueleto dentro (rodillas, codos y cintura doblan), de formas gruesas, cabeza grande (unas 4,4 cabezas de alto), cara de ojos grandes y piezas facetadas. Se viste según su oficio (`aldeano`, `aldeana`, `crio`, `guardia`, `noble`, `clan`, `mercader`, `minero`, `escriba`, `marino`, `monje`), lleva útiles y armas (`martillo`, `hacha`, `pico`, `lanza`, `espada`, `cetro`, `jarra`, `escudo`…) y adopta una postura (`reposo`, `habla`, `escucha`, `golpea`, `remueve`, `bebe`, `come`, `escribe`, `reza`, `carga`, `empuja`…). No hay modelos ni texturas: todo es código.

Hay además un tipo `troll` (troll de escarcha: piel azulada, colmillos, orejas de punta y collar de hierro), que se usa con una talla de 1,3 a 1,5. En las ciudades, donde la gente parada va horneada, una figura singular se pide con el sexto argumento de `figura()` en `ciudad.js`.

En los parajes y los interiores cada figura es una malla con huesos; echa a andar sola en cuanto se la mueve. En las calles de las ciudades, donde hay más de cien, el ciclo de andar se hornea en doce geometrías fijas y se dibuja instanciado, con los colores de ropa, pelo y piel de cada persona.

## Enseres y animales

Lo que no es gente ni edificio sale de `js/utileria.js`: cada pieza es una geometría con los cantos matados y el color en los vértices, con un degradado de abajo arriba, sin texturas. Las usan los parajes (`ruinas.js`, `edificios.js`), las ciudades (`ciudad.js`), el mapa (`ambiente.js`: caminantes, carros de bueyes y rebaños) y los interiores (`interior.js`, `salas.js`). En los interiores, además, todas las cajas sueltas pasan por `cajaSala` y `acabado`, que les matan el canto y les dan el mismo degradado sobre el color de su material.

El mobiliario de las salas (mesas, sillas, sitiales, literas, camas, arcones, yunque, pila, braseros, rodelas, espadas y lanzas) sale también de ahí, en unidades de sala. Hay dos alturas que no conviene tocar porque la gente sentada está ajustada a ellas: el asiento de sitiales y sillas, y el tablero de las mesas (`alto + 0.35` en `mesa()` de `salas.js`). El sitial no lleva color propio: su armazón va en grises y toma el del material que se le pase (oro, piedra, madera).

La piedra de las cuatro ruinas (`ruinas.js`: criptas, sagrario, ciudad ahogada) es cantería: un material hecho con `canto(color, alto, largo, verdín)` trocea cada caja, torre o arco en sillares y `cantear` (en `utileria.js`) les reparte tonos y algo de verdín. Las hojas de la puerta de las criptas y la roca de la cuna van lisas a propósito.

Para añadir un enser: una función `gAlgo()` que devuelva la geometría con el suelo en y = 0 y el frente hacia +z, y se pinta con `matUtil`. Los animales admiten `null` como color para salir en blanco y teñirse por instancia.

## Vista de máster

Lo que los jugadores no deben saber (qué hay de cierto en cada rumor, lo que calla cada personaje, qué hay dentro de cada ruina, los frentes que avanzan) no está en este repositorio ni debe estarlo: el repositorio es público. Va en un archivo aparte, `alden-master.json`, que guarda el máster.

- En **Capas → Vista de máster…** se elige ese archivo desde el equipo. Se lee en el navegador y se queda guardado solo en ese navegador; no se sube a ninguna parte.
- Con la vista puesta, la ficha de cada lugar añade un bloque «Solo máster» y el códice gana una pestaña «Máster».
- La tecla **M** la oculta y la muestra. Al abrir la página siempre empieza oculta, por si la pantalla está a la vista de los jugadores.
- «Quitar de este equipo» borra el archivo del navegador.
- **Interior de las ruinas.** Si el archivo trae una `planta` para un lugar, su ficha (ya dentro del paraje) añade «Ver por dentro · solo máster». El interior se levanta en el momento con `js/mazmorra.js`; sin archivo, o con la vista oculta, el botón no existe y en esta web no hay nada que encontrar.
- El `.gitignore` ya excluye `alden-master*.json`. Aun así: no lo metas en la carpeta del repositorio.

### Formato de una planta

```json
"planta": {
  "tono": { "suelo": 7238248, "muro": 5922389, "luz": 12570816, "fondo": 395271, "verdin": 0.08 },
  "salas": [ { "id": "a", "nombre": "…", "x": 0, "z": 20, "w": 14, "d": 8, "texto": "lo que se lee al señalarla",
               "rasgos": [ { "tipo": "columna", "x": -4, "z": 1 } ] } ],
  "pasos": [ { "de": "a", "a": "b", "ancho": 3 } ]
}
```

Las salas son rectángulos centrados en `x, z` (+z hacia quien mira). Un paso sale recto si las dos salas se solapan en un eje y hace un codo si no; el hueco en el muro se abre solo. Los rasgos van medidos desde el centro de su sala: `columna`, `yacente`, `pozo`, `eje`, `mesa`, `rueda`, `aro`, `raices`, `agua`, `hielo`, `escombro`, `escalera`, `losa`, `cofre`, `banco`, `figura`, `bestia`, `escarcha` y `nota` (un rótulo con texto).

## Probar en local

Hace falta servirlo por HTTP (los módulos y el JSON no cargan con `file://`):

```
python3 -m http.server 8000
```

y abrir `http://localhost:8000`.

## Publicar en GitHub Pages

Subir `index.html`, `README.md`, `.gitignore` y la carpeta `assets` entera a la raíz del repositorio y activar Pages (Settings → Pages → Deploy from a branch → `main` / root).

## Controles

- Ratón: arrastrar mueve, rueda acerca, botón derecho gira.
- Táctil: un dedo mueve; con dos dedos, pellizcar acerca, retorcer gira y arrastrar los dos a la vez inclina. Un toque abre un lugar. Dentro de un lugar hay un botón «Volver» arriba a la izquierda.
- Teclado: Tab recorre los nombres, Intro abre la ficha, Esc la cierra; con el mapa enfocado, las flechas lo desplazan. F, modo foto; M, notas de máster (si hay archivo cargado).
