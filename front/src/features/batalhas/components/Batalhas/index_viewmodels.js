import { useEffect, useState } from 'react';
import * as api from '../../services/index_services';
import { useSessao } from '@/features/auth';
import { TAMANHO_TIME, temTimeCompleto } from '@/shared';

// A View usa no texto "Monte um time com 3 Pokémon"
export { TAMANHO_TIME };

/* [MVVM] Novo. ViewModel da lista de batalhas (./index.jsx): listas, treinadores ativos,
 * sugestões enquanto digita, desafiar e responder. Tudo isso estava na tela.
 * [SOLID-S] temTime era calculado no App e passado por props; agora é calculado aqui, onde é usado.
 * [SOLID-D] temTime e onAtualizarUsuario não chegam mais por props: vêm de useSessao().
 * [KISS] bloqueioDesafio() é aplicado aqui e cada treinador já sai com o campo `bloqueio`.
 * [DRY] TAMANHO_TIME vem de @/shared.
 */

// De quanto em quanto tempo a lista se atualiza sozinha (o oponente pode jogar ou ficar offline a qualquer momento)
const ATUALIZAR_MS = 10 * 1000;

// Por que um treinador ativo não pode ser desafiado agora (null = pode)
function bloqueioDesafio(treinador) {
  if (treinador.emBatalha) return 'Em batalha com você';
  if (treinador.desafioEnviado) return 'Desafio enviado';
  if (treinador.desafioRecebido) return 'Desafiou você';
  return null;
}

// Busca as batalhas e os treinadores ativos juntos (as duas listas mudam com as mesmas ações)
const buscarTudo = () => Promise.all([api.listarBatalhas(), api.listarTreinadoresAtivos()]);

/** Lista de batalhas, treinadores ativos e os desafios. onAbrir leva para a tela de uma batalha. */
export function useBatalhasViewModel(onAbrir) {
  const { usuario, atualizarUsuario } = useSessao();
  const [batalhas, setBatalhas] = useState(null);
  const [ativos, setAtivos] = useState([]);
  const [erro, setErro] = useState(null);
  const [oponente, setOponente] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  // Recarrega depois de desafiar/responder
  const carregar = async () => {
    try {
      const [lista, treinadores] = await buscarTudo();
      setBatalhas(lista);
      setAtivos(treinadores);
    } catch (e) {
      setErro(e.message);
    }
  };

  useEffect(() => {
    let ativo = true;
    const buscar = () => buscarTudo().then(
      ([lista, treinadores]) => {
        if (!ativo) return;
        setBatalhas(lista);
        setAtivos(treinadores);
      },
      (e) => {
        if (ativo) setErro(e.message);
      },
    );
    buscar();
    const timer = setInterval(buscar, ATUALIZAR_MS);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, []);

  // Sugestões de treinadores enquanto digita (espera 300ms parado para não chamar a cada tecla)
  useEffect(() => {
    const busca = oponente.trim();
    if (!busca) return undefined;
    let ativo = true;
    const timer = setTimeout(() => {
      api.buscarTreinadores(busca).then((lista) => {
        if (ativo) setSugestoes(lista);
      }, () => {});
    }, 300);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [oponente]);

  const executar = async (acao, mensagem) => {
    setEnviando(true);
    setErro(null);
    setAviso(null);
    try {
      await acao();
      setAviso(mensagem);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  const desafiar = (nome) => executar(async () => {
    await api.desafiar(nome);
    setOponente('');
  }, `Desafio enviado para ${nome}! O convite fica aberto por 24h.`);

  // Desafia quem foi digitado no campo
  const desafiarDigitado = () => {
    const nome = oponente.trim();
    if (nome) desafiar(nome);
  };

  const responder = (batalha, aceitar) => executar(async () => {
    const resposta = await api.responderDesafio(batalha.id, aceitar);
    if (aceitar) onAbrir(resposta.id);
  }, aceitar ? null : 'Desafio recusado.');

  const abrir = (batalha) => {
    atualizarUsuario();
    onAbrir(batalha.id);
  };

  const lista = batalhas ?? [];
  // O texto digitado no campo também filtra a lista de treinadores ativos
  const termo = oponente.trim().toLowerCase();
  const ativosFiltrados = termo ? ativos.filter((t) => t.login.toLowerCase().includes(termo)) : ativos;

  return {
    carregado: batalhas !== null,
    erro,
    aviso,
    enviando,
    // [SOLID-S] Antes calculado no App e passado por props.
    // [DRY] A conta era uma cópia da de useHistoriaViewModel; agora as duas usam temTimeCompleto()
    // de @/shared. Código original:
    // temTime: usuario.pokemons.filter((p) => p.posicaoTime).length === TAMANHO_TIME,
    temTime: temTimeCompleto(usuario.pokemons),
    oponente,
    setOponente,
    filtrando: Boolean(termo),
    sugestoes,
    ativos: ativosFiltrados.map((treinador) => ({ ...treinador, bloqueio: bloqueioDesafio(treinador) })),
    semBatalhas: lista.length === 0,
    minhaVez: lista.filter((b) => b.minhaVez),
    esperando: lista.filter((b) => b.status === 'em_andamento' && !b.minhaVez),
    recebidos: lista.filter((b) => b.status === 'aguardando' && !b.souDesafiante),
    enviados: lista.filter((b) => b.status === 'aguardando' && b.souDesafiante),
    encerradas: lista.filter((b) => !['aguardando', 'em_andamento'].includes(b.status)),
    desafiar,
    desafiarDigitado,
    responder,
    abrir,
  };
}
