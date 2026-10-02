# Albor - Hoja de Personaje (extension de Owlbear Rodeo)

Extension para gestionar fichas de **Albor 0.4** dentro de [Owlbear Rodeo](https://www.owlbear.rodeo/).

## Que hace

- **Cada jugador guarda su ficha en el navegador.** El director también crea y edita personajes propios.
- **El director crea una sala** (código de 6 caracteres). Los jugadores se unen y el director ve una grilla de la mesa; las hojas ajenas se abren en solo lectura.
- **Ficha**: identidad (linaje, ocupación, rol), cuatro estadísticas (VIG / AGI / APT / VOL) con cantidad de dados y tamaño base (d4–d12), DET, Chispa, reservas, suerte, heridas, MOV, DP y talentos en texto libre.
- **Tirador**: stat, talento (+1 escalón de dado), dados extra y dificultad G(5)–S(19). Interpreta éxito extra / éxito / éxito limitado / fracaso. Crítico si hay 3+ dados d6 o mayores y al menos tres caras pares ≥ 6.
- **Dice+** (opcional, lo activa el GM): tiradas 3D. Si no está instalada, se usa la tirada local.
- **Vista web**: Ver en web / copiar enlace. Fuera de Owlbear se elige Director o Jugador y se puede crear o unirse a la misma sala.

Las fichas viven en `localStorage` (`com.albor/web-state`). Owlbear solo guarda el código de la sala (`com.albor/room`) para que el resto de la mesa pueda unirse. La sala en vivo es un Durable Object de Cloudflare.

## Requisitos

- Node.js 18+ y npm.

## Uso en desarrollo (local)

```bash
npm install
npm run dev
npm run dev:rooms
```

Vite sirve la extension en `http://localhost:5173` y proxea `/rooms` al Worker (`wrangler dev` en el puerto 8787). Sin `dev:rooms` las fichas locales siguen funcionando; crear o unirse a una sala no.

### Cargar la extension en Owlbear

1. Entra a una sala en https://www.owlbear.rodeo/
2. Abri el menu de extensiones y elegi **Add Extension**.
3. Pega:

   ```
   http://localhost:5173/manifest.json
   ```

## Build y deploy (Cloudflare Pages)

```bash
npm run build
npm run preview
npm run deploy
```

`npm run deploy` hace el build, copia `static_root/` a `dist/` y sube con Wrangler:

```
wrangler pages deploy dist --project-name=albor-hoja-owlbear
```

Necesitas `npx wrangler login` la primera vez.

URLs previstas:

- App: `https://albor-hoja-owlbear.pages.dev`
- Manifest: `https://albor-hoja-owlbear.pages.dev/manifest.json`
