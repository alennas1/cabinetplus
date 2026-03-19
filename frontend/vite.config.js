import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // We'll register manually so we can show an in-app "update available" prompt.
      injectRegister: null,
      registerType: 'prompt',
      includeAssets: [
        'logo.png',
        'apple-touch-icon.png',
        'pwa-192.png',
        'pwa-512.png',
      ],
      manifest: {
        name: 'Cabinet+',
        short_name: 'Cabinet+',
        description: 'Cabinet+ web app',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
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
