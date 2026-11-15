import PropTypes from 'prop-types';
import './Confirmacao.css';

/* Pergunta de sim/não num diálogo modal (fundo escuro, Esc cancela, foco preso no diálogo).
 * Usado, por exemplo, antes de sair do Time com alterações não salvas.
 */
function Confirmacao({
  titulo, texto, textoConfirmar, textoCancelar, onConfirmar, onCancelar,
}) {
  return (
    <dialog
      // showModal no ref: abre como modal
      ref={(dialogo) => dialogo && !dialogo.open && dialogo.showModal()}
      className="confirmacao"
      aria-labelledby="confirmacao-titulo"
      aria-describedby="confirmacao-texto"
      // Esc fecha o diálogo: conta como cancelar
      onClose={onCancelar}
    >
      <h2 id="confirmacao-titulo" className="confirmacao-titulo">{titulo}</h2>
      <p id="confirmacao-texto" className="confirmacao-texto">{texto}</p>
      <div className="confirmacao-acoes">
        {/* O foco começa na opção que não perde nada */}
        <button type="button" className="jogo-botao jogo-botao--claro" onClick={() => onCancelar()} autoFocus>
          {textoCancelar}
        </button>
        <button type="button" className="jogo-botao" onClick={() => onConfirmar()}>
          {textoConfirmar}
        </button>
      </div>
    </dialog>
  );
}

Confirmacao.propTypes = {
  titulo: PropTypes.string.isRequired,
  texto: PropTypes.string.isRequired,
  textoConfirmar: PropTypes.string.isRequired,
  textoCancelar: PropTypes.string.isRequired,
  onConfirmar: PropTypes.func.isRequired,
  onCancelar: PropTypes.func.isRequired,
};

export default Confirmacao;
