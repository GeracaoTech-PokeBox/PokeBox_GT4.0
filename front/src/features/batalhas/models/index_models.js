import { formatarNome } from '@/shared';

// Regras e textos de batalha (PvP e contra o selvagem). Juntou models/batalha e models/eventosBatalha.

/* [DRY] Novo. Regras e textos de batalha que estavam copiados em dois lugares:
 *   - MOTIVOS: em pages/Batalha e pages/Batalhas
 *   - reservasDoLado: em useBatalhaViewModel (PvP) e useBatalhaSelvagem (História)
 * [MVVM] É Model: não usa React. Vale para as duas batalhas, PvP e contra o selvagem.
 */

// Como a batalha terminou, para os textos de resultado
export const MOTIVOS = { nocaute: 'por nocaute', wo: 'por W.O.', desistencia: 'por desistência' };

// Pokémon de um lado que ainda podem entrar no lugar do ativo: fora de campo e com PS
export const reservasDoLado = (lado) => lado.pokemons
  .map((pokemon, indice) => ({ pokemon, indice }))
  .filter(({ pokemon, indice }) => indice !== lado.ativo && pokemon.hp > 0);

/* [MVVM] Model. Era components/eventosBatalha, mas não tem JSX: não é componente, é dado/regra.
 * [SOLID-S] Com a mudança, components/ ficou só com componentes visuais.
 * Transforma eventos da batalha em frases; usada pelos ViewModels de Batalha e Historia.
 */

// Transforma os eventos de uma jogada em frases para o histórico da batalha.
// O lado do Pokémon selvagem da história não tem treinador (usuarioId null).
export function descreverEventos(eventos, estado) {
  const nomePokemon = (id) => {
    const pokemon = estado.lados.flatMap((l) => l.pokemons).find((p) => p.pokemonId === id);
    return pokemon ? formatarNome(pokemon.nome) : 'Pokémon';
  };
  const login = (lado) => estado.lados[lado].login;
  // "Pikachu de ash" ou "Pikachu selvagem"
  const doLado = (lado, pokemonId) => (estado.lados[lado].usuarioId === null
    ? `${nomePokemon(pokemonId)} selvagem`
    : `${nomePokemon(pokemonId)} de ${login(lado)}`);

  /* [DRY] O trecho "<dano> de dano em <alvo> (crítico!)." estava escrito duas vezes, no golpe
   * especial e no ataque básico. Agora as duas frases usam danoEm().
   *
   * Código original:
   *
   * // Golpe especial: "Venusaur usou Razor Leaf! Causou 40 de dano em Squirtle. É super efetivo!"
   * const danoDeGolpe = (evento) => {
   *   const usou = `${nomePokemon(evento.atacante)} usou ${formatarNome(evento.golpe)}!`;
   *   if (evento.efetividade === 0) return `${usou} Não teve efeito em ${nomePokemon(evento.alvo)}.`;
   *   let frase = `${usou} Causou ${evento.dano} de dano em ${nomePokemon(evento.alvo)}${evento.critico ? ' (crítico!)' : ''}.`;
   *   if (evento.efetividade > 1) frase += ' É super efetivo!';
   *   else if (evento.efetividade < 1) frase += ' Não foi muito efetivo...';
   *   return frase;
   * };
   *
   * ...e no switch:
   *
   *   case 'dano':
   *     if (evento.golpe) return danoDeGolpe(evento);
   *     return `${nomePokemon(evento.atacante)} causou ${evento.dano} de dano em ${nomePokemon(evento.alvo)}${evento.critico ? ' (crítico!)' : ''}.`;
   */

  // "40 de dano em Squirtle (crítico!)."
  const danoEm = (evento) => `${evento.dano} de dano em ${nomePokemon(evento.alvo)}${evento.critico ? ' (crítico!)' : ''}.`;

  // Golpe especial: "Venusaur usou Razor Leaf! Causou 40 de dano em Squirtle. É super efetivo!"
  const danoDeGolpe = (evento) => {
    const usou = `${nomePokemon(evento.atacante)} usou ${formatarNome(evento.golpe)}!`;
    if (evento.efetividade === 0) return `${usou} Não teve efeito em ${nomePokemon(evento.alvo)}.`;
    let frase = `${usou} Causou ${danoEm(evento)}`;
    if (evento.efetividade > 1) frase += ' É super efetivo!';
    else if (evento.efetividade < 1) frase += ' Não foi muito efetivo...';
    return frase;
  };

  return eventos.map((evento) => {
    switch (evento.tipo) {
      case 'dano':
        if (evento.golpe) return danoDeGolpe(evento);
        return `${nomePokemon(evento.atacante)} causou ${danoEm(evento)}`;
      case 'errou':
        return `${nomePokemon(evento.atacante)} usou ${formatarNome(evento.golpe)}, mas errou!`;
      case 'resistiu':
        return `${doLado(evento.lado, evento.pokemonId)} aguentou firme com 1 PS pelo afeto ao treinador!`;
      case 'nocaute':
        return `${doLado(evento.lado, evento.pokemonId)} foi nocauteado!`;
      case 'entrou':
        return `${login(evento.lado)} colocou ${formatarNome(estado.lados[evento.lado].pokemons[evento.indice].nome)} em campo.`;
      case 'timeout':
        return `${login(evento.lado)} perdeu o prazo de 4h (${evento.timeoutsSeguidos}/2) e a vez passou.`;
      case 'desistiu':
        return `${login(evento.lado)} desistiu.`;
      default:
        return '';
    }
  });
}
