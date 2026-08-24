import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Stuurt /api-requests door naar de lokale Express-API (server/), zodat
    // de frontend geen hardcoded backend-URL of CORS-gedoe nodig heeft.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
