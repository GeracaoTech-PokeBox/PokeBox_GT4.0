// App Express sem o listen, para os testes de integração poderem subir o servidor numa porta qualquer
const express = require('express');
const rotas = require('./rotas');
const { proxyPokeApi } = require('./features/especies');
const { documentacao } = require('./documentacao');

const app = express();

// Sem o cabeçalho "X-Powered-By: Express": não conta para quem ataca qual servidor está por trás
// (apontado pelo OWASP ZAP em testes_de_seguranca/)
app.disable('x-powered-by');

// Cabeçalhos de segurança em todas as respostas (também apontados pelo ZAP):
// - nosniff: o navegador não tenta "adivinhar" o tipo do conteúdo (um JSON nunca vira script)
// - Cross-Origin-Resource-Policy: outro site não embute as respostas da API como imagem/script.
//   Não afeta o front chamando a API: fetch com CORS não passa por essa regra.
// - CSP e X-Frame-Options: a API só devolve JSON, então nada pode ser carregado a partir de uma
//   resposta dela e nenhum site pode exibi-la num iframe (anti-clickjacking)
// - COOP/COEP: isola a resposta de outras janelas e origens
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cross-Origin-Resource-Policy', 'same-origin');
  res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.set('X-Frame-Options', 'DENY');
  res.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.set('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// No Render as requisições chegam pelo proxy dele, então sem isto req.ip seria o IP do
// proxy para todo mundo, e o limite de tentativas de login/cadastro (rotas.js) valeria
// para a turma inteira junta. Com isto o Express usa o IP real do X-Forwarded-For.
// O Render define RENDER=true sozinho; no docker-compose nada muda.
if (process.env.RENDER) app.set('trust proxy', true);

/* CORS só para o front do jogo, não para qualquer site (o "*" de antes foi apontado pelo OWASP ZAP).
 * Em produção o front (Vercel/Netlify) chama o back em outro domínio: liste-o em CORS_ORIGENS,
 * separado por vírgula (ex.: CORS_ORIGENS=https://pokebox.vercel.app). Sem a variável, só valem os
 * endereços do Vite na máquina. No docker-compose o front chama /api pelo proxy do Vite (mesma
 * origem), então o CORS nem entra em jogo.
 */
const ORIGENS_LOCAIS = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
const ORIGENS_PERMITIDAS = new Set(
  (process.env.CORS_ORIGENS ?? '').split(',').map((origem) => origem.trim().replace(/\/+$/, '')).filter(Boolean)
    .concat(ORIGENS_LOCAIS),
);

app.use((req, res, next) => {
  const origem = req.get('origin');
  // A resposta muda conforme a origem: caches e proxies não podem misturar uma com a outra
  res.vary('Origin');
  if (origem && ORIGENS_PERMITIDAS.has(origem)) {
    res.set('Access-Control-Allow-Origin', origem);
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  }
  // Origem de fora da lista: responde sem os cabeçalhos de CORS e o navegador bloqueia a leitura
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Resposta rápida, sem banco: usada pelo health check do Render e pelo front para
// "acordar" o back (no plano grátis do Render ele dorme depois de 15 min sem acesso)
app.get('/api/saude', (req, res) => {
  res.json({ ok: true });
});

// Repassa GET /api/pokeapi/<caminho> para https://pokeapi.co/api/v2/<caminho> (features/especies)
app.use('/api/pokeapi', proxyPokeApi);

// Documentação das rotas (Swagger UI), a partir de docs/openapi.yaml. É a única página HTML do back:
// o CSP "default-src 'none'" lá de cima bloquearia os scripts e estilos dela, então aqui ele libera
// só o que vem do próprio back (o Swagger UI usa <style> inline e imagens em data:).
app.use('/api/docs', (req, res, next) => {
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'",
  );
  next();
}, documentacao);

// Endpoints do jogo (precisam do banco)
app.use('/api', rotas);

module.exports = app;
