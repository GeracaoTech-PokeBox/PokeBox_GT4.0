# Backend do PokeBox

API REST do PokeBox em **Node.js + Express 5 + PostgreSQL** (SQL escrito à mão, sem ORM). Os dados de espécies e golpes vêm da [PokeAPI](https://pokeapi.co) e ficam guardados no banco como cache.

> Arquitetura, regras do jogo e todos os endpoints: [docs/BACKEND.md](docs/BACKEND.md).

## Rodando

**Tudo no Docker** (na raiz do repositório):

```bash
docker compose up -d     # banco (5432) + back (8080) + front (5174)
```

**Back fora do Docker** (com o banco do compose rodando):

```bash
cd back
npm install
cp .env.example .env     # já aponta para o Postgres do compose
npm start                # http://localhost:8080/api/saude → { "ok": true }
```

Ao subir, o back aplica sozinho as migrações de `db/migracoes` que ainda não rodaram. Se alguma falhar, ele não sobe.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Connection string do Postgres. Sem ela, só `/api/saude` e o proxy da PokeAPI funcionam |
| `PORT` | Porta HTTP (padrão `8080`) |

O `.env` não vai para o Git. Nunca coloque nele a connection string de produção.

## Testes

```bash
npm run test:unit       # unitários: regras, motor de batalha, tipos, proxy da PokeAPI (sem banco, < 1 s)
npm run test:int        # integração com Postgres de verdade (precisa do Docker, ~20 s)
npm test                # os dois
npm run test:cobertura  # unitários com relatório de cobertura

# Só um arquivo ou só os testes cujo nome bate com o padrão
npm run test:int -- --test-name-pattern=trocas
```

Os unitários ficam em `test/unit` e não precisam de banco nem de rede. Os sorteios usam `rngSequencia` (`test/helpers/rng.js`), que devolve valores fixos e falha se a regra sortear mais vezes do que o teste previu. A PokeAPI é trocada por `instalarPokeApiFake` (`test/helpers/pokeapi-fake.js`).

A integração fica em `test/integracao`, um arquivo por parte do jogo (contas, loja e time, cuidados e evolução, vitrine e presença, batalhas, trocas, história, golpes) e mais `jornada.test.js`, que faz o caminho de um jogador novo do cadastro até a primeira batalha. Cada teste monta o próprio cenário e não depende dos outros:

- `test/helpers/ambiente.js` recria o banco a partir do `db/db.sql`, sobe o app numa porta livre e oferece `api()`, `saldo()` e `limparDados()`, que zera as tabelas antes de cada teste.
- `test/helpers/fabricas.js` cria treinadores (`criarTreinador`), cards (`criarPokemon`) e times (`criarTime`) direto pelas funções do jogo. A ação que está sendo testada continua passando pela API.
- `test/helpers/pokeapi-sintetica.js` responde no lugar da PokeAPI, com dados fixos para cada espécie e golpe. Assim a integração não depende de rede. As famílias de Bulbasaur, Charmander e Squirtle usam nomes, status e níveis de evolução reais.

Três arquivos cobrem o que não aparece num fluxo normal:

- `concorrencia.test.js` dispara pedidos ao mesmo tempo (cliques duplos, dois compradores no mesmo anúncio, agendador e jogada juntos) e confere que só um passa, que nada é pago duas vezes e que o total de Pokécoins não muda.
- `autorizacao.test.js` faz um treinador tentar agir sobre Pokémon, anúncios, propostas, batalhas e encontros de outro, rota por rota. Cada tentativa precisa dar 400 e deixar o banco igual, conferido com `fotografar()`, que lê todas as linhas de todas as tabelas.
- `atomicidade.test.js` força uma falha no meio de compras, trocas, recompensas e revanches com um trigger temporário do Postgres (`test/helpers/falhas.js`) e confere que a transação desfez tudo.

`migracoes.test.js` repete o que acontece num banco novo: o `db.sql` cria tudo e o back aplica as migrações por cima ao subir. O schema final (colunas, constraints, índices, sequências e triggers) precisa ser igual ao do `db.sql` puro, e rodar as migrações de novo, ou em duas instâncias ao mesmo tempo, não pode mudar nada. **Ao mudar o banco, altere o `db.sql` e crie a migração juntos**: se só um dos dois mudar, esse teste falha.

Nos unitários, `erros-de-banco.test.js` confere o que o front recebe quando o banco falha: 503 com mensagem para o jogador quando ele está fora do ar ou mal configurado, e 500 genérico, sem detalhes internos, para qualquer outro erro.

O `test:int` sobe o Postgres do compose (se ele não estiver rodando), cria o banco `pokebox_teste` e roda os arquivos um por vez, porque todos usam o mesmo banco. Com `DATABASE_URL_TESTE` definida, ele usa esse banco direto e não precisa de Docker. O nome do banco precisa terminar em `_teste`, porque o teste apaga e recria o schema.

No GitHub, o workflow [`.github/workflows/back.yml`](../.github/workflows/back.yml) roda os unitários (com cobertura) e a integração (com um Postgres 16 do próprio Actions) em todo PR para `develop` ou `main` e em todo push nessas duas branches, quando a mudança mexe em `back/` ou `db/`.

## Estrutura

```
server.js        # Entrada: .env, migrações, HTTP e agendador de batalhas
src/app.js       # CORS, /api/saude, proxy da PokeAPI
src/rotas.js     # Endpoints /api/*: validação, autenticação, erros → HTTP
src/db.js        # Pool do Postgres + transacao()
src/jogo/        # Regras de negócio, um arquivo por área
  config.js      #   todas as constantes de balanceamento (preços, prazos, chances)
```

## Onde mexer

- **Preço, prazo, chance ou recompensa:** `src/jogo/config.js`
- **Novo endpoint:** `src/rotas.js` (validação) + o módulo em `src/jogo/` (regra)
- **Banco:** nova migração idempotente em `db/migracoes/` **e** atualização de `db/db.sql`

## Deploy

Render (`render.yaml`, health check em `/api/saude`) com o banco no Neon, ou `docker-compose.prod.yml` numa máquina própria. Detalhes em [docs/BACKEND.md](docs/BACKEND.md#9-rodando-e-testando).
