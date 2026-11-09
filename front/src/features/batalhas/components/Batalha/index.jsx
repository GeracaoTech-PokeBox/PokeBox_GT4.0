import PropTypes from 'prop-types';
import { tempoRestante } from '@/shared';
import { MOTIVOS } from '../../models/index_models';
import AcoesBatalha from '../AcoesBatalha';
import { LadoCampo } from '../CampoBatalha';
import RecompensaBatalha from '../RecompensaBatalha';
import { useBatalhaViewModel } from './index_viewmodels';
import './Batalha.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [SOLID-D] Não recebe mais onAtualizarUsuario. Continua recebendo batalhaId e onVoltar, que são
 *   navegação (quem controla a tela atual é o App).
 */

// [DRY] Retirado daqui: MOTIVOS era uma cópia idêntica da que existe em pages/Batalhas.
// Agora as duas telas importam de ../../models.
// const MOTIVOS = { nocaute: 'por nocaute', wo: 'por W.O.', desistencia: 'por desistência' };

function Batalha({ batalhaId, onVoltar }) {
  const vm = useBatalhaViewModel(batalhaId);
  const {
    batalha, eu, oponente, recompensas, reservas, enviando,
  } = vm;

  if (!vm.carregado) {
    return vm.erro ? <p className="jogo-erro" role="alert">{vm.erro}</p> : <p aria-busy="true">Carregando batalha...</p>;
  }

  const voltar = (
    <button type="button" className="jogo-botao jogo-botao--claro" onClick={() => onVoltar()}>
      ← Batalhas
    </button>
  );

  if (!vm.comecou) {
    return (
      <section>
        {voltar}
        <p className="jogo-texto">Essa batalha ainda não começou.</p>
      </section>
    );
  }

  return (
    <section className="batalha">
      <div className="batalha-cabecalho">
        {voltar}
        <h1 className="jogo-titulo">{`vs ${batalha.oponente}`}</h1>
        {batalha.status === 'em_andamento' && (
          <p className="batalha-turno" role="status">
            {batalha.minhaVez
              ? `Turno ${batalha.turno} · Sua vez! Faltam ${tempoRestante(batalha.prazoEm)}.`
              : `Turno ${batalha.turno} · Vez de ${batalha.oponente} (${tempoRestante(batalha.prazoEm)} restantes). Você pode fechar a página.`}
          </p>
        )}
      </div>

      {batalha.status === 'finalizada' && (
        <div className="batalha-resultado" data-venci={batalha.venci} role="status">
          <strong>{`${batalha.venci ? 'Você venceu' : 'Você perdeu'} ${MOTIVOS[batalha.motivoFim]}!`}</strong>
          {/* [DRY] Retirado daqui: o texto "+X Pokécoins e +Y XP" e a lista de quem subiu de nível
            eram uma cópia do mesmo JSX do BatalhaSelvagem (./index.jsx). Agora os dois usam o
            componente RecompensaBatalha. */}
          <RecompensaBatalha recompensa={recompensas} />
        </div>
      )}

      <div className="batalha-campo">
        <LadoCampo lado={oponente} meu={false} />
        <LadoCampo lado={eu} meu />
      </div>

      {vm.erro && <p className="jogo-erro" role="alert">{vm.erro}</p>}

      {/* [DRY] Retirado daqui: o painel de ações (golpes, Atacar, Trocar Pokémon e a lista de
        reservas) era uma cópia do mesmo JSX do BatalhaSelvagem (./index.jsx). Agora os dois usam
        o componente AcoesBatalha. */}
      {batalha.minhaVez && (
        <AcoesBatalha
          pokemon={eu.pokemons[eu.ativo]}
          reservas={reservas}
          enviando={enviando}
          trocando={vm.trocando}
          onAlternarTroca={vm.alternarTroca}
          onAtacar={vm.atacar}
          onUsarGolpe={vm.usarGolpe}
          onTrocar={vm.trocar}
        />
      )}

      {batalha.status === 'em_andamento' && (
        <div className="batalha-desistir">
          {vm.confirmarDesistencia ? (
            <>
              <span>Desistir conta como derrota e não dá recompensa.</span>
              <button type="button" className="jogo-botao" disabled={enviando} onClick={vm.desistir}>
                Confirmar desistência
              </button>
              <button type="button" className="jogo-botao jogo-botao--claro" onClick={() => vm.setConfirmarDesistencia(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button type="button" className="batalha-link" onClick={() => vm.setConfirmarDesistencia(true)}>
              Desistir da batalha
            </button>
          )}
        </div>
      )}

      <section className="batalha-historico">
        <h2>Histórico</h2>
        {vm.historico.length === 0 ? (
          <p className="jogo-texto">Nenhuma jogada ainda.</p>
        ) : (
          <ol reversed>
            {vm.historico.map((acao) => (
              <li key={`${acao.turno}-${acao.criadaEm}`} data-automatica={acao.automatica}>
                <span className="batalha-historico-turno">{`Turno ${acao.turno}`}</span>
                {acao.frases.map((frase) => <span key={frase}>{frase}</span>)}
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

Batalha.propTypes = {
  batalhaId: PropTypes.number.isRequired,
  onVoltar: PropTypes.func.isRequired,
};

export default Batalha;
