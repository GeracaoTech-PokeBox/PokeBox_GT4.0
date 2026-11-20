import PropTypes from 'prop-types';
import { tempoDesde } from '@/shared';
import { usePainelNovidades } from './index_viewmodels';
import './PainelNovidades.css';

/* [MVVM] View das novidades de uma aba. Cada notificação fica aqui até o treinador clicar em
 * "Vi!": isso marca como vista e dá Pokécoins (até 15 por dia). O ViewModel fica em
 * index_viewmodels.js e o estado de todas as abas no NotificacoesProvider.
 */
function PainelNovidades({ tela }) {
  const {
    daTela, recompensa, vendo, mensagem, marcarVista,
  } = usePainelNovidades(tela);

  if (daTela.length === 0 && !mensagem) return null;

  return (
    <section className="novidades" aria-labelledby="novidades-titulo">
      <h2 id="novidades-titulo" className="novidades-titulo">
        <span aria-hidden="true">🔔</span>
        {daTela.length > 0 ? `Novidades nesta aba (${daTela.length})` : 'Novidades nesta aba'}
      </h2>
      {mensagem && <p className="novidades-mensagem" role="status">{mensagem}</p>}
      {daTela.length > 0 && (
        <ul className="novidades-lista">
          {daTela.map((n) => (
            <li key={n.id} className="novidades-item">
              <div className="novidades-texto">
                <strong>
                  {n.titulo}
                  {n.quantidade > 1 && <span className="novidades-quantidade">{` ×${n.quantidade}`}</span>}
                </strong>
                <span>{n.texto}</span>
                <time dateTime={n.criadaEm}>{tempoDesde(n.criadaEm)}</time>
              </div>
              <button
                type="button"
                className="jogo-botao novidades-ver"
                disabled={vendo !== null}
                onClick={() => marcarVista(n.id)}
              >
                {vendo === n.id && 'Marcando...'}
                {vendo !== n.id && (recompensa > 0 ? `Vi! +${recompensa} Pokécoins` : 'Vi!')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

PainelNovidades.propTypes = { tela: PropTypes.string.isRequired };

export default PainelNovidades;
