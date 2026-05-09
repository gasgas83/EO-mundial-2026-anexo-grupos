import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import FullReload from "vite-plugin-full-reload";

export default defineConfig({
  plugins: [svelte({}), FullReload("src/**")],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Agrega [hash] al nombre del archivo (ej: "eo-carrusel-photo.a1b2c3.js")
        entryFileNames: 'eo-mundial-2026-anexo-grupos.[hash].js',
        // Opcional: También puedes aplicar hash a los assets (CSS, imágenes, etc.)
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    }
  }
})