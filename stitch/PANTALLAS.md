# Albor: instrucciones para Stitch

Cómo usarlo:

1. Crear un proyecto nuevo en Stitch llamado **"Albor - Hoja de Personaje"**, en modo
   Desktop.
2. Crear el sistema de diseño a partir de `DESIGN.md` (con "create design system from
   DESIGN.md") y aplicarlo al proyecto.
3. Generar cada pantalla por separado. Pegar siempre el **Contexto común** y, a
   continuación, el prompt de la pantalla.
4. Para las pantallas que salen de otra (por ejemplo, la vista del GM sale de la ficha
   del jugador), conviene usar "edit screens" sobre la pantalla base en lugar de
   generarla desde cero, así se mantiene la coherencia.

---

## Contexto común (pegar antes de cada prompt)

```text
Extensión "Albor - Hoja de Personaje" para Owlbear Rodeo (mesa virtual de rol). Se
abre como popover de 900 px de ancho por 700 px de alto; el contenido hace scroll
vertical. Todo el texto está en español rioplatense (voseo: "Creá", "Importá",
"Elegí").

Estética: la ficha impresa oficial de Albor v0.4. Fondo de pergamino #f7f1e4, papel
#fffdf8, filetes y líneas dorados #b88e44, títulos oro oscuro #8c6a28 y tinta sepia
#2c2418. El carbón #2a2724 se usa sólo en la banda de estadísticas, el botón primario
y la pestaña activa. Títulos, etiquetas y botones en Cinzel (los botones en
mayúsculas); lo que escribe el jugador, en Cormorant Garamond. Esquinas rectas. Los
campos no tienen caja: son una línea base dorada de 2 px, como un formulario impreso.
Nada de sombras difusas, glassmorphism ni colores neón. Estilo sobrio, editorial y de
alta densidad.

Encabezado de la app: arriba, la marca de agua centrada "~ ~ ~ albor ~ ~ juego ~ de ~
rol ~ ~ ~" (Cinzel minúscula, dorado, tracking amplio); a la izquierda el título
"ALBOR" y el subtítulo "Vista de jugador · Nahuel" (o "Vista del Director (GM) ·
Koru"); a la derecha, los botones de acción. Debajo, una línea dorada de 2 px.

Personaje de ejemplo: Iara Solís. Concepto: "Cartógrafa que persigue el primer
amanecer". Linaje: Humana del Delta. Ocupación: Gremio de Cartógrafos. Rol:
Exploradora. Nivel 2. Tamaño 1. VIG 2 d6, AGI 3 d8, APT 3 d6, VOL 2 d4. Determinación
8/8 (reserva 16). Chispa 10/10 (reserva 20). Suerte 7/10. Heridas 0/1. Movimiento 6.
Adrenalina 1d4+2. DP 1.
```

---

## Pantalla 1: Ficha del jugador, página 1 (Ficha)

```text
Pantalla principal de la vista de jugador, pestaña "Ficha" activa.

1. Encabezado (ver contexto común). Acciones a la derecha. Hoy son nueve botones
   sueltos, así que agrupalos: [Nuevo] [Duplicar], un menú "Archivo ▾" (Exportar
   JSON, Exportar PDF, Importar JSON) y un menú "Compartir ▾" (Ver en web, Copiar
   enlace). El jugador no ve "Eliminar".
2. Pestañas: Ficha (activa) · Tiradas · Opciones.
3. Selector de personaje: una fila de chips con los nombres ("Iara Solís" activo).
4. Barra de sincronización (una línea en texto sepia): "Sincronizar con ficha local:"
   seguido de un select "Elegir…".
5. Barra de guardado, pegada arriba al hacer scroll (sticky): un botón primario
   "GUARDAR" y, al lado, el texto en rojo óxido "Hay cambios sin guardar."
6. Panel "TIRADOR", compacto y colapsable:
   - Cuatro chips de estadística: "VIG 2d6", "AGI 3d8" (activo), "APT 3d6", "VOL 2d4".
   - Checkbox: "Talento aplica (+1 escalón de dado)".
   - Campo numérico "Dados extra" (de −3 a 6) y el selector de "Dificultad" (− 9 +),
     con la leyenda "E(9)" debajo.
   - Línea de resumen: "Vas a tirar 3d8 vs E(9) · local".
   - Botón primario "TIRAR".
   - Último resultado: tres caras de dado (DADO 1: 6, DADO 2: 8, DADO 3: 2; todas d8)
     y la línea "6 + 8 + 2 = 16 vs 9 → Éxito extra", con borde verde.
   - Ayuda en sepia: "Dados base: d4 → d6 → d8 → d10 → d12. El talento sube un
     escalón."
7. Hoja de papel con doble filete interior:
   - Marca de agua centrada.
   - "Nombre del Personaje", centrado y grande: Iara Solís.
   - "Concepto del personaje", a todo el ancho.
   - Una fila de cinco campos: Linaje · Ocupación (o Gremio) · Rol · Nivel · Tamaño.
   - Banda carbón con las cuatro estadísticas: pestaña dorada con "VIGOR" y el número
     2 grande; debajo, el estandarte trapezoidal "dado base d6". Lo mismo para
     AGILIDAD, APTITUD y VOLUNTAD.
   - Primera fila de recursos (tres cajas): "Determinación" (actual 8 / Máxima 8,
     Reserva 16), "Chispa" (actual 10 / Máxima 10, Reserva 20) y "Suerte" (Restante 7
     / Total 10).
   - Segunda fila (cuatro cajas): "Heridas" (actuales 0 / Capacidad 1), "Movimiento"
     6, "Adrenalina (+VIG)" 1d4+2 y "DP" 1.
   - Sección "- TALENTOS -" con el botón secundario "Añadir" a la derecha. Cada fila
     tiene el nombre (160 px), la descripción (textarea) y el botón "Quitar". Ejemplos:
     "Ojo de halcón / Repetí una tirada de AGI para orientarte, una vez por escena." y
     "Mano firme / +1 escalón de dado al trazar mapas."
   - Sección "NOTAS": un textarea amplio.
```

## Pantalla 2: Ficha del jugador, página 2

```text
Continuación de la misma ficha: segunda hoja de papel, debajo de la primera y con el
mismo marco. Mostrala sola, con la barra de guardado sticky arriba.

1. Marca de agua y "Nombre del Personaje" centrado (Iara Solís).
2. "- LAZOS -", con "notas" a la derecha en sepia. Tres filas de dos columnas: Lazo |
   notas. Ejemplo: "Tío Ernesto | Me enseñó a leer las estrellas".
3. Dos columnas:
   - Izquierda: "- ETIQUETAS -" (una grilla de 2 × 2 líneas de escritura: "Curiosa",
     "Terca", "Nadadora", vacía) y, debajo, "- DOMINIO -" (seis líneas de escritura).
   - Derecha: "- EQUIPO -" (once líneas: "Brújula de bronce", "Cuerda 15 m", "Tinta y
     plumas", etc.).
4. "- MAESTRÍAS -", con "descripción" a la derecha. Seis filas de dos columnas:
   Maestría | descripción.
5. "- ARMAS Y ARMADURA -", con "stat × dado + momentum" a la derecha en sepia. Cinco
   bloques de arma. Cada bloque tiene:
   - Fila 1: "Arma o armadura" (160 px) | notas. Ejemplo: "Daga curva | ligera,
     arrojadiza".
   - Fila 2, con los controles en línea: Estadística (select "AGI (3)"), Dado (select
     "d6"), Momentum (número 0–6), el selector de Dificultad (− 9 +, "E(9)") y el
     botón primario "TIRAR 3D6".
   - Una línea de vista previa en sepia: "AGI 3 × d6 → 3d6".
   - En el primer bloque, un resultado con borde rojo óxido: caras 1, 3, 2 y la línea
     "1 + 3 + 2 = 6 vs 9 → Fracaso".
   - Los bloques vacíos dicen "Ponle nombre al arma para tirar." y el botón aparece
     deshabilitado.
6. Pie de la hoja: a la izquierda, "albor" en Cinzel oro y "Albor v0.4 — 2026"; a la
   derecha, en sepia pequeño: "Albor es un juego de rol, fantasía y exploración creado
   por Augusto Marini. Todos los derechos reservados."
```

## Pantalla 3: Ficha en la vista del Director (GM)

```text
Editar la Pantalla 1 para la vista del GM.

- Subtítulo: "Vista del Director (GM) · Koru".
- Pestañas: Ficha (activa) · Tirador GM · Tiradas · Opciones.
- Acciones del encabezado: además de las del jugador, "Eliminar" como botón de peligro
  (borde y texto rojo óxido), fuera de los menús y separado del resto.
- Selector de personajes con cuatro chips: "Iara Solís" (activo), "Bruno del Monte",
  "Tala", "Nuevo personaje". Mostrá en cada chip, en sepia pequeño, a quién está
  asignado: "Nahuel", "Sofi", "sin asignar".
- En la fila de identidad se suma un sexto campo, el select "Asignado a", con las
  opciones "Sin asignar", "Nahuel", "Sofi", "Koru (GM)" y "Asignado (desconectado)".
- Sin la barra de sincronización con ficha local.
```

## Pantalla 4: Tirador del Director

```text
Vista del GM, pestaña "Tirador GM" activa. No se muestra el selector de personajes.

Un panel ancho con escuadras ornamentales:
- Título: "TIRADOR DEL DIRECTOR".
- Subtítulo en sepia: "Tiradas libres para PNJ, trampas, daño o checks sin ficha. ·
  Dice+".
- Campo "Quién tira", con el placeholder "Koru" y el valor "Lobo de ceniza".
- Una fila con "Cantidad" (número 1–12, valor 4), "Dado" (select de d4 a d12, valor
  d8) y el selector de Dificultad. Acá el selector admite "sin dificultad": se muestra
  "—" y la leyenda "(solo total)".
- Línea de resumen: "Vas a tirar 4d8 vs C(13)".
- Botón primario "TIRAR".
- Resultado: cuatro caras (8, 6, 4, 8), "8 + 6 + 4 + 8 = 26 vs 13 → Éxito extra ·
  Crítico · Dice+", con borde verde. Resaltá el crítico con un sello o una cinta
  dorada discreta.

Sumá a la derecha, en una columna estrecha, una referencia rápida de bandas de
dificultad (G 5, F 7, E 9, D 11, C 13, B 15, A 17, S 19) y de resultados: más de 5
por encima es Éxito extra; de 0 a 5 por encima, Éxito; de 1 a 2 por debajo, Éxito
limitado; peor que eso, Fracaso. Crítico: tres o más dados d6 o mayores con al menos
tres caras pares ≥ 6.
```

## Pantalla 5: Historial de tiradas

```text
Pestaña "Tiradas" activa (vista del GM, que puede vaciar el historial).

Un panel con el título "TIRADAS" y el botón "Vaciar" a la derecha. Es una lista de
entradas separadas por un filete oro claro; la más reciente va primero. Cada entrada
tiene:
- Quién tiró, en Cinzel negrita: "Iara Solís (Nahuel)".
- El resumen en texto: "AGI +talento 3d10 [7 + 10 + 2] = 19 vs E(9) → Éxito extra".
- Una fila de caras de dado chicas, con el tipo de dado encima ("D10"), y al final la
  suma en sepia: "7 + 10 + 2 = 19".
- La hora y el origen en sepia: "18:42:07 · Dice+".

Mostrá seis entradas variadas:
- una crítica en verde ("… CRÍTICO → Éxito");
- un fracaso en rojo óxido;
- un éxito limitado en tinta normal;
- una del director ("Lobo de ceniza (Koru)  4d8 [8 + 6 + 4 + 8] = 26 vs C(13) →
  Éxito extra");
- una de arma ("Daga curva AGI+1 mom 4d6 [...]").

Agregá también una variante del estado vacío: "Todavía no hay tiradas.", centrado, en
sepia, con el sol de Albor dibujado a línea fina.
```

## Pantalla 6: Opciones

```text
Pestaña "Opciones" activa (vista del GM).

Un panel titulado "OPCIONES" con:
- Checkbox: "Usar Dice+ (dados 3D en Owlbear). Si no está instalada, se tira en
  local."
- Checkbox: "Sincronizar la sala con las fichas locales de este navegador".
- Una ayuda en sepia: "Entorno: Owlbear Rodeo · metadata com.albor/state" (la clave de
  metadata en tipografía monoespaciada pequeña).
- El botón secundario "Exportar mesa".

Mostralo agrupado en dos bloques: "Dados" y "Datos de la mesa". La pantalla queda con
mucho aire; no la rellenes con elementos inventados.
```

## Pantalla 7: Vista web de solo lectura (ficha compartida)

```text
Página independiente, fuera de Owlbear. Es lo que se abre con "Ver en web" o con un
enlace compartido. Ancho de escritorio de 1280 px, con la ficha centrada y un ancho
máximo de 960 px.

- Encabezado: marca de agua, título grande con el nombre del personaje ("Iara Solís")
  y el subtítulo "Vista web de solo lectura". Botones a la derecha: "Abrir JSON" y
  "Exportar PDF".
- Debajo, las dos hojas completas (página 1 y página 2, como en las pantallas 1 y 2),
  pero en modo lectura: los campos muestran el texto como si estuviera escrito sobre
  las líneas doradas, sin controles de edición, sin Tirador, sin barra de guardado,
  sin "Añadir"/"Quitar" y sin botones de tirar en las armas.
- Estilo de impresión: que parezca la ficha física, con buen contraste.

Agregá una variante de error: sin la ficha y con el mensaje en rojo óxido "No hay
ficha en este enlace. Importá un JSON." junto al botón "Abrir JSON" destacado.
```

## Pantalla 8: Estados vacíos y de carga

```text
Tres variantes pequeñas del popover de 900 × 700 px:

1. Carga: el popover vacío en pergamino, con el sol de Albor al centro y "Cargando la
   mesa..." en Cinzel sepia.
2. Jugador sin personaje: el encabezado de jugador, las pestañas y, en el cuerpo, "El
   GM todavía no te asignó un personaje." en sepia, centrado, con una ilustración
   lineal discreta (un sol tras el horizonte).
3. GM sin personajes: "Todavía no hay personajes. Creá uno o importá un JSON.", con
   dos botones centrados: "NUEVO" (primario) e "IMPORTAR JSON" (secundario).
```

## Pantalla 9 (opcional): Confirmaciones

```text
Hoy la app usa diálogos nativos del navegador. Diseñá modales propios en el estilo
del pergamino (panel con escuadras ornamentales sobre un velo carbón al 60 %):

- "Hay cambios sin guardar. ¿Descartarlos?", con los botones [Cancelar] y
  [Descartar] (peligro).
- "¿Borrar a Iara Solís?", con los botones [Cancelar] y [Eliminar] (peligro).
- Error: "No se pudo importar ese archivo." con el botón [Entendido].
```

---

## Notas de la revisión del código que deben guiar el rediseño

Para que el diseño nuevo se pueda implementar sin tocar la lógica, estas reglas salen
del código actual:

- **Mismos datos y los mismos textos**: los nombres de campos, etiquetas y mensajes de
  los prompts son los literales de `CharacterSheet.tsx`, `DiceRoller.tsx`,
  `GmDiceRoller.tsx`, `DiceLog.tsx` y `App.tsx`. No hay que agregar campos nuevos
  (por ejemplo, retrato, XP u oro), porque el modelo `AlborCharacter` no los tiene.
- **Cantidades fijas en la página 2**: 3 lazos, 4 etiquetas, 11 líneas de equipo, 6
  de dominio, 6 maestrías y 5 armas (`PAGE2_COUNTS`). Los talentos de la página 1 son
  una lista dinámica.
- **Rangos**: cada estadística va de 1 a 8 dados, con dado base d4/d6/d8/d10/d12. La
  dificultad va de 1 a 30 y lleva la letra de banda sólo en 5, 7, 9, …, 19.
- **Permisos**: sólo el GM ve "Tirador GM", "Asignado a", "Eliminar", "Vaciar" y la
  opción de sincronizar la sala. El jugador ve sólo sus fichas.
- **Problemas de la UI actual que el rediseño resuelve**:
  - El encabezado tiene nueve botones sueltos que se desbordan en 900 px; se agrupan
    en menús.
  - El Tirador ocupa la parte de arriba de la ficha y empuja la hoja hacia abajo; pasa
    a ser un panel colapsable.
  - Hay dos barras de "Guardar" (una sticky y otra al final); con la sticky alcanza.
  - Las confirmaciones usan `window.confirm` y `window.alert`; se reemplazan por
    modales con el estilo de la app.
  - En el historial se colorea la entrada entera en verde o rojo; conviene colorear
    sólo un filete lateral o el resultado, para no perder legibilidad.
