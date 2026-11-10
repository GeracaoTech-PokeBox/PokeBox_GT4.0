import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // No Netlify o front e o back (Render) ficam em endereços diferentes, então o build
  // precisa saber onde está o back. Sem isso o site publica "certinho", mas nenhuma
  // chamada funciona. Melhor o build falhar com uma mensagem clara.
  if (command === 'build' && process.env.NETLIFY) {
    const { VITE_BACK_URL } = loadEnv(mode, process.cwd(), 'VITE_')
    if (!/^https?:\/\//.test(VITE_BACK_URL ?? '')) {
      throw new Error(
        'Defina VITE_BACK_URL com a URL do back no Render (ex.: https://pokebox-back.onrender.com) ' +
        'em Site configuration → Environment variables do Netlify e rode o deploy de novo.',
      )
    }
  }

  return {
    plugins: [react()],
    server: {
      // Escuta na rede local para abrir pelo celular (http://<ip-do-pc>:5173)
      host: true,
      // O front chama /api no próprio Vite, que repassa para o back. Assim o
      // celular não tenta acessar "localhost:8080", que seria ele mesmo.
      proxy: {
        '/api': process.env.BACK_URL ?? 'http://localhost:8080',
      },
    },
  }
})
