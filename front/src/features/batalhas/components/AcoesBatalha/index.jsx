import PropTypes from 'prop-types';
import { BotoesGolpes, formatarNome, urlArtwork } from '@/shared';

/* [DRY] Novo. O painel de ações da batalha (golpes, Atacar, Trocar Pokémon e a lista de reservas)
 * estava copiado em pages/Batalha (PvP) e no BatalhaSelvagem de pages/Historia, com o mesmo JSX e
 * as mesmas classes CSS (que ficam em ../Batalha/Batalha.css).
 * `children` recebe os botões extras de cada tela, como o "Fugir" da História.
 * [MVVM] É View: só recebe dados e avisa as ações por props.
 */
function AcoesBatalha({
  pokemon, reservas, enviando, trocando, onAlternarTroca, onAtacar, onUsarGolpe, onTrocar, children,
}) {
  return (
    <div className="batalha-acoes jogo-painel">
      <BotoesGolpes pokemon={pokemon} desabilitado={enviando} onUsar={onUsarGolpe} />
      <button type="button" className="jogo-botao" disabled={enviando} onClick={onAtacar}>
        Atacar
      </button>
      <button
        type="button"
        className="jogo-botao jogo-botao--azul"
        disabled={enviando || reservas.length === 0}
        aria-expanded={trocando}
        onClick={onAlternarTroca}
      >
        Trocar Pokémon
      </button>
      {children}
      {trocando && (
        <ul className="batalha-trocas">
          {reservas.map(({ pokemon: reserva, indice }) => (
            <li key={reserva.pokemonId}>
              <button type="button" disabled={enviando} onClick={() => onTrocar(indice)}>
                <img src={urlArtwork(reserva.especieId, reserva.shiny)} alt="" />
                <span>{formatarNome(reserva.nome)}</span>
                <span>{`${reserva.hp}/${reserva.hpMax} PS`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

AcoesBatalha.propTypes = {
  // Pokémon ativo, para os botões de golpe
  pokemon: PropTypes.object.isRequired,
  reservas: PropTypes.arrayOf(PropTypes.shape({
    pokemon: PropTypes.object.isRequired,
    indice: PropTypes.number.isRequired,
  })).isRequired,
  enviando: PropTypes.bool.isRequired,
  trocando: PropTypes.bool.isRequired,
  onAlternarTroca: PropTypes.func.isRequired,
  onAtacar: PropTypes.func.isRequired,
  onUsarGolpe: PropTypes.func.isRequired,
  onTrocar: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default AcoesBatalha;
