import { useEffect, useRef } from 'react';
import FiltrosPokemons from '../FiltrosPokemons';
import PokemonCard from '../PokemonCard';
import { formatarNumero } from '@/shared';
import { usePokemonsViewModel } from './index_viewmodels';
import './Pokemons.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [MVVM] O único useEffect que sobrou é o do IntersectionObserver: ele observa um elemento do DOM,
 *   o que é trabalho da View.
 */

function Pokemons() {
  const vm = usePokemonsViewModel();
  const { temMais, carregarMais } = vm;
  const sentinelaRef = useRef(null);
  const quantosVisiveis = vm.visiveis.length;

  // [MVVM] Fica na View porque observa um elemento do DOM. Quando o fim da lista aparece na
  // tela, pede mais cards ao ViewModel.
  useEffect(() => {
    const sentinela = sentinelaRef.current;
    if (!sentinela || !temMais) return undefined;

    const observador = new IntersectionObserver((entradas) => {
      if (entradas[0].isIntersecting) carregarMais();
    }, { rootMargin: '400px' });
    observador.observe(sentinela);

    return () => observador.disconnect();
  }, [temMais, quantosVisiveis, carregarMais]);

  const renderVazio = () => {
    if (vm.erroFiltro) {
      return (
        <p className="pokemons-status" role="alert">
          Não foi possível aplicar os filtros. Tente escolher de novo.
        </p>
      );
    }
    if (vm.aplicandoFiltros) {
      return (
        <p className="pokemons-status" aria-busy="true">
          Aplicando filtros...
        </p>
      );
    }
    return (
      <p className="pokemons-status">
        {vm.busca.trim()
          ? `Nenhum Pokémon encontrado para "${vm.busca.trim()}" com esses filtros.`
          : 'Nenhum Pokémon encontrado com esses filtros.'}
      </p>
    );
  };

  if (vm.erroLista) {
    return (
      <div className="pokemons-status" role="alert">
        <p>{vm.erroLista}</p>
        <button type="button" className="pokemons-botao" onClick={vm.tentarNovamente}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!vm.carregado) {
    return (
      <p className="pokemons-status" aria-busy="true">
        Carregando a Pokédex...
      </p>
    );
  }

  return (
    <>
      <div className="pokemons-barra">
        <label className="pokemons-busca" htmlFor="pokemons-busca">
          <span>Buscar Pokémon</span>
          <input
            id="pokemons-busca"
            type="search"
            placeholder="Nome ou número"
            value={vm.busca}
            onChange={(e) => vm.buscar(e.target.value)}
          />
        </label>
        <p className="pokemons-contagem" aria-live="polite">
          {`${vm.totalFiltrados} de ${vm.total} Pokémon`}
        </p>
      </div>

      <FiltrosPokemons
        filtros={vm.filtros}
        onAlterar={vm.alterarFiltro}
        onLimpar={vm.limparFiltros}
      />

      {vm.totalFiltrados > 0 ? (
        <ul className="pokemons-grade">
          {vm.visiveis.map(({ id, name, detalhes }) => (
            <li key={id}>
              {detalhes ? (
                <PokemonCard pokemon={detalhes} />
              ) : (
                <div className="pokemons-card-carregando" aria-busy={detalhes !== false}>
                  {/* [DRY] O "#0025" era montado na mão, repetindo formatarNumero() de @/shared.
                    Código original:
                    <span className="pokemons-card-carregando-numero">{`#${String(id).padStart(4, '0')}`}</span>
                  */}
                  <span className="pokemons-card-carregando-numero">{formatarNumero(id)}</span>
                  <span className="pokemons-card-carregando-nome">{name.replace(/-/g, ' ')}</span>
                  <span>
                    {detalhes === false ? 'Não foi possível carregar.' : 'Carregando...'}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : renderVazio()}

      {temMais && (
        <div ref={sentinelaRef} className="pokemons-mais">
          <button type="button" className="pokemons-botao" onClick={carregarMais}>
            Carregar mais
          </button>
        </div>
      )}
    </>
  );
}

export default Pokemons;
