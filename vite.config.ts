import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'assets/heisel-analytics-logo-on-light.png',
        'assets/heisel-analytics-logo-on-dark.png',
      ],
      manifest: {
        name: 'Sailing Plot Editor',
        short_name: 'SailPlot',
        description: 'Create and share static sailing plots without a backend.',
        theme_color: '#171717',
        background_color: '#171717',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        icons: [
          {
            src: 'icons/sailplot-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: { outDir: 'dist', sourcemap: true },
})
