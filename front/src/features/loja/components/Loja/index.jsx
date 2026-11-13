import PropTypes from 'prop-types';
import { CartaPokemon, formatarNome, formatarNumero } from '@/shared';
import LojaPokebolas from '../LojaPokebolas';
import { GERACOES, PRECO_POKEMON, useLojaViewModel } from './index_viewmodels';
import './Loja.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js. A compra de Pokébolas é o componente ../LojaPokebolas.
 * [SOLID-D] Não recebe mais `usuario`, onComprar e onComprarPokebolas do App. onIrParaTime continua
 *   por props: é navegação.
 */

function Loja({ onIrParaTime }) {
  const {
    saldo, podeComprar, comprando, erro, revelado, fecharRevelado, comprados, comprar,
  } = useLojaViewModel();

  return (
    <section className="loja">
      <h1 className="jogo-titulo">Loja</h1>
      <p className="jogo-texto">
        Uma loja por geração: cada uma sorteia só entre os Pokémon dela.
        Cada Pokémon é sorteado na hora e é único: IVs, altura, peso e a chance de 1% de ser shiny.
        Lendários e míticos também podem aparecer, mas são bem mais raros.
      </p>

      <div className="loja-resumo">
        <p className="loja-preco">{`Cada Pokémon: ${PRECO_POKEMON} Pokécoins`}</p>
        <p className="loja-saldo">{`Seu saldo: ${saldo} Pokécoins`}</p>
        {!podeComprar && (
          <p className="loja-dica">
            Sem Pokécoins suficientes. Batalhe para ganhar mais: +40 na vitória e +10 na derrota.
          </p>
        )}
      </div>

      <LojaPokebolas />

      <ul className="loja-geracoes">
        {GERACOES.map((g) => {
          const sorteando = comprando === g.numero;
          return (
            <li key={g.numero} className="loja-geracao jogo-painel">
              <div className="loja-pokebola" aria-hidden="true" data-girando={sorteando} />
              <p className="loja-geracao-numero">{`Geração ${g.numero}`}</p>
              <h2 className="loja-nome">{g.regiao}</h2>
              <p className="loja-intervalo">{`${formatarNumero(g.primeira)} a ${formatarNumero(g.ultima)}`}</p>
              <button
                type="button"
                className="jogo-botao"
                onClick={() => comprar(g.numero)}
                disabled={!podeComprar || comprando !== null}
                aria-label={`Comprar Pokémon da geração ${g.numero} (${g.regiao})`}
              >
                {sorteando ? 'Sorteando...' : 'Comprar'}
              </button>
            </li>
          );
        })}
      </ul>

      {erro && <p className="jogo-erro" role="alert">{erro}</p>}

      {revelado && (
        // showModal no ref: abre como modal (fundo escuro, Esc fecha, foco preso no diálogo)
        <dialog
          ref={(dialogo) => dialogo && !dialogo.open && dialogo.showModal()}
          className="loja-revelado"
          aria-labelledby="loja-revelado-titulo"
          onClose={fecharRevelado}
        >
          <p id="loja-revelado-titulo" className="loja-revelado-titulo">
            {`Você recebeu ${formatarNome(revelado.nome)} ${formatarNumero(revelado.mintNumero)}!`}
            {revelado.shiny && ' É shiny!'}
            {revelado.posicaoTime ? ` Ele entrou no seu time na posição ${revelado.posicaoTime}.` : ' Ele foi para a sua coleção.'}
          </p>
          <div className="loja-revelado-carta">
            <CartaPokemon pokemon={revelado} />
          </div>
          <div className="loja-revelado-acoes">
            <button type="button" className="jogo-botao jogo-botao--claro" onClick={fecharRevelado} autoFocus>
              Comprar mais
            </button>
            <button type="button" className="jogo-botao" onClick={() => onIrParaTime()}>
              Ir para o time
            </button>
          </div>
        </dialog>
      )}

      {comprados.length > 0 && (
        <>
          <h2 className="loja-subtitulo">Compras desta visita</h2>
          <ul className="loja-grade">
            {comprados.map((pokemon) => (
              <li key={pokemon.id}><CartaPokemon pokemon={pokemon} compacto /></li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

Loja.propTypes = {
  onIrParaTime: PropTypes.func.isRequired,
};

export default Loja;
