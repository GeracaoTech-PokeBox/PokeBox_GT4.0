// Time de batalha: acesso ao banco. Só SQL, sem regra de jogo.
// Toda função recebe `db` primeiro: o pool (leitura avulsa) ou o client de uma transação.
// A posse e a ordem dos cards ficam na feature pokemons (garantirQueSaoDoDono, definirOrdem).

/** Algum desses Pokémon tem anúncio ativo nas trocas? */
async function algumAnunciado(db, pokemonIds) {
  const { rowCount } = await db.query(
    "SELECT 1 FROM anuncios WHERE pokemon_id = ANY($1) AND status = 'ativo'",
    [pokemonIds],
  );
  return rowCount > 0;
}

module.exports = { algumAnunciado };
