import PropTypes from 'prop-types';
import { formatoPokemon, somaValores } from './formatos';
import { formatarNome } from './tipos';
import { urlSprite } from '../services/pokeapi';

/* [DRY] Componente novo. Anunciar.jsx (escolher o Pokémon a anunciar) e PropostaForm.jsx
 * (escolher os Pokémon da oferta) tinham o mesmo botão, linha por linha:
 *
 *   <button
 *     type="button"
 *     className="trocas-escolha-item"
 *     aria-pressed={...}
 *     onClick={...}
 *   >
 *     <img src={urlSprite(pokemon.especieId, pokemon.shiny)} alt="" loading="lazy" />
 *     <strong>{`${formatarNome(pokemon.nome)}${pokemon.shiny ? ' ★' : ''}`}</strong>
 *     <span>{`Nv. ${pokemon.nivel} · IVs ${somaIvs(pokemon.ivs)}`}</span>
 *   </button>
 *
 * Só mudavam aria-pressed, disabled e onClick, que agora são props.
 */

// Botão de um Pokémon da coleção nas listas de escolha das trocas
function ItemEscolha({
  pokemon, selecionado, desabilitado = false, onClick,
}) {
  return (
    <button
      type="button"
      className="trocas-escolha-item"
      aria-pressed={selecionado}
      disabled={desabilitado}
      onClick={onClick}
    >
      <img src={urlSprite(pokemon.especieId, pokemon.shiny)} alt="" loading="lazy" />
      <strong>{`${formatarNome(pokemon.nome)}${pokemon.shiny ? ' ★' : ''}`}</strong>
      <span>{`Nv. ${pokemon.nivel} · IVs ${somaValores(pokemon.ivs)}`}</span>
    </button>
  );
}

ItemEscolha.propTypes = {
  pokemon: formatoPokemon.isRequired,
  selecionado: PropTypes.bool.isRequired,
  desabilitado: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export default ItemEscolha;
