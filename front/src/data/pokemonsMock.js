// Dados de exemplo no mesmo formato de https://pokeapi.co/api/v2/pokemon/{id}
// TODO: substituir pela resposta da PokeAPI quando a integração for feita.
// As listas de moves e game_indices estão resumidas.

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const CRIES = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon';

function sprites(id) {
  return {
    front_default: `${SPRITES}/${id}.png`,
    front_shiny: `${SPRITES}/shiny/${id}.png`,
    other: {
      'official-artwork': {
        front_default: `${SPRITES}/other/official-artwork/${id}.png`,
        front_shiny: `${SPRITES}/other/official-artwork/shiny/${id}.png`,
      },
    },
  };
}

function cries(id) {
  return {
    latest: `${CRIES}/latest/${id}.ogg`,
    legacy: `${CRIES}/legacy/${id}.ogg`,
  };
}

function stats(hp, attack, defense, specialAttack, specialDefense, speed) {
  return [
    ['hp', hp],
    ['attack', attack],
    ['defense', defense],
    ['special-attack', specialAttack],
    ['special-defense', specialDefense],
    ['speed', speed],
  ].map(([name, baseStat]) => ({ base_stat: baseStat, effort: 0, stat: { name } }));
}

function lista(chave, nomes) {
  return nomes.map((name) => ({ [chave]: { name } }));
}

const pokemonsMock = [
  {
    id: 1,
    name: 'bulbasaur',
    height: 7,
    weight: 69,
    base_experience: 64,
    types: [
      { slot: 1, type: { name: 'grass' } },
      { slot: 2, type: { name: 'poison' } },
    ],
    abilities: [
      { slot: 1, is_hidden: false, ability: { name: 'overgrow' } },
      { slot: 3, is_hidden: true, ability: { name: 'chlorophyll' } },
    ],
    stats: stats(45, 49, 49, 65, 65, 45),
    sprites: sprites(1),
    cries: cries(1),
    species: { name: 'bulbasaur' },
    forms: [{ name: 'bulbasaur' }],
    held_items: [],
    moves: lista('move', ['razor-wind', 'swords-dance', 'cut', 'bind', 'vine-whip', 'headbutt', 'tackle', 'body-slam']),
    game_indices: [
      { game_index: 153, version: { name: 'red' } },
      { game_index: 153, version: { name: 'blue' } },
      { game_index: 153, version: { name: 'yellow' } },
    ],
  },
  {
    id: 4,
    name: 'charmander',
    height: 6,
    weight: 85,
    base_experience: 62,
    types: [{ slot: 1, type: { name: 'fire' } }],
    abilities: [
      { slot: 1, is_hidden: false, ability: { name: 'blaze' } },
      { slot: 3, is_hidden: true, ability: { name: 'solar-power' } },
    ],
    stats: stats(39, 52, 43, 60, 50, 65),
    sprites: sprites(4),
    cries: cries(4),
    species: { name: 'charmander' },
    forms: [{ name: 'charmander' }],
    held_items: [],
    moves: lista('move', ['mega-punch', 'fire-punch', 'thunder-punch', 'scratch', 'swords-dance', 'cut', 'ember', 'flamethrower']),
    game_indices: [
      { game_index: 176, version: { name: 'red' } },
      { game_index: 176, version: { name: 'blue' } },
      { game_index: 176, version: { name: 'yellow' } },
    ],
  },
  {
    id: 7,
    name: 'squirtle',
    height: 5,
    weight: 90,
    base_experience: 63,
    types: [{ slot: 1, type: { name: 'water' } }],
    abilities: [
      { slot: 1, is_hidden: false, ability: { name: 'torrent' } },
      { slot: 3, is_hidden: true, ability: { name: 'rain-dish' } },
    ],
    stats: stats(44, 48, 65, 50, 64, 43),
    sprites: sprites(7),
    cries: cries(7),
    species: { name: 'squirtle' },
    forms: [{ name: 'squirtle' }],
    held_items: [],
    moves: lista('move', ['mega-punch', 'ice-punch', 'mega-kick', 'headbutt', 'tackle', 'tail-whip', 'bubble', 'water-gun']),
    game_indices: [
      { game_index: 177, version: { name: 'red' } },
      { game_index: 177, version: { name: 'blue' } },
      { game_index: 177, version: { name: 'yellow' } },
    ],
  },
  {
    id: 25,
    name: 'pikachu',
    height: 4,
    weight: 60,
    base_experience: 112,
    types: [{ slot: 1, type: { name: 'electric' } }],
    abilities: [
      { slot: 1, is_hidden: false, ability: { name: 'static' } },
      { slot: 3, is_hidden: true, ability: { name: 'lightning-rod' } },
    ],
    stats: stats(35, 55, 40, 50, 50, 90),
    sprites: sprites(25),
    cries: cries(25),
    species: { name: 'pikachu' },
    forms: [{ name: 'pikachu' }],
    held_items: lista('item', ['oran-berry', 'light-ball']),
    moves: lista('move', ['mega-punch', 'pay-day', 'thunder-punch', 'slam', 'thunder-shock', 'thunderbolt', 'quick-attack', 'thunder']),
    game_indices: [
      { game_index: 84, version: { name: 'red' } },
      { game_index: 84, version: { name: 'blue' } },
      { game_index: 84, version: { name: 'yellow' } },
    ],
  },
  {
    id: 94,
    name: 'gengar',
    height: 15,
    weight: 405,
    base_experience: 250,
    types: [
      { slot: 1, type: { name: 'ghost' } },
      { slot: 2, type: { name: 'poison' } },
    ],
    abilities: [{ slot: 1, is_hidden: false, ability: { name: 'cursed-body' } }],
    stats: stats(60, 65, 60, 130, 75, 110),
    sprites: sprites(94),
    cries: cries(94),
    species: { name: 'gengar' },
    forms: [{ name: 'gengar' }],
    held_items: [],
    moves: lista('move', ['mega-punch', 'fire-punch', 'ice-punch', 'thunder-punch', 'mega-kick', 'toxic', 'night-shade', 'lick', 'shadow-ball', 'hypnosis']),
    game_indices: [
      { game_index: 14, version: { name: 'red' } },
      { game_index: 14, version: { name: 'blue' } },
      { game_index: 14, version: { name: 'yellow' } },
    ],
  },
  {
    id: 133,
    name: 'eevee',
    height: 3,
    weight: 65,
    base_experience: 65,
    types: [{ slot: 1, type: { name: 'normal' } }],
    abilities: [
      { slot: 1, is_hidden: false, ability: { name: 'run-away' } },
      { slot: 2, is_hidden: false, ability: { name: 'adaptability' } },
      { slot: 3, is_hidden: true, ability: { name: 'anticipation' } },
    ],
    stats: stats(55, 55, 50, 45, 65, 55),
    sprites: sprites(133),
    cries: cries(133),
    species: { name: 'eevee' },
    forms: [{ name: 'eevee' }],
    held_items: [],
    moves: lista('move', ['pay-day', 'sand-attack', 'headbutt', 'tackle', 'take-down', 'bite', 'quick-attack', 'swift']),
    game_indices: [
      { game_index: 102, version: { name: 'red' } },
      { game_index: 102, version: { name: 'blue' } },
      { game_index: 102, version: { name: 'yellow' } },
    ],
  },
];

export default pokemonsMock;
