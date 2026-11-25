import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    // En desarrollo, el servidor de salas (npm run dev lo arranca en :3000) atiende /ws
    proxy: { '/ws': { target: 'ws://localhost:3000', ws: true } },
  },
})
