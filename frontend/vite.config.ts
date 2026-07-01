import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:       ['react', 'react-dom'],
          motion:       ['framer-motion'],
          query:        ['@tanstack/react-query'],
          highlighter:  ['react-syntax-highlighter'],
        },
      },
    },
  },
})
