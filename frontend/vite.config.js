import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This tells Vite/esbuild what to drop during the minification process
    minify: 'esbuild',
  },
  esbuild: {
    // This will remove all console.log and debugger statements 
    // only when running the 'build' command (production)
    drop: ['console', 'debugger'],
  },
})