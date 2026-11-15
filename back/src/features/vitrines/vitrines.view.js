// Vitrines: formato do JSON que vai para o front
const config = require('../../compartilhado/config');
const { coracoes } = require('../../jogo/regras');

/** Só o que outro treinador pode ver de um card (sem IVs, que entregariam os status de batalha) */
function destaque(linha) {
  return {
    id: linha.id,
    mintNumero: linha.mint_numero,
    especieId: linha.especie_id,
    nome: linha.nome,
    tipos: linha.tipos,
    raridade: linha.raridade,
    shiny: linha.shiny,
    nivel: linha.nivel,
    coracoes: coracoes(linha.afeto),
  };
}

/** Média de corações do time, com uma casa (4,2 ♥) */
function afetoDoTime(afetoMedio) {
  if (afetoMedio === null) return 0;
  return Math.round((afetoMedio / config.AFETO_POR_CORACAO) * 10) / 10;
}

function vitrine({
  dono, souDono, dados, numeros, vitorias, destaques, especies,
}) {
  return {
    treinador: { login: dono.login, desde: dono.criado_em },
    souDono,
    bio: dados.bio,
    estilo: dados.estilo,
    visitas: dados.visitas,
    estatisticas: {
      pokemons: numeros.pokemons,
      especies: numeros.especies,
      shinies: numeros.shinies,
      vitorias,
      afetoTime: afetoDoTime(numeros.afeto_time),
    },
    destaques: destaques.map(destaque),
    // Espécies que o treinador tem hoje, para o álbum
    colecao: especies,
  };
}

/** Item da lista de vitrines para visitar */
function itemDaLista(linha) {
  return { ...linha, bio: linha.bio ?? '', previa: linha.previa ?? [] };
}

module.exports = { vitrine, itemDaLista };
