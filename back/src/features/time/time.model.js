// Time de batalha: acesso ao banco. Só SQL, sem regra de jogo.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.

/** Trava a linha do usuário até o fim da transação */
async function travarUsuario(client, usuarioId) {
  await client.query('SELECT 1 FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
}

/** Quantos desses Pokémon são do usuário */
async function contarPokemonsDoDono(db, pokemonIds, usuarioId) {
  const { rowCount } = await db.query(
    'SELECT 1 FROM pokemons WHERE id = ANY($1) AND dono_id = $2',
    [pokemonIds, usuarioId],
  );
  return rowCount;
}

/** Algum desses Pokémon tem anúncio ativo nas trocas? */
async function algumAnunciado(db, pokemonIds) {
  const { rowCount } = await db.query(
    "SELECT 1 FROM anuncios WHERE pokemon_id = ANY($1) AND status = 'ativo'",
    [pokemonIds],
  );
  return rowCount > 0;
}

/** Grava o time na ordem recebida (posição 1, 2, 3...) */
async function definirPosicoes(client, usuarioId, pokemonIds) {
  // Limpa antes de gravar para não esbarrar no UNIQUE (dono_id, posicao_time)
  await client.query('UPDATE pokemons SET posicao_time = NULL WHERE dono_id = $1', [usuarioId]);
  for (const [i, id] of pokemonIds.entries()) {
    await client.query('UPDATE pokemons SET posicao_time = $2 WHERE id = $1', [id, i + 1]);
  }
}

module.exports = {
  travarUsuario, contarPokemonsDoDono, algumAnunciado, definirPosicoes,
};
