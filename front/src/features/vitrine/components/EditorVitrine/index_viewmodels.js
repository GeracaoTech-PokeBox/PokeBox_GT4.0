import { useState } from 'react';
import { DESTAQUES_MAXIMO } from '../../constants/index_constants';

/* [MVVM] ViewModel do EditorVitrine. Era o useEditorVitrine, exportado junto com os outros
 * hooks da Vitrine em viewmodels/useVitrineViewModel.
 */

/** Formulário do dono: apresentação, estilo e até 6 Pokémon em destaque (na ordem dos cliques) */
export function useEditorVitrine(vitrine, onSalvar) {
  const [bio, setBio] = useState(vitrine.bio);
  const [estilo, setEstilo] = useState(vitrine.estilo);
  const [selecionados, setSelecionados] = useState(() => vitrine.destaques.map((p) => p.id));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  const alternar = (id) => {
    setSelecionados((atual) => {
      if (atual.includes(id)) return atual.filter((outro) => outro !== id);
      return atual.length < DESTAQUES_MAXIMO ? [...atual, id] : atual;
    });
  };

  const salvar = async () => {
    setSalvando(true);
    setErro(null);
    try {
      await onSalvar({ bio, estilo, pokemonIds: selecionados });
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  };

  return {
    bio,
    setBio,
    estilo,
    setEstilo,
    selecionados,
    alternar,
    cheio: selecionados.length >= DESTAQUES_MAXIMO,
    salvando,
    erro,
    salvar,
  };
}
