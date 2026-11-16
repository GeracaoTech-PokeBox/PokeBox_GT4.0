// App Express sem o listen, para os testes de integração poderem subir o servidor numa porta qualquer
const express = require('express');
const rotas = require('./rotas');
const { proxyPokeApi } = require('./features/especies');
const { documentacao } = require('./documentacao');

const app = express();

// No Render as requisições chegam pelo proxy dele, então sem isto req.ip seria o IP do
// proxy para todo mundo, e o limite de tentativas de login/cadastro (rotas.js) valeria
// para a turma inteira junta. Com isto o Express usa o IP real do X-Forwarded-For.
// O Render define RENDER=true sozinho; no docker-compose nada muda.
if (process.env.RENDER) app.set('trust proxy', true);

// O front roda em outra porta, então precisa de CORS. Como o login usa o
// cabeçalho Authorization (e não cookie), liberar qualquer origem é seguro.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

// Documentação das rotas (Swagger UI), a partir de docs/openapi.yaml
app.use('/api/docs', documentacao);

// Endpoints do jogo (precisam do banco)
app.use('/api', rotas);

module.exports = app;
