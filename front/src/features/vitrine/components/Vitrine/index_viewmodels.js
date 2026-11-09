import { useEffect, useState } from 'react';
import { carregar } from '@/shared';
import * as api from '../../services/index_services';
import { useSessao } from '@/features/auth';

/* [MVVM] Novo. ViewModel da Vitrine (./index.jsx): vitrine aberta, visitar outra, salvar.
 * [SOLID-S] Um hook por parte da tela, cada um na pasta do seu componente:
 *   useEditorVitrine em ../EditorVitrine, useAlbum em ../Album e useBuscaVitrines em ../OutrasVitrines.
 * [SOLID-D] A tela não chama mais api.* nem recebe `usuario` por props: usa este hook, que lê o
 *   usuário com useSessao().
 * [YAGNI] O carregar() com useCallback da tela original só era usado ao salvar; virou parte de salvar().
 */

/** Vitrine aberta (a minha ou a de outro treinador), edição e aviso de salvo */
export function useVitrineViewModel() {
  const { usuario } = useSessao();
  const [login, setLogin] = useState(usuario.login);
  const [vitrine, setVitrine] = useState(null);
  const [erro, setErro] = useState(null);
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => carregar(api.buscarVitrine(login), setVitrine, (e) => setErro(e.message)), [login]);

  const visitar = (alvo) => {
    setVitrine(null);
    setEditando(false);
    setAviso(null);
    setLogin(alvo);
  };

  const salvar = async (dados) => {
    await api.salvarVitrine(dados);
    setErro(null);
    try {
      setVitrine(await api.buscarVitrine(login));
    } catch (e) {
      setErro(e.message);
    }
    setEditando(false);
    setAviso('Vitrine salva! Agora outros treinadores podem ver suas mudanças.');
  };

  return {
    vitrine,
    erro,
    aviso,
    editando,
    souDono: login.toLowerCase() === usuario.login.toLowerCase(),
    meusPokemons: usuario.pokemons,
    visitar,
    voltarParaMinha: () => visitar(usuario.login),
    salvar,
    editar: () => setEditando(true),
    cancelarEdicao: () => setEditando(false),
  };
}
