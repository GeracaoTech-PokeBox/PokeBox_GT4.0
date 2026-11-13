import { useEffect, useState } from 'react';
import { plural, formatarNome, formatarNumero, TAMANHO_TIME, temTimeCompleto } from '@/shared';
import * as api from '../../services/index_services';
import { useSessao } from '@/features/auth';
import { forcaDoPonto, xpDoPonto } from '../../models/index_models';

/* [MVVM] Novo. ViewModel da História (./index.jsx), a maior tela do jogo. Vieram da tela os
 * 10 useState, a carga inicial, explorar, batalhar, refazer, capturar, ignorar e a seleção de
 * trilha e ponto.
 *   - useBatalhaSelvagem foi para ../BatalhaSelvagem/index_viewmodels.js, junto do componente
 *   - dificuldadeCaptura foi para ../../models (é regra, não estado de tela)
 * [SOLID-S] A View não calcula mais a situação de um ponto, a força nem o XP: chama
 *   situacaoDoPonto(), forcaDoPonto() e xpDoPonto().
 * [DRY] forcaDoPonto e xpDoPonto ficam em ../../models; TAMANHO_TIME em @/shared.
 * [SOLID-D] usuario e onAtualizarUsuario não chegam mais por props: vêm de useSessao().
 */

export { TAMANHO_TIME };
// A Pokébola balança um pouco antes de mostrar o resultado da captura
const SUSPENSE_CAPTURA_MS = 900;

const esperar = (ms) => new Promise((resolver) => { setTimeout(resolver, ms); });

const mesmoPonto = (a, b) => a.trilha === b.trilha && a.ponto === b.ponto;

