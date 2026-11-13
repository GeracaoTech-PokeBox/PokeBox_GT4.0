import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Avatar, IV_TOTAL_MAXIMO, plural, dadosTipo, formatarNome, formatarNumero, nomesTipos, urlArtwork,
} from '@/shared';
import Ordenar from '../Ordenar';
import PropostaForm from '../PropostaForm';
import { useAnunciosDaEspecie } from './index_viewmodels';

/* [MVVM] View da segunda tela do mercado. Era um componente interno de Mercado; ganhou pasta
 * própria junto com o seu ViewModel (index_viewmodels.js).
 * [MVVM] Ficou aqui só estado visual: `confirmando` (CardAnuncio).
 */

const ORDENS_ANUNCIOS = [
  { valor: 'preco', nome: 'Preço (crescente)' },
  { valor: 'ivs', nome: 'Melhores IVs' },
  { valor: 'nivel', nome: 'Maior nível' },
  { valor: 'recentes', nome: 'Mais recentes' },
];

// [DRY] Movida para shared/utils (era formatos.js): Anunciar, PropostaForm e Propostas usavam o mesmo 124 escrito à mão.
// const IV_TOTAL_MAXIMO = 124; // 4 status x 31

const STATUS = [
  { chave: 'hp', nome: 'PS' },
  { chave: 'ataque', nome: 'Atq' },
  { chave: 'defesa', nome: 'Def' },
  { chave: 'velocidade', nome: 'Vel' },
];

// [DRY] Movida para shared/utils (era formatos.js): Anunciar.jsx e Layout.jsx refaziam a mesma escolha singular/plural.
// const plural = (n, singular, varios) => `${n.toLocaleString('pt-BR')} ${n === 1 ? singular : varios}`;

// Barra de 0 a 124 com a marca da soma dos IVs (como a barra de desgaste do mercado da Steam)
function BarraIvs({ total }) {
  const posicao = (total / IV_TOTAL_MAXIMO) * 100;
  return (
    <div className="trocas-ivs">
      <span className="trocas-ivs-texto">{`IVs: ${total} / ${IV_TOTAL_MAXIMO}`}</span>
      <span className="trocas-ivs-barra" role="img" aria-label={`Soma dos IVs: ${total} de ${IV_TOTAL_MAXIMO}`}>
        <span className="trocas-ivs-marca" style={{ left: `${posicao}%` }} />
      </span>
    </div>
  );
}

BarraIvs.propTypes = { total: PropTypes.number.isRequired };

// Um anúncio: o card do Pokémon, quem anunciou e as ações
function CardAnuncio({ anuncio, saldo, enviando, onComprar, onPropor }) {
  // [MVVM] Estado só visual (pede confirmação antes de comprar): pode ficar na View.
  const [confirmando, setConfirmando] = useState(false);
  const { pokemon } = anuncio;
  const nome = formatarNome(pokemon.nome);

  let acoes;
  if (anuncio.meu) {
    acoes = <span className="trocas-meu">Seu anúncio</span>;
  } else {
    acoes = (
      <>
        {anuncio.aceitaPropostas && (
          <button type="button" className="trocas-botao trocas-botao--secundario" disabled={enviando} onClick={() => onPropor(anuncio)}>
            Propor troca
          </button>
        )}
        {anuncio.preco !== null && (confirmando ? (
          <>
            <button type="button" className="trocas-botao trocas-botao--secundario" onClick={() => setConfirmando(false)}>Voltar</button>
            <button type="button" className="trocas-botao trocas-botao--comprar" disabled={enviando} onClick={() => onComprar(anuncio)}>
              Confirmar
            </button>
          </>
        ) : (
          <button
            type="button"
            className="trocas-botao trocas-botao--comprar"
            disabled={enviando || saldo < anuncio.preco}
            title={saldo < anuncio.preco ? 'Pokécoins insuficientes' : undefined}
            onClick={() => setConfirmando(true)}
          >
            Comprar
          </button>
        ))}
      </>
    );
  }

  return (
    <article className={`trocas-anuncio${pokemon.shiny ? ' trocas-anuncio--shiny' : ''}`} style={{ '--trocas-cor': dadosTipo(pokemon.tipos[0]).cor }}>
      {/* [DRY] Mesma junção de nomes de tipos de ListaEspecies; agora é nomesTipos().
        Código original:
        <span className="trocas-especie-tipo">{`${pokemon.tipos.map((tipo) => dadosTipo(tipo).nome).join(' / ')} · Nv. ${pokemon.nivel}`}</span>
      */}
      <span className="trocas-especie-tipo">{`${nomesTipos(pokemon.tipos)} · Nv. ${pokemon.nivel}`}</span>
      <strong className="trocas-especie-nome">
        {`${nome} ${formatarNumero(pokemon.mintNumero)}`}
        {pokemon.shiny && <span className="trocas-shiny"> ★ Shiny</span>}
      </strong>
      <img src={urlArtwork(pokemon.especieId, pokemon.shiny)} alt={`${nome}${pokemon.shiny ? ' shiny' : ''}`} loading="lazy" />

      <span className="trocas-vendedor">
        <Avatar login={anuncio.vendedor} tamanho="pequeno" />
        <span>
          Anunciado por
          {' '}
          <strong>{anuncio.vendedor}</strong>
        </span>
      </span>

      <dl className="trocas-status">
        {STATUS.map(({ chave, nome: rotulo }) => (
          <div key={chave}>
            <dt>{rotulo}</dt>
            <dd>{pokemon.status[chave]}</dd>
            <dd className="trocas-status-iv">{`IV ${pokemon.ivs[chave]}`}</dd>
          </div>
        ))}
      </dl>
      <BarraIvs total={pokemon.ivTotal} />
      <span className="trocas-medidas">{`${pokemon.alturaM.toLocaleString('pt-BR')} m · ${pokemon.pesoKg.toLocaleString('pt-BR')} kg`}</span>

      <div className="trocas-anuncio-rodape">
        <span className="trocas-preco">
          {anuncio.preco !== null ? `${anuncio.preco.toLocaleString('pt-BR')} Pokécoins` : 'Aceita propostas'}
        </span>
        <div className="trocas-acoes">{acoes}</div>
      </div>
    </article>
  );
}

