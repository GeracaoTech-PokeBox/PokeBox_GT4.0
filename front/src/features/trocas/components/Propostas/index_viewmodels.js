import { useEffect, useState } from 'react';
import { carregar, formatarNome, useAcao } from '@/shared';
import * as api from '../../services/index_services';
import { useSessao } from '@/features/auth';

/* [MVVM] Novo. ViewModel do componente Propostas: lista, contagem de pendentes, aceitar, recusar
 * e cancelar.
 * [SOLID-D] As chamadas api.aceitarProposta/recusarProposta/cancelarProposta estavam escritas
 *   dentro dos onClick do JSX; viraram aceitar(), recusar() e cancelar().
 * [SOLID-I] onAtualizarUsuario não vem mais por props (Trocas só repassava): vem de useSessao().
 */

const pendentes = (lista) => lista.filter((p) => p.status === 'pendente').length;

/** Propostas recebidas e enviadas, com aceitar, recusar e cancelar. onMudou avisa a tela de cima. */
export function usePropostasViewModel(onMudou) {
  const { recarregarUsuario } = useSessao();
  const [lado, setLado] = useState('recebidas');
  const [dados, setDados] = useState(null);
  const [versao, setVersao] = useState(0);

  /* [DRY] Os estados erro/aviso/enviando e a função executar repetiam os de Anunciar.jsx e
   * Mercado.jsx (agora no hook useAcao). O useEffect repetia o bloco "let ativo = true ..."
   * (agora em carregar()). Aqui só sobra o que é próprio desta tela: recarregar a lista e
   * avisar a tela de cima (onMudou) no fim, e mostrar a mensagem de sucesso.
   *
   * Código original:
   *
   * const [erro, setErro] = useState(null);
   * const [aviso, setAviso] = useState(null);
   * const [enviando, setEnviando] = useState(false);
   *
   * useEffect(() => {
   *   let ativo = true;
   *   api.listarPropostas().then((resposta) => {
   *     if (ativo) setDados(resposta);
   *   }, (e) => {
   *     if (ativo) setErro(e.message);
   *   });
   *   return () => {
   *     ativo = false;
   *   };
   * }, [versao]);
   *
   * const executar = async (acao, mensagem) => {
   *   setEnviando(true);
   *   setErro(null);
   *   setAviso(null);
   *   try {
   *     await acao();
   *     setAviso(mensagem);
   *   } catch (e) {
   *     setErro(e.message);
   *   } finally {
   *     setEnviando(false);
   *     setVersao((v) => v + 1);
   *     onMudou();
   *   }
   * };
   */
  const {
    enviando, erro, setErro, aviso, setAviso, executar: executarAcao,
  } = useAcao(() => {
    setVersao((v) => v + 1);
    onMudou();
  });

  useEffect(() => carregar(api.listarPropostas(), setDados, (e) => setErro(e.message)), [versao, setErro]);

  const executar = (acao, mensagem) => executarAcao(async () => {
    await acao();
    setAviso(mensagem);
  });

  return {
    lado,
    setLado,
    carregado: dados !== null,
    // Quantas esperam resposta em cada lado (o número na subaba)
    pendentesEm: (valor) => (dados ? pendentes(dados[valor]) : 0),
    lista: dados?.[lado] ?? [],
    enviando,
    erro,
    aviso,
    aceitar: (p) => executar(async () => {
      await api.aceitarProposta(p.id);
      await recarregarUsuario();
    }, `Troca feita! ${formatarNome(p.alvo.nome)} foi para ${p.proponente} e a oferta já está com você.`),
    recusar: (p) => executar(() => api.recusarProposta(p.id), `Proposta de ${p.proponente} recusada.`),
    cancelar: (p) => executar(() => api.cancelarProposta(p.id), 'Proposta cancelada.'),
  };
}
