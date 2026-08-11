import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')

  return {
    // No GitHub Actions, o caminho recebe automaticamente o nome real do repositório.
    // Em desenvolvimento e builds locais, a raiz continua sendo usada.
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    build: {
      // Mantém o bundle compatível com versões amplamente usadas do Chrome Android.
      target: 'es2017',
    },
    server: { host: true },
    preview: { host: true },
  }
})
