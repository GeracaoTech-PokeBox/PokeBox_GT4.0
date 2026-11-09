import PropTypes from 'prop-types';
import { tempoDesde, tempoRestante, formatarNome, urlArtwork } from '@/shared';
import { MOTIVOS } from '../../models/index_models';
import { TAMANHO_TIME, useBatalhasViewModel } from './index_viewmodels';
import './Batalhas.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [SOLID-D] Não recebe mais temTime nem onAtualizarUsuario. onAbrir continua por props: é navegação.
 * [MVVM] resumoEncerrada ficou aqui porque é só texto de tela.
 */

// [DRY] Retirado daqui: MOTIVOS era uma cópia idêntica da que existe em pages/Batalha.
// Agora as duas telas importam de ../../models.
// const MOTIVOS = { nocaute: 'por nocaute', wo: 'por W.O.', desistencia: 'por desistência' };

function resumoEncerrada(batalha) {
  if (batalha.status === 'recusada') return 'Desafio recusado';
  if (batalha.status === 'expirada') return 'Desafio expirou sem resposta';
  return `${batalha.venci ? 'Vitória' : 'Derrota'} ${MOTIVOS[batalha.motivoFim]}`;
}

function Batalhas({ onAbrir }) {
  const vm = useBatalhasViewModel(onAbrir);
  const {
    enviando, temTime, erro, aviso, oponente, setOponente, sugestoes, ativos, desafiar, responder,
    minhaVez, recebidos, esperando, enviados, encerradas,
  } = vm;

  if (!vm.carregado) {
    return vm.erro ? <p className="jogo-erro" role="alert">{vm.erro}</p> : <p aria-busy="true">Carregando batalhas...</p>;
  }

  const handleDesafiar = (e) => {
    e.preventDefault();
    vm.desafiarDigitado();
  };

  const secao = (titulo, lista, renderItem) => lista.length > 0 && (
    <section className="batalhas-secao">
      <h2>{`${titulo} (${lista.length})`}</h2>
      <ul className="batalhas-lista">{lista.map(renderItem)}</ul>
    </section>
  );

  const botaoAbrir = (batalha, texto = 'Abrir') => (
    <button type="button" className="jogo-botao jogo-botao--claro" onClick={() => vm.abrir(batalha)}>
      {texto}
    </button>
  );

  return (
    <section className="batalhas">
      <h1 className="jogo-titulo">Batalhas</h1>
      <p className="jogo-texto">
        As batalhas são por turnos e ninguém precisa estar online ao mesmo tempo: cada jogador tem 4h para jogar.
        Perder o prazo passa a vez; perder duas vezes seguidas é derrota por W.O.
      </p>

      <form className="batalhas-desafiar jogo-painel" onSubmit={handleDesafiar}>
        <label htmlFor="batalhas-oponente">Procurar treinador</label>
        <div className="batalhas-desafiar-linha">
          <input
            id="batalhas-oponente"
            list="batalhas-sugestoes"
            placeholder="Login do treinador"
            maxLength={20}
            autoComplete="off"
            value={oponente}
            onChange={(e) => setOponente(e.target.value)}
          />
          <datalist id="batalhas-sugestoes">
            {sugestoes.map((nome) => <option key={nome} value={nome} />)}
          </datalist>
          <button type="submit" className="jogo-botao" disabled={enviando || !temTime || !oponente.trim()}>
            Desafiar
          </button>
        </div>
        {/* [DRY] O "3" estava escrito à mão, repetindo TAMANHO_TIME de @/shared. Código original:
          {!temTime && <p className="batalhas-dica">Monte um time com 3 Pokémon para poder desafiar.</p>}
        */}
        {!temTime && <p className="batalhas-dica">{`Monte um time com ${TAMANHO_TIME} Pokémon para poder desafiar.`}</p>}
      </form>

      {erro && <p className="jogo-erro" role="alert">{erro}</p>}
      {aviso && <p className="jogo-aviso" role="status">{aviso}</p>}

      <section className="batalhas-secao" aria-labelledby="batalhas-ativos-titulo">
        <h2 id="batalhas-ativos-titulo">
          {`Treinadores ativos nas últimas 24h (${ativos.length})`}
        </h2>
        {ativos.length === 0 ? (
          <p className="batalhas-dica">
            {vm.filtrando
              ? `Nenhum treinador ativo com "${oponente.trim()}". Você ainda pode desafiar pelo login exato no campo acima.`
              : 'Ninguém com time completo entrou no jogo nas últimas 24h.'}
          </p>
        ) : (
          <ul className="batalhas-ativos">
            {ativos.map((treinador) => {
              const { bloqueio } = treinador;
              return (
                <li key={treinador.login} className="batalhas-ativo">
                  <div className="batalhas-ativo-info">
                    <strong>{treinador.login}</strong>
                    <span>{`Visto ${tempoDesde(treinador.ultimoAcessoEm)} · nível médio ${treinador.nivelMedio}`}</span>
                  </div>
                  <ul className="batalhas-ativo-time" aria-label={`Time de ${treinador.login}`}>
                    {treinador.time.map((pokemon, i) => (
                      // Posição na chave: o time pode ter duas vezes a mesma espécie
                      <li key={`${i}-${pokemon.especieId}`} title={`${formatarNome(pokemon.nome)} · Nv. ${pokemon.nivel}${pokemon.shiny ? ' · shiny' : ''}`}>
                        <img src={urlArtwork(pokemon.especieId, pokemon.shiny)} alt={formatarNome(pokemon.nome)} loading="lazy" />
                      </li>
                    ))}
                  </ul>
                  {bloqueio ? (
                    <span className="batalhas-ativo-status">{bloqueio}</span>
                  ) : (
                    <button
                      type="button"
                      className="jogo-botao"
                      disabled={enviando || !temTime}
                      onClick={() => desafiar(treinador.login)}
                    >
                      Desafiar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {secao('Sua vez', minhaVez, (b) => (
        <li key={b.id} className="batalhas-item batalhas-item--vez">
          <div>
            <strong>{`vs ${b.oponente}`}</strong>
            <span>{`Turno ${b.turno} · faltam ${tempoRestante(b.prazoEm)} para jogar`}</span>
          </div>
          {botaoAbrir(b, 'Jogar')}
        </li>
      ))}

      {secao('Desafios recebidos', recebidos, (b) => (
        <li key={b.id} className="batalhas-item">
          <div>
            <strong>{`${b.oponente} desafiou você`}</strong>
            <span>{`Expira em ${tempoRestante(b.expiraEm)}`}</span>
          </div>
          <div className="batalhas-botoes">
            <button type="button" className="jogo-botao" disabled={enviando || !temTime} onClick={() => responder(b, true)}>
              Aceitar
            </button>
            <button type="button" className="jogo-botao jogo-botao--claro" disabled={enviando} onClick={() => responder(b, false)}>
              Recusar
            </button>
          </div>
        </li>
      ))}

      {secao('Esperando o oponente', esperando, (b) => (
        <li key={b.id} className="batalhas-item">
          <div>
            <strong>{`vs ${b.oponente}`}</strong>
            <span>{`Turno ${b.turno} · ${b.oponente} tem ${tempoRestante(b.prazoEm)} para jogar`}</span>
          </div>
          {botaoAbrir(b)}
        </li>
      ))}

      {secao('Desafios enviados', enviados, (b) => (
        <li key={b.id} className="batalhas-item">
          <div>
            <strong>{`Você desafiou ${b.oponente}`}</strong>
            <span>{`Esperando resposta · expira em ${tempoRestante(b.expiraEm)}`}</span>
          </div>
        </li>
      ))}

      {secao('Encerradas', encerradas, (b) => (
        <li key={b.id} className="batalhas-item" data-resultado={b.status === 'finalizada' ? (b.venci ? 'vitoria' : 'derrota') : 'nenhum'}>
          <div>
            <strong>{`vs ${b.oponente}`}</strong>
            <span>{resumoEncerrada(b)}</span>
          </div>
          {b.status === 'finalizada' && botaoAbrir(b, 'Ver')}
        </li>
      ))}

      {vm.semBatalhas && <p className="jogo-texto">Nenhuma batalha ainda. Desafie alguém!</p>}
    </section>
  );
}

Batalhas.propTypes = {
  onAbrir: PropTypes.func.isRequired,
};

export default Batalhas;
