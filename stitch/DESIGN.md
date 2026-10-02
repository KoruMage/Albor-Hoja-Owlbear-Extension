---
name: Albor Pergamino
colors:
  background: '#f7f1e4'
  surface: '#fffdf8'
  surface-container: '#efe3c4'
  surface-inverse: '#2a2724'
  on-surface: '#2c2418'
  on-surface-variant: '#8a6e3d'
  on-surface-inverse: '#f7f1e4'
  primary: '#b88e44'
  primary-dark: '#8c6a28'
  primary-light: '#e4d2a0'
  outline: '#c4a15a'
  success: '#3d7a52'
  error: '#9a3b2a'
  accent-sun: '#e08a2c'
typography:
  display:
    fontFamily: Cinzel
    fontSize: 20px
    fontWeight: '700'
    letterSpacing: 0.12em
  section-title:
    fontFamily: Cinzel
    fontSize: 13px
    fontWeight: '700'
    letterSpacing: 0.14em
    textTransform: uppercase
  label:
    fontFamily: Cinzel
    fontSize: 11px
    fontWeight: '500'
    letterSpacing: 0.04em
  button:
    fontFamily: Cinzel
    fontSize: 10px
    fontWeight: '700'
    letterSpacing: 0.06em
    textTransform: uppercase
  body:
    fontFamily: Cormorant Garamond
    fontSize: 14px
    fontWeight: '500'
  input:
    fontFamily: Cormorant Garamond
    fontSize: 15px
    fontWeight: '600'
  die-number:
    fontFamily: Cinzel
    fontSize: 22px
    fontWeight: '700'
rounded:
  DEFAULT: 0px
  tab: 3px
spacing:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 16px
---

## Marca y tono

Albor es un juego de rol de fantasía y exploración (Albor v0.4, de Augusto Marini). La
interfaz es la versión digital de la ficha oficial impresa: un pergamino claro, tinta
sepia, filetes dorados y una única banda oscura de carbón donde viven las cuatro
estadísticas. Debe sentirse como papel impreso de calidad, no como una app de juegos
brillante: nada de neón, glassmorphism, sombras difusas ni gradientes llamativos.

El logotipo es un sol naranja (`#e08a2c`) naciendo sobre el horizonte con tres rayos
dorados. La marca de agua de texto es `~ ~ ~ albor ~ ~ juego ~ de ~ rol ~ ~ ~`, en
Cinzel minúscula, dorado, con tracking amplio, centrada arriba de cada hoja.

## Colores

- **Pergamino** (`#f7f1e4`) de fondo general, con dos halos radiales dorados muy tenues
  (12 % y 10 % de opacidad) en la esquina superior izquierda y la inferior derecha.
- **Papel** (`#fffdf8`) para hojas, paneles y campos.
- **Oro** (`#b88e44`) para bordes, filetes y líneas de escritura; **oro oscuro**
  (`#8c6a28`) para títulos y texto de botones; **oro claro** (`#e4d2a0`) para marcos
  secundarios y divisores de listas.
- **Carbón** (`#2a2724`) sólo para: la banda de estadísticas, el botón primario y la
  pestaña o chip activo (con texto pergamino).
- **Tinta** (`#2c2418`) para el texto escrito por el jugador; **sepia**
  (`#8a6e3d`) para etiquetas, ayudas y texto secundario.
- **Verde** (`#3d7a52`) para éxito y crítico; **rojo óxido** (`#9a3b2a`) para fracaso,
  advertencias y acciones destructivas.

## Tipografía

- **Cinzel** (versalitas romanas) para títulos, etiquetas de campo, botones, números de
  estadísticas y caras de dados.
- **Cormorant Garamond** para todo lo que escribe el jugador (valores de campos,
  descripciones, notas) y para los textos de ayuda.
- Títulos de sección con guiones decorativos: `- Talentos -`, `- Lazos -`.
- La interfaz corre en un popover de Owlbear de 900 × 700 px con base de 14 px: la
  escala es compacta y ningún título supera los 20 px.

## Formas y bordes

- Esquinas rectas (0 px) en todo. La única excepción es la pestaña dorada de cada
  estadística, con 3 px arriba.
- **Paneles**: fondo papel, borde de 1 px oro y dos escuadras ornamentales de 10 × 10 px
  (1,5 px, oro) en la esquina superior izquierda y la inferior derecha, como marcas
  de corte de imprenta.
- **Hoja**: fondo papel, borde de 1 px oro claro y un doble filete interior (6 px de
  pergamino y luego 1 px oro claro).
- **Campos de texto**: sin caja. Sólo una línea base de 2 px con gradiente metálico
  (`#e8d5a3 → #b88e44 → #7a5a22 → #d4b46a`), como la línea de un formulario impreso.
  La etiqueta va arriba, en Cinzel sepia.
- **Filas de lista** (talentos, lazos, maestrías, armas): línea base dorada de 2 px con
  una pequeña muesca vertical de 2 × 10 px en el extremo derecho.

## Componentes

### Botones
- **Secundario**: fondo transparente, borde de 1 px oro, texto Cinzel en mayúsculas
  oro oscuro, hover con fondo `#efe3c4`.
- **Primario**: fondo carbón, texto pergamino, borde oro, en negrita y con más padding
  (8 × 16 px). Se usa para *Guardar* y *Tirar*.
- **Peligro**: borde y texto rojo óxido.
- Deshabilitado: 45 % de opacidad.

### Pestañas y chips de selección
Fila de botones secundarios; el activo se pinta carbón con texto pergamino.

### Banda de estadísticas
Barra carbón con cuatro columnas iguales (VIGOR, AGILIDAD, APTITUD, VOLUNTAD). Cada
columna tiene una **pestaña dorada** con gradiente (`#d4b05a → #b88e44`) donde van el
nombre y la cantidad de dados (1–8) en blanco, y debajo un **estandarte** de pergamino
recortado en trapecio (más ancho arriba) que dice "dado base" y muestra d4–d12.

### Cajas de recurso
Borde de 1,5 px oro, título en Cinzel pequeño oro oscuro y el par `actual / Máxima`
con la barra separadora en oro. Algunas suman una tercera fila, "Reserva".

### Selector de dificultad
Botón `−`, número centrado de 52 px y botón `+`, todo pegado; abajo, la banda de
dificultad en sepia: G(5), F(7), E(9), D(11), C(13), B(15), A(17), S(19).

### Caras de dado
Fichas cuadradas con borde de 2 px oro y fondo papel: arriba "DADO 1" en versalitas
diminutas, al centro el número grande en Cinzel y abajo "d8". En el historial se usa
una versión chica.

### Resultado de tirada
Caja con borde de 1 px cuyo color depende del resultado: verde para *Éxito extra* y
*Éxito*, oro oscuro para *Éxito limitado* y rojo óxido para *Fracaso*. Muestra las
caras, la suma (`4 + 6 + 2 = 12`), `vs 9 → Éxito` y los sufijos `· Crítico` y `· Dice+`.
