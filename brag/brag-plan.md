# brag-plan · Tierras de Alden (juegorol)

Entrada: proyecto (`github.com/luisbla/juegorol`, commit `0c36ead`, v42).
Opciones: `--tone cinematic --format landscape --duration 20` → 1920×1080, 30 fps, 600 fotogramas.

## Qué es

- **En una frase:** un mapa de campaña de rol en 3D, interactivo, que se abre en el navegador como una web estática.
- **Para quién:** el máster y los jugadores de la mesa: ven dónde están, entran en las ciudades y miden los viajes.
- **Qué lo distingue:** no hay modelos ni texturas; relieve, ciudades, tabernas y gente salen de código y de un `mundo.json`.
- **La afirmación más fuerte:** «No hay modelos ni texturas: todo es código.» (README)
- **Gancho visual:** la maqueta entera del mundo saliendo de la noche al amanecer.
- **Flujo real que se enseña:** portada → mapa → ficha de Valcoria → «Entrar en la ciudad» → taberna → «Viajar desde aquí» (465 km · 12,1 días a pie).
- **Tono:** `cinematic`: tráiler, tipografía grande, pocas frases, golpes en los cortes.
- **Frase para compartir:** «Cuatro tierras, una frontera que arde y un invierno que llega pronto. Y ni un solo modelo 3D: todo es código.»

## Ángulo

El tráiler de una campaña que no existe más que en un navegador. Los tres primeros rótulos son la frase de la portada del
propio proyecto, partida en tres planos; la portada real aparece después con la frase entera, se pulsa «Entrar con sonido»
y a partir de ahí se enseña el producto en uso. El remate es la afirmación del README.

## Identidad visual (del proyecto)

- Colores de `assets/css/app.css`: tinta `#12141a`, crema `#efe6d2`, oro `#e0b85e`, tenue `#b7ad98`.
- Tipografía: la pila serif del proyecto (Iowan Old Style / Palatino…). En esta máquina la resuelve TeX Gyre Pagella, que es un clon de Palatino.
  Rótulos al modo de `.etq-region`: mayúsculas, espaciado ancho, sombra oscura.
- Todo lo que se ve en 3D es la app real corriendo en Chrome sin cabeza, capturada fotograma a fotograma con reloj virtual.
  La interfaz (cabecera, mandos, fichas, etiquetas) es el DOM real con su hoja de estilos. La portada se monta con el marcado y el CSS reales.
- Datos personales o secretos: ninguno. El mundo y sus personajes son ficción; no se usa el archivo de máster (no está en el repo).

## Música

120 pulsos por minuto (1 pulso = 15 fotogramas; se siente a 60). Re menor. 40 pulsos en 20 s. Todos los cortes caen en pulso.
Bordón grave y golpes en los cortes durante el gancho; al pulsar «Entrar con sonido» entra el ostinato de cuerdas y el bombo;
remate con golpe final y cola. Efectos (golpes, subidas, clic) en la misma tonalidad y sobre la misma rejilla.

## Guion (30 fps)

| # | Pulsos | Fotogramas | Tiempo | Plano (app real) | Texto |
|---|---|---|---|---|---|
| C1 gancho | 0–2 | 0–44 | 0,0–1,5 | Vista general: la maqueta pasa de la noche al alba (05:20 → 07:20) | CUATRO TIERRAS. |
| C2 | 3–6 | 45–104 | 1,5–3,5 | Puesto de Vigía Quemado al anochecer, brasas y humo, cámara que se acerca | UNA FRONTERA QUE ARDE. |
| C3 | 7–10 | 105–164 | 3,5–5,5 | Fortaleza Griselda nevada entre cumbres, travelling lateral | UN INVIERNO QUE LLEGA PRONTO. |
| R revelación | 11–17 | 165–269 | 5,5–9,0 | Portada real sobre el mapa de día; clic en «Entrar con sonido»; se levanta el velo y aparece la interfaz; clic en VALCORIA | UN MAPA DE CAMPAÑA · Tierras de Alden · (la frase entera) |
| H1a | 18–19 | 270–299 | 9,0–10,0 | Ficha de Valcoria; clic en «Entrar en la ciudad» | Entra en cada capital. |
| H1b | 20–22 | 300–344 | 10,0–11,5 | Valcoria por dentro, órbita lenta sobre los tejados | (sigue) |
| H2 | 23–25 | 345–389 | 11,5–13,0 | La Taberna del Jabalí Contento, cámara que entra | Siéntate en la taberna. |
| H3 | 26–29 | 390–449 | 13,0–15,0 | «Viajar desde aquí»: Valcoria → Puerto de Liria, la ruta se traza y la comitiva la recorre | Cada viaje, medido en días. |
| P remate | 30–34 | 450–524 | 15,0–17,5 | Página «Personajes»: las doce clases andando; en el pulso 32 cambian de especie | SIN MODELOS. SIN TEXTURAS. / TODO ES CÓDIGO. |
| O cierre | 35–39 | 525–599 | 17,5–20,0 | El mapa de noche, ventanas encendidas y el faro | Tierras de Alden · luisbla.github.io/juegorol |

Suma: 45 + 60 + 60 + 105 + 30 + 45 + 45 + 60 + 75 + 75 = 600 fotogramas.

## Transiciones

- Entre rótulos del gancho: corte con fundido a tinta de 3 fotogramas, sobre el golpe.
- Revelación: destello a blanco desde la nieve de Griselda; el mapa se posa bajo la portada y el velo se levanta como en la app.
- H1a → H1b: el fundido a tinta de la propia app al entrar en una ciudad (abreviado).
- Resto: corte seco en pulso. P → O: fundido a tinta.

## Notas de producción

- Chrome dibuja por software (SwiftShader), a varios segundos por fotograma. Los planos de interior se capturan cuadro a cuadro (30 fps reales).
  Los planos del mapa entero se capturan con cámara fija cada pocos fotogramas y se funden; el empuje de cámara de esos planos se hace en montaje.
- Captura a 1280×720 con densidad 1,5 (salida 1920×1080) para que la interfaz se lea en vídeo.

## Resultado

- `brag.mp4`: 1920×1080, 30 fps, 600 fotogramas, 20,0 s, H.264 + AAC. El fotograma 0 es el póster (`brag.jpg`, la portada asentada).
- Herramientas: Chrome sin cabeza, Playwright, ffmpeg, Python con numpy y scipy. Ya estaban en la máquina; no se ha instalado nada ni se ha tocado el repositorio.
- Sincronía: clics de interfaz en los pulsos 15,5 / 17,5 / 19,5; cambio de especie en el pulso 32; todos los cortes en pulso.
- La banda sonora está sintetizada por código (el script no va en el repositorio): −13,5 LUFS, pico real −3,1 dB.
