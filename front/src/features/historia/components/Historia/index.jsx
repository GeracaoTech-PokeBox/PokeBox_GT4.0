import PropTypes from 'prop-types';
import { plural, formatarNome, urlArtwork, urlSprite } from '@/shared';
import BatalhaSelvagem from '../BatalhaSelvagem';
import { dificuldadeCaptura } from '../../models/index_models';
import { formatarForca } from '../../utils/index_utils';
import { TAMANHO_TIME, useHistoriaViewModel } from './index_viewmodels';
import './Historia.css';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js; a batalha
 * contra o selvagem virou o componente ../BatalhaSelvagem, com o seu próprio ViewModel.
 * [SOLID-D] Não recebe mais `usuario` e onAtualizarUsuario. onIrPara continua por props: é navegação.
 * [MVVM] Ficaram aqui formatarMilhar e posicaoNaTrilha (posição no grid), que são
 *   só apresentação. formatarForca foi para ../../utils (BatalhaSelvagem também usa).
 */

const formatarMilhar = (numero) => numero.toLocaleString('pt-BR');

// Posição de cada ponto na trilha em "S": 5 por linha, a segunda linha volta da direita para a esquerda
function posicaoNaTrilha(ponto, porLinha = 5) {
  const linha = Math.floor((ponto - 1) / porLinha);
  const coluna = (ponto - 1) % porLinha;
  return { gridRow: linha + 1, gridColumn: linha % 2 === 0 ? coluna + 1 : porLinha - coluna };
}

function Pokebola({ balancando = false }) {
  return <span className="historia-pokebola" aria-hidden="true" data-balancando={balancando} />;
}

Pokebola.propTypes = { balancando: PropTypes.bool };

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

