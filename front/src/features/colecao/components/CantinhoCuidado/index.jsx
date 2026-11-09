import PropTypes from 'prop-types';
import {
  BarraProgresso, Coracoes, formatoPokemon, dadosTipo, formatarNumero, urlArtwork,
} from '@/shared';
import CartaoGolpes from '../CartaoGolpes';
import { BEM_ESTAR_BAIXO, useCantinhoCuidadoViewModel } from './index_viewmodels';
import './CantinhoCuidado.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js.
 * Os golpes especiais viraram o componente ../CartaoGolpes, com o seu próprio ViewModel.
 * As ações cuidar/roletar/desbloquear continuam vindo por props do ViewModel de MeusPokemons.
 */

/* [DRY] A barra acessível (role="progressbar" + aria + span interno) era a mesma da barra de
 * afeto logo abaixo e da barra de XP de CartaPokemon.jsx; agora é o componente BarraProgresso.
 *
 * Código original:
 *
 * function BarraBemEstar({ nome, valor }) {
 *   return (
 *     <div className="cantinho-bem-estar">
 *       <div className="cantinho-bem-estar-topo">
 *         <span>{nome}</span>
 *         <span>{`${valor}%`}</span>
 *       </div>
 *       <span
 *         className="cantinho-bem-estar-barra"
 *         data-baixo={valor < BEM_ESTAR_BAIXO}
 *         data-tipo={nome.toLowerCase()}
 *         role="progressbar"
 *         aria-label={nome}
 *         aria-valuemin={0}
 *         aria-valuemax={100}
 *         aria-valuenow={valor}
 *       >
 *         <span style={{ width: `${valor}%` }} />
 *       </span>
 *     </div>
 *   );
 * }
 */
function BarraBemEstar({ nome, valor }) {
  return (
    <div className="cantinho-bem-estar">
      <div className="cantinho-bem-estar-topo">
        <span>{nome}</span>
        <span>{`${valor}%`}</span>
      </div>
      <BarraProgresso
        className="cantinho-bem-estar-barra"
        rotulo={nome}
        porcentagem={valor}
        data-baixo={valor < BEM_ESTAR_BAIXO}
        data-tipo={nome.toLowerCase()}
      />
    </div>
  );
}

BarraBemEstar.propTypes = { nome: PropTypes.string.isRequired, valor: PropTypes.number.isRequired };

function CantinhoCuidado({
  pokemon, onCuidar, onRoletarGolpes, onDesbloquearGolpes, onVoltar,
}) {
  const vm = useCantinhoCuidadoViewModel(pokemon, onCuidar);
  const { nome, animacao } = vm;
  const { afeto } = pokemon;

  return (
    <section className="cantinho" style={{ '--cantinho-cor': dadosTipo(pokemon.tipos[0]).cor }} aria-labelledby="cantinho-titulo">
      <header className="cantinho-topo">
        <button type="button" className="cantinho-voltar" onClick={onVoltar} aria-label="Voltar para Meus Pokémon">←</button>
        <div>
          <span className="cantinho-rotulo">Cantinho de cuidado</span>
          <h2 id="cantinho-titulo" className="cantinho-titulo">
            {nome}
            <span>{` ${formatarNumero(pokemon.mintNumero)} · Nv. ${pokemon.nivel}`}</span>
          </h2>
        </div>
      </header>

      {vm.erro && <p className="jogo-erro" role="alert">{vm.erro}</p>}

      <div className="cantinho-grade">
        <div className="cantinho-principal">
          <div className="cantinho-palco">
            <p className="cantinho-humor">{`${nome} ${vm.humor}`}</p>
            <div className="cantinho-imagem">
              <img
                src={urlArtwork(pokemon.especieId, pokemon.shiny)}
                alt={`${nome}${pokemon.shiny ? ' shiny' : ''}`}
                key={`img-${animacao}`}
                data-animando={animacao > 0}
              />
              {animacao > 0 && (
                <span className="cantinho-coracoes-subindo" key={`coracoes-${animacao}`} aria-hidden="true">
                  <span>♥</span>
                  <span>♥</span>
                  <span>♥</span>
                </span>
              )}
            </div>
            <p className="cantinho-reacao" role="status">{vm.reacao}</p>
          </div>

          <ul className="cantinho-acoes">
            {vm.acoes.map(({
              tipo, rotulo, icone, detalhe, desabilitado,
            }) => (
              <li key={tipo}>
                <button
                  type="button"
                  className="cantinho-acao"
                  disabled={desabilitado}
                  onClick={() => vm.cuidar(tipo)}
                >
                  <span className="cantinho-acao-icone" aria-hidden="true">{icone}</span>
                  <span className="cantinho-acao-texto">
                    <strong>{rotulo}</strong>
                    <span>{detalhe}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <aside className="cantinho-lateral">
          <section className="cantinho-cartao">
            <h3>Afeto por você</h3>
            <Coracoes quantidade={afeto.coracoes} tamanho="grande" />
            {/* [DRY] Mesma barra acessível de BarraBemEstar e de CartaPokemon; agora é BarraProgresso.
              Código original:
              <span
                className="cantinho-barra"
                role="progressbar"
                aria-label="Progresso até o próximo coração"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progresso)}
              >
                <span style={{ width: `${progresso}%` }} />
              </span>
            */}
            <BarraProgresso className="cantinho-barra" rotulo="Progresso até o próximo coração" porcentagem={vm.progresso} />
            <p className="cantinho-dica">
              {afeto.maximo ? 'Afeto máximo!' : `${afeto.faltamParaProximo} pontos até o próximo ♥`}
            </p>
            <BarraBemEstar nome="Humor" valor={pokemon.humor} />
            <BarraBemEstar nome="Energia" valor={pokemon.energia} />
            <dl className="cantinho-bonus">
              <dt>Bônus de status</dt>
              <dd>{`+${Math.round(afeto.bonusStatus * 100)}%`}</dd>
            </dl>
          </section>

          <CartaoGolpes pokemon={pokemon} nome={nome} onRoletar={onRoletarGolpes} onDesbloquear={onDesbloquearGolpes} />

          <section className="cantinho-cartao">
            <h3>Últimos cuidados</h3>
            {vm.historico.length === 0 ? (
              <p className="cantinho-dica">{`Nenhum cuidado ainda. ${nome} está esperando você!`}</p>
            ) : (
              <ul className="cantinho-historico">
                {vm.historico.map((item) => (
                  <li key={item.chave}>
                    <span>{item.texto}</span>
                    <time dateTime={item.criadoEm}>{item.quando}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="cantinho-cartao cantinho-cartao--info">
            <h3>Por que cuidar?</h3>
            <p>
              Cada coração dá <strong>+2% em todos os status</strong>. Com os 5 corações,
              {` ${nome} `}
              tem <strong>30% de chance de aguentar com 1 PS</strong> um golpe que o nocautearia
              (uma vez por batalha) e pode aprender <strong>2 golpes especiais</strong> na roleta.
              O afeto continua depois de evoluir.
              Humor e energia caem devagar com o tempo: brincar cansa, então alimente para recuperar a energia.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}

CantinhoCuidado.propTypes = {
  pokemon: formatoPokemon.isRequired,
  onCuidar: PropTypes.func.isRequired,
  onRoletarGolpes: PropTypes.func.isRequired,
  onDesbloquearGolpes: PropTypes.func.isRequired,
  onVoltar: PropTypes.func.isRequired,
};

export default CantinhoCuidado;
