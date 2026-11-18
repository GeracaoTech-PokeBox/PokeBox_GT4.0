import PropTypes from 'prop-types';

/* Mini-histórico dentro do campo de batalha: as últimas VISIVEIS ações, a mais nova embaixo.
 * Animação sem timers: desenha VISIVEIS + 1 itens; o mais antigo, que acabou de ser empurrado
 * para fora, ganha data-saindo e o CSS o encolhe até sumir. O item novo entra com a animação de
 * montagem. O histórico completo continua abaixo do campo.
 * [MVVM] View: os itens chegam prontos de itensDoFeed() (../../models).
 */

const VISIVEIS = 4;

function FeedBatalha({ itens }) {
  const ultimos = itens.slice(-(VISIVEIS + 1));
  const saindo = ultimos.length > VISIVEIS ? ultimos[0].chave : null;

  return (
    <ol className="batalha-feed" aria-label="Últimas ações da batalha" aria-live="polite">
      {ultimos.map(({
        chave, inicio, meu, frases,
      }) => (
        <li
          key={chave}
          className="batalha-feed-item"
          data-saindo={chave === saindo}
          data-meu={meu}
          data-inicio={inicio}
          // O que está saindo some da tela: o leitor de tela não precisa ler de novo
          aria-hidden={chave === saindo || undefined}
        >
          {inicio && <span className="batalha-feed-rotulo">Início</span>}
          {frases.join(' ')}
        </li>
      ))}
    </ol>
  );
}

FeedBatalha.propTypes = {
  itens: PropTypes.arrayOf(PropTypes.shape({
    chave: PropTypes.string.isRequired,
    inicio: PropTypes.bool.isRequired,
    meu: PropTypes.bool.isRequired,
    frases: PropTypes.arrayOf(PropTypes.string).isRequired,
  })).isRequired,
};

export default FeedBatalha;
