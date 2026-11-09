import RecorteCodigo from '../RecorteCodigo';
import EstruturaProjeto from '../EstruturaProjeto';
import { useCriteriosViewModel } from './index_viewmodels';

/* [MVVM] View: só desenha. Qual card está aberto e os recortes de código ficam em
 * index_viewmodels.js, nesta pasta.
 */

// Critérios de avaliação do projeto final: um card por princípio; ao clicar, mostra onde foi usado
function Criterios() {
  const {
    criterios, abertoId, aberto, alternar,
  } = useCriteriosViewModel();

  return (
    <>
      <section className="sobre-painel" aria-labelledby="sobre-criterios-titulo">
        <h2 id="sobre-criterios-titulo" className="sobre-titulo">Critérios de avaliação</h2>
        <p className="sobre-dica">Clique em um critério para ver onde ele aparece no código do PokeBox.</p>

        <ul className="sobre-criterios">
          {criterios.map(({ id, nome, resumo }) => (
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
              </button>
            </li>
          ))}
        </ul>

        {aberto && (
          <div id="sobre-criterio-detalhe" className="sobre-criterio-detalhe" role="region" aria-label={`Exemplos de ${aberto.id}`}>
            <h3 className="sobre-subtitulo">{`${aberto.id} · ${aberto.nome}`}</h3>
            {aberto.exemplos.map(({ arquivo, explicacao, recorte }) => (
              <article key={`${arquivo}-${explicacao}`} className="sobre-exemplo">
                <p>{explicacao}</p>
                <RecorteCodigo arquivo={arquivo} recorte={recorte} />
              </article>
            ))}
          </div>
        )}
      </section>

      <EstruturaProjeto />
    </>
  );
}

export default Criterios;
