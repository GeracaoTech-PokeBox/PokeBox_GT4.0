// Espécies: busca na PokeAPI e converte para o formato da tabela especies
const config = require('../../compartilhado/config');
const { POKEAPI_URL, buscarJson, extrairId } = require('../../compartilhado/pokeapi');

/**
 * Percorre a cadeia evolutiva a partir da raiz e anota, para cada espécie, as
 * próximas evoluções com o nível pedido. O min_level da PokeAPI é usado quando
 * existe; sem ele (pedra, troca, amizade) o nível é o de entrada + NIVEIS_EVOLUCAO_SEM_NIVEL.
 * @param {object} no           nó de /evolution-chain
 * @param {number} nivelEntrada nível em que essa espécie é alcançada (1 na raiz)
 * @param {Map<string, object[]>} mapa  nome da espécie -> evoluções
 */
function mapearCadeia(no, nivelEntrada, mapa) {
  const evolucoes = no.evolves_to.map((filho) => {
    const niveis = filho.evolution_details.map((d) => d.min_level).filter((n) => n != null);
    const nivel = Math.min(
      config.NIVEL_MAXIMO,
      niveis.length > 0 ? Math.min(...niveis) : nivelEntrada + config.NIVEIS_EVOLUCAO_SEM_NIVEL,
    );
    mapearCadeia(filho, nivel, mapa);
    return { especieId: extrairId(filho.species.url), nome: filho.species.name, nivel };
  });
  mapa.set(no.species.name, evolucoes);
  return mapa;
}

function raridadeDe(especie) {
  if (especie.is_mythical) return 'mitico';
  if (especie.is_legendary) return 'lendario';
  return 'comum';
}

/** Busca na PokeAPI tudo o que a tabela especies precisa */
async function buscarEspecie(id) {
  const [pokemon, especie] = await Promise.all([
    buscarJson(`${POKEAPI_URL}/pokemon/${id}`),
    buscarJson(`${POKEAPI_URL}/pokemon-species/${id}`),
  ]);
  const cadeia = await buscarJson(especie.evolution_chain.url);
  const evolucoes = mapearCadeia(cadeia.chain, 1, new Map()).get(especie.name) ?? [];
  const stat = (nome) => pokemon.stats.find((s) => s.stat.name === nome).base_stat;

  return {
    id,
    nome: especie.name,
    tipos: pokemon.types.map((t) => t.type.name),
    raridade: raridadeDe(especie),
    taxa_captura: especie.capture_rate,
    hp_base: stat('hp'),
    ataque_base: stat('attack'),
    defesa_base: stat('defense'),
    velocidade_base: stat('speed'),
    altura_base: pokemon.height,
    peso_base: pokemon.weight,
    evolucoes,
  };
}

/** Só o capture_rate da espécie */
async function buscarTaxaCaptura(id) {
  const especie = await buscarJson(`${POKEAPI_URL}/pokemon-species/${id}`);
  return especie.capture_rate;
}

module.exports = { mapearCadeia, buscarEspecie, buscarTaxaCaptura };
