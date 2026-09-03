import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El plugin de CORS permite que Owlbear (owlbear.rodeo) cargue el manifest
// y el iframe desde el servidor de desarrollo local.
export default defineConfig({
  plugins: [react()],
  server: {
    cors: true,
    host: true,
  },
});
