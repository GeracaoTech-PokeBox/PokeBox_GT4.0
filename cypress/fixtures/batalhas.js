// Dados fictícios no formato retornado por /eu e /batalhas/:id.
// Cada teste recebe objetos novos, inclusive para as atualizações automáticas da tela.
export function criarDadosBatalha() {
  const pokemon = (pokemonId, especieId, nome, velocidade) => ({
    pokemonId, especieId, nome, velocidade,
    mintNumero: pokemonId,
    shiny: false,
    nivel: 10,
    hp: 100,
    hpMax: 100,
    golpes: [],
  });
  const meuTime = [
    pokemon(11, 25, 'pikachu', 90),
    pokemon(12, 1, 'bulbasaur', 45),
    pokemon(13, 4, 'charmander', 65),
  ];
  const timeOponente = [
    pokemon(21, 7, 'squirtle', 43),
    pokemon(22, 16, 'pidgey', 56),
    pokemon(23, 19, 'rattata', 72),
  ];
  const usuario = { id: 101, login: 'ash_cypress', pokecoins: 200, pokebolas: 5 };
  const batalha = {
    id: 301,
    status: 'em_andamento',
    oponente: 'misty_cypress',
    oponenteOnline: true,
    souDesafiante: true,
    minhaVez: true,
    turno: 1,
    prazoEm: new Date(Date.now() + 60000).toISOString(),
    expiraEm: new Date(Date.now() + 86400000).toISOString(),
    venci: false,
    motivoFim: null,
    minhasRecompensas: null,
    estado: {
      lados: [
        { usuarioId: usuario.id, login: usuario.login, ativo: 0, pokemons: meuTime },
        { usuarioId: 202, login: 'misty_cypress', ativo: 0, pokemons: timeOponente },
      ],
    },
  };

  return {
    perfil: {
      usuario,
      pokemons: meuTime.map((p, i) => ({ ...p, id: p.pokemonId, posicaoTime: i + 1 })),
    },
    treinadores: [{ login: 'misty_cypress', nivelMedio: 10, time: timeOponente }],
    lista: [],
    detalhe: { batalha, acoes: [] },
  };
}
