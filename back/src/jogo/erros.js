// Erro de regra do jogo (saldo insuficiente, não é sua vez...). As rotas devolvem 400 com a mensagem.
class ErroJogo extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroJogo';
  }
}

// A PokeAPI não respondeu (fora do ar, sem internet, ou a conexão HTTPS foi interceptada por
// antivírus/proxy). As rotas devolvem 503: é um problema passageiro, não do jogador.
class ErroPokeApi extends Error {
  constructor(mensagem, opcoes) {
    super(mensagem, opcoes);
    this.name = 'ErroPokeApi';
  }
}

module.exports = { ErroJogo, ErroPokeApi };