function Historia({ onIrPara }) {
  const vm = useHistoriaViewModel();
  const {
    historia, selecionado, pontoSelecionado, trilha, temTime, pokebolas, enviando, capturando, mensagemCaptura,
  } = vm;

  if (!vm.carregado) {
    return vm.erro ? <p className="jogo-erro" role="alert">{vm.erro}</p> : <p aria-busy="true">Carregando história...</p>;
  }

  const { pontosPorTrilha, custoRefazer, tentativasCaptura } = historia;

  // Bloco de captura: aparece no fim da batalha vencida e no painel de um ponto vencido
  const blocoCaptura = selecionado && (selecionado.situacao === 'vencido' || mensagemCaptura) && (
    <div className="historia-captura" aria-live="polite">
      <Pokebola balancando={capturando} />
      <div className="historia-captura-texto">
        {mensagemCaptura && (
          <p className="historia-captura-resultado" data-sucesso={mensagemCaptura.sucesso}>{mensagemCaptura.texto}</p>
        )}
        {selecionado.situacao === 'vencido' && (
          <>
            {selecionado.chanceCaptura != null && (
              <div className="historia-taxa" data-dificuldade={dificuldadeCaptura(selecionado.chanceCaptura).nivel}>
                <span className="historia-taxa-rotulo">{`Taxa de captura de ${formatarNome(selecionado.nome)}`}</span>
                <span className="historia-taxa-valor">
                  {`${Math.round(selecionado.chanceCaptura * 100)}%`}
                  <small>{` por Pokébola · ${dificuldadeCaptura(selecionado.chanceCaptura).texto}`}</small>
                </span>
                <span
                  className="historia-taxa-barra"
                  role="meter"
                  aria-label="Taxa de captura"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(selecionado.chanceCaptura * 100)}
                >
                  <span style={{ width: `${selecionado.chanceCaptura * 100}%` }} />
                </span>
              </div>
            )}
            <p>
              {`Tentativas restantes: ${selecionado.tentativasRestantes} de ${tentativasCaptura}`}
              {/* [DRY] Retirado daqui: a escolha "Pokébola"/"Pokébolas" feita na mão repetia plural()
                de @/shared. Código original:
                {` · Você tem ${pokebolas} Pokébola${pokebolas === 1 ? '' : 's'}.`}
              */}
              {` · Você tem ${plural(pokebolas, 'Pokébola', 'Pokébolas')}.`}
            </p>
            <div className="historia-captura-botoes">
              <button type="button" className="jogo-botao" disabled={capturando || pokebolas === 0} onClick={vm.capturar}>
                {capturando ? 'Balançando...' : `Jogar Pokébola${selecionado.chanceCaptura != null ? ` (${Math.round(selecionado.chanceCaptura * 100)}%)` : ''}`}
              </button>
              {pokebolas === 0 && (
                <button type="button" className="jogo-botao jogo-botao--azul" onClick={() => onIrPara('loja')}>
                  Comprar Pokébolas
                </button>
              )}
              {!vm.confirmarIgnorar && (
                <button
                  type="button"
                  className="jogo-botao jogo-botao--claro"
                  disabled={capturando || enviando}
                  onClick={() => vm.setConfirmarIgnorar(true)}
                >
                  Ignorar Pokémon
                </button>
              )}
            </div>
            {vm.confirmarIgnorar && (
              <div className="historia-ignorar">
                <span>{`${formatarNome(selecionado.nome)} vai embora e não poderá mais ser capturado. Para batalhar de novo neste ponto, refaça por ${custoRefazer} Pokécoins.`}</span>
                <div className="historia-captura-botoes">
                  <button type="button" className="jogo-botao" disabled={enviando} onClick={vm.ignorar}>
                    Confirmar
                  </button>
                  <button type="button" className="jogo-botao jogo-botao--claro" onClick={() => vm.setConfirmarIgnorar(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (vm.batalha) {
    return (
      <section className="historia">
        <h1 className="jogo-titulo">História</h1>
        {vm.erro && <p className="jogo-erro" role="alert">{vm.erro}</p>}
        <BatalhaSelvagem
          encontro={selecionado}
          batalha={vm.batalha}
          enviando={enviando}
          onJogar={vm.jogar}
          onVoltar={vm.voltarATrilha}
          captura={blocoCaptura}
        />
      </section>
    );
  }

  // Painel do ponto selecionado
  let painel = null;
  if (pontoSelecionado) {
    const forca = vm.forcaDoPonto(trilha, pontoSelecionado);
    const cabecalho = `Ponto ${pontoSelecionado} · Força ${formatarForca(forca)}`;
    // Ponto já vencido: as próximas batalhas são revanches, com XP reduzido
    const revanche = Boolean(selecionado?.pontoVencido);
    const recompensa = (
      <p className="historia-painel-recompensa" data-revanche={revanche}>
        {`${revanche ? 'Revanche' : 'Vitória'}: +${formatarMilhar(vm.xpDoPonto(forca, revanche))} XP para cada Pokémon do time · +${historia.recompensa.pokecoins} Pokécoins`}
        {revanche && ` (metade do XP da primeira vitória, que foi de ${formatarMilhar(vm.xpDoPonto(forca, false))})`}
      </p>
    );
    if (selecionado) {
      const { status } = selecionado;
      painel = (
        <div className="historia-painel jogo-painel" data-situacao={selecionado.situacao}>
          <img
            className="historia-painel-arte"
            src={urlArtwork(selecionado.especieId, selecionado.shiny)}
            alt={formatarNome(selecionado.nome)}
          />
          <div className="historia-painel-info">
            <p className="historia-painel-ponto">{cabecalho}</p>
            {recompensa}
            <h2>
              {formatarNome(selecionado.nome)}
              {selecionado.shiny && ' ★'}
            </h2>
            <p className="historia-painel-detalhe">
              {`Nv. ${selecionado.nivel} · ${status.hp} PS · Atq ${status.ataque} · Def ${status.defesa} · Vel ${status.velocidade}`}
            </p>
            {selecionado.situacao === 'encontrado' && (
              <>
                <p>
                  {selecionado.batalha
                    ? 'Você deixou uma batalha pela metade aqui.'
                    : `Um ${formatarNome(selecionado.nome)} selvagem apareceu!`}
                </p>
                {!temTime && (
                  <p className="jogo-aviso">
                    {`Monte um time com ${TAMANHO_TIME} Pokémon para batalhar. `}
                    <button type="button" className="historia-link" onClick={() => onIrPara('time')}>Ir para o time</button>
                  </p>
                )}
                <button
                  type="button"
                  className="jogo-botao"
                  disabled={(!temTime && !selecionado.batalha) || enviando}
                  onClick={vm.batalhar}
                >
                  {selecionado.batalha ? 'Continuar batalha' : 'Batalhar'}
                </button>
              </>
            )}
            {selecionado.situacao === 'vencido' && <p>Derrotado! Tente capturá-lo antes que ele fuja.</p>}
            {selecionado.situacao === 'fugiu' && !mensagemCaptura && <p>{`${formatarNome(selecionado.nome)} fugiu.`}</p>}
            {selecionado.situacao === 'ignorado' && !mensagemCaptura && (
              <p>{`Você deixou ${formatarNome(selecionado.nome)} ir embora.`}</p>
            )}
            {selecionado.situacao === 'capturado' && !mensagemCaptura && (
              <p className="historia-painel-capturado">Capturado! Ele está na sua coleção.</p>
            )}
            {blocoCaptura}
            {selecionado.situacao === 'vencido' && (
              <p className="historia-refazer-dica">
                {`Para refazer este ponto contra um novo Pokémon, capture-o, ignore-o ou use as ${selecionado.tentativasRestantes} tentativas restantes.`}
              </p>
            )}
            {['capturado', 'fugiu', 'ignorado'].includes(selecionado.situacao) && (
              <div className="historia-refazer">
                <p>{`Refaça este ponto contra um novo Pokémon aleatório por ${custoRefazer} Pokécoins. A vitória dá os Pokécoins e metade do XP da primeira vez, e você pode tentar capturá-lo.`}</p>
                {!temTime && <p className="jogo-aviso">{`Monte um time com ${TAMANHO_TIME} Pokémon para batalhar.`}</p>}
                <button
                  type="button"
                  className="jogo-botao jogo-botao--azul"
                  disabled={!temTime || enviando || capturando || !vm.podePagarRefazer}
                  onClick={vm.refazer}
                >
                  {enviando ? 'Procurando...' : `Refazer · ${custoRefazer} Pokécoins`}
                </button>
              </div>
            )}
          </div>
        </div>
      );
    } else if (vm.pontoEhProximo(pontoSelecionado)) {
      painel = (
        <div className="historia-painel jogo-painel" data-situacao="inexplorado">
          <span className="historia-painel-misterio" aria-hidden="true">?</span>
          <div className="historia-painel-info">
            <p className="historia-painel-ponto">{cabecalho}</p>
            {recompensa}
            <h2>Mato alto</h2>
            <p>Alguma coisa está se mexendo por aqui... Explore para encontrar o Pokémon selvagem deste ponto.</p>
            <button type="button" className="jogo-botao" disabled={enviando} onClick={vm.explorar}>
              {enviando ? 'Explorando...' : 'Explorar'}
            </button>
          </div>
        </div>
      );
    } else {
      painel = (
        <div className="historia-painel jogo-painel" data-situacao="bloqueado">
          <span className="historia-painel-misterio" aria-hidden="true">?</span>
          <div className="historia-painel-info">
            <p className="historia-painel-ponto">{cabecalho}</p>
            {recompensa}
            <h2>Caminho bloqueado</h2>
            <p>Vença os pontos anteriores para chegar até aqui.</p>
          </div>
        </div>
      );
    }
  }

  return (
    <section className="historia">
      <h1 className="jogo-titulo">História</h1>
      <p className="jogo-texto">
        {`Siga as trilhas e encontre Pokémon selvagens. Cada ponto é mais forte que o anterior: a trilha 1 vai de 0,1x a 1,0x
        da força normal, a trilha 2 de 1,1x a 2,0x, e assim por diante. Vença com seu time de ${TAMANHO_TIME} para ganhar
        Pokécoins e XP, e tente capturar o Pokémon derrotado com uma Pokébola.`}
      </p>

      <div className="historia-resumo">
        <span className="historia-resumo-item">
          <Pokebola />
          {/* [DRY] Retirado daqui: mesma escolha singular/plural feita na mão; agora usa plural()
            de @/shared. Código original: {`${pokebolas} Pokébola${pokebolas === 1 ? '' : 's'}`} */}
          {plural(pokebolas, 'Pokébola', 'Pokébolas')}
        </span>
        <span className="historia-resumo-item">{`${historia.vencidos} de ${historia.trilhas * pontosPorTrilha} pontos vencidos`}</span>
        <span className="historia-resumo-item">{`${historia.capturados} capturados`}</span>
      </div>

      {vm.historiaCompleta && <p className="jogo-aviso">Você completou toda a história. Parabéns, treinador!</p>}

      <div className="historia-trilhas" role="tablist" aria-label="Trilhas">
        {Array.from({ length: historia.trilhas }, (_, i) => i + 1).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            className="historia-trilha-aba"
            aria-selected={trilha === t}
            disabled={!vm.trilhaLiberada(t)}
            onClick={() => vm.abrirTrilha(t)}
          >
            <strong>{`Trilha ${t}`}</strong>
            <span>{`${formatarForca(vm.forcaDoPonto(t, 1))} a ${formatarForca(vm.forcaDoPonto(t, pontosPorTrilha))}`}</span>
          </button>
        ))}
      </div>

      <ol className="historia-mapa" aria-label={`Pontos da trilha ${trilha}`}>
        {Array.from({ length: pontosPorTrilha }, (_, i) => i + 1).map((p) => {
          const encontro = vm.encontroNoPonto(p);
          const situacao = vm.situacaoDoPonto(p);
          const rotulo = encontro ? `${formatarNome(encontro.nome)} (${situacao})` : situacao;
          return (
            <li key={p} style={posicaoNaTrilha(p)}>
              <button
                type="button"
                className="historia-ponto"
                data-situacao={situacao}
                aria-pressed={pontoSelecionado === p}
                aria-label={`Ponto ${p}: ${rotulo}`}
                onClick={() => vm.selecionarPonto(p)}
              >
                {encontro ? <img src={urlSprite(encontro.especieId, encontro.shiny)} alt="" /> : <span aria-hidden="true">{situacao === 'inexplorado' ? '?' : p}</span>}
              </button>
              <span className="historia-ponto-forca">{formatarForca(vm.forcaDoPonto(trilha, p))}</span>
            </li>
          );
        })}
      </ol>

      {vm.erro && <p className="jogo-erro" role="alert">{vm.erro}</p>}
      {painel}
    </section>
  );
}

Historia.propTypes = {
  onIrPara: PropTypes.func.isRequired,
};

export default Historia;
