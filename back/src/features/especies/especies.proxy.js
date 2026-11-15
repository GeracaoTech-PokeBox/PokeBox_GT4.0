// Proxy da PokeAPI para a Pokédex do front: GET /api/pokeapi/<caminho> -> https://pokeapi.co/api/v2/<caminho>.
// Montado direto no app.js (fora do roteador de /api): não precisa de login, de banco nem do express.json.
const { POKEAPI_URL } = require('../../compartilhado/pokeapi');

// Aceita só "/recurso" ou "/recurso/id-ou-nome" (ex.: /pokemon, /type/fire)
const CAMINHO_VALIDO = /^\/[a-z0-9-]+(\/[a-z0-9-]+)?\/?$/i;
const PARAMETROS_PERMITIDOS = ['limit', 'offset'];

async function proxyPokeApi(req, res) {
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
}

module.exports = { proxyPokeApi };
