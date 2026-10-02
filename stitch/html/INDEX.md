# Pantallas de Stitch: Albor - Hoja de Personaje

- Proyecto de Stitch: `11198478379996200297` ("Albor - Hoja de Personaje")
- Sistema de diseño: `assets/388a267f77ec49a084ea913a8aa89e16` ("Albor Pergamino", creado desde `stitch/DESIGN.md`)
- Modelo: `GEMINI_3_8_FLASH`, dispositivo `DESKTOP`.

Las capturas se bajaron a 1280 px de ancho. En 01, 03, 04 y 06 la captura muestra sólo
la primera vista (1280 × 1024); el HTML tiene la pantalla completa.

| Archivo | Título en Stitch | Id de pantalla |
| --- | --- | --- |
| `00-logo-sol.svg` | Sol naciente Albor (logo generado por Stitch, extra) | `432cbacf2eed44399e016aa585cc4eaf` |
| `01-ficha-p1.html` / `.png` | Albor - Hoja de Personaje (Iara Solís) | `2e09ac39c99b4687af8e4342c1520bb6` |
| `02-ficha-p2.html` / `.png` | Albor - Hoja de Personaje (Segunda Hoja - Lazos y Combate) | `b20aa4d5e8a8428fa281d702bda706d5` |
| `03-vista-gm.html` / `.png` | Albor - Hoja de Personaje (Vista del Director / GM) | `87df5f41b05c4bc0aefea8de7d885fc8` |
| `04-tirador-gm.html` / `.png` | Albor - Vista del Director (Tirador GM corregido) | `8e7bd8d9e20d41b18e5f8a4a035e2f47` |
| `05-tiradas.html` / `.png` | Albor - Historial de Tiradas (Vista GM) Corregido | `f2212f85befb44f7b7b888d1137d78eb` |
| `06-opciones.html` / `.png` | Albor - Opciones (Vista del GM) | `01017eaeca65445f829d3a5a215ff63d` |
| `07-vista-web.html` / `.png` | Albor - Vista Web de Solo Lectura (Iara Solís) | `db48639fe2754b96a567407a768a56ed` |
| `08-estados-vacios.html` / `.png` | Albor - Variantes del Popover (Carga, Jugador y GM) | `77922901d45c4e728f6dc1c068dc2e2a` |
| `09-modales.html` / `.png` | Albor - Diálogos Modales (Estilo Pergamino) | `b1203ca4ac5c4b1489bc052acc302ca5` |

Notas:

- 03 se hizo con `edit_screens` sobre 01; Stitch la creó como pantalla nueva y 01 quedó intacta.
- 04 y 05 son la versión corregida con `edit_screens`. Las originales siguen en el proyecto:
  `b1dca2865a594873aacfdb4f3cbb0969` (Tirador GM) y `1c2d78ecfb4041d98b46d0797fb81809` (Tiradas).
- 05, 07 y 08 incluyen sus variantes dentro de la misma pantalla (estado vacío, error web y
  los tres estados de carga/vacío), por eso no hay archivos `-b`.
- 09 se generó en un segundo intento (el primero venció por tiempo y nunca apareció). Los tres
  modales son fieles al prompt; el resto de la pantalla no: la página exterior es carbón, hay una
  barra "Simular diálogo" inventada, y la ficha velada de fondo tiene campos que no son de Albor
  (Fuerza, Intelecto, Arquetipo, etc.). Usar sólo los modales y el velo como referencia.
- 07 y 08 existen (se obtienen con `get_screen`) pero `list_screens` y `get_project` no las listan.

| Archivo | Título en Stitch | Id de pantalla |
| --- | --- | --- |
| `10-mesa.html` | Albor - Vista del Director (Mesa) | `120b4956c6c24452aa1d8a8eb4d4586f` |
| `11-sala.html` | Albor - Variantes del Popover de Sala (Gestión y Conexión) | `f5cd27ea660943dea253be4d3d15f769` |
| `12-opciones.html` | Albor - Opciones (Vista del GM Corregida) | `8f8c731a073b4778b2469f87d4a14936` |
| `13-ficha-sala.html` | Albor - Vista del Director (Ficha Propia y Solo Lectura) | `34d4e1a531f9455d91a19a8dcfcc9746` |

10, 11, 12 y 13 se derivaron con `edit_screens` (10 y 13 desde la vista GM `87df5f41b05c4bc0aefea8de7d885fc8`, 11 desde los estados vacíos `77922901d45c4e728f6dc1c068dc2e2a`, 12 desde opciones `01017eaeca65445f829d3a5a215ff63d`). Las pantallas base quedaron intactas.

| Archivo | Título en Stitch | Id de pantalla |
| --- | --- | --- |
| `14-mesa-oscura.html` | Albor - Vista del Director (Mesa - Versión Oscura) | `d6238afb9fae47d589e7ecd8a0441af0` |
| `15-ficha-oscura.html` | Albor - Hoja de Personaje Nocturna (Iara Solís) | `99ca044811b14226b6ebd3ab76005035` |

14 sale de la mesa `120b4956c6c24452aa1d8a8eb4d4586f` y 15 de la ficha `2e09ac39c99b4687af8e4342c1520bb6`. Fondo `#16130f`, papel `#241f19`, tinta `#f3ead7`, oro `#d4b46a`. Las claras quedaron intactas.

| Archivo | Título en Stitch | Id de pantalla |
| --- | --- | --- |
| `16-listas-agregar.html` | Albor - Hoja de Personaje (Segunda Hoja - Listas Dinámicas con Agregar) | `a5478884e92047daad146bcdf9f56b08` |

16 sale de la segunda hoja `b20aa4d5e8a8428fa281d702bda706d5`. Equipo, Dominio, Maestrías y Armas llevan el botón Agregar; no hay filas vacías hasta pulsarlo.

| Archivo | Título en Stitch | Id de pantalla |
| --- | --- | --- |
| `17-ficha-p2-oscura.html` | Albor - Hoja de Personaje Nocturna (Segunda Hoja - Lazos y Combate) | `03a66f140b5c4726bf20927b9fd6838a` |
| `18-opciones-oscuras.html` | Albor - Opciones Nocturnas (Vista del GM) | `8237291ed3aa47b093e9a376c3506334` |
| `19-tiradas-oscuras.html` | Albor - Historial de Tiradas (Vista GM - Versión Oscura) | `3133bbe28baf4321a025e312090d0302` |
| `20-sala-oscura.html` | Albor - Variantes del Popover de Sala (Modo Nocturno) | `cf323e5fff4f414b86864ef4890801a0` |
| `21-tirador-oscuro.html` | Albor - Vista del Director (Tirador GM - Versión Oscura) | `c0477a035ef54dc5aac4f8a37738f5f9` |

17 sale de las listas con Agregar, 18 de las opciones corregidas, 19 del historial, 20 de la sala y 21 del tirador GM. Misma noche que 14 y 15. En 18 hay una sección Apariencia con el checkbox Noche.
