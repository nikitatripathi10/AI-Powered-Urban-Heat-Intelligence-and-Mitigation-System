import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      // Forward all /api calls to the FastAPI backend in local dev.
      // The frontend uses VITE_API_URL="" so fetch("/api/...") is relative,
      // and Vite rewrites it here before it hits the browser's network stack.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
