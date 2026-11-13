import { useState } from 'react';
import PropTypes from 'prop-types';
import { Avatar, IV_TOTAL_MAXIMO, formatarNome, formatarNumero, tempoDesde, urlArtwork } from '@/shared';
import { usePropostasViewModel } from './index_viewmodels';

/* [MVVM] View: só desenha. Estado, efeitos e chamadas à API ficam em index_viewmodels.js, nesta pasta.
 * [SOLID-I] Não recebe mais onAtualizarUsuario. onMudou continua: avisa a aba de cima.
 * [MVVM] `confirmando` (CardProposta) ficou aqui: é estado só visual.
 */

const STATUS = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  recusada: 'Recusada',
  cancelada: 'Cancelada',
  encerrada: 'Encerrada',
};

const formatoResumo = PropTypes.shape({
  id: PropTypes.number.isRequired,
  mintNumero: PropTypes.number.isRequired,
  especieId: PropTypes.number.isRequired,
  nome: PropTypes.string.isRequired,
  shiny: PropTypes.bool.isRequired,
  nivel: PropTypes.number.isRequired,
  ivTotal: PropTypes.number.isRequired,
});

function MiniCard({ pokemon, grande = false }) {
  const nome = formatarNome(pokemon.nome);
  return (
    <figure className={`trocas-mini${grande ? ' trocas-mini--grande' : ''}`}>
      <img src={urlArtwork(pokemon.especieId, pokemon.shiny)} alt={`${nome}${pokemon.shiny ? ' shiny' : ''}`} loading="lazy" />
      <figcaption>
        <strong>{`${nome}${pokemon.shiny ? ' ★' : ''}`}</strong>
        <span>{`${formatarNumero(pokemon.mintNumero)} · Nv. ${pokemon.nivel}`}</span>
        {/* [DRY] Número mágico "124" repetido em 4 arquivos; agora é IV_TOTAL_MAXIMO.
          Código original:
          <span>{`IVs ${pokemon.ivTotal}/124`}</span>
        */}
        <span>{`IVs ${pokemon.ivTotal}/${IV_TOTAL_MAXIMO}`}</span>
      </figcaption>
    </figure>
  );
}

MiniCard.propTypes = { pokemon: formatoResumo.isRequired, grande: PropTypes.bool };

// "1 Pikachu + 1 Froakie + 50 Pokécoins → Charizard"
function resumo(proposta) {
  const contagem = new Map();
  proposta.oferta.forEach((p) => contagem.set(p.nome, (contagem.get(p.nome) ?? 0) + 1));
  const partes = [...contagem].map(([nome, n]) => `${n} ${formatarNome(nome)}`);
  if (proposta.pokecoins > 0) partes.push(`${proposta.pokecoins.toLocaleString('pt-BR')} Pokécoins`);
  return `${partes.join(' + ')} → ${formatarNome(proposta.alvo.nome)}`;
}

