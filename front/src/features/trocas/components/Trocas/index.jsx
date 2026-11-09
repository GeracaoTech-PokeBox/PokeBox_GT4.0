import Mercado from '../Mercado';
import Anunciar from '../Anunciar';
import Propostas from '../Propostas';
import { useTrocasViewModel } from './index_viewmodels';
import './Trocas.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [SOLID-I] Não recebe nem repassa mais `usuario` e onAtualizarUsuario para Mercado, Anunciar e
 *   Propostas.
 */

const ABAS = [
  { valor: 'mercado', nome: 'Mercado' },
  { valor: 'anunciar', nome: 'Anunciar' },
  { valor: 'propostas', nome: 'Propostas' },
];

// Mercado entre jogadores: comprar/propor (Mercado), anunciar (Anunciar) e responder (Propostas)
function Trocas() {
  const {
    aba, setAba, pendentes, contarPendentes,
  } = useTrocasViewModel();

  return (
    <section className="trocas">
      <header className="trocas-cabecalho">
        <div>
          <h1 className="trocas-titulo-pagina">Trocas</h1>
          <p className="trocas-dica">Compre, venda e troque Pokémon com outros treinadores.</p>
        </div>
        <div className="trocas-abas" role="tablist" aria-label="Trocas">
          {ABAS.map(({ valor, nome }) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={aba === valor}
              className="trocas-aba"
              onClick={() => setAba(valor)}
            >
              {nome}
              {valor === 'propostas' && pendentes > 0 && <span className="trocas-contador">{pendentes}</span>}
            </button>
          ))}
        </div>
      </header>

      {aba === 'mercado' && <Mercado />}
      {aba === 'anunciar' && <Anunciar onVerPropostas={() => setAba('propostas')} />}
      {aba === 'propostas' && <Propostas onMudou={contarPendentes} />}
    </section>
  );
}

export default Trocas;
