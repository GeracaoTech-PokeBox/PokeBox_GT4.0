import { useState } from 'react';
import PropTypes from 'prop-types';
import PokemonCard from '../components/PokemonCard';
import pokemonsMock from '../data/pokemonsMock';
import './Pokemons.css';

// Busca pelo nome ("pika") ou pelo número ("25" ou "#0025")
function filtrarPokemons(pokemons, busca) {
  const termo = busca.trim().toLowerCase().replace(/^#0*/, '');
  if (!termo) return pokemons;

  return pokemons.filter(
    (pokemon) => pokemon.name.includes(termo) || String(pokemon.id) === termo,
  );
}

function Pokemons({ usuario, onSair }) {
  // TODO: trocar pelos dados da PokeAPI quando a integração for feita
  const [pokemons] = useState(pokemonsMock);
  const [busca, setBusca] = useState('');

  const pokemonsFiltrados = filtrarPokemons(pokemons, busca);

  return (
    <div className="pokemons-page">
      <header className="pokemons-topo">
        <div className="pokemons-topo-conteudo">
          <div className="pokemons-marca">
            <span className="pokemons-lente" aria-hidden="true" />
            <h1 className="pokemons-titulo">PokeBox</h1>
          </div>

          <div className="pokemons-usuario">
            <span>{`Olá, ${usuario.login}!`}</span>
            <button type="button" className="pokemons-sair" onClick={() => onSair()}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="pokemons-conteudo">
        <div className="pokemons-barra">
          <label className="pokemons-busca" htmlFor="pokemons-busca">
            <span>Buscar Pokémon</span>
            <input
              id="pokemons-busca"
              type="search"
              placeholder="Nome ou número"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
          <p className="pokemons-contagem" aria-live="polite">
            {`${pokemonsFiltrados.length} de ${pokemons.length} Pokémon`}
          </p>
        </div>

        {pokemonsFiltrados.length > 0 ? (
          <ul className="pokemons-grade">
            {pokemonsFiltrados.map((pokemon) => (
              <li key={pokemon.id}>
                <PokemonCard pokemon={pokemon} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="pokemons-vazio">{`Nenhum Pokémon encontrado para "${busca.trim()}".`}</p>
        )}
      </main>
    </div>
  );
}

Pokemons.propTypes = {
  usuario: PropTypes.shape({
    login: PropTypes.string.isRequired,
  }).isRequired,
  onSair: PropTypes.func.isRequired,
};

export default Pokemons;
