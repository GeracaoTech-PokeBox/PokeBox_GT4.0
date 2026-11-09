import { useState } from 'react';
import PropTypes from 'prop-types';
import { ESTRUTURAS } from '../../constants/index_constants';

function ListaPastas({ itens }) {
  return (
    <dl className="sobre-estrutura">
      {itens.map(({ caminho, descricao }) => (
        <div key={caminho}>
          <dt><code>{caminho}</code></dt>
          <dd>{descricao}</dd>
        </div>
      ))}
    </dl>
  );
}

ListaPastas.propTypes = {
  itens: PropTypes.arrayOf(PropTypes.shape({
    caminho: PropTypes.string.isRequired,
    descricao: PropTypes.string.isRequired,
  })).isRequired,
};

/* [MVVM] View: a visão escolhida (Geral, Front, Back...) é estado só visual, então fica aqui.
 * Uma visão nova é só mais um item em ESTRUTURAS ([SOLID-O]).
 */

// Estrutura do repositório, uma parte por vez
function EstruturaProjeto() {
  const [visao, setVisao] = useState(ESTRUTURAS[0].valor);
  const { resumo, secoes } = ESTRUTURAS.find(({ valor }) => valor === visao);

  return (
    <section className="sobre-painel" aria-labelledby="sobre-estrutura-titulo">
      <h2 id="sobre-estrutura-titulo" className="sobre-titulo">Estrutura do projeto</h2>
      <div className="sobre-abas sobre-abas--estrutura" role="tablist" aria-label="Parte do projeto">
        {ESTRUTURAS.map(({ valor, nome }) => (
          <button
            key={valor}
            id={`sobre-estrutura-${valor}`}
            type="button"
            role="tab"
            aria-selected={visao === valor}
            aria-controls="sobre-estrutura-conteudo"
            className="sobre-aba sobre-aba--pequena"
            onClick={() => setVisao(valor)}
          >
            {nome}
          </button>
        ))}
      </div>

      <div id="sobre-estrutura-conteudo" role="tabpanel" aria-labelledby={`sobre-estrutura-${visao}`}>
        <p className="sobre-dica">{resumo}</p>
        {secoes.map(({ titulo, itens }) => (
          <div key={titulo}>
            <h3 className="sobre-subtitulo">{titulo}</h3>
            <ListaPastas itens={itens} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default EstruturaProjeto;
