// Regras da história. Espelham back/src/jogo/regras.js: se uma mudar lá, mude aqui também.

// História (regras.forcaDoPonto): trilha 1 vai de 0,1x a 1,0x, trilha 2 de 1,1x a 2,0x...
export const forcaDoPonto = (trilha, ponto, pontosPorTrilha) => ((trilha - 1) * pontosPorTrilha + ponto) / 10;

// História (regras.xpDaHistoria): o XP cresce mais rápido que a força
// (na revanche, multiplicado por multXpRevanche)
export const xpDoPonto = (forca, { xpPorForca, xpPorForcaAoQuadrado, multXpRevanche }, revanche) => Math.round(
  (xpPorForca * forca + xpPorForcaAoQuadrado * forca * forca) * (revanche ? multXpRevanche : 1),
);

// Faixas da chance de captura (10% nos lendários, 20% nos iniciais, até 50% nos mais fáceis)
export function dificuldadeCaptura(chance) {
  if (chance < 0.2) return { nivel: 'muito-dificil', texto: 'muito difícil' };
  if (chance < 0.3) return { nivel: 'dificil', texto: 'difícil' };
  if (chance < 0.4) return { nivel: 'media', texto: 'média' };
  return { nivel: 'facil', texto: 'fácil' };
}