function CardProposta({ proposta, recebida, enviando, onAceitar, onRecusar, onCancelar }) {
  const [confirmando, setConfirmando] = useState(false);
  const outro = recebida ? proposta.proponente : proposta.vendedor;
  const alvo = formatarNome(proposta.alvo.nome);

  return (
    <article className="trocas-proposta" data-status={proposta.status}>
      <header className="trocas-proposta-topo">
        <Avatar login={outro} tamanho="pequeno" />
        <span>
          {recebida ? (
            <>
              <strong>{outro}</strong>
              {` quer o seu ${alvo}`}
            </>
          ) : (
            <>
              {`Você quer o ${alvo} de `}
              <strong>{outro}</strong>
            </>
          )}
        </span>
        <span className="trocas-proposta-status">{STATUS[proposta.status]}</span>
      </header>

      <div className="trocas-proposta-corpo">
        <section>
          <h3>Interessado em</h3>
          <MiniCard pokemon={proposta.alvo} grande />
        </section>
        <section>
          <h3>Oferece em troca</h3>
          <div className="trocas-proposta-oferta">
            {proposta.oferta.map((p, i) => (
              <span key={p.id} className="trocas-proposta-item">
                {i > 0 && <span className="trocas-mais" aria-hidden="true">+</span>}
                <MiniCard pokemon={p} />
              </span>
            ))}
            {proposta.pokecoins > 0 && (
              <span className="trocas-proposta-item">
                {proposta.oferta.length > 0 && <span className="trocas-mais" aria-hidden="true">+</span>}
                <span className="trocas-moedas trocas-moedas--grande">
                  {proposta.pokecoins.toLocaleString('pt-BR')}
                  <small>Pokécoins</small>
                </span>
              </span>
            )}
          </div>
        </section>
      </div>

      <footer className="trocas-proposta-rodape">
        <span className="trocas-proposta-resumo">{resumo(proposta)}</span>
        <time dateTime={proposta.criadaEm}>{tempoDesde(proposta.criadaEm)}</time>
        {proposta.status === 'pendente' && (
          <div className="trocas-acoes">
            {recebida && !confirmando && (
              <>
                <button type="button" className="trocas-botao trocas-botao--secundario" disabled={enviando} onClick={() => onRecusar(proposta)}>
                  Recusar
                </button>
                <button type="button" className="trocas-botao trocas-botao--comprar" disabled={enviando} onClick={() => setConfirmando(true)}>
                  Aceitar
                </button>
              </>
            )}
            {recebida && confirmando && (
              <>
                <button type="button" className="trocas-botao trocas-botao--secundario" onClick={() => setConfirmando(false)}>Voltar</button>
                <button type="button" className="trocas-botao trocas-botao--comprar" disabled={enviando} onClick={() => onAceitar(proposta)}>
                  {`Confirmar: trocar ${alvo}`}
                </button>
              </>
            )}
            {!recebida && (
              <button type="button" className="trocas-botao trocas-botao--secundario" disabled={enviando} onClick={() => onCancelar(proposta)}>
                Cancelar proposta
              </button>
            )}
          </div>
        )}
      </footer>
    </article>
  );
}

CardProposta.propTypes = {
  proposta: PropTypes.shape({
    id: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    pokecoins: PropTypes.number.isRequired,
    criadaEm: PropTypes.string.isRequired,
    vendedor: PropTypes.string.isRequired,
    proponente: PropTypes.string.isRequired,
    alvo: formatoResumo.isRequired,
    oferta: PropTypes.arrayOf(formatoResumo).isRequired,
  }).isRequired,
  recebida: PropTypes.bool.isRequired,
  enviando: PropTypes.bool.isRequired,
  onAceitar: PropTypes.func.isRequired,
  onRecusar: PropTypes.func.isRequired,
  onCancelar: PropTypes.func.isRequired,
};

function Propostas({ onMudou }) {
  const {
    lado, setLado, carregado, pendentesEm, lista, enviando, erro, aviso, aceitar, recusar, cancelar,
  } = usePropostasViewModel(onMudou);

  return (
    <>
      <div className="trocas-subabas" role="tablist" aria-label="Propostas">
        {[['recebidas', 'Recebidas'], ['enviadas', 'Enviadas']].map(([valor, nome]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={lado === valor}
            className="trocas-subaba"
            onClick={() => setLado(valor)}
          >
            {nome}
            {pendentesEm(valor) > 0 && <span className="trocas-contador">{pendentesEm(valor)}</span>}
          </button>
        ))}
      </div>

      {erro && <p className="jogo-erro" role="alert">{erro}</p>}
      {aviso && <p className="jogo-aviso" role="status">{aviso}</p>}
      {!carregado && !erro && <p aria-busy="true">Carregando propostas...</p>}
      {carregado && lista.length === 0 && (
        <p className="trocas-vazio">
          {lado === 'recebidas'
            ? 'Nenhuma proposta recebida. Anuncie um Pokémon aceitando propostas para receber ofertas.'
            : 'Você ainda não mandou propostas. Encontre um Pokémon no Mercado e clique em "Propor troca".'}
        </p>
      )}

      <ul className="trocas-propostas">
        {lista.map((proposta) => (
          <li key={proposta.id}>
            <CardProposta
              proposta={proposta}
              recebida={lado === 'recebidas'}
              enviando={enviando}
              onAceitar={aceitar}
              onRecusar={recusar}
              onCancelar={cancelar}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

Propostas.propTypes = {
  onMudou: PropTypes.func.isRequired,
};

export default Propostas;