CardAnuncio.propTypes = {
  anuncio: PropTypes.shape({
    id: PropTypes.number.isRequired,
    preco: PropTypes.number,
    aceitaPropostas: PropTypes.bool.isRequired,
    vendedor: PropTypes.string.isRequired,
    meu: PropTypes.bool.isRequired,
    pokemon: PropTypes.object.isRequired,
  }).isRequired,
  saldo: PropTypes.number.isRequired,
  enviando: PropTypes.bool.isRequired,
  onComprar: PropTypes.func.isRequired,
  onPropor: PropTypes.func.isRequired,
};

// Segunda tela: todos os anúncios de uma espécie, para escolher pelos status
function AnunciosDaEspecie({ especie, onVoltar }) {
  const {
    ordem, setOrdem, anuncios, saldo, enviando, erro, aviso, comprar, propondo, abrirProposta, fecharProposta, propostaEnviada,
  } = useAnunciosDaEspecie(especie);

  const nome = formatarNome(especie.nome);

  if (propondo) {
    return <PropostaForm anuncio={propondo} onCancelar={fecharProposta} onEnviada={propostaEnviada} />;
  }

  return (
    <>
      <div className="trocas-barra-topo">
        <button type="button" className="trocas-voltar" onClick={onVoltar}>← Todas as espécies</button>
        <Ordenar valor={ordem} opcoes={ORDENS_ANUNCIOS} onMudar={setOrdem} />
      </div>
      <h2 className="trocas-titulo">
        <img src={urlArtwork(especie.especieId)} alt="" />
        {nome}
      </h2>

      {erro && <p className="jogo-erro" role="alert">{erro}</p>}
      {aviso && <p className="jogo-aviso" role="status">{aviso}</p>}
      {anuncios === null && !erro && <p aria-busy="true">Carregando anúncios...</p>}
      {anuncios?.length === 0 && <p className="trocas-vazio">{`Ninguém está anunciando ${nome} agora.`}</p>}
      {anuncios?.length > 0 && <p className="trocas-contagem">{plural(anuncios.length, 'anúncio', 'anúncios')}</p>}

      <ul className="trocas-grade">
        {anuncios?.map((anuncio) => (
          <li key={anuncio.id}>
            <CardAnuncio
              anuncio={anuncio}
              saldo={saldo}
              enviando={enviando}
              onComprar={comprar}
              onPropor={abrirProposta}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

AnunciosDaEspecie.propTypes = {
  especie: PropTypes.shape({ especieId: PropTypes.number.isRequired, nome: PropTypes.string.isRequired }).isRequired,
  onVoltar: PropTypes.func.isRequired,
};

export default AnunciosDaEspecie;