/** Modo história: trilhas, pontos, batalhas contra selvagens e captura */
export function useHistoriaViewModel() {
  const { usuario, recarregarUsuario } = useSessao();
  const [historia, setHistoria] = useState(null);
  const [trilha, setTrilha] = useState(1);
  const [pontoSelecionado, setPontoSelecionado] = useState(null);
  // Batalha mostrada na tela (a em andamento ou a que acabou de terminar)
  const [batalha, setBatalha] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [mensagemCaptura, setMensagemCaptura] = useState(null);
  // Ignorar não tem volta, então pede uma confirmação antes
  const [confirmarIgnorar, setConfirmarIgnorar] = useState(false);
  const [erro, setErro] = useState(null);

  // Atualiza o encontro do ponto sem buscar a história inteira (cada ponto mostra só o último encontro)
  const guardarEncontro = (encontro) => setHistoria((atual) => ({
    ...atual,
    encontros: atual.encontros.some((e) => mesmoPonto(e, encontro))
      ? atual.encontros.map((e) => (mesmoPonto(e, encontro) ? encontro : e))
      : [...atual.encontros, encontro],
  }));

  const recarregar = () => api.buscarHistoria().then(setHistoria);

  useEffect(() => {
    let ativo = true;
    api.buscarHistoria().then(
      (dados) => {
        if (!ativo) return;
        setHistoria(dados);
        // Abre numa batalha que ficou pela metade (inclusive revanche) ou no ponto em que o treinador parou
        const emBatalha = dados.encontros.find((e) => e.batalha);
        const aberto = dados.encontros.find((e) => e.situacao === 'encontrado' && !e.revanche);
        const atual = emBatalha ?? aberto ?? dados.proximo ?? dados.encontros.at(-1);
        if (atual) {
          setTrilha(atual.trilha);
          setPontoSelecionado(atual.ponto);
        }
        if (emBatalha) setBatalha(emBatalha.batalha);
      },
      (e) => {
        if (ativo) setErro(e.message);
      },
    );
    return () => {
      ativo = false;
    };
  }, []);

  const proximo = historia?.proximo;
  const pontosPorTrilha = historia?.pontosPorTrilha;
  const encontroDe = (t, p) => historia?.encontros.find((e) => e.trilha === t && e.ponto === p) ?? null;
  const ehProximo = (t, p) => proximo?.trilha === t && proximo?.ponto === p;
  const selecionado = pontoSelecionado ? encontroDe(trilha, pontoSelecionado) : null;

  const executar = async (acao) => {
    setEnviando(true);
    setErro(null);
    try {
      await acao();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const explorar = () => executar(async () => {
    const encontro = await api.explorarHistoria();
    guardarEncontro(encontro);
    setMensagemCaptura(null);
  });

  const aplicarBatalha = async ({ encontro, batalha: resultado }) => {
    guardarEncontro(encontro);
    setBatalha(resultado);
    if (resultado.fim) {
      setMensagemCaptura(null);
      // Vitória: o próximo ponto foi liberado e o saldo/XP mudaram
      await Promise.all([recarregar(), recarregarUsuario()]);
    }
  };

  // Primeira batalha do ponto (ou continuar uma que ficou pela metade)
  const batalhar = () => executar(async () => {
    await aplicarBatalha(await api.batalharNaHistoria(selecionado.id));
    setMensagemCaptura(null);
  });

  // Revanche contra um novo Pokémon aleatório: cobra Pokécoins, então atualiza o saldo no topo
  const refazer = () => executar(async () => {
    await aplicarBatalha(await api.refazerPonto(trilha, pontoSelecionado));
    setMensagemCaptura(null);
    await recarregarUsuario();
  });

  const jogar = (jogada) => executar(async () => {
    await aplicarBatalha(await api.jogarNaHistoria(selecionado.id, jogada));
  });

  const capturar = async () => {
    setCapturando(true);
    setErro(null);
    setMensagemCaptura(null);
    try {
      const [resultado] = await Promise.all([api.capturar(selecionado.id), esperar(SUSPENSE_CAPTURA_MS)]);
      guardarEncontro(resultado.encontro);
      const nome = formatarNome(selecionado.nome);
      const { tentativasRestantes } = resultado.encontro;
      // [DRY] A escolha "tentativa"/"tentativas" era feita na mão; agora usa plural() de @/shared.
      let texto = `${nome} escapou da Pokébola! Restam ${plural(tentativasRestantes, 'tentativa', 'tentativas')}.`;
      if (resultado.capturou) {
        texto = `Gotcha! ${formatarNome(resultado.pokemon.nome)} ${formatarNumero(resultado.pokemon.mintNumero)} foi capturado e está na sua coleção!`;
      } else if (resultado.fugiu) {
        texto = `${nome} escapou e fugiu depois de ${historia.tentativasCaptura} tentativas! Agora você pode refazer este ponto contra um novo Pokémon.`;
      }
      setMensagemCaptura({ sucesso: resultado.capturou, texto });
      await Promise.all([recarregar(), recarregarUsuario()]);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCapturando(false);
    }
  };

  const ignorar = () => executar(async () => {
    const nome = formatarNome(selecionado.nome);
    guardarEncontro(await api.ignorarPokemon(selecionado.id));
    setConfirmarIgnorar(false);
    setMensagemCaptura({ sucesso: false, texto: `Você deixou ${nome} ir embora. Agora pode refazer este ponto contra um novo Pokémon.` });
  });

  const voltarATrilha = () => {
    setBatalha(null);
    // Depois de vencer um ponto novo, já deixa o próximo selecionado (mudando de trilha se for o caso)
    if (selecionado?.situacao !== 'encontrado' && proximo && !batalha?.estado.revanche) {
      setTrilha(proximo.trilha);
      setPontoSelecionado(proximo.ponto);
    }
    setMensagemCaptura(null);
  };

  const selecionarPonto = (p) => {
    setPontoSelecionado(p);
    setConfirmarIgnorar(false);
    setMensagemCaptura(null);
    setErro(null);
  };

  // Ao trocar de trilha, abre no próximo ponto a explorar (se for desta trilha) ou no primeiro
  const abrirTrilha = (t) => {
    setTrilha(t);
    selecionarPonto(ehProximo(t, proximo?.ponto) ? proximo.ponto : 1);
  };

  // Situação de um ponto da trilha aberta, para o mapa
  const situacaoDoPonto = (p) => {
    const encontro = encontroDe(trilha, p);
    if (encontro) return encontro.situacao;
    return ehProximo(trilha, p) ? 'inexplorado' : 'bloqueado';
  };

  return {
    carregado: historia !== null,
    historia,
    erro,
    // [DRY] Retirado daqui: a conta "pokemons.filter((p) => p.posicaoTime).length === TAMANHO_TIME"
    // era uma cópia da de useBatalhasViewModel. Agora as duas usam temTimeCompleto() de @/shared.
    temTime: temTimeCompleto(usuario.pokemons),
    pokebolas: usuario.pokebolas ?? 0,
    podePagarRefazer: historia !== null && usuario.pokecoins >= historia.custoRefazer,
    historiaCompleta: historia !== null && historia.vencidos === historia.trilhas * pontosPorTrilha,
    trilha,
    trilhaLiberada: (t) => Boolean(historia?.encontros.some((e) => e.trilha === t)) || proximo?.trilha === t,
    abrirTrilha,
    pontoSelecionado,
    selecionado,
    selecionarPonto,
    pontoEhProximo: (p) => ehProximo(trilha, p),
    encontroNoPonto: (p) => encontroDe(trilha, p),
    situacaoDoPonto,
    forcaDoPonto: (t, p) => forcaDoPonto(t, p, pontosPorTrilha),
    xpDoPonto: (forca, revanche) => xpDoPonto(forca, historia.recompensa, revanche),
    // Batalha só aparece com um ponto selecionado
    batalha: selecionado ? batalha : null,
    enviando,
    capturando,
    mensagemCaptura,
    confirmarIgnorar,
    setConfirmarIgnorar,
    explorar,
    batalhar,
    refazer,
    jogar,
    capturar,
    ignorar,
    voltarATrilha,
  };
}
