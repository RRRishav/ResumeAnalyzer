import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const viteTempDir = resolve(process.cwd(), '.vite-temp')
const jitiCacheDir = resolve(viteTempDir, 'node-jiti')

mkdirSync(jitiCacheDir, { recursive: true })

process.env.TEMP = viteTempDir
process.env.TMP = viteTempDir
process.env.JITI_CACHE_DIR = jitiCacheDir

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
