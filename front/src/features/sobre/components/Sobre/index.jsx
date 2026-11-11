import { Suspense, lazy, useState } from 'react';
import CreditosPokeApi from '../CreditosPokeApi';
import GeracaoTech from '../GeracaoTech';
import { ABAS } from '../../constants/index_constants';
import './Sobre.css';

/* [MVVM] View: só desenha. A sub-aba aberta é estado só visual, então fica aqui mesmo
 * (como a subtela do Mercado); quem tem estado de verdade (Criterios) tem o seu ViewModel.
 */

// Os critérios carregam o código-fonte do front como texto: só baixa quando a aba é aberta
const Criterios = lazy(() => import('../Criterios'));

const CONTEUDO = {
  geracaoTech: GeracaoTech,
  pokeapi: CreditosPokeApi,
  criterios: Criterios,
};

// Sobre nós: o curso, os créditos à PokeAPI e os critérios de avaliação do projeto
function Sobre() {
  const [aba, setAba] = useState('geracaoTech');
  const Conteudo = CONTEUDO[aba];

  return (
    <section className="sobre">
      <header className="sobre-cabecalho">
        <div>
          <h1 className="sobre-titulo-pagina">Sobre nós</h1>
          <p className="sobre-dica">O projeto, quem o tornou possível e como ele foi construído.</p>
        </div>
        <div className="sobre-abas" role="tablist" aria-label="Sobre nós">
          {ABAS.map(({ valor, nome }) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={aba === valor}
              className="sobre-aba"
              onClick={() => setAba(valor)}
            >
              {nome}
            </button>
          ))}
        </div>
      </header>

      <Suspense fallback={<p className="sobre-dica" aria-busy="true">Lendo o código do projeto...</p>}>
        <Conteudo />
      </Suspense>
    </section>
  );
}

export default Sobre;
