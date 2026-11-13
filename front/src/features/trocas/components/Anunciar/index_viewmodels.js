import { useEffect, useState } from 'react';
import { carregar, formatarNome, useAcao } from '@/shared';
import * as api from '../../services/index_services';
import { useSessao } from '@/features/auth';
import { PRECO_MAXIMO_ANUNCIO } from '../../constants/index_constants';

/* [MVVM] Novo. ViewModel do componente Anunciar: escolher o Pokémon, validar o preço, anunciar e
 * cancelar anúncios.
 * [SOLID-I] Não recebe mais `usuario` e `onAtualizarUsuario` por props (Trocas só repassava).
 * [KISS] podeAnunciar já considera `enviando`, então o botão usa uma condição só.
 * [DRY] PRECO_MAXIMO_ANUNCIO vem de ../../constants.
 */

export { PRECO_MAXIMO_ANUNCIO };

/** Anunciar um Pokémon (venda e/ou propostas) e cancelar os anúncios ativos */
export function useAnunciarViewModel() {
  const { usuario, recarregarUsuario } = useSessao();
  const [escolhidoId, setEscolhidoId] = useState(null);
  const [vender, setVender] = useState(true);
  const [preco, setPreco] = useState('');
  const [aceitaPropostas, setAceitaPropostas] = useState(true);
  const [meus, setMeus] = useState(null);
  // Muda para buscar "Meus anúncios" de novo
  const [versao, setVersao] = useState(0);

  /* [DRY] Os estados enviando/erro/aviso e a função executar eram iguais aos de Propostas.jsx
   * e Mercado.jsx. Agora vêm do hook useAcao; só o "recarregar a lista no fim" é deste componente.
   * O useEffect usava o mesmo bloco "let ativo = true ... return () => { ativo = false }" das
   * outras telas, agora centralizado em carregar().
   *
   * Código original:
   *
   * const [enviando, setEnviando] = useState(false);
   * const [erro, setErro] = useState(null);
   * const [aviso, setAviso] = useState(null);
   *
   * useEffect(() => {
   *   let ativo = true;
   *   api.listarMeusAnuncios().then((lista) => {
   *     if (ativo) setMeus(lista);
   *   }, (e) => {
   *     if (ativo) setErro(e.message);
   *   });
   *   return () => {
   *     ativo = false;
   *   };
   * }, [versao]);
   *
   * const executar = async (acao) => {
   *   setEnviando(true);
   *   setErro(null);
   *   setAviso(null);
   *   try {
   *     await acao();
   *   } catch (e) {
   *     setErro(e.message);
   *   } finally {
   *     setEnviando(false);
   *     setVersao((v) => v + 1);
   *   }
   * };
   */
  const {
    enviando, erro, setErro, aviso, setAviso, executar,
  } = useAcao(() => setVersao((v) => v + 1));

  useEffect(() => carregar(api.listarMeusAnuncios(), setMeus, (e) => setErro(e.message)), [versao, setErro]);

  // Fora do time de batalha e ainda não anunciados
  const disponiveis = usuario.pokemons.filter((p) => !p.posicaoTime && !p.anunciado);
  const escolhido = disponiveis.find((p) => p.id === escolhidoId) ?? null;
  const valor = Number(preco);
  const precoValido = Number.isInteger(valor) && valor >= 1 && valor <= PRECO_MAXIMO_ANUNCIO;
  const podeAnunciar = Boolean(escolhido) && (vender || aceitaPropostas) && (!vender || precoValido);

  const anunciar = () => executar(async () => {
    await api.criarAnuncio({ pokemonId: escolhido.id, preco: vender ? valor : null, aceitaPropostas });
    setAviso(`${formatarNome(escolhido.nome)} foi anunciado! Ele já aparece no mercado para outros treinadores.`);
    setEscolhidoId(null);
    setPreco('');
    await recarregarUsuario();
  });

  const cancelar = (anuncio) => executar(async () => {
    await api.cancelarAnuncio(anuncio.id);
    setAviso(`O anúncio de ${formatarNome(anuncio.pokemon.nome)} foi cancelado.`);
    await recarregarUsuario();
  });

  return {
    disponiveis,
    escolhidoId,
    escolher: setEscolhidoId,
    escolhido,
    vender,
    setVender,
    preco,
    setPreco,
    aceitaPropostas,
    setAceitaPropostas,
    podeAnunciar: podeAnunciar && !enviando,
    meus,
    enviando,
    erro,
    aviso,
    anunciar,
    cancelar,
  };
}
