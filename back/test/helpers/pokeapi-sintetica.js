// Uma PokeAPI inventada, mas no mesmo formato da real, para a integração não depender da rede.
// Responde qualquer espécie (1 a 1025) e qualquer golpe, sempre com os mesmos dados para o mesmo id.
// As três primeiras famílias de iniciais usam os nomes, status e níveis de evolução reais,
// porque os testes de evolução conferem "charmander -> charmeleon no 16".

const BASE = 'https://pokeapi.co/api/v2';

const TIPOS = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

// [id, nome, nível para evoluir até ela, [hp, ataque, defesa, velocidade], altura, peso]
const FAMILIAS = [
  {
    cadeia: 1,
    tipos: ['grass', 'poison'],
    especies: [
      [1, 'bulbasaur', null, [45, 49, 49, 45], 7, 69],
      [2, 'ivysaur', 16, [60, 62, 63, 60], 10, 130],
      [3, 'venusaur', 32, [80, 82, 83, 80], 20, 1000],
    ],
  },
  {
    cadeia: 2,
    tipos: ['fire'],
    especies: [
      [4, 'charmander', null, [39, 52, 43, 65], 6, 85],
      [5, 'charmeleon', 16, [58, 64, 58, 80], 11, 190],
      [6, 'charizard', 36, [78, 84, 78, 100], 17, 905],
    ],
  },
  {
    cadeia: 3,
    tipos: ['water'],
    especies: [
      [7, 'squirtle', null, [44, 48, 65, 43], 5, 90],
      [8, 'wartortle', 16, [59, 63, 80, 58], 10, 225],
      [9, 'blastoise', 36, [79, 83, 100, 78], 16, 855],
    ],
  },
];

const ESPECIE_MAXIMA = 1025;

/** Dados de uma espécie: real nas famílias acima, gerada a partir do id nas outras */
function especie(id) {
  for (const familia of FAMILIAS) {
    const indice = familia.especies.findIndex(([eid]) => eid === id);
    if (indice !== -1) {
      const [, nome, , [hp, ataque, defesa, velocidade], altura, peso] = familia.especies[indice];
      return {
        id, nome, tipos: familia.tipos, cadeia: familia.cadeia, hp, ataque, defesa, velocidade, altura, peso,
        taxaCaptura: 45, lendario: false, mitico: false,
      };
    }
  }
  return {
    id,
    nome: `especie-${id}`,
    tipos: [TIPOS[id % TIPOS.length]],
    cadeia: 10000 + id, // cada espécie gerada é a própria cadeia, sem evolução
    hp: 40 + (id % 40),
    ataque: 40 + ((id * 7) % 40),
    defesa: 40 + ((id * 3) % 40),
    velocidade: 40 + ((id * 5) % 40),
    altura: 5 + (id % 15),
    peso: 50 + (id % 200),
    taxaCaptura: [3, 45, 120, 190, 255][id % 5],
    lendario: id % 50 === 0,
    mitico: id % 151 === 0,
  };
}

const urlEspecie = (id) => `${BASE}/pokemon-species/${id}/`;
const golpesDaEspecie = (id) => Array.from({ length: 8 }, (_, i) => id * 10 + i + 1);

function pokemon(id) {
  const e = especie(id);
  const stat = (nome, valor) => ({ base_stat: valor, stat: { name: nome } });
  return {
    id,
    name: e.nome,
    height: e.altura,
    weight: e.peso,
    types: e.tipos.map((tipo, i) => ({ slot: i + 1, type: { name: tipo } })),
    stats: [
      stat('hp', e.hp), stat('attack', e.ataque), stat('defense', e.defesa),
      stat('special-attack', 50), stat('special-defense', 50), stat('speed', e.velocidade),
    ],
    moves: golpesDaEspecie(id).map((g) => ({ move: { name: `golpe-${g}`, url: `${BASE}/move/${g}/` } })),
  };
}

function especiePokeApi(id) {
  const e = especie(id);
  return {
    id,
    name: e.nome,
    is_legendary: e.lendario,
    is_mythical: e.mitico,
    capture_rate: e.taxaCaptura,
    evolution_chain: { url: `${BASE}/evolution-chain/${e.cadeia}/` },
  };
}

function cadeiaEvolutiva(cadeiaId) {
  const familia = FAMILIAS.find((f) => f.cadeia === cadeiaId);
  if (!familia) {
    const id = cadeiaId - 10000;
    if (id < 1 || id > ESPECIE_MAXIMA) return undefined;
    return { id: cadeiaId, chain: { species: { name: especie(id).nome, url: urlEspecie(id) }, evolution_details: [], evolves_to: [] } };
  }
  // Monta de trás para frente: cada espécie evolui para a próxima da lista
  const no = (indice) => {
    const [id, nome, nivel] = familia.especies[indice];
    return {
      species: { name: nome, url: urlEspecie(id) },
      evolution_details: nivel ? [{ min_level: nivel }] : [],
      evolves_to: indice + 1 < familia.especies.length ? [no(indice + 1)] : [],
    };
  };
  return { id: cadeiaId, chain: no(0) };
}

/** A cada 4 golpes, um não causa dano (classe status), como Growl ou Light Screen */
function golpe(id) {
  const status = id % 4 === 0;
  return {
    id,
    name: `golpe-${id}`,
    type: { name: TIPOS[id % TIPOS.length] },
    damage_class: { name: status ? 'status' : ['physical', 'special'][id % 2] },
    power: status ? null : 40 + (id % 50),
    accuracy: status || id % 3 === 0 ? null : 90 + (id % 11),
    pp: 15 + (id % 10),
  };
}

/**
 * Resposta para um caminho da PokeAPI (depois de /api/v2), ou undefined para 404.
 * Use com instalarPokeApiFake(mock, pokeApiSintetica).
 * @param {string} caminho
 */
function pokeApiSintetica(caminho) {
  const [, recurso, textoId] = caminho.split('/');
  const id = Number(textoId);
  if (!Number.isInteger(id) || id < 1) return undefined;
  const especieValida = id <= ESPECIE_MAXIMA;
  switch (recurso) {
    case 'pokemon': return especieValida ? pokemon(id) : undefined;
    case 'pokemon-species': return especieValida ? especiePokeApi(id) : undefined;
    case 'evolution-chain': return cadeiaEvolutiva(id);
    case 'move': return golpe(id);
    default: return undefined;
  }
}

module.exports = { pokeApiSintetica };
