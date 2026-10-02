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
