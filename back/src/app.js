// App Express sem o listen, para os testes de integração poderem subir o servidor numa porta qualquer
const express = require('express');
const rotas = require('./rotas');

const POKEAPI_URL = 'https://pokeapi.co/api/v2';

// Aceita só "/recurso" ou "/recurso/id-ou-nome" (ex.: /pokemon, /type/fire)
const CAMINHO_VALIDO = /^\/[a-z0-9-]+(\/[a-z0-9-]+)?\/?$/i;
const PARAMETROS_PERMITIDOS = ['limit', 'offset'];

const app = express();

// Sem o cabeçalho "X-Powered-By: Express": não conta para quem ataca qual servidor está por trás
// (apontado pelo OWASP ZAP em testes_de_seguranca/)
app.disable('x-powered-by');

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

// Repassa GET /api/pokeapi/<caminho> para https://pokeapi.co/api/v2/<caminho>
app.use('/api/pokeapi', async (req, res) => {
  if (req.method !== 'GET') {
    res.sendStatus(405);
    return;
  }
  if (!CAMINHO_VALIDO.test(req.path)) {
    res.status(400).json({ erro: 'Caminho inválido.' });
    return;
  }

  const url = new URL(`${POKEAPI_URL}${req.path}`);
  PARAMETROS_PERMITIDOS.forEach((parametro) => {
    if (req.query[parametro]) url.searchParams.set(parametro, String(req.query[parametro]));
  });

  try {
    const resposta = await fetch(url);
    const corpo = await resposta.text();
    res.status(resposta.status).type('application/json').send(corpo);
  } catch {
    res.status(502).json({ erro: 'Não foi possível acessar a PokeAPI.' });
  }
});

// Endpoints do jogo (precisam do banco)
app.use('/api', rotas);

module.exports = app;
