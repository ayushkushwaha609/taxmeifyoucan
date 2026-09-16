import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Root of the domain on Vercel. Set DEPLOY_BASE to deploy under a subpath.
const BASE = process.env.DEPLOY_BASE ?? '/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'],
      manifest: {
        name: 'Chhutta — bada payment, chhote steps mein',
        short_name: 'Chhutta',
        description:
          'An experimental prototype that breaks one large UPI payment into smaller payment steps. Everything happens on your device.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fbf7f0',
        theme_color: '#fbf7f0',
        lang: 'en-IN',
        categories: ['utilities'],
        icons: [
          { src: BASE + 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: BASE + 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: BASE + 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: BASE + 'index.html',
        runtimeCaching: [
          {
            // Google Fonts, so the app shell still looks right offline.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { host: true },
});
