// Documentação da API: Swagger UI em /api/docs e a especificação crua em /api/docs/openapi.json.
// A especificação fica em docs/openapi.yaml; test/unit/documentacao.test.js confere se toda rota
// do rotas.js está lá. Montado no app.js antes do roteador de /api: não precisa de login nem de banco.
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const ARQUIVO = path.join(__dirname, '..', 'docs', 'openapi.yaml');

// Lido uma vez, ao subir: um YAML quebrado impede o back de subir, em vez de aparecer só na página
const especificacao = YAML.parse(fs.readFileSync(ARQUIVO, 'utf8'));

const documentacao = express.Router();

// Para gerar clientes ou importar no Postman/Insomnia
documentacao.get('/openapi.json', (req, res) => {
  res.json(especificacao);
});

documentacao.use('/', swaggerUi.serve, swaggerUi.setup(especificacao, {
  customSiteTitle: 'PokeBox API',
  swaggerOptions: { persistAuthorization: true }, // mantém o token do Authorize ao recarregar a página
}));

module.exports = { documentacao, especificacao };
