import { useState } from 'react';
import PropTypes from 'prop-types';
import { useFiltrosPokemonsViewModel } from './index_viewmodels';
import './FiltrosPokemons.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 */

function FiltrosPokemons({ filtros, onAlterar, onLimpar }) {
  // [MVVM] Estado só visual (painel aberto ou fechado): pode ficar na View.
  const [aberto, setAberto] = useState(false);
  const campos = useFiltrosPokemonsViewModel();
  const quantidadeAtivos = Object.keys(filtros).length;

  return (
    <section className="filtros">
      <div className="filtros-acoes">
        <button
          type="button"
          className="filtros-alternar"
          aria-expanded={aberto}
          aria-controls="filtros-painel"
          onClick={() => setAberto((valor) => !valor)}
        >
          {quantidadeAtivos > 0 ? `Filtros (${quantidadeAtivos})` : 'Filtros'}
          <span aria-hidden="true">{aberto ? ' ▲' : ' ▼'}</span>
        </button>

        {quantidadeAtivos > 0 && (
          <button type="button" className="filtros-limpar" onClick={() => onLimpar()}>
            Limpar filtros
          </button>
        )}
      </div>

      {aberto && (
        <div id="filtros-painel" className="filtros-painel">
          {campos.map(({
            recurso, rotulo, disponivel, textoVazio, opcoes,
          }) => (
            <label key={recurso} className="filtros-campo" htmlFor={`filtros-${recurso}`}>
              <span>{rotulo}</span>
              <select
                id={`filtros-${recurso}`}
                value={filtros[recurso] ?? ''}
                disabled={!disponivel}
                onChange={(e) => onAlterar(recurso, e.target.value || null)}
              >
                <option value="">{textoVazio}</option>
                {opcoes.map(({ nome, rotulo: texto }) => <option key={nome} value={nome}>{texto}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}
    </section>
  );
}

FiltrosPokemons.propTypes = {
  filtros: PropTypes.objectOf(PropTypes.string).isRequired,
  onAlterar: PropTypes.func.isRequired,
  onLimpar: PropTypes.func.isRequired,
};

export default FiltrosPokemons;
