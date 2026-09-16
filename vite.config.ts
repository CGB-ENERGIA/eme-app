import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo-cgb.png'],
      manifest: {
        id: '/',
        name: 'EME - Atendimento Emergencial',
        short_name: 'EME',
        description: 'Formulário de Atendimento Emergencial CGB Energia',
        theme_color: '#9B003C',
        // Fundo da splash nativa do Android ao abrir o PWA instalado (antes do
        // nosso HTML carregar) — usa o escuro do app, não o vermelho de marca.
        background_color: '#0d0f16',
        display: 'standalone',
        orientation: 'any',
        start_url: '/solicitacoes',
        scope: '/',
        categories: ['business', 'productivity'],
        lang: 'pt-BR',
        // Sem purpose "maskable": Android sintetiza um fundo (theme_color) atrás
        // dela, criando um halo colorido que não é nossa marca. Só "any" — mostra
        // o ícone real, sem nada adicionado por cima.
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Com autoUpdate: ativa SW novo na hora e assume as abas abertas
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
