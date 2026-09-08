import { defineConfig } from 'vite'
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    target: 'es2022',
    cssMinify: true,
    rollupOptions: {
      output: {
        // Leaflet in un chunk separato, caricato lazy solo dalla vista Mappa
        manualChunks: (id) => (id.includes('node_modules/leaflet') ? 'leaflet' : undefined)
      }
    }
  }
})
