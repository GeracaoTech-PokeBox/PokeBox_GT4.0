import { useState } from 'react';
import AnunciosDaEspecie from '../AnunciosDaEspecie';
import ListaEspecies from '../ListaEspecies';

/* [MVVM] View: só escolhe a subtela. Cada uma (ListaEspecies e AnunciosDaEspecie) tem a sua pasta
 * com o seu ViewModel; antes os dois hooks ficavam juntos em viewmodels/useMercadoViewModel.
 * [SOLID-I] Não recebe mais `usuario` e onAtualizarUsuario (Trocas só repassava).
 */

function Mercado() {
  // [MVVM] Estado só de navegação interna (qual espécie está aberta, null = lista): pode ficar na View.
  const [especie, setEspecie] = useState(null);

  if (especie) {
    return <AnunciosDaEspecie especie={especie} onVoltar={() => setEspecie(null)} />;
  }
  return <ListaEspecies onAbrir={setEspecie} />;
}

export default Mercado;
