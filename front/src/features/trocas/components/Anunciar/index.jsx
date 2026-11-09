import PropTypes from 'prop-types';
import ItemEscolha from '../ItemEscolha';
import {
  IV_TOTAL_MAXIMO, plural, somaValores, dadosTipo, formatarNome, formatarNumero, urlArtwork, urlSprite,
} from '@/shared';
import { PRECO_MAXIMO_ANUNCIO, useAnunciarViewModel } from './index_viewmodels';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [SOLID-I] Não recebe mais `usuario` e onAtualizarUsuario. onVerPropostas continua: troca a aba.
 */

// [DRY] Cópia idêntica da que existia em PropostaForm.jsx. Agora vem de formatos.js (somaValores).
// const somaIvs = (ivs) => Object.values(ivs).reduce((soma, iv) => soma + iv, 0);

function Anunciar({ onVerPropostas }) {
  const {
    disponiveis, escolhidoId, escolher, escolhido, vender, setVender, preco, setPreco,
    aceitaPropostas, setAceitaPropostas, podeAnunciar, meus, enviando, erro, aviso, anunciar, cancelar,
  } = useAnunciarViewModel();

  const handleAnunciar = (evento) => {
    evento.preventDefault();
    anunciar();
  };

  return (
    <>
      {erro && <p className="jogo-erro" role="alert">{erro}</p>}
      {aviso && <p className="jogo-aviso" role="status">{aviso}</p>}

      <div className="trocas-anunciar">
        <section className="trocas-painel" aria-labelledby="anunciar-escolha">
          <h2 id="anunciar-escolha" className="trocas-subtitulo">1. Escolha o Pokémon</h2>
          {disponiveis.length === 0 ? (
            <p className="trocas-dica">
              Nenhum Pokémon disponível. Os do time de batalha não podem ser anunciados: compre mais na Loja
              ou troque o time para liberar algum.
            </p>
          ) : (
            <ul className="trocas-escolha">
              {/* [DRY] O botão era idêntico ao de PropostaForm.jsx; agora é o componente ItemEscolha.
                Código original:
                {disponiveis.map((pokemon) => (
                  <li key={pokemon.id}>
                    <button
                      type="button"
                      className="trocas-escolha-item"
                      aria-pressed={pokemon.id === escolhidoId}
                      onClick={() => setEscolhidoId(pokemon.id)}
                    >
                      <img src={urlSprite(pokemon.especieId, pokemon.shiny)} alt="" loading="lazy" />
                      <strong>{`${formatarNome(pokemon.nome)}${pokemon.shiny ? ' ★' : ''}`}</strong>
                      <span>{`Nv. ${pokemon.nivel} · IVs ${somaIvs(pokemon.ivs)}`}</span>
                    </button>
                  </li>
                ))}
              */}
              {disponiveis.map((pokemon) => (
                <li key={pokemon.id}>
                  <ItemEscolha
                    pokemon={pokemon}
                    selecionado={pokemon.id === escolhidoId}
                    onClick={() => escolher(pokemon.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <form className="trocas-painel" onSubmit={handleAnunciar} aria-labelledby="anunciar-como">
          <h2 id="anunciar-como" className="trocas-subtitulo">2. Como quer negociar</h2>
          {escolhido ? (
            <div className="trocas-escolhido" style={{ '--trocas-cor': dadosTipo(escolhido.tipos[0]).cor }}>
              <img src={urlArtwork(escolhido.especieId, escolhido.shiny)} alt="" />
              <div>
                <strong>{formatarNome(escolhido.nome)}</strong>
                {/* [DRY] O "124" era um número mágico repetido em 4 arquivos; agora é IV_TOTAL_MAXIMO.
                  Código original:
                  <span>{`${formatarNumero(escolhido.mintNumero)} · Nv. ${escolhido.nivel} · IVs ${somaIvs(escolhido.ivs)}/124`}</span>
                */}
                <span>{`${formatarNumero(escolhido.mintNumero)} · Nv. ${escolhido.nivel} · IVs ${somaValores(escolhido.ivs)}/${IV_TOTAL_MAXIMO}`}</span>
              </div>
            </div>
          ) : (
            <p className="trocas-dica">Escolha um Pokémon ao lado.</p>
          )}

          <label className="trocas-opcao">
            <input type="checkbox" checked={vender} onChange={(e) => setVender(e.target.checked)} />
            <span>
              <strong>Vender por Pokécoins</strong>
              <span>Quem pagar o preço leva na hora.</span>
            </span>
          </label>
          {vender && (
            <label className="trocas-campo">
              <span>Preço em Pokécoins</span>
              <input
                type="number"
                min={1}
                max={PRECO_MAXIMO_ANUNCIO}
                step={1}
                inputMode="numeric"
                placeholder="Ex.: 150"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
              />
            </label>
          )}

          <label className="trocas-opcao">
            <input type="checkbox" checked={aceitaPropostas} onChange={(e) => setAceitaPropostas(e.target.checked)} />
            <span>
              <strong>Receber propostas de troca</strong>
              <span>Outros treinadores podem oferecer Pokémon e/ou Pokécoins. Você decide se aceita.</span>
            </span>
          </label>

          <p className="trocas-dica">
            Ao trocar de dono, o afeto do Pokémon volta a zero: ele vai precisar criar laços com o novo treinador.
          </p>

          <button type="submit" className="trocas-botao" disabled={!podeAnunciar}>
            {enviando ? 'Anunciando...' : 'Anunciar'}
          </button>
        </form>
      </div>

      <section className="trocas-meus" aria-labelledby="anunciar-meus">
        <h2 id="anunciar-meus" className="trocas-subtitulo">Meus anúncios</h2>
        {meus === null && !erro && <p aria-busy="true">Carregando...</p>}
        {meus?.length === 0 && <p className="trocas-dica">Você não tem anúncios ativos.</p>}
        <ul className="trocas-lista">
          {meus?.map((anuncio) => (
            <li key={anuncio.id} className="trocas-linha">
              <img src={urlSprite(anuncio.pokemon.especieId, anuncio.pokemon.shiny)} alt="" />
              <span className="trocas-linha-texto">
                <strong>{`${formatarNome(anuncio.pokemon.nome)} ${formatarNumero(anuncio.pokemon.mintNumero)}`}</strong>
                <span>
                  {[
                    anuncio.preco !== null && `${anuncio.preco.toLocaleString('pt-BR')} Pokécoins`,
                    anuncio.aceitaPropostas && 'aceita propostas',
                  ].filter(Boolean).join(' · ')}
                </span>
              </span>
              {anuncio.propostasPendentes > 0 && (
                <button type="button" className="trocas-selo" onClick={onVerPropostas}>
                  {/* [DRY] Refazia na mão a escolha singular/plural que já existe em plural().
                    Código original:
                    {`${anuncio.propostasPendentes} ${anuncio.propostasPendentes === 1 ? 'proposta' : 'propostas'}`}
                  */}
                  {plural(anuncio.propostasPendentes, 'proposta', 'propostas')}
                </button>
              )}
              <button
                type="button"
                className="trocas-botao trocas-botao--secundario"
                disabled={enviando}
                onClick={() => cancelar(anuncio)}
              >
                Cancelar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

Anunciar.propTypes = {
  onVerPropostas: PropTypes.func.isRequired,
};

export default Anunciar;
