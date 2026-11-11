import { CartaPokemon, Tutorial, urlArtwork } from '@/shared';
import CantinhoCuidado from '../CantinhoCuidado';
import FiltrosColecao from '../FiltrosColecao';
import { INICIAIS, useMeusPokemonsViewModel } from './index_viewmodels';
import './MeusPokemons.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [SOLID-D] Não recebe mais `usuario` e as 5 ações que o App montava.
 * [MVVM] TIPOS_INICIAIS ficou aqui porque são só as cores e os nomes dos botões.
 */

// Em todas as gerações os iniciais vêm na ordem planta, fogo e água
const TIPOS_INICIAIS = [
  { nome: 'Planta', cor: '#7ac74c' },
  { nome: 'Fogo', cor: '#ee8130' },
  { nome: 'Água', cor: '#6390f0' },
];

function MeusPokemons() {
  const vm = useMeusPokemonsViewModel();

  const renderEscolhaInicial = () => (
    <section className="meus-pokemons-inicial">
      <h2 className="meus-pokemons-titulo-secao">Escolha seu Pokémon inicial</h2>
      <p className="meus-pokemons-texto">
        Todo treinador começa a jornada com um parceiro. Escolha um dos Pokémon abaixo.
      </p>

      {INICIAIS.map(({ geracao, regiao, pokemons }) => (
        <section key={geracao} className="meus-pokemons-geracao">
          <h3>{`${geracao} (${regiao})`}</h3>
          <ul className="meus-pokemons-opcoes">
            {pokemons.map(({ id, nome }, posicao) => (
              <li key={id}>
                <button
                  type="button"
                  className="meus-pokemons-opcao"
                  aria-pressed={vm.escolhido === id}
                  style={{ '--meus-pokemons-cor': TIPOS_INICIAIS[posicao].cor }}
                  onClick={() => vm.escolher(id)}
                >
                  <img src={urlArtwork(id)} alt="" loading="lazy" />
                  <span className="meus-pokemons-opcao-nome">{nome}</span>
                  <span className="meus-pokemons-opcao-tipo">{TIPOS_INICIAIS[posicao].nome}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {vm.inicialEscolhido && (
        <div className="meus-pokemons-confirmar" role="status">
          <span>{`Você escolheu ${vm.inicialEscolhido.nome}!`}</span>
          <button type="button" className="meus-pokemons-botao" onClick={vm.confirmarInicial} disabled={vm.enviando}>
            {vm.enviando ? 'Enviando...' : 'Confirmar'}
          </button>
        </div>
      )}
    </section>
  );

  const renderColecao = () => (
    <section>
      <h2 className="meus-pokemons-titulo-secao">Meus Pokémon</h2>
      <p className="meus-pokemons-texto">
        {`${vm.total === 1 ? '1 Pokémon' : `${vm.total} Pokémon`}. `}
        Cada card é único: IVs, altura, peso e shiny foram sorteados quando ele chegou até você.
        Dê carinho, brinque e alimente seus Pokémon para ganhar corações de afeto.
      </p>

      <button
        type="button"
        className="jogo-botao jogo-botao--azul meus-pokemons-como-cuidar"
        onClick={vm.tutorialCuidados.rever}
      >
        Como cuidar dos Pokémon
      </button>

      <FiltrosColecao
        filtros={vm.filtros}
        onMudar={vm.mudarFiltros}
        tipos={vm.tipos}
        mostrando={vm.visiveis.length}
        total={vm.total}
      />

      {vm.visiveis.length === 0 && (
        <p className="meus-pokemons-texto">Nenhum Pokémon combina com esses filtros.</p>
      )}

      <ul className="meus-pokemons-grade">
        {vm.visiveis.map((pokemon) => (
          <li key={pokemon.id}>
            <CartaPokemon
              pokemon={pokemon}
              onEvoluir={vm.evoluir}
              evoluindo={vm.enviando}
              onCuidar={() => {
                vm.abrirCuidado(pokemon.id);
                window.scrollTo(0, 0);
              }}
            />
          </li>
        ))}
      </ul>

      {/* Os alvos dos passos (afeto e "Cuidar de...") ficam no primeiro card da coleção */}
      {vm.tutorialCuidados.aberto && (
        <Tutorial
          key={vm.tutorialCuidados.passo}
          passos={vm.tutorialCuidados.passos}
          passo={vm.tutorialCuidados.passo}
          onProximo={vm.tutorialCuidados.proximo}
          onPular={vm.tutorialCuidados.pular}
        />
      )}
    </section>
  );

  if (vm.cuidando) {
    return (
      <CantinhoCuidado
        pokemon={vm.cuidando}
        onCuidar={vm.cuidar}
        onRoletarGolpes={vm.roletarGolpes}
        onDesbloquearGolpes={vm.desbloquearGolpes}
        onVoltar={vm.fecharCuidado}
      />
    );
  }

  return (
    <>
      {vm.erro && <p className="jogo-erro" role="alert">{vm.erro}</p>}
      {vm.aviso && <p className="jogo-aviso" role="status">{vm.aviso}</p>}
      {vm.semPokemons ? renderEscolhaInicial() : renderColecao()}
    </>
  );
}

export default MeusPokemons;
