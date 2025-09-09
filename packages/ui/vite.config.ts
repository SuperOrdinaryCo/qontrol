import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { version } from './package.json'
import { mockExclusionPlugin } from './src/plugins/mockExclusion'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(__dirname, '../..'), '')
  const enableMocks = env.VITE_ENABLE_MOCKS === 'true'
  const base = process.env.NODE_ENV === 'production' ? '/qontrol/' : '/';

  let proxy = {}

  if (!enableMocks) {
    proxy = {
      '/api': {
        target: env.VITE_BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    }
  }

  return {
    plugins: [
      vue(),
      mockExclusionPlugin(),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
      'import.meta.env.VITE_ENABLE_MOCKS': enableMocks,
      'import.meta.env.VITE_BASE_URL': base,
    },
    server: {
      port: 5173,
      proxy,
    },
    base: './',
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
    },
    // Always copy public directory, but the plugin will clean up MSW files if not needed
    publicDir: 'public',
  }
})
