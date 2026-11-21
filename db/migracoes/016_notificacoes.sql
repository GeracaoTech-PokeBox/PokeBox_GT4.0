-- Notificações: o que mudou em cada aba e ainda não foi visto pelo treinador.
-- Cada uma fica pendente (vista_em NULL) até ele abrir e ver; ver dá Pokécoins (motivo 'recompensa_notificacao').
-- Aplicada sozinha pelo back ao subir (src/banco/migracoes.js).
BEGIN;

CREATE TABLE IF NOT EXISTS notificacoes (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  aba         TEXT NOT NULL CHECK (aba IN ('pokemons', 'meusPokemons', 'loja', 'time', 'historia', 'vitrine',
                                           'trocas', 'batalhas', 'sobre')),
  chave       TEXT NOT NULL,              -- o mesmo assunto não repete enquanto estiver pendente (ex.: 'visitas')
  titulo      TEXT NOT NULL,
  texto       TEXT NOT NULL,
  quantidade  INTEGER NOT NULL DEFAULT 1, -- quantas vezes aconteceu desde a última vez que foi vista
  criada_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  vista_em    TIMESTAMPTZ,
  recompensa  INTEGER                     -- Pokécoins dados ao ver (0 se já tinha passado do limite do dia)
);
CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_pendente_idx ON notificacoes (usuario_id, chave) WHERE vista_em IS NULL;
CREATE INDEX IF NOT EXISTS notificacoes_vistas_idx ON notificacoes (usuario_id, vista_em);

ALTER TABLE transacoes_pokecoins DROP CONSTRAINT IF EXISTS transacoes_pokecoins_motivo_check;
ALTER TABLE transacoes_pokecoins ADD CONSTRAINT transacoes_pokecoins_motivo_check
  CHECK (motivo IN ('bonus_cadastro', 'compra_loja', 'recompensa_batalha', 'compra_mercado', 'venda_mercado', 'troca',
                    'compra_pokebola', 'recompensa_historia', 'refazer_historia', 'roleta_golpes', 'desbloqueio_golpes',
                    'recompensa_afeto', 'recompensa_notificacao'));

-- Novidades do jogo para quem já joga (quem se cadastrar depois já encontra tudo assim)
INSERT INTO notificacoes (usuario_id, aba, chave, titulo, texto)
SELECT u.id, n.aba, n.chave, n.titulo, n.texto
  FROM usuarios u
 CROSS JOIN (VALUES
   ('meusPokemons', 'novidade:golpe-inicial', 'Novidade: golpe especial desde o início',
    'Todo Pokémon agora nasce com 1 golpe especial. Com 5 ♥ (ou o desbloqueio), ele aprende mais 2 na roleta.'),
   ('trocas', 'novidade:golpes-nas-trocas', 'Novidade: golpes nos anúncios',
    'Os anúncios do mercado mostram os golpes especiais do Pokémon, que vão junto com ele na troca.'),
   ('vitrine', 'novidade:lista-de-vitrines', 'Novidade: vitrines dos treinadores',
    'A lista de vitrines mostra o nome completo e os 3 Pokémon em destaque de cada treinador.')
 ) AS n(aba, chave, titulo, texto)
ON CONFLICT (usuario_id, chave) WHERE vista_em IS NULL DO NOTHING;

COMMIT;
