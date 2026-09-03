---
title: Albor - Hoja de Personaje
description: Fichas de personaje y tirador de dados para Albor 0.4, con asignacion de jugadores y Dice+
author: Koru
icon: /icon.svg
tags:
  - character
  - party
  - tool
manifest: /manifest.json
---

# Albor - Hoja de Personaje

Extension para gestionar fichas de **Albor 0.4** dentro de Owlbear Rodeo.

### Que hace

- El GM ve todas las fichas y puede asignar cada PJ a un jugador conectado. \
  Cada jugador ve y edita solo su(s) personaje(s) asignado(s).
- Ficha con identidad, cuatro estadisticas (VIG / AGI / APT / VOL: cantidad de dados + tamaño base), DET, Chispa, reservas, suerte, heridas y talentos en texto libre.
- Tirador: elegis stat, si aplica un talento (+1 escalón de dado), dados extra y dificultad G(5)–S(19). Interpreta éxito extra / éxito / éxito limitado / fracaso y detecta críticos.
- Integracion opcional con Dice+ para dados 3D (si no esta instalada, se usa la tirada local).
- Vista web: cada ficha se puede abrir o compartir con un enlace, y tambien se puede importar un JSON exportado.

Todo el estado se guarda en la metadata de la sala de Owlbear (`com.albor/state`).

### Uso

1. Entra a una sala en Owlbear Rodeo.
2. Abri el menu de extensiones y elegi "Add Extension".
3. Pega la URL del manifest: `https://albor-hoja-owlbear.pages.dev/manifest.json`
4. Aparecera el boton "Albor" en la barra de acciones.
5. El rol (GM o jugador) lo determina Owlbear automaticamente.
