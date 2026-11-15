import PropTypes from 'prop-types';
import {
  CartaPokemon, TabelaTipos, resumoEvolucao, formatarNome, formatarNumero, urlArtwork,
} from '@/shared';
import { FiltrosColecao } from '@/features/colecao';
import { useArrastarVagas } from '../../hooks/index_hooks';
import { TAMANHO_TIME, useTimeViewModel } from './index_viewmodels';
import './Time.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [SOLID-D] Não recebe mais `usuario` e onSalvar. onIrParaLoja continua por props: é navegação.
 */

function Time({ onIrParaLoja, onAlterado }) {
  const vm = useTimeViewModel(onAlterado);
  const { selecionados } = vm;
  const { propsDaVaga } = useArrastarVagas(vm.trocar);

  if (vm.colecaoPequena) {
    return (
      <section>
        <h1 className="jogo-titulo">Time</h1>
        <p className="jogo-texto">
          {`Para batalhar você precisa de ${TAMANHO_TIME} Pokémon. Você tem ${vm.totalNaColecao}.`}
        </p>
        <button type="button" className="jogo-botao" onClick={() => onIrParaLoja()}>
          Ir para a loja
        </button>
      </section>
    );
  }

  return (
    <section className="time">
      <h1 className="jogo-titulo">Time</h1>
      <p className="jogo-texto">
        {`Escolha ${TAMANHO_TIME} Pokémon da coleção. O primeiro abre a batalha, e quando um é nocauteado o próximo da fila entra.`}
        {' Arraste os cards do time para trocar a ordem.'}
      </p>
      <div className="time-tabela-tipos">
        <TabelaTipos />
      </div>

      <ol className="time-slots">
        {vm.vagas.map((pokemon, i) => {
          const evolucao = pokemon && resumoEvolucao(pokemon);
          return (
            <li key={i} className="time-slot" data-vazio={!pokemon} {...propsDaVaga(i, Boolean(pokemon))}>
              <span className="time-slot-numero">{i + 1}</span>
              {pokemon ? (
                <>
                  {/* draggable={false}: senão o navegador arrasta só a imagem, por cima do nosso arrasto */}
                  <img src={urlArtwork(pokemon.especieId, pokemon.shiny)} alt="" draggable={false} />
                  <span className="time-slot-nome">{formatarNome(pokemon.nome)}</span>
                  <span className="time-slot-nivel">{`Nv. ${pokemon.nivel}`}</span>
                  <span className="time-slot-evolucao" data-pronto={evolucao?.pronto ?? false}>
                    {evolucao ? evolucao.texto : 'Não evolui mais'}
                  </span>
                  <span className="time-slot-acoes">
                    <button type="button" aria-label="Mover para a esquerda" disabled={i === 0} onClick={() => vm.mover(i, -1)}>◀</button>
                    <button type="button" aria-label={`Tirar ${formatarNome(pokemon.nome)} do time`} onClick={() => vm.alternar(pokemon.id)}>✕</button>
                    <button type="button" aria-label="Mover para a direita" disabled={i === selecionados.length - 1} onClick={() => vm.mover(i, 1)}>▶</button>
                  </span>
                </>
              ) : (
                <span className="time-slot-vazio">Vazio</span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="time-salvar">
        <button type="button" className="jogo-botao" disabled={!vm.podeSalvar} onClick={vm.salvar}>
          {vm.salvando ? 'Salvando...' : 'Salvar time'}
        </button>
        {vm.faltam > 0 && <span>{`Faltam ${vm.faltam}.`}</span>}
        {vm.alterado && <span className="time-nao-salvo">Alterações não salvas</span>}
      </div>

      {vm.erro && <p className="jogo-erro" role="alert">{vm.erro}</p>}
      {vm.aviso && <p className="jogo-aviso" role="status">{vm.aviso}</p>}

      <h2 className="time-subtitulo">Coleção</h2>
      <FiltrosColecao
        filtros={vm.filtros}
        onMudar={vm.mudarFiltros}
        tipos={vm.tipos}
        mostrando={vm.visiveis.length}
        total={vm.totalNaColecao}
      />
      {vm.visiveis.length === 0 && <p className="jogo-texto">Nenhum Pokémon combina com esses filtros.</p>}
      <ul className="time-grade jogo-grade-cartas">
        {vm.visiveis.map((pokemon) => {
          const posicao = selecionados.indexOf(pokemon.id);
          return (
            <li key={pokemon.id} className="time-opcao" data-no-time={posicao !== -1}>
              <CartaPokemon pokemon={pokemon} compacto>
                <button
                  type="button"
                  className="jogo-botao jogo-botao--claro time-escolher"
                  disabled={posicao === -1 && vm.cheio}
                  onClick={() => vm.alternar(pokemon.id)}
                  aria-label={`${posicao === -1 ? 'Colocar no time' : 'Tirar do time'}: ${formatarNome(pokemon.nome)} ${formatarNumero(pokemon.mintNumero)}`}
                >
                  {posicao === -1 ? 'Colocar no time' : 'Tirar do time'}
                </button>
              </CartaPokemon>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

Time.propTypes = {
  onIrParaLoja: PropTypes.func.isRequired,
  onAlterado: PropTypes.func.isRequired,
};

export default Time;
