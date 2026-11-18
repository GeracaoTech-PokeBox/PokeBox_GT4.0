// Tratamento de erros da API. Precisa ser o último middleware do roteador de /api:
// o Express 5 já encaminha para cá os erros lançados nas funções async das rotas.
const { ErroJogo, ErroPokeApi } = require('../erros');

// Códigos de erro do Node/PostgreSQL que significam "não deu para usar o banco"
const ERROS_BANCO = new Set([
  'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', // servidor não responde
  '28P01', '28000', // usuário/senha recusados
  '3D000', // banco não existe
  '42P01', // tabela não existe (db.sql não foi rodado)
]);

// eslint-disable-next-line no-unused-vars
function tratarErros(erro, req, res, next) {
  if (erro instanceof ErroJogo) {
    res.status(erro.status).json({ erro: erro.message });
    return;
  }
  // PokeAPI fora do ar ou conexão recusada: passageiro, vale tentar de novo
  if (erro instanceof ErroPokeApi) {
    console.error(erro.message);
    res.status(503).json({ erro: 'Não foi possível falar com a PokeAPI agora. Tente de novo em instantes.' });
    return;
  }
  if (erro.type === 'entity.parse.failed') {
    res.status(400).json({ erro: 'JSON inválido.' });
    return;
  }
  if (erro.type === 'entity.too.large') {
    res.status(413).json({ erro: 'Dados grandes demais.' });
    return;
  }
  // Banco fora do ar, DATABASE_URL faltando/errada ou db.sql não aplicado
  if (ERROS_BANCO.has(erro.code)) {
    // ECONNREFUSED chega como AggregateError, com a mensagem vazia
    console.error(`Banco de dados indisponível (${erro.code}${erro.message ? `: ${erro.message}` : ''}). `
      + 'Confira o DATABASE_URL em back/.env e se o banco está rodando (docker compose up -d db).');
    res.status(503).json({ erro: 'O banco de dados está fora do ar. Tente de novo em instantes.' });
    return;
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno. Tente novamente.' });
}

module.exports = { tratarErros };
