import { fileURLToPath, URL } from 'node:url'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/* Cabeçalhos de segurança do front (apontados pelo OWASP ZAP em testes_de_seguranca/).
 * Os valores de produção se repetem em vercel.json e em ../netlify.toml: ao mudar aqui, mude lá.
 */
// Imagens dos Pokémon (PokeAPI/sprites) e gritos da Pokédex (PokeAPI/cries)
const SPRITES = 'https://raw.githubusercontent.com'
// Onde o front publicado acha o back: Render, ou o túnel do Cloudflare (docker-compose --profile online)
const BACKS_PUBLICADOS = 'https://pokebox-back.onrender.com https://*.trycloudflare.com'

// CSP: de onde a página pode carregar cada coisa. Em desenvolvimento o Vite injeta scripts e
// estilos inline (React Refresh, CSS importado) e usa WebSocket para atualizar a tela ao salvar.
function politicaDeConteudo({ dev }) {
  return [
    "default-src 'self'",
    `script-src 'self'${dev ? " 'unsafe-inline'" : ''}`,
    `style-src 'self'${dev ? " 'unsafe-inline'" : ''}`,
    `img-src 'self' data: ${SPRITES}`,
    `media-src ${SPRITES}`,
    `connect-src 'self' ${BACKS_PUBLICADOS}${dev ? ' ws: wss:' : ''}`,
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Anti-clickjacking: nenhum site pode exibir o jogo dentro de um iframe
    "frame-ancestors 'none'",
  ].join('; ')
}

const cabecalhosDeSeguranca = ({ dev }) => ({
  'Content-Security-Policy': politicaDeConteudo({ dev }),
  // Anti-clickjacking para navegadores antigos, que não conhecem o frame-ancestors do CSP
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  // O jogo não usa nenhum desses recursos do navegador: um script injetado também não usa
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()',
  // Isola a aba de janelas abertas por outros sites
  'Cross-Origin-Opener-Policy': 'same-origin',
  // credentialless (e não require-corp): as imagens e os gritos do GitHub não mandam o cabeçalho
  // que o require-corp exige e seriam bloqueados; assim eles carregam, só que sem cookies
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Resource-Policy': 'same-origin',
})

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
    resolve: {
      // '@/features/loja' -> 'src/features/loja'. Entre features e para shared/core, importe
      // sempre pela fachada (index.js) com este alias.
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      // Escuta na rede local para abrir pelo celular (http://<ip-do-pc>:5173)
      host: true,
      headers: cabecalhosDeSeguranca({ dev: true }),
      // O front chama /api no próprio Vite, que repassa para o back. Assim o
      // celular não tenta acessar "localhost:8080", que seria ele mesmo.
      proxy: {
        '/api': process.env.BACK_URL ?? 'http://localhost:8080',
      },
    },
    // vite preview: o build de produção com os cabeçalhos de produção (o proxy /api é o mesmo do
    // server). É o que o scan do ZAP em testes_de_seguranca/ ataca.
    preview: {
      host: true,
      headers: cabecalhosDeSeguranca({ dev: false }),
    },
  }
})
