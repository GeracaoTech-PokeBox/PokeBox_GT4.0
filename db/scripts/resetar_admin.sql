DO $$
DECLARE
  v_usuario   usuarios%ROWTYPE;
  v_pokemons  BIGINT[];
  v_batalhas  BIGINT[];
  v_anuncios  BIGINT[];
  v_novo_id   BIGINT;
BEGIN
  SELECT * INTO v_usuario FROM usuarios WHERE lower(login) = lower('admin') FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário admin não encontrado';
  END IF;

  SELECT coalesce(array_agg(id), '{}') INTO v_pokemons
    FROM pokemons WHERE dono_id = v_usuario.id;
  SELECT coalesce(array_agg(id), '{}') INTO v_batalhas
    FROM batalhas WHERE v_usuario.id IN (desafiante_id, desafiado_id);
  SELECT coalesce(array_agg(id), '{}') INTO v_anuncios
    FROM anuncios
   WHERE vendedor_id = v_usuario.id OR comprador_id = v_usuario.id OR pokemon_id = ANY (v_pokemons);

  -- Extrato: apaga o do admin; nos outros treinadores só solta a referência
  DELETE FROM transacoes_pokecoins WHERE usuario_id = v_usuario.id;
  UPDATE transacoes_pokecoins SET batalha_id = NULL WHERE batalha_id = ANY (v_batalhas);
  UPDATE transacoes_pokecoins SET anuncio_id = NULL WHERE anuncio_id = ANY (v_anuncios);

  -- Mercado
  DELETE FROM proposta_pokemons WHERE pokemon_id = ANY (v_pokemons);
  DELETE FROM propostas WHERE proponente_id = v_usuario.id OR anuncio_id = ANY (v_anuncios);
  DELETE FROM anuncios WHERE id = ANY (v_anuncios);

  -- Batalhas
  DELETE FROM batalha_acoes WHERE batalha_id = ANY (v_batalhas);
  DELETE FROM batalhas WHERE id = ANY (v_batalhas);

  -- História
  DELETE FROM historia_encontros WHERE usuario_id = v_usuario.id;
  UPDATE historia_encontros SET pokemon_id = NULL WHERE pokemon_id = ANY (v_pokemons);

  -- Pokémon (cuidados caem junto por CASCADE)
  DELETE FROM pokemons WHERE id = ANY (v_pokemons);

  -- Conta: apaga (sessoes e vitrines caem por CASCADE) e recria igual ao cadastro, com id novo
  DELETE FROM usuarios WHERE id = v_usuario.id;
  INSERT INTO usuarios (login, celular, senha_hash, pokecoins)   -- 1000 = POKECOINS_CADASTRO
  VALUES (v_usuario.login, v_usuario.celular, v_usuario.senha_hash, 1000)
  RETURNING id INTO v_novo_id;
  INSERT INTO transacoes_pokecoins (usuario_id, valor, motivo)
  VALUES (v_novo_id, 1000, 'bonus_cadastro');

  RAISE NOTICE 'admin resetado: id % -> %', v_usuario.id, v_novo_id;
END $$;

-- Para conferir depois:
SELECT u.id, u.login, u.pokecoins, u.pokebolas,
       (SELECT count(*) FROM pokemons WHERE dono_id = u.id) AS pokemons
FROM usuarios u WHERE lower(login) = 'admin';
-- esperado: 1000 pokécoins, 0 pokébolas, 0 pokémon
