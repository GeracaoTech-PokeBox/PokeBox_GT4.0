/* [DRY] Arquivo novo. Anunciar, CantinhoCuidado, FiltrosPokemons, Mercado (2x) e Propostas
 * repetiam o mesmo bloco dentro do useEffect para não atualizar o estado de um componente que
 * já saiu da tela:
 *
 *   let ativo = true;
 *   api.algumaCoisa().then((dados) => {
 *     if (ativo) setDados(dados);
 *   }, (e) => {
 *     if (ativo) setErro(e.message);
 *   });
 *   return () => {
 *     ativo = false;
 *   };
 *
 * São 8 linhas de "encanamento" por tela, iguais exceto pela promessa e pelos setters.
 * Centralizar aqui deixa cada useEffect com uma linha e garante que todos tratam o
 * "componente desmontado" do mesmo jeito.
 */

/**
 * Repassa o resultado da promessa para os callbacks enquanto o efeito estiver ativo.
 * Devolve a função de limpeza do useEffect: `useEffect(() => carregar(...), [deps])`.
 */
export function carregar(promessa, onSucesso, onErro = () => {}) {
  let ativo = true;
  promessa.then((dados) => {
    if (ativo) onSucesso(dados);
  }, (erro) => {
    if (ativo) onErro(erro);
  });
  return () => {
    ativo = false;
  };
}
