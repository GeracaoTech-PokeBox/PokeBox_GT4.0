import { chamar } from '@/core';

// Mercado, anúncios e propostas de troca
export const listarMercado = (busca, ordem) => chamar('GET', `/mercado?busca=${encodeURIComponent(busca)}&ordem=${ordem}`);
export const listarAnunciosDaEspecie = (especieId, ordem) => chamar('GET', `/mercado/${especieId}?ordem=${ordem}`);
export const listarMeusAnuncios = () => chamar('GET', '/anuncios/meus');
export const criarAnuncio = (dados) => chamar('POST', '/anuncios', dados);
export const cancelarAnuncio = (id) => chamar('DELETE', `/anuncios/${id}`);
export const comprarAnuncio = (id) => chamar('POST', `/anuncios/${id}/comprar`);
export const proporTroca = (anuncioId, oferta) => chamar('POST', `/anuncios/${anuncioId}/propostas`, oferta);
export const listarPropostas = () => chamar('GET', '/propostas');
export const aceitarProposta = (id) => chamar('POST', `/propostas/${id}/aceitar`);
export const recusarProposta = (id) => chamar('POST', `/propostas/${id}/recusar`);
export const cancelarProposta = (id) => chamar('DELETE', `/propostas/${id}`);
