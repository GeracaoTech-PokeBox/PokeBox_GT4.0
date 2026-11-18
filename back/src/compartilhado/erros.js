// Erro de regra do jogo (saldo insuficiente, não é sua vez...). Cada tipo diz o próprio status HTTP
// e o tratarErros só repassa: um tipo novo de erro é só uma classe nova aqui.
class ErroJogo extends Error {
  /**
   * @param {string} mensagem  vai para o front em { erro: mensagem }
   * @param {number} [status]  status HTTP da resposta (400 = regra do jogo ou dado inválido)
   */
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.name = 'ErroJogo';
    this.status = status;
  }
}

// O que a URL aponta (/batalhas/:id, /pokemons/:id...) não existe ou não é do usuário: 404.
// Continua sendo um ErroJogo, então quem trata ErroJogo trata este também.
class NaoEncontrado extends ErroJogo {
  constructor(mensagem) {
    super(mensagem, 404);
    this.name = 'NaoEncontrado';
  }
}

// A PokeAPI não respondeu (fora do ar, sem internet, ou a conexão HTTPS foi interceptada por
// antivírus/proxy). As rotas devolvem 503: é um problema passageiro, não do jogador.
// Não estende ErroJogo de propósito: a mensagem tem URL e código internos, e o tratarErros
// responde com uma mensagem genérica em vez de repassá-la ao front.
class ErroPokeApi extends Error {
  constructor(mensagem, opcoes) {
    super(mensagem, opcoes);
    this.name = 'ErroPokeApi';
  }
}

module.exports = { ErroJogo, NaoEncontrado, ErroPokeApi };
