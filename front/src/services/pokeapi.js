const API_URL = 'https://pokeapi.co/api/v2';
const ARTWORK_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';

// Guarda a promessa de cada Pokémon para não repetir a mesma requisição
const cacheDetalhes = new Map();

async function buscarJson(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) {
    throw new Error(`PokeAPI respondeu ${resposta.status} para ${url}`);
  }
  return resposta.json();
}

// ".../api/v2/pokemon/25/" -> 25
function extrairId(url) {
  return Number(url.split('/').filter(Boolean).pop());
}

// Lista leve com todos os Pokémon disponíveis (só id e nome)
export async function listarPokemons() {
  const dados = await buscarJson(`${API_URL}/pokemon?limit=100000`);
  return dados.results.map(({ name, url }) => ({ id: extrairId(url), name }));
}

// Arte oficial pelo número, sem precisar buscar o Pokémon inteiro
export function urlArtwork(id) {
  return `${ARTWORK_URL}/${id}.png`;
}

// Dados completos de um Pokémon (/pokemon/{id})
export function buscarPokemon(id) {
  if (!cacheDetalhes.has(id)) {
    const promessa = buscarJson(`${API_URL}/pokemon/${id}`).catch((erro) => {
      // Tira do cache para permitir uma nova tentativa depois
      cacheDetalhes.delete(id);
      throw erro;
    });
    cacheDetalhes.set(id, promessa);
  }
  return cacheDetalhes.get(id);
}
