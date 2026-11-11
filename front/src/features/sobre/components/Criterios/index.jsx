import CasoCriterio from '../CasoCriterio';
import EstruturaProjeto from '../EstruturaProjeto';
import { plural } from '@/shared';
import { useCriteriosViewModel } from './index_viewmodels';

/* [MVVM] View: só desenha. Os casos (lidos do código-fonte) e qual card está aberto ficam em
 * index_viewmodels.js, nesta pasta.
 */

// Critérios de avaliação do projeto final: um card por princípio; ao clicar, todos os casos dele
function Criterios() {
  const {
    criterios, abertoId, aberto, alternar,
  } = useCriteriosViewModel();

  return (
    <>
      <section className="sobre-painel" aria-labelledby="sobre-criterios-titulo">
        <h2 id="sobre-criterios-titulo" className="sobre-titulo">Critérios de avaliação</h2>
        <p className="sobre-dica">
          Cada caso vem direto do código: os comentários marcados com a tag do critério explicam a
          mudança e, quando houve refatoração, guardam o código original. Clique em um critério para ver todos.
        </p>

        <ul className="sobre-criterios">
          {criterios.map(({
            id, nome, resumo, casos,
          }) => (
            <li key={id}>
              <button
                type="button"
                className="sobre-criterio"
                aria-expanded={abertoId === id}
                aria-controls="sobre-criterio-detalhe"
                onClick={() => alternar(id)}
              >
                <strong>{id}</strong>
                <span className="sobre-criterio-nome">{nome}</span>
                <span className="sobre-criterio-resumo">{resumo}</span>
                <span className="sobre-criterio-total">{plural(casos.length, 'caso', 'casos')}</span>
              </button>
            </li>
          ))}
        </ul>

        {aberto && (
          <div id="sobre-criterio-detalhe" className="sobre-criterio-detalhe" role="region" aria-label={`Casos de ${aberto.id}`}>
            <h3 className="sobre-subtitulo">{`${aberto.id} · ${aberto.nome}`}</h3>
            <p className="sobre-dica">
              {`${plural(aberto.casos.length, 'caso encontrado', 'casos encontrados')}, ${aberto.comAntesEDepois} com antes e depois. `}
              Clique em um caso para abrir.
            </p>
            <div className="sobre-legenda" aria-hidden="true">
              <span className="sobre-legenda-antes">Antes: código original, guardado no comentário</span>
              <span className="sobre-legenda-depois">Depois: como o código está hoje</span>
            </div>
            <ul className="sobre-casos">
              {aberto.casos.map((caso) => (
                <li key={caso.id}><CasoCriterio caso={caso} /></li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <EstruturaProjeto />
    </>
  );
}

export default Criterios;
