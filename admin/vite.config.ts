import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev lokal: teruskan /api ke backend Express (npm run dev di folder backend)
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
