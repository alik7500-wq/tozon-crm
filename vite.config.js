import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {resolveEnvironment} from './src/api/environment-validation.js'
resolveEnvironment(process.env)

// https://vite.dev/config/
export default defineConfig({
  envDir: false,
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
