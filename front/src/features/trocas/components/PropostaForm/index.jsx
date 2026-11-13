import PropTypes from 'prop-types';
import { Avatar, IV_TOTAL_MAXIMO, formatarNome, formatarNumero, urlArtwork } from '@/shared';
import ItemEscolha from '../ItemEscolha';
import { POKEMONS_POR_PROPOSTA, usePropostaFormViewModel } from './index_viewmodels';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [SOLID-I] Não recebe mais o objeto `usuario` inteiro do Mercado.
 */

// [DRY] Cópia idêntica da que existia em Anunciar.jsx. Agora a soma é feita dentro de
// ItemEscolha.jsx, com somaValores() de formatos.js, e este arquivo não precisa mais dela.
// const somaIvs = (ivs) => Object.values(ivs).reduce((soma, iv) => soma + iv, 0);

// Monta a oferta (Pokémon da coleção + Pokécoins) para um anúncio que aceita propostas
function PropostaForm({ anuncio, onCancelar, onEnviada }) {
  const vm = usePropostaFormViewModel(anuncio, onEnviada);
  const {
    disponiveis, oferecidos, moedas, enviando, erro,
  } = vm;
  const alvo = anuncio.pokemon;
  const nomeAlvo = formatarNome(alvo.nome);

  const handleSubmit = (evento) => {
    evento.preventDefault();
    vm.enviar();
  };

  return (
    <form className="trocas-proposta-form" onSubmit={handleSubmit}>
      <button type="button" className="trocas-voltar" onClick={onCancelar}>← Voltar aos anúncios</button>
      <h2 className="trocas-titulo">{`Propor troca por ${nomeAlvo}`}</h2>
      <p className="trocas-vendedor">
        <Avatar login={anuncio.vendedor} tamanho="pequeno" />
        <span>
          Anúncio de
          {' '}
          <strong>{anuncio.vendedor}</strong>
          {/* [DRY] Número mágico "124" repetido em 4 arquivos; agora é IV_TOTAL_MAXIMO.
            Código original:
            {` · ${formatarNumero(alvo.mintNumero)} · Nv. ${alvo.nivel} · IVs ${alvo.ivTotal}/124`}
          */}
          {` · ${formatarNumero(alvo.mintNumero)} · Nv. ${alvo.nivel} · IVs ${alvo.ivTotal}/${IV_TOTAL_MAXIMO}`}
        </span>
      </p>

      {erro && <p className="jogo-erro" role="alert">{erro}</p>}

      {/* Resumo: oferta -> Pokémon do anúncio */}
      <div className="trocas-resumo" aria-label="Resumo da proposta">
        <div className="trocas-resumo-oferta">
          {oferecidos.length === 0 && moedas === 0 && <span className="trocas-dica">Escolha o que oferecer abaixo</span>}
          {oferecidos.map((p, i) => (
            <span key={p.id} className="trocas-resumo-item">
              {i > 0 && <span className="trocas-mais" aria-hidden="true">+</span>}
              <img src={urlArtwork(p.especieId, p.shiny)} alt="" />
              <span>{formatarNome(p.nome)}</span>
            </span>
          ))}
          {moedas > 0 && (
            <span className="trocas-resumo-item">
              {oferecidos.length > 0 && <span className="trocas-mais" aria-hidden="true">+</span>}
              <span className="trocas-moedas">{moedas.toLocaleString('pt-BR')}</span>
              <span>Pokécoins</span>
            </span>
          )}
        </div>
        <span className="trocas-seta" aria-hidden="true">→</span>
        <span className="trocas-resumo-item trocas-resumo-alvo">
          <img src={urlArtwork(alvo.especieId, alvo.shiny)} alt="" />
          <span>{nomeAlvo}</span>
        </span>
      </div>

      <fieldset className="trocas-campo">
        <legend>{`Seus Pokémon (${vm.quantidadeSelecionados}/${POKEMONS_POR_PROPOSTA})`}</legend>
        {disponiveis.length === 0 ? (
          <p className="trocas-dica">Todos os seus Pokémon estão no time de batalha, e eles não podem ser trocados. Você ainda pode oferecer Pokécoins.</p>
        ) : (
          <>
            <p className="trocas-dica">Só aparecem os que estão fora do time de batalha.</p>
            <ul className="trocas-escolha">
              {/* [DRY] Botão idêntico ao de Anunciar.jsx; agora é o componente ItemEscolha.
                [KISS] selecionados.includes(pokemon.id) era calculado duas vezes por item;
                agora é calculado uma vez e guardado em "marcado".
                Código original:
                {disponiveis.map((pokemon) => (
                  <li key={pokemon.id}>
                    <button
                      type="button"
                      className="trocas-escolha-item"
                      aria-pressed={selecionados.includes(pokemon.id)}
                      disabled={!selecionados.includes(pokemon.id) && selecionados.length >= POKEMONS_MAXIMO}
                      onClick={() => alternar(pokemon.id)}
                    >
                      <img src={urlSprite(pokemon.especieId, pokemon.shiny)} alt="" loading="lazy" />
                      <strong>{`${formatarNome(pokemon.nome)}${pokemon.shiny ? ' ★' : ''}`}</strong>
                      <span>{`Nv. ${pokemon.nivel} · IVs ${somaIvs(pokemon.ivs)}`}</span>
                    </button>
                  </li>
                ))}
              */}
              {disponiveis.map((pokemon) => {
                const marcado = vm.estaSelecionado(pokemon.id);
                return (
                  <li key={pokemon.id}>
                    <ItemEscolha
                      pokemon={pokemon}
                      selecionado={marcado}
                      desabilitado={!marcado && vm.cheio}
                      onClick={() => vm.alternar(pokemon.id)}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </fieldset>

      <label className="trocas-campo">
        <span>{`Pokécoins (você tem ${vm.saldo.toLocaleString('pt-BR')})`}</span>
        <input
          type="number"
          min={0}
          max={vm.saldo}
          step={1}
          inputMode="numeric"
          placeholder="0"
          value={vm.pokecoins}
          onChange={(e) => vm.setPokecoins(e.target.value)}
        />
      </label>

      <p className="trocas-dica">
        {`Nada fica reservado: se ${anuncio.vendedor} aceitar, a troca acontece na hora, desde que você ainda tenha o que ofereceu.`}
      </p>

      <div className="trocas-form-botoes">
        <button type="button" className="trocas-botao trocas-botao--secundario" onClick={onCancelar} disabled={enviando}>Cancelar</button>
        <button
          type="submit"
          className="trocas-botao"
          disabled={!vm.podeEnviar}
        >
          {enviando ? 'Enviando...' : 'Enviar proposta'}
        </button>
      </div>
    </form>
  );
}

PropostaForm.propTypes = {
  anuncio: PropTypes.shape({
    id: PropTypes.number.isRequired,
    vendedor: PropTypes.string.isRequired,
    pokemon: PropTypes.shape({
      especieId: PropTypes.number.isRequired,
      nome: PropTypes.string.isRequired,
      shiny: PropTypes.bool.isRequired,
      mintNumero: PropTypes.number.isRequired,
      nivel: PropTypes.number.isRequired,
      ivTotal: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  onCancelar: PropTypes.func.isRequired,
  onEnviada: PropTypes.func.isRequired,
};

export default PropostaForm;
