import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/ai-marketing-automation/',
  plugins: [react()],
  server: {
    proxy: {
      '/api/ideas': {
        target: 'https://aistudio.alibaba-inc.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/ideas/, '/api/aiapp/run/kwyxilIBTkm/latest'),
      },
    },
  },
})
