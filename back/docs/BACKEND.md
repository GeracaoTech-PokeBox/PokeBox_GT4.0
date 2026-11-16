# Backend do PokeBox — como funciona

Este documento explica a arquitetura do back, os fluxos principais do jogo e onde mexer para alterar cada regra. Ele foi escrito a partir do código em `back/src` e do esquema em `db/db.sql`.

---

## 1. Visão geral

| Item | Escolha |
|---|---|
| Runtime | Node.js (CommonJS) |
| Framework HTTP | Express 5, que encaminha sozinho para o tratador de erros as exceções lançadas em handlers `async` |
| Banco | PostgreSQL, via `pg` (Pool). Sem ORM: as consultas SQL são escritas à mão |
| Dados externos | [PokeAPI](https://pokeapi.co), consultada só uma vez por espécie/golpe e guardada no banco como cache |
| Autenticação | Token opaco no cabeçalho `Authorization: Bearer <token>`. O banco guarda só o hash SHA-256 do token |
| Tempo real | Não há WebSocket. O front consulta o back de tempos em tempos (polling), e um agendador interno resolve os prazos das batalhas |
| Deploy | Docker Compose (local), Render + Neon (`render.yaml`) ou back + banco numa máquina própria (`docker-compose.prod.yml`) |

### Estrutura de pastas

O back segue o padrão **MVC com uma pasta por feature**: tudo de uma parte do jogo (rotas, validação, regra, SQL e formato da resposta) fica junto em `src/features/<nome>/`.

```
back/
├── server.js                  # Ponto de entrada: lê o .env, aplica as migrações, sobe o HTTP e o agendador
├── .env.example               # Modelo das variáveis de ambiente (copie para .env; o .env não vai para o Git)
├── Dockerfile
├── src/
│   ├── app.js                 # App Express: CORS, /api/saude, proxy da PokeAPI e montagem de /api
│   ├── rotas.js               # Monta as rotas de cada feature, o express.json e o tratamento de erros
│   ├── features/              # Uma pasta por parte do jogo (ver "Uma feature por dentro")
│   │   ├── contas/            # Cadastro, login, senha, sessão e o middleware autenticar
│   │   ├── pokemons/          # Cards: mint, coleção (/eu), XP, evolução, cuidados; o card do front (view)
│   │   ├── golpes/            # Cache de golpes da PokeAPI + roleta/desbloqueio de golpes especiais
│   │   ├── especies/          # Cache de espécies da PokeAPI + o proxy /api/pokeapi
│   │   ├── loja/              # Pokémon inicial, compra por geração, Pokébolas
│   │   ├── time/              # Time de batalha
│   │   ├── vitrines/          # Perfil público do treinador
│   │   ├── treinadores/       # Busca por login, treinadores online, presença
│   │   ├── trocas/            # Mercado: anúncios, compra direta, propostas
│   │   ├── historia/          # Modo história (PvE): trilhas, selvagens, captura
│   │   └── batalhas/          # Batalhas PvP assíncronas + o agendador de prazos
│   ├── nucleo/                # Regras puras usadas por várias features (sem banco, rede nem relógio)
│   │   ├── motor.js           # Motor de batalha (estado + ação -> novo estado + eventos)
│   │   ├── regras.js          # Mint, status, afeto, cuidados, XP e evolução
│   │   └── tipos.js           # Tabela de efetividade de tipos
│   ├── banco/                 # Acesso ao Postgres que não é de uma feature só
│   │   ├── db.js              # Pool do Postgres + helper transacao()
│   │   ├── migracoes.js       # Aplica db/migracoes/*.sql que ainda não rodaram
│   │   ├── carteira.js        # Saldo de Pokécoins + extrato (lerSaldo, creditar, debitar, registrarNoExtrato)
│   │   └── busca.js           # Padrões de ILIKE com escape (comecaCom, contem)
│   └── compartilhado/         # Utilitários sem regra de feature
│       ├── config.js          # TODAS as constantes de balanceamento (preços, prazos, chances...)
│       ├── erros.js           # ErroJogo (erro de regra -> HTTP 400)
│       ├── validacao.js       # texto(), inteiro(), busca(), opcao(), acaoDe(), LOGIN_MAXIMO
│       ├── aleatorio.js       # RNG criptográfico (crypto) e helpers de sorteio
│       ├── pokeapi.js         # URL da PokeAPI, buscarJson(), extrairId()
│       └── middlewares/       # limitarTentativas (rate limit) e tratarErros
└── test/
    ├── rodar.js               # Sobe o Postgres no Docker, cria o banco pokebox_teste e roda os testes
    ├── unit/                  # Regras puras, motor, tipos, proxy e erros de banco (sem banco real)
    ├── integracao/            # Um arquivo por parte do jogo, via HTTP com Postgres de verdade
    └── helpers/               # Ambiente de teste, fábricas, PokeAPI falsa, RNG fixo
```

### Uma feature por dentro

Cada pasta de `src/features/` tem os mesmos papéis. O nome do arquivo diz o papel: `<feature>.<papel>.js`.

| Arquivo | Papel (MVC) | Faz | Não faz |
|---|---|---|---|
| `<feature>.rotas.js` | rotas | Caminho + `autenticar` + qual função do controller atende | Ler o corpo, regra |
| `<feature>.controller.js` | **Controller** | Lê e valida `req` (`inteiro()`, `texto()`...), chama o service, escolhe o status HTTP | SQL, regra de jogo |
| `<feature>.service.js` | regra (serviço) | Regra de negócio, `transacao()`, travas, chamadas a outras features | Conhecer `req`/`res` |
| `<feature>.model.js` | **Model** | Só SQL. Toda função recebe `db` primeiro: o `pool` ou o `client` da transação | Decidir se algo é permitido |
| `<feature>.view.js` | **View** | Monta o JSON do front a partir das linhas do banco | Consultar o banco |
| `index.js` | API pública | O que outras partes do back podem usar dessa feature | |

A **View** só existe onde há formatação a fazer (`pokemons`, `vitrines`, `trocas`, `historia`, `batalhas`); nas outras features o SQL já devolve o formato final. Algumas features têm arquivos a mais com um papel só: `contas.senhas.js` (hash de senha e token), `contas.autenticar.js` (o middleware), `especies.pokeapi.js` e `golpes.pokeapi.js` (busca e conversão da PokeAPI), `especies.proxy.js`, `historia.regras.js` (fórmulas puras da história), `historia.batalha.js` (batalha contra o selvagem, sem banco) e `batalhas.agendador.js`.

### Camadas

```
HTTP ──► app.js ──► rotas.js ──► <feature>.rotas ──► controller ──► service ──► model ──► banco/db.js ──► PostgreSQL
                                                                      │   │
                                                                      │   ├─► nucleo/ e *.regras.js (lógica pura, sem I/O)
                                                                      │   ├─► outras features (pelo index.js delas)
                                                                      │   └─► *.pokeapi.js ──► PokeAPI (só no cache miss)
                                                                      └─► view ──► JSON do front
```

**Regras de importação** (o que mantém as features independentes e sem `require` circular):

1. Uma feature importa outra **só pelo `index.js`** dela (`require('../pokemons')`), nunca os arquivos internos.
2. `nucleo/`, `compartilhado/` e `banco/` **não importam nada de `features/`**.
3. As dependências entre features seguem uma ordem: `contas` → `especies` → `pokemons` → `golpes`, `loja`, `time`, `vitrines`, `trocas` → `batalhas` → `historia`. Uma feature não importa uma que vem depois dela.
4. O único SQL que uma feature entrega a outra são os trechos do card (`CAMPOS_CARD`, `SELECT_GOLPES`, exportados por `pokemons`), usados pelas consultas de trocas e batalhas.

Mais dois pontos:

- **`autenticar`** fica em cada rota (`rotas.get('/x', autenticar, ...)`), e não num `router.use(autenticar)` dentro da feature: os roteadores das features são montados sem prefixo, então um `use` ali valeria para as requisições de todas as features montadas depois.
- **`config.js`** concentra o balanceamento. Para mudar preço, prazo ou chance, mexa só aqui.

---

## 2. Inicialização (`server.js`)

1. Se o arquivo `back/.env` existir, carrega-o com `dotenv` (`DATABASE_URL`, `PORT`). Variáveis já definidas no ambiente têm prioridade. Se o arquivo não existir, o back usa só as variáveis do ambiente (é o que acontece no Docker Compose e no Render).
2. **Sem `DATABASE_URL`**: sobe só o servidor. Funcionam apenas `/api/saude` e o proxy da PokeAPI; as rotas do jogo falham.
3. **Com `DATABASE_URL`**:
   1. `aplicarMigracoes()` roda os `.sql` de `db/migracoes` (ou de `MIGRACOES_DIR`) que ainda não constam na tabela `migracoes`. Usa `pg_advisory_lock` para que duas instâncias não apliquem a mesma migração ao mesmo tempo. Se alguma migração falhar, o processo encerra com código 1.
   2. Sobe o HTTP na porta `PORT` (padrão 8080).
   3. Inicia o **agendador** (`features/batalhas/batalhas.agendador.js`).

> O esquema base (`db/db.sql`) é aplicado pelo próprio container do Postgres na primeira subida (`docker-entrypoint-initdb.d`). As migrações são idempotentes (`IF NOT EXISTS` etc.), então um banco novo e um antigo terminam iguais.

---

## 3. Camada HTTP

### `app.js`
- **`trust proxy`** é ativado quando `RENDER` está definido, para que `req.ip` seja o IP real do cliente. O limitador de tentativas depende disso.
- **CORS** aceita qualquer origem (`*`). Isso é seguro porque a autenticação vai no cabeçalho `Authorization`, e não em cookie. `OPTIONS` responde 204.
- **`GET /api/saude`**: `{ ok: true }` sem tocar no banco. Serve de health check do Render e para "acordar" o back no plano gratuito.
- **`GET /api/pokeapi/<recurso>[/<id>]`**: proxy para a PokeAPI (`features/especies/especies.proxy.js`). Aceita só caminhos `^/[a-z0-9-]+(/[a-z0-9-]+)?/?$` (sem diferenciar maiúsculas) e repassa só os parâmetros `limit`/`offset`. Caminho fora do padrão recebe 400, outro método recebe 405 e PokeAPI inacessível recebe 502. Fica montado direto no app, fora do roteador de `/api`: não passa pelo `express.json` nem pelo tratamento de erros do jogo.
- **`/api/*`**: router do jogo (`rotas.js`).

### `rotas.js` e padrões das rotas
- `rotas.js` liga o `express.json`, monta o roteador de cada feature (sem prefixo; cada feature declara os caminhos completos) e, por último, o `tratarErros`.
- Body JSON limitado a **10 kb**.
- **Autenticação** (middleware `autenticar`, em `features/contas/contas.autenticar.js`): extrai o token do Bearer e busca a sessão. Se der certo, preenche `req.usuario = { id, login, pokecoins, pokebolas }`; se não, responde 401. Esse mesmo middleware atualiza `ultimo_acesso_em`/`online_em`, no máximo uma vez a cada 15 s.
- **Rate limit** em memória para tudo sob `/api/auth` (inclusive `/auth/sair`): 20 requisições por IP+rota a cada 15 minutos (429). O contador zera quando o processo reinicia e não é compartilhado entre instâncias.
- **Tratamento de erros** (`compartilhado/middlewares/tratarErros.js`, último middleware):

| Origem | Resposta |
|---|---|
| `ErroJogo` (regra de negócio violada) | `400 { erro: mensagem }` |
| JSON malformado | `400 { erro: 'JSON inválido.' }` |
| Corpo acima de 10 kb | `413 { erro: 'Dados grandes demais.' }` |
| Banco fora do ar, credencial errada, tabela inexistente | `503` |
| Qualquer outro erro | `500 { erro: 'Erro interno...' }` (o detalhe vai só para o log) |

---

## 4. Banco de dados

Esquema em [`db/db.sql`](../../db/db.sql) e evoluções em [`db/migracoes/`](../../db/migracoes).

| Tabela | Papel |
|---|---|
| `usuarios` | Conta: login (único, sem diferenciar maiúsculas), celular, `senha_hash`, `pokecoins`, `pokebolas`, `ultimo_acesso_em`, `online_em` |
| `sessoes` | `token_hash` → usuário, com validade de 30 dias |
| `especies` | Cache da PokeAPI: tipos, raridade, status base, `taxa_captura`, `evolucoes` (JSONB), `movimentos` (ids de golpes) |
| `golpes` | Cache de golpes da PokeAPI (tipo, classe, poder, precisão, PP) |
| `pokemons` | **Card único** de um jogador: `mint_numero` global, espécie atual/original, shiny, IVs, multiplicadores de altura/peso, nível/XP, posição no time (1–3) e na vitrine (1–6), afeto/humor/energia, bônus de evolução, golpes especiais |
| `cuidados` | Histórico de carinho/brincar/alimentar (controla a espera entre cuidados) |
| `vitrines` | Bio, estilo (`palco`/`album`) e contador de visitas |
| `batalhas` | Batalha PvP: status, prazos, **`estado` JSONB** (os dois times congelados), vez, vencedor, recompensas |
| `batalha_acoes` | Log de cada jogada (eventos para animar no front), incluindo as automáticas por timeout |
| `historia_encontros` | Cada Pokémon selvagem encontrado na trilha, com o estado da batalha PvE em andamento |
| `anuncios`, `propostas`, `proposta_pokemons` | Mercado de trocas |
| `transacoes_pokecoins` | **Extrato**: toda entrada e saída de Pokécoins, com motivo. Também serve de base para o anti-farm |
| `migracoes` | Controle das migrações aplicadas |

**Conversão de tipos** (`banco/db.js`): `BIGINT` e `NUMERIC` chegam como `Number` (por padrão o `pg` os devolve como string).

---

## 5. Princípios de consistência (vale para todos os fluxos)

Estes padrões se repetem em todo o código e explicam a maior parte das decisões:

1. **`transacao(fn)`**: tudo que altera mais de uma linha roda dentro de `BEGIN/COMMIT`; qualquer erro faz `ROLLBACK`.
2. **Débito condicional e atômico** (`carteira.debitar`): `UPDATE usuarios SET pokecoins = pokecoins - X WHERE id = $1 AND pokecoins >= X RETURNING ...`. Se nenhuma linha voltar, o saldo não era suficiente. Assim, dois cliques rápidos não gastam o mesmo saldo.
3. **Travas de linha (`SELECT ... FOR UPDATE`)** antes de conferir e alterar: no usuário (escolha do inicial, definição de time, desafio, explorar), na batalha, no encontro, no anúncio e na proposta.
4. **Ordem fixa de travas no mercado**: primeiro os usuários (em ordem de id), depois o anúncio, depois os cards. Isso evita deadlock entre operações cruzadas.
5. **Nunca chamar a PokeAPI com transação aberta**: `garantirEspecie`, `garantirGolpe` etc. rodam antes do `transacao()`, para não segurar locks enquanto a rede responde. Dentro da transação os dados são conferidos de novo.
6. **Extrato sempre**: todo movimento de Pokécoins passa por `banco/carteira.js` (`creditar`, `debitar`), que grava a linha em `transacoes_pokecoins` na mesma transação.
7. **RNG seguro**: `crypto.randomInt` em vez de `Math.random`, porque shiny e IVs têm valor no jogo. As funções recebem `rng` por parâmetro para os testes poderem fixar o sorteio.

---

## 6. Fluxos principais

### 6.1 Conta e sessão — `features/contas`

| Endpoint | O que faz |
|---|---|
| `POST /api/auth/cadastro` `{login, celular, senha}` | Valida (login ≤ 20, celular com 11 dígitos, senha ≥ 8), gera o hash com **scrypt** (`sal:hash`), cria o usuário com **1000 Pokécoins** (registra `bonus_cadastro`) e devolve `{ usuario, token }` |
| `POST /api/auth/login` | Confere a senha com `timingSafeEqual` e devolve o mesmo erro genérico para usuário e senha errados. Cria uma sessão |
| `POST /api/auth/verificar` | Recuperação de senha, passo 1: informa se existe o par login+celular |
| `POST /api/auth/redefinir-senha` | Recuperação, passo 2: troca a senha e **apaga todas as sessões** do usuário |
| `POST /api/auth/sair` | Apaga a sessão e marca o usuário como offline na hora |

O token tem 32 bytes aleatórios em hex e só o SHA-256 dele fica no banco. A sessão vale 30 dias.

### 6.2 Coleção, loja e time — `features/pokemons`, `features/loja` e `features/time`

```
Cadastro ─► GET /eu (coleção vazia) ─► POST /eu/inicial ─► POST /loja/comprar ... ─► PUT /time
```

- **`GET /api/eu`** devolve o usuário e a coleção (time primeiro, na ordem; depois os demais do mais novo ao mais antigo). Cada card passa por `descreverPokemon` (`pokemons.view.js`), que calcula status, medidas, afeto, disponibilidade de cuidados e evoluções.
- **`POST /api/eu/inicial` `{especieId}`**: só um dos 27 iniciais e só para quem ainda não tem nenhum Pokémon. Trava o usuário para impedir dois iniciais. O card já entra no time na posição 1.
- **`POST /api/loja/comprar` `{geracao}`** (100 Pokécoins):
  1. Confere o saldo previamente, para não ir à PokeAPI à toa.
  2. `sortearEspecieDaLoja`: sorteia um id dentro do intervalo da geração e **aceita conforme a raridade** (comum 100%, lendário 10%, mítico 5%); se recusar, sorteia de novo.
  3. Na transação: débito condicional, extrato, mint do card (entra na primeira vaga livre do time, se houver).
- **`POST /api/loja/pokebolas` `{quantidade}`**: de 1 a 99, a 10 Pokécoins cada.
- **`PUT /api/time` `{pokemonIds: [a,b,c]}`**: exatamente 3 cards diferentes, todos do usuário e nenhum anunciado no mercado. Limpa as posições e regrava, para respeitar o `UNIQUE (dono_id, posicao_time)`.

#### Mint (criação de um card)
`sortearAtributos` (`nucleo/regras.js`): **1% de shiny**. Shiny tem IVs de 20 a 31; os demais, de 0 a 31. Altura e peso recebem multiplicadores de 0,8 a 1,2. O `mint_numero` vem de uma sequence global, então todo card do jogo tem um número único.

#### Fórmula de status (`calcularStatus`, em `nucleo/regras.js`)
```
HP     = floor((2*base + IV) * nível / 100) + nível + 10
Outros = floor((2*base + IV) * nível / 100) + 5
× (1 + 2% por coração de afeto)  + bônus fixos de evolução
```

### 6.3 Progressão do card — `features/pokemons` + `features/golpes`

- **XP** (`darXp`): cada nível exige `nível × 100` de XP, e uma vitória pode subir vários níveis. O nível máximo é 100.
- **Evolução** — `POST /api/pokemons/:id/evoluir` `{especieId}`: o nível mínimo vem da PokeAPI (`min_level`). Evoluções por pedra, troca ou amizade usam *nível de entrada + 20*. Mint, shiny, IVs e nível continuam iguais; a base de status passa a ser a da nova espécie. Cada status tem **30% de chance de ganhar +1 a +5** permanentes.
- **Cuidados** — `POST /api/pokemons/:id/cuidar` `{tipo}`:

| Tipo | Afeto | Humor | Energia | Espera |
|---|---|---|---|---|
| carinho | +10 | +15 | 0 | 2 h |
| brincar | +20 | +25 | −25 | 4 h |
| alimentar | +20 | 0 | +35 | 4 h |

  Humor e energia caem com o tempo (2 e 1 ponto por hora), e esse desgaste é calculado na leitura a partir de `bem_estar_em`. A cada 100 de afeto o card ganha 1 coração (máximo 5 = 500 pontos), e **cada coração paga 100 Pokécoins uma única vez por card** (`coracoes_premiados`), mesmo que o afeto zere numa troca.
- **Golpes especiais** — `POST /api/pokemons/:id/golpes/roletar` e `/desbloquear`:
  - Ficam liberados com o afeto máximo **ou** pagando 200 Pokécoins (o desbloqueio já inclui a primeira roleta).
  - A roleta sorteia 2 golpes **que causam dano** entre os que a espécie aprende. A primeira é grátis; as seguintes custam 100.
  - O sorteio acontece fora da transação. Dentro dela, o código confere se o card não mudou (espécie ou golpes) enquanto a roleta girava.

### 6.4 Batalhas PvP assíncronas — `features/batalhas` + `nucleo/motor.js`

```
desafiar ──► [aguardando] ──recusar──► [recusada]
                 │  └──24h sem resposta──► [expirada]
              aceitar
                 ▼
          [em_andamento] ──jogadas / timeouts──► [finalizada] ──► recompensas
```

1. **`POST /api/batalhas` `{oponente}`**: o desafiante precisa ter um time de 3. Pode ter no máximo 5 desafios pendentes e só 1 por oponente. O desafio expira em 24 h.
2. **`POST /api/batalhas/:id/responder` `{aceitar}`**: ao aceitar, **os dois times são congelados** no `estado` JSONB (`motor.montarLado`), com status calculados, golpes e PP. Começa quem tiver o primeiro Pokémon mais rápido (empate vai para sorteio). O prazo de **1 minuto por jogada** começa a contar.
3. **`POST /api/batalhas/:id/jogadas` `{tipo, indice?}`**:
   - `atacar`: ataque básico com poder 50 e sem tipo.
   - `golpe` (`indice`): golpe especial. Gasta PP, pode errar conforme a precisão e aplica **STAB ×1,5** e a efetividade de tipo (`nucleo/tipos.js`).
   - `trocar` (`indice`): troca o Pokémon em campo e gasta o turno.
   - `desistir`: pode ser feito a qualquer momento, mesmo fora da vez.
4. **Motor** (`motor.aplicarAcao`) é puro: recebe o estado, devolve `{ estado, eventos, fim }` e nunca altera o objeto de entrada.
   - O dano segue a fórmula dos jogos principais, com variação de 85–100%. O crítico tem chance de 1/16, ou 1/8 se o atacante for mais rápido, e multiplica por ×1,5.
   - Um card com afeto máximo tem 30% de chance de **aguentar com 1 PS** um golpe que o nocautearia, uma vez por batalha.
   - Quando um Pokémon é nocauteado, o próximo vivo entra automaticamente.
5. **Prazos**: há dois mecanismos, e os dois chamam `resolverPrazo`:
   - o **agendador** (`batalhas.agendador.js`, a cada 10 s) processa as batalhas vencidas com `FOR UPDATE SKIP LOCKED` e expira os desafios;
   - **toda leitura ou jogada** (`atualizarPrazos`) confere o prazo antes de agir. Assim o jogo continua correto mesmo com o agendador parado.

   Um timeout passa a vez; **2 timeouts seguidos do mesmo jogador dão W.O.**
6. **Fim e recompensas** (na mesma transação que finaliza a batalha, então nunca são pagas duas vezes):

| Situação | Pokécoins | XP (para cada Pokémon do time) |
|---|---|---|
| Vencedor | 40 | 150 |
| Perdedor por nocaute | 10 | 50 |
| Perdedor por W.O./desistência | 0 | 0 |

   **Anti-farm**: não há recompensa se a batalha teve menos de 6 jogadas manuais no total, se o jogador já recebeu 10 batalhas premiadas nas últimas 24 h ou se já recebeu 3 contra o mesmo oponente nesse período.

Endpoints auxiliares: `GET /api/batalhas` (pendentes e em andamento, mais as 20 últimas encerradas), `GET /api/batalhas/:id` (com o log de ações) e, em `features/treinadores`, `GET /api/treinadores/ativos` (online no último minuto, ativos nas últimas 24 h e com time completo), `POST /api/presenca` (sinal de vida que o front envia a cada ~20 s) e `GET /api/treinadores?busca=`.

### 6.5 Modo história (PvE) — `features/historia`

São 5 trilhas de 10 pontos, percorridas em ordem. Cada ponto tem uma **força** de 0,1× a 5,0×, que aumenta 0,1 por ponto.

```
explorar ─► [encontrado] ─batalha─► vence ─► [vencido] ─► capturar (até 10 Pokébolas) ─► [capturado]
                 ▲            │                  │                          └─10 falhas─► [fugiu]
                 └── perde ───┘                  └─ ignorar ─► [ignorado]
capturado/fugiu/ignorado ─► refazer (25 Pokécoins) ─► revanche contra um novo selvagem
```

- **`POST /api/historia/explorar`** sorteia um selvagem de **qualquer geração**, com o mesmo peso de raridade da loja, e o fixa no próximo ponto. Se o jogador perder, o mesmo selvagem continua esperando. Só existe um encontro aberto por vez (índice único parcial no banco).
- **Batalha** (`/encontros/:id/batalha` e `/jogadas`) usa o mesmo `nucleo/motor.js` (o lado do selvagem é montado em `historia.batalha.js`). O selvagem é o lado 1, tem um só Pokémon, só usa ataque básico e **responde na mesma requisição**, logo depois da jogada do treinador. Não há prazo. Os status do selvagem são *os status da espécie no nível 50 × força*.
- **Vitória**: 10 Pokécoins e XP progressivo para os 3 do time: `5000·força + 1500·força²`. Por exemplo, 0,1× dá 515 XP e 5,0× dá 62.500 XP. Uma revanche paga 50% do XP.
- **Captura** (`/capturar`): gasta 1 Pokébola. A chance é interpolada a partir do `capture_rate` da PokeAPI: 3 → 10%, 45 → 20%, 255 → 50%. O card capturado mantém os IVs, o shiny e o nível do selvagem.
- **Refazer** (`/trilhas/:t/pontos/:p/refazer`): custa 25 Pokécoins, sorteia um novo selvagem na mesma força e **não faz a trilha avançar**. Se o jogador perder uma revanche, o selvagem foge.

### 6.6 Mercado de trocas — `features/trocas`

- **Anunciar** — `POST /api/anuncios` `{pokemonId, preco?, aceitaPropostas}`: o anúncio precisa ter preço (de 1 a 100.000 Pokécoins), aceitar propostas ou as duas coisas. O card precisa estar fora do time. Cada jogador pode ter até 20 anúncios ativos, e cada card só pode ter um anúncio ativo.
- **Navegar**: `GET /api/mercado?busca=&ordem=` lista as espécies com anúncios; `GET /api/mercado/:especieId?ordem=` lista os anúncios de uma espécie; `GET /api/anuncios/meus` lista os do próprio jogador. Os cards aparecem sem o bônus de afeto (`cardPublico`), porque o afeto zera na troca.
- **Compra direta** — `POST /api/anuncios/:id/comprar`: trava os usuários, o anúncio e o card, move as Pokécoins (`compra_mercado`/`venda_mercado`) e transfere o card.
- **Proposta** — `POST /api/anuncios/:id/propostas` `{pokemonIds, pokecoins}`: até 6 Pokémon (fora do time) e/ou de 0 a 100.000 Pokécoins. Cada jogador pode ter até 10 propostas pendentes e só 1 por anúncio. **Nada fica reservado**: os cards e o saldo são conferidos de novo no momento em que a proposta é aceita.
- **Aceitar** — `POST /api/propostas/:id/aceitar`: troca tudo numa só transação.
- `recusar` (vendedor) e `DELETE /api/propostas/:id` (proponente) encerram a proposta.

**Ao transferir um card** (`transferirCards`): o card sai do time e da vitrine, o **afeto zera**, o histórico de cuidados é apagado, os outros anúncios do card são cancelados e as propostas pendentes que o envolviam são encerradas.

### 6.7 Vitrine — `features/vitrines`

- **`GET /api/vitrines/:login`** devolve o perfil público: bio, estilo, visitas, estatísticas (Pokémon, espécies, shinies, vitórias, média de corações do time), até 6 destaques (ou o time, se o jogador não escolheu destaques) e o álbum de espécies. A visita de outro treinador incrementa o contador. Os destaques **não mostram IVs**.
- **`PUT /api/vitrine`** `{bio, estilo, pokemonIds}`: bio de até 160 caracteres, estilo `palco` ou `album`, até 6 destaques.
- **`GET /api/vitrines?busca=`** lista as vitrines de outros treinadores, das mais visitadas para as menos visitadas.

---

## 7. Cache da PokeAPI — `features/especies` e `features/golpes`

- `garantirEspecie(id)`: se a espécie não estiver na tabela `especies`, busca `/pokemon/{id}`, `/pokemon-species/{id}` e a cadeia evolutiva, calcula o nível de cada evolução (`mapearCadeia`) e grava com `ON CONFLICT DO NOTHING`, para o caso de duas requisições concorrentes.
- `garantirTaxaCaptura(id)`: completa sob demanda a coluna `taxa_captura` das espécies salvas antes de ela existir.
- `garantirMovimentos` / `garantirGolpe`: mesma ideia para a lista de golpes de uma espécie e para cada golpe (os golpes sem dano também são guardados, para não serem buscados de novo).
- Consequência: depois que uma espécie ou golpe entra no cache, **as batalhas não dependem da PokeAPI estar no ar**. A tabela de tipos também fica no código (`nucleo/tipos.js`) pelo mesmo motivo.

---

## 8. Referência rápida de endpoints

Todos ficam sob `/api`. 🔒 = exige `Authorization: Bearer <token>`.

| Método | Rota | Área |
|---|---|---|
| GET | `/saude` | infra |
| GET | `/pokeapi/:recurso[/:id]` | proxy |
| POST | `/auth/cadastro`, `/auth/login`, `/auth/verificar`, `/auth/redefinir-senha` | conta (rate limit) |
| POST 🔒 | `/auth/sair` | conta (rate limit) |
| GET 🔒 | `/eu` | coleção |
| POST 🔒 | `/eu/inicial` | coleção |
| POST 🔒 | `/loja/comprar`, `/loja/pokebolas` | loja |
| PUT 🔒 | `/time` | time |
| POST 🔒 | `/pokemons/:id/evoluir`, `/pokemons/:id/cuidar` | card |
| POST 🔒 | `/pokemons/:id/golpes/roletar`, `/pokemons/:id/golpes/desbloquear` | card |
| GET 🔒 | `/pokemons/:id/cuidados` | card |
| GET 🔒 | `/mercado`, `/mercado/:especieId`, `/anuncios/meus`, `/propostas` | trocas |
| POST 🔒 | `/anuncios`, `/anuncios/:id/comprar`, `/anuncios/:id/propostas` | trocas |
| POST 🔒 | `/propostas/:id/aceitar`, `/propostas/:id/recusar` | trocas |
| DELETE 🔒 | `/anuncios/:id`, `/propostas/:id` | trocas |
| GET 🔒 | `/vitrines`, `/vitrines/:login` | vitrine |
| PUT 🔒 | `/vitrine` | vitrine |
| GET 🔒 | `/treinadores`, `/treinadores/ativos` | social |
| POST 🔒 | `/presenca` | social |
| GET 🔒 | `/historia` | história |
| POST 🔒 | `/historia/explorar`, `/historia/encontros/:id/batalha`, `/historia/encontros/:id/jogadas`, `/historia/encontros/:id/capturar`, `/historia/encontros/:id/ignorar`, `/historia/trilhas/:trilha/pontos/:ponto/refazer` | história |
| GET 🔒 | `/batalhas`, `/batalhas/:id` | PvP |
| POST 🔒 | `/batalhas`, `/batalhas/:id/responder`, `/batalhas/:id/jogadas` | PvP |

Formato da jogada (PvP e história): `{ "tipo": "atacar" | "desistir" }` ou `{ "tipo": "golpe" | "trocar", "indice": n }`.

---

## 9. Rodando e testando

**Local com Docker** (na raiz do repositório):
```bash
docker compose up -d          # db (Postgres 16) + back (8080) + front (5174)
```

**Back fora do Docker** (com o banco do compose rodando):
```bash
cd back
npm install
cp .env.example .env   # já aponta para o Postgres do compose: localhost:5432, usuário/senha pokebox
npm start
```

#### Variáveis de ambiente

| Variável | Uso | Onde definir |
|---|---|---|
| `DATABASE_URL` | Connection string do Postgres. Sem ela, só `/api/saude` e o proxy da PokeAPI funcionam | `back/.env` (local), `environment` do `docker-compose.yml`, painel do Render (produção) |
| `PORT` | Porta HTTP (padrão 8080) | idem |
| `MIGRACOES_DIR` | Pasta das migrações (padrão `../db/migracoes`) | opcional |
| `DATABASE_URL_TESTE` | Banco usado pelos testes; o nome precisa terminar em `_teste` | definido sozinho por `test/rodar.js` |
| `RENDER` | Ativa o `trust proxy` | definido sozinho pelo Render |

O `back/.env` está no `.gitignore` e **não deve ser versionado**. Use o `back/.env.example` como modelo e nunca coloque nele a connection string de produção (Neon), que fica só no painel do Render.

**Testes**:
```bash
cd back
npm test                # unitários (test/unit) + integração (test/integracao)
npm run test:cobertura  # os dois juntos, com as metas de cobertura de test/metas-de-cobertura.js
```
`test/rodar.js` encontra (ou sobe) o Postgres do compose, cria o banco `pokebox_teste` e roda os arquivos de `test/integracao/` um por vez. Cada arquivo recria o esquema, sobe o app numa porta aleatória e testa uma parte do jogo via HTTP. Para pular a parte do Docker, defina `DATABASE_URL_TESTE` manualmente. Os testes não dependem do `back/.env`. Os detalhes (helpers, PokeAPI falsa, concorrência, atomicidade) estão no [README do back](../README.md#testes).

**Produção**, uma de duas opções:
- **Render + Neon** (`render.yaml`): Web Service Node 22 no Render (`rootDir: back`, health check em `/api/saude`) com o banco no Neon (`DATABASE_URL` configurado no painel).
- **Máquina própria** (`docker-compose.prod.yml`): sobe só o banco e o back, com a senha do Postgres lida do `.env` da raiz e o banco sem porta exposta. O back precisa ser exposto em https (Cloudflare Tunnel, Caddy...) para o front na Vercel (`VITE_BACK_URL`).

> O `Dockerfile` usa Node 20 e o Render usa Node 22. O código roda nos dois, mas vale alinhar as versões se aparecer alguma diferença entre local e produção.

---

## 10. Onde mexer

| Quero... | Arquivo |
|---|---|
| Mudar preço, prazo, chance ou recompensa | `src/compartilhado/config.js` |
| Mudar a fórmula de status, XP, afeto ou cuidado | `src/nucleo/regras.js` |
| Mudar a força dos pontos, o selvagem, a captura ou o XP da história | `src/features/historia/historia.regras.js` |
| Mudar dano, crítico ou turnos da batalha | `src/nucleo/motor.js` |
| Mudar a tabela de tipos | `src/nucleo/tipos.js` |
| Mudar o que o card mostra no front | `src/features/pokemons/pokemons.view.js` |
| Criar um endpoint numa feature | Em `src/features/<nome>/`: a rota em `<nome>.rotas.js`, a validação no controller, a regra no service e o SQL novo no model |
| Criar uma feature nova | Copiar a estrutura de uma pequena (ex.: `features/time`), expor o que for preciso no `index.js` e montar as rotas em `src/rotas.js` |
| Usar algo de outra feature | Importar pelo `index.js` dela (e exportar lá, se ainda não estiver) |
| Mexer em Pokécoins | `src/banco/carteira.js` (`creditar`, `debitar`): saldo e extrato andam juntos |
| Alterar o banco | Criar um `db/migracoes/NNN_nome.sql` idempotente **e** atualizar `db/db.sql`. Use o próximo número livre: as migrações rodam em ordem alfabética |
| Adicionar um motivo de extrato | Acrescentá-lo ao `CHECK` de `transacoes_pokecoins.motivo` (via migração) |
