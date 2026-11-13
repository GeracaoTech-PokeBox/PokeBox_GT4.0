import PropTypes from 'prop-types';
import { AcoesBatalha, LadoCampo, RecompensaBatalha } from '@/features/batalhas';
import { formatarNome } from '@/shared';
import { formatarForca } from '../../utils/index_utils';
import { useBatalhaSelvagem } from './index_viewmodels';

/* [MVVM] View da batalha contra o selvagem. Era um componente interno de pages/Historia; ganhou
 * pasta própria junto com o seu ViewModel (index_viewmodels.js), que antes ficava no mesmo
 * arquivo do ViewModel da História.
 */

function BatalhaSelvagem({
  encontro, batalha, enviando, onJogar, onVoltar, captura,
}) {
  const {
    eu, selvagem, fim, venci, revanche, resultado, recompensa, reservas, historico, trocando,
    alternarTroca, atacar, usarGolpe, trocar, fugir,
  } = useBatalhaSelvagem(batalha, onJogar);

  return (
    <section className="historia-batalha" aria-label="Batalha contra Pokémon selvagem">
      <p className="historia-batalha-titulo">
        {`Trilha ${encontro.trilha} · Ponto ${encontro.ponto} · Força ${formatarForca(encontro.forca)}`}
      </p>

      {fim && (
        <div className="batalha-resultado" data-venci={venci} role="status">
          <strong>{resultado}</strong>
          {/* [DRY] Retirado daqui: o texto "+X Pokécoins e +Y XP" e a lista de quem subiu de nível
            eram uma cópia do mesmo JSX de pages/Batalha. Agora as duas telas usam o componente
            RecompensaBatalha (na derrota, não há recompensa para mostrar). */}
          {venci && <RecompensaBatalha recompensa={recompensa} />}
          {!venci && (
            <span>
              {revanche
                ? `${formatarNome(encontro.nome)} fugiu. Refaça o ponto para encontrar outro Pokémon.`
                : `${formatarNome(encontro.nome)} continua esperando neste ponto. Fortaleça seu time e tente de novo!`}
            </span>
          )}
        </div>
      )}

      <div className="batalha-campo">
        <LadoCampo lado={selvagem} meu={false} />
        <LadoCampo lado={eu} meu />
      </div>

      {/* [DRY] Retirado daqui: o painel de ações (golpes, Atacar, Trocar Pokémon e a lista de
        reservas) era uma cópia do mesmo JSX de pages/Batalha. Agora as duas telas usam o componente
        AcoesBatalha. Só o botão "Fugir", que é desta tela, vai como children. */}
      {!fim && (
        <AcoesBatalha
          pokemon={eu.pokemons[eu.ativo]}
          reservas={reservas}
          enviando={enviando}
          trocando={trocando}
          onAlternarTroca={alternarTroca}
          onAtacar={atacar}
          onUsarGolpe={usarGolpe}
          onTrocar={trocar}
        >
          <button type="button" className="jogo-botao jogo-botao--claro" disabled={enviando} onClick={fugir}>
            Fugir
          </button>
        </AcoesBatalha>
      )}

      {fim && (
        <div className="historia-batalha-fim">
          {venci && captura}
          <button type="button" className="jogo-botao jogo-botao--claro" onClick={() => onVoltar()}>
            Voltar à trilha
          </button>
        </div>
      )}

      {historico.length > 0 && (
        <section className="batalha-historico">
          <h2>Histórico</h2>
          <ol reversed>
            {historico.map(({ numero, meu, frases }) => (
              <li key={numero} data-automatica={!meu}>
                <span className="batalha-historico-turno">{meu ? 'Você' : 'Pokémon selvagem'}</span>
                {frases.map((frase) => <span key={frase}>{frase}</span>)}
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}

const formatoEncontro = PropTypes.shape({
  id: PropTypes.number.isRequired,
  trilha: PropTypes.number.isRequired,
  ponto: PropTypes.number.isRequired,
  forca: PropTypes.number.isRequired,
  especieId: PropTypes.number.isRequired,
  nome: PropTypes.string.isRequired,
  tipos: PropTypes.arrayOf(PropTypes.string).isRequired,
  shiny: PropTypes.bool.isRequired,
  nivel: PropTypes.number.isRequired,
  status: PropTypes.shape({
    hp: PropTypes.number, ataque: PropTypes.number, defesa: PropTypes.number, velocidade: PropTypes.number,
  }).isRequired,
  situacao: PropTypes.oneOf(['encontrado', 'vencido', 'capturado', 'fugiu', 'ignorado']).isRequired,
  revanche: PropTypes.bool,
  chanceCaptura: PropTypes.number,
  tentativasCaptura: PropTypes.number.isRequired,
  tentativasRestantes: PropTypes.number,
});

BatalhaSelvagem.propTypes = {
  encontro: formatoEncontro.isRequired,
  batalha: PropTypes.shape({
    estado: PropTypes.shape({ lados: PropTypes.array.isRequired }).isRequired,
    log: PropTypes.array.isRequired,
    fim: PropTypes.shape({ vencedor: PropTypes.number, motivo: PropTypes.string }),
    recompensa: PropTypes.shape({ pokecoins: PropTypes.number, xp: PropTypes.number, subiram: PropTypes.array }),
  }).isRequired,
  enviando: PropTypes.bool.isRequired,
  onJogar: PropTypes.func.isRequired,
  onVoltar: PropTypes.func.isRequired,
  captura: PropTypes.node,
};

export default BatalhaSelvagem;
