import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { bankAdminPlugin } from './scripts/vite-bank-admin.js'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Admin edit middleware — dev server only, never included in production bundle
    command === 'serve' ? bankAdminPlugin() : null,
  ].filter(Boolean),
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
}))
