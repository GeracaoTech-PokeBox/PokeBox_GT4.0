import { useEffect, useState } from 'react';
import {
  carregar, formatarNome, formatarNumero, useAcao,
} from '@/shared';
import { useSessao } from '@/features/auth';
import * as api from '../../services/index_services';

/* [MVVM] ViewModel do AnunciosDaEspecie: anúncios, compra e a proposta aberta. Era o
 * useAnunciosDaEspecie, exportado junto com o useListaEspecies em viewmodels/useMercadoViewModel.
 * [SOLID-I] O usuário descia App → Trocas → Mercado → AnunciosDaEspecie → PropostaForm,
 *   passando por componentes que não o usavam. Agora quem precisa lê com useSessao().
 * [KISS] Abrir/fechar a proposta e o aviso de "proposta enviada" viraram funções com nome
 *   (abrirProposta, fecharProposta, propostaEnviada) em vez de arrow functions dentro do JSX.
 */

/** Segunda tela do mercado: anúncios de uma espécie, compra e proposta de troca */
export function useAnunciosDaEspecie(especie) {
  const { usuario, recarregarUsuario } = useSessao();
  const [ordem, setOrdem] = useState('preco');
  const [anuncios, setAnuncios] = useState(null);
  // Anúncio para o qual o treinador está montando uma proposta (null = nenhum)
  const [propondo, setPropondo] = useState(null);
  // Muda para buscar a lista de novo depois de uma compra
  const [versao, setVersao] = useState(0);

  /* [DRY] erro/aviso/enviando e o try/catch/finally de handleComprar eram iguais ao
   * "executar" de Anunciar.jsx e Propostas.jsx (agora no hook useAcao). O useEffect repetia
   * o bloco "let ativo = true ..." (agora em carregar()).
   *
   * Código original:
   *
   * const [erro, setErro] = useState(null);
   * const [aviso, setAviso] = useState(null);
   * const [enviando, setEnviando] = useState(false);
   *
   * useEffect(() => {
   *   let ativo = true;
   *   api.listarAnunciosDaEspecie(especie.especieId, ordem).then((lista) => {
   *     if (ativo) setAnuncios(lista);
   *   }, (e) => {
   *     if (ativo) setErro(e.message);
   *   });
   *   return () => {
   *     ativo = false;
   *   };
   * }, [especie.especieId, ordem, versao]);
   *
   * const handleComprar = async (anuncio) => {
   *   setEnviando(true);
   *   setErro(null);
   *   setAviso(null);
   *   try {
   *     const card = await api.comprarAnuncio(anuncio.id);
   *     setAviso(`${formatarNome(card.nome)} ${formatarNumero(card.mintNumero)} agora é seu! Ele está em Meus Pokémon.`);
   *     await onAtualizarUsuario();
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

  useEffect(
    () => carregar(api.listarAnunciosDaEspecie(especie.especieId, ordem), setAnuncios, (e) => setErro(e.message)),
    [especie.especieId, ordem, versao, setErro],
  );

  const comprar = (anuncio) => executar(async () => {
    const card = await api.comprarAnuncio(anuncio.id);
    setAviso(`${formatarNome(card.nome)} ${formatarNumero(card.mintNumero)} agora é seu! Ele está em Meus Pokémon.`);
    await recarregarUsuario();
  });

  const abrirProposta = (anuncio) => {
    setAviso(null);
    setPropondo(anuncio);
  };

  const propostaEnviada = () => {
    setAviso(`Proposta enviada para ${propondo.vendedor}! Acompanhe na aba Propostas.`);
    setPropondo(null);
  };

  return {
    ordem,
    setOrdem,
    anuncios,
    saldo: usuario.pokecoins,
    enviando,
    erro,
    aviso,
    comprar,
    propondo,
    abrirProposta,
    fecharProposta: () => setPropondo(null),
    propostaEnviada,
  };
}
