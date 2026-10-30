import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Shared layer: auto-imports AppFooter. Published to GitHub Packages, so
  // installs need NODE_AUTH_TOKEN in the environment (see .npmrc).
  extends: ['@simone98dm/layer'],

  modules: [
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxt/test-utils',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@nuxt/image',
    '@nuxtjs/color-mode',
    // '@vite-pwa/nuxt',
  ],

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
  },

  // Privacy: never fetch icons from api.iconify.design (visitor IP leak);
  // heroicons/mdi/logos are installed locally via @iconify-json/*.
  icon: { fallbackToApi: false },

  // Privacy: @nuxt/fonts comes from the shared layer. The only font is
  // self-hosted (_fonts.scss); disable every remote provider so nothing
  // is ever fetched from Google/Bunny/etc.
  fonts: {
    providers: {
      google: false,
      googleicons: false,
      bunny: false,
      fontshare: false,
      fontsource: false,
      adobe: false,
    },
  },

  runtimeConfig: {
    public: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    },
    resendApiKey: process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM || 'House M8 <noreply@housem8.app>',
    // PostgreSQL configuration (alternative connection methods)
    postgresUrl: process.env.POSTGRES_URL || '',
    postgresHost: process.env.POSTGRES_HOST || 'localhost',
    postgresPort: process.env.POSTGRES_PORT || '5432',
    postgresDatabase: process.env.POSTGRES_DATABASE || 'house_m8',
    postgresUser: process.env.POSTGRES_USER || 'postgres',
    postgresPassword: process.env.POSTGRES_PASSWORD || '',
    // JWT configuration for PostgreSQL auth
    jwtSecret: process.env.JWT_SECRET,
    // Google OAuth configuration
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    // ConfigCat feature flags (server-only, never exposed to the client)
    configcatSdkKey: process.env.CONFIGCAT_SDK_KEY || '',
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      meta: [
        { charset: 'utf-8' },
        {
          // No maximum-scale / user-scalable=0: those block pinch-zoom, which
          // is a WCAG 1.4.4 (Resize Text, AA) failure on every page and hits
          // low-vision users hardest. Do not re-add them to stop iOS input
          // auto-zoom — that is fixed by giving inputs a >=16px font-size.
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0, viewport-fit=cover',
        },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent',
        },
        { name: 'apple-mobile-web-app-title', content: 'House M8' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        // { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },

  // pwa: {
  //   registerType: 'autoUpdate',
  //   includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon-192x192.png', 'icon-512x512.png'],
  //   manifest: {
  //     id: '/',
  //     name: 'House M8',
  //     short_name: 'House M8',
  //     description: 'Manage your flat expenses and roommate life',
  //     theme_color: '#3b82f6',
  //     background_color: '#ffffff',
  //     display: 'standalone',
  //     scope: '/',
  //     start_url: '/',
  //     orientation: 'any',
  //     icons: [
  //       {
  //         src: '/icon-192x192.png',
  //         sizes: '192x192',
  //         type: 'image/png',
  //         purpose: 'any',
  //       },
  //       {
  //         src: '/icon-512x512.png',
  //         sizes: '512x512',
  //         type: 'image/png',
  //         purpose: 'any',
  //       },
  //     ],
  //   },
  //   workbox: {
  //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  //     cleanupOutdatedCaches: true,
  //     runtimeCaching: [
  //       {
  //         urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
  //         handler: 'CacheFirst',
  //         options: {
  //           cacheName: 'google-fonts-cache',
  //           expiration: {
  //             maxEntries: 10,
  //             maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
  //           },
  //           cacheableResponse: {
  //             statuses: [0, 200],
  //           },
  //         },
  //       },
  //     ],
  //   },
  //   devOptions: {
  //     enabled: true,
  //     suppressWarnings: true,
  //     type: 'module',
  //   },
  // },

  nitro: {
    experimental: {
      wasm: true,
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "base-uri 'self'",
        ].join('; '),
      },
    },
    // Legal pages are NOT prerendered: a build-time render freezes the default
    // locale, so Accept-Language: it got English HTML that then flipped to
    // Italian on hydration (mismatch + layout shift). SSR per request instead.
  },

  i18n: {
    strategy: 'no_prefix',
    types: 'composition',
    langDir: 'locales',
    defaultLocale: 'en',
    detectBrowserLanguage: {
      // Cookie off: the module would write `i18n_locale` on every first load
      // from the browser language, before any user choice. The cookie is set
      // only by LanguageSwitcher and read back by plugins/locale-preference.ts.
      useCookie: false,
      redirectOn: 'root',
    },
    locales: [
      {
        code: 'en',
        language: 'en',
        iso: 'en-US',
        file: 'en.json',
        name: 'English',
      },
      {
        code: 'it',
        language: 'it',
        iso: 'it-IT',
        file: 'it.json',
        name: 'Italiano',
      },
    ],
    vueI18n: 'i18n.config.ts',
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        '@intlify/core',
        '@intlify/core-base',
        '@intlify/message-compiler',
        '@intlify/shared',
        '@intlify/utils/h3',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'ufo',
        'vue-i18n',
      ],
    },
  },
});
