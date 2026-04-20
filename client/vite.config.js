import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev server proxies /api to the Express backend (VITE_API_PROXY_TARGET, default https://final-project-n18z.onrender.com).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = (env.VITE_API_PROXY_TARGET || 'https://final-project-n18z.onrender.com').trim()

  return {
    plugins: [react()],
    server: {
      proxy: {
        https://final-project-n18z.onrender.com': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
