// Créditos à PokeAPI, de onde vêm os dados e as imagens dos Pokémon
function CreditosPokeApi() {
  return (
    <section className="sobre-painel" aria-labelledby="sobre-pokeapi-titulo">
      <h2 id="sobre-pokeapi-titulo" className="sobre-titulo">PokeAPI</h2>
      <p>
        Os dados dos Pokémon do PokeBox (espécies, tipos, status, evoluções e golpes) vêm da
        {' '}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer">PokeAPI</a>
        , uma API gratuita e de código aberto mantida pela comunidade. As imagens vêm do repositório
        {' '}
        <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noreferrer">PokeAPI/sprites</a>
        .
      </p>
      <p>
        Para respeitar a política de uso justo da PokeAPI, o PokeBox busca os dados pelo próprio
        back-end e guarda as respostas em cache, evitando repetir a mesma requisição.
      </p>
      <p className="sobre-dica">
        Pokémon e os nomes dos Pokémon são marcas registradas da Nintendo, Game Freak e The Pokémon
        Company. O PokeBox é um projeto de estudo, sem fins comerciais e sem vínculo com essas empresas.
      </p>
    </section>
  );
}

export default CreditosPokeApi;
