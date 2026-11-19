# SOLID

SOLID são cinco princípios de design que ajudam o código a aguentar mudanças. Eles nasceram na orientação a objetos, mas valem para qualquer código organizado em módulos e funções, como o back do PokeBox (JavaScript com CommonJS, quase sem classes).

| Letra | Princípio | Em uma frase |
|---|---|---|
| **S** | Single Responsibility Principle (SRP) | Cada módulo ou função deve ter um único motivo para mudar |
| **O** | Open/Closed Principle (OCP) | Aberto para extensão, fechado para modificação: comportamento novo entra sem editar o que já funciona |
| **L** | Liskov Substitution Principle (LSP) | Quem cumpre um contrato pode substituir qualquer outro que cumpra o mesmo contrato, sem surpresas |
| **I** | Interface Segregation Principle (ISP) | Ninguém deve depender de coisas que não usa |
| **D** | Dependency Inversion Principle (DIP) | A regra de negócio recebe as dependências (banco, rede, relógio), em vez de buscar as implementações concretas |

**Todas as mudanças abaixo já foram aplicadas no código**: o "antes" é como o código era e o "depois" é como ficou. No fim de cada princípio há uma lista do que o projeto já fazia bem.

---

## S — Single Responsibility Principle (SRP)

### S.1 Uma função de leitura que também escreve no banco

**Onde:** [contas.service.js](../src/features/contas/contas.service.js) (`usuarioDaSessao`) e [contas.autenticar.js](../src/features/contas/contas.autenticar.js)

**Problema:** o nome diz "usuário da sessão", mas a função faz duas coisas: descobre quem é o dono do token **e** grava a presença online. São dois motivos para mudar (a regra de sessão e a regra de presença). Também fica impossível perguntar "de quem é este token?" sem marcar a pessoa como online.

#### Antes

```js
// contas.service.js
async function usuarioDaSessao(token) {
  const linha = await model.buscarUsuarioDaSessao(pool, senhas.hashToken(token));
  if (!linha) return null;

  const { ultimo_acesso_em: ultimoAcesso, online_em: onlineEm, ...usuario } = linha;
  const antigo = (data) => !data || Date.now() - data.getTime() > ATUALIZAR_ACESSO_MS;
  if (antigo(ultimoAcesso) || antigo(onlineEm)) await model.marcarAcesso(pool, usuario.id);
  return usuario;
}

// contas.autenticar.js
async function autenticar(req, res, next) {
  const token = tokenDe(req);
  const usuario = token && (await service.usuarioDaSessao(token));
  if (!usuario) {
    res.status(401).json({ erro: 'Faça login para continuar.' });
    return;
  }
  req.usuario = usuario;
  next();
}
```

#### Depois

```js
// contas.service.js
/** Dono do token, com as datas de acesso, ou null se o token não existe ou expirou. Só lê. */
async function buscarSessao(token) {
  return (await model.buscarUsuarioDaSessao(pool, senhas.hashToken(token))) ?? null;
}

/** Marca último acesso e presença online, no máximo a cada ATUALIZAR_ACESSO_MS */
async function registrarPresenca({ id, ultimo_acesso_em: ultimoAcesso, online_em: onlineEm }) {
  const antigo = (data) => !data || Date.now() - data.getTime() > ATUALIZAR_ACESSO_MS;
  if (antigo(ultimoAcesso) || antigo(onlineEm)) await model.marcarAcesso(pool, id);
}

// contas.autenticar.js
async function autenticar(req, res, next) {
  const token = tokenDe(req);
  const sessao = token && (await service.buscarSessao(token));
  if (!sessao) {
    res.status(401).json({ erro: 'Faça login para continuar.' });
    return;
  }
  await service.registrarPresenca(sessao);
  const { ultimo_acesso_em: _a, online_em: _o, ...usuario } = sessao;
  req.usuario = usuario;
  next();
}
```

**Ganho:** cada função faz o que o nome diz. A decisão "esta requisição conta como presença" passa para o middleware, que é quem sabe em que contexto está.

---

### S.2 O service de batalhas cuida de quatro assuntos

**Onde:** [batalhas.service.js](../src/features/batalhas/batalhas.service.js) (340 linhas)

**Problema:** o arquivo tem desafio, jogadas e prazos, recompensas com regras anti-farm e o processamento do agendador. As regras anti-farm (`calcularPremio`) mudam por motivos de balanceamento e não têm relação com o fluxo de turnos. A feature `historia` já resolveu isso separando `historia.regras.js` e `historia.batalha.js`.

#### Antes

```
batalhas.service.js
├── desafiar, responderDesafio, expirarSeVencido          ← desafio
├── calcularPremio, distribuirRecompensas                ← recompensas e anti-farm
├── registrarResultado, resolverPrazo, jogar, ...        ← jogadas e prazos
└── processarPrazosVencidos, expirarDesafios             ← agendador
```

#### Depois

```js
// batalhas.recompensas.js
// Batalhas: quanto cada lado ganha no fim, com os limites anti-farm.
// Sem esses limites, duas contas do mesmo dono poderiam batalhar entre si só para gerar Pokécoins.
const carteira = require('../../banco/carteira');
const config = require('../../compartilhado/config');
const { darXp } = require('../pokemons');
const model = require('./batalhas.model');

async function calcularPremio(client, { usuarioId, oponenteId, base, jogadasManuais }) {
  // ... (igual ao atual)
}

/** Pokécoins para os jogadores e XP para os Pokémon do time de cada um */
async function distribuirRecompensas(client, batalhaId, estado, fim) {
  // ... (igual ao atual)
}

module.exports = { distribuirRecompensas };
```

```js
// batalhas.service.js
const { distribuirRecompensas } = require('./batalhas.recompensas');
// O resto continua igual; o arquivo fica só com desafio, jogadas e prazos
```

**Ganho:** quem for mexer no balanceamento abre um arquivo de ~60 linhas só com isso, e quem for mexer nos turnos não precisa passar pelas regras anti-farm.

### O que já segue o SRP

- **MVC por feature:** rotas (caminhos), controller (lê e valida a requisição), service (regra e transação), model (só SQL) e view (formato do JSON). Os comentários no topo de cada arquivo dizem a responsabilidade dele.
- **[contas.senhas.js](../src/features/contas/contas.senhas.js):** só criptografia, separada da regra de conta.
- **[motor.js](../src/nucleo/motor.js):** só a regra da batalha. Não sabe nada de banco, relógio ou prazo.

---

## O — Open/Closed Principle (OCP)

### O.1 Nova ação de batalha exige editar o `if/else` do motor

**Onde:** [motor.js](../src/nucleo/motor.js) (`aplicarAcao`) e [validacao.js](../src/compartilhado/validacao.js) (`acaoDe`)

**Problema:** para adicionar uma ação nova (por exemplo, usar um item), é preciso abrir `aplicarAcao` e acrescentar mais um `else if` no meio de uma função que já funciona, e lembrar de atualizar a lista de tipos em `acaoDe`.

#### Antes

```js
function aplicarAcao(estadoAtual, indiceJogador, acao, rng = rngSeguro) {
  // ... clone, desistir, conferir a vez

  if (acao.tipo === 'atacar') {
    const fim = acertar(estado, indiceJogador, null, eventos, rng);
    if (fim) return { estado, eventos, fim };
  } else if (acao.tipo === 'golpe') {
    const atacante = eu.pokemons[eu.ativo];
    const golpe = atacante.golpes?.[acao.indice];
    if (!golpe) throw new ErroJogo('Golpe inválido.');
    // ... PP e precisão
  } else if (acao.tipo === 'trocar') {
    // ... validar e trocar
  } else {
    throw new ErroJogo('Ação desconhecida.');
  }

  eu.timeoutsSeguidos = 0;
  estado.vez = outro(indiceJogador);
  return { estado, eventos, fim: null };
}
```

#### Depois

```js
// Cada ação de turno recebe o estado (já clonado) e devolve o fim da batalha, ou null.
// Ação nova = uma entrada nova aqui; aplicarAcao não muda.
const ACOES_DE_TURNO = {
  atacar(estado, indice, acao, eventos, rng) {
    return acertar(estado, indice, null, eventos, rng);
  },

  golpe(estado, indice, acao, eventos, rng) {
    const eu = estado.lados[indice];
    const atacante = eu.pokemons[eu.ativo];
    const golpe = atacante.golpes?.[acao.indice];
    if (!golpe) throw new ErroJogo('Golpe inválido.');
    if (golpe.pp <= 0) throw new ErroJogo('Esse golpe não tem mais PP nesta batalha.');
    golpe.pp -= 1;
    if (golpe.precisao !== null && rng() * 100 >= golpe.precisao) {
      eventos.push({ tipo: 'errou', lado: indice, atacante: atacante.pokemonId, golpe: golpe.nome });
      return null;
    }
    return acertar(estado, indice, golpe, eventos, rng);
  },

  trocar(estado, indice, acao, eventos) {
    const eu = estado.lados[indice];
    const escolhido = eu.pokemons[acao.indice];
    if (!escolhido) throw new ErroJogo('Pokémon inválido.');
    if (acao.indice === eu.ativo) throw new ErroJogo('Esse Pokémon já está em campo.');
    if (escolhido.hp === 0) throw new ErroJogo('Esse Pokémon foi nocauteado.');
    eu.ativo = acao.indice;
    eventos.push({ tipo: 'entrou', lado: indice, indice: acao.indice });
    return null;
  },
};

function aplicarAcao(estadoAtual, indiceJogador, acao, rng = rngSeguro) {
  // ... clone, desistir (pode fora da vez), conferir a vez: igual ao atual

  if (!Object.hasOwn(ACOES_DE_TURNO, acao.tipo)) throw new ErroJogo('Ação desconhecida.');
  const fim = ACOES_DE_TURNO[acao.tipo](estado, indiceJogador, acao, eventos, rng);
  if (fim) return { estado, eventos, fim };

  estado.lados[indiceJogador].timeoutsSeguidos = 0;
  estado.vez = outro(indiceJogador);
  return { estado, eventos, fim: null };
}
```

`desistir` continua tratado antes, porque é a única ação permitida fora da vez. O `Object.hasOwn` é o mesmo cuidado que `aplicarCuidado` já tem, para `'toString'` ou `'constructor'` não serem aceitos como ação.

---

### O.2 Todo erro de regra vira 400, inclusive "não encontrado"

**Onde:** [erros.js](../src/compartilhado/erros.js) e [tratarErros.js](../src/compartilhado/middlewares/tratarErros.js)

**Problema:** o tratador só conhece `ErroJogo` e sempre responde 400. "Pokémon não encontrado" e "Batalha não encontrada" deveriam ser 404, mas para isso hoje seria preciso abrir o tratador e acrescentar um `if` para cada tipo novo de erro.

#### Antes

```js
// erros.js
class ErroJogo extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroJogo';
  }
}

// tratarErros.js
if (erro instanceof ErroJogo) {
  res.status(400).json({ erro: erro.message });
  return;
}
```

#### Depois

```js
// erros.js
// Erro de regra do jogo. Cada tipo diz o próprio status HTTP; o tratarErros só repassa.
class ErroJogo extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.name = 'ErroJogo';
    this.status = status;
  }
}

class NaoEncontrado extends ErroJogo {
  constructor(mensagem) {
    super(mensagem, 404);
    this.name = 'NaoEncontrado';
  }
}

module.exports = { ErroJogo, NaoEncontrado };

// tratarErros.js
if (erro instanceof ErroJogo) {
  res.status(erro.status).json({ erro: erro.message });
  return;
}

// pokemons.service.js
if (!pokemon || pokemon.dono_id !== usuarioId) throw new NaoEncontrado('Pokémon não encontrado.');
```

**Ganho:** um erro novo (por exemplo, `SemSaldo` com 402 ou `Conflito` com 409) é só uma classe nova. O `tratarErros` não muda mais.

**Critério usado:** vira 404 só o que vem **na URL** (`/batalhas/:id`, `/pokemons/:id`, `/anuncios/:id`, `/propostas/:id`, `/historia/encontros/:id`, `/vitrines/:login`). Uma referência que vem **no corpo** continua 400, porque a rota existe e o que está errado é o dado enviado. É o caso do `oponente` ao desafiar e do `pokemonId` ao anunciar.

**Impacto da mudança na API:**
- **Front:** só trata o 401 de forma especial. Nos outros casos ele mostra `erro` do corpo, então nada muda para o jogador.
- **[openapi.yaml](openapi.yaml):** ganhou a resposta `NaoEncontrado` nas 18 rotas afetadas.
- **Testes de integração:** passaram a esperar 404 nesses casos.

**Bug que a mudança revelou:** com 404, o teste de "dois cliques em evoluir" mostrou que o segundo clique recebia "Pokémon não encontrado" mesmo com o Pokémon existindo. A causa era `travarParaEvolucao` (e `travarParaXp`) travar com `JOIN especies ... FOR UPDATE OF p`. Depois de esperar a trava, o Postgres reconfere o JOIN com o card já evoluído e a espécie antiga, e a linha some. No XP isso era pior: um card que evoluísse no mesmo instante em que a batalha terminava perdia o XP sem aviso. Agora as duas funções travam só `pokemons` e leem a espécie numa consulta separada ([pokemons.model.js](../src/features/pokemons/pokemons.model.js)).

### O que já segue o OCP

- **Cuidados ([config.js](../src/compartilhado/config.js) `CUIDADOS`):** um cuidado novo é uma entrada nova no objeto. `aplicarCuidado` e `disponibilidadeCuidados` percorrem a configuração e não precisam mudar.
- **Roleta de golpes ([golpes.service.js](../src/features/golpes/golpes.service.js) `sortearECobrar`):** o fluxo de sortear e cobrar é fixo, e o que muda entre roleta e desbloqueio vem num objeto `regras`. Uma terceira forma de ganhar golpes seria só um novo objeto de regras.
- **Tabela de tipos ([tipos.js](../src/nucleo/tipos.js)) e ordenações do mercado (`ORDENS_MERCADO`, `ORDENS_ANUNCIOS`):** dado em vez de `if`. Um tipo ou uma ordenação nova é uma linha na tabela.

---

## L — Liskov Substitution Principle (LSP)

Em JavaScript quase não há herança no projeto, mas o princípio vale para **contratos**: se várias coisas são usadas no mesmo lugar, todas precisam se comportar do jeito que esse lugar espera, sem exceções escondidas.

### L.1 O ataque básico não é um golpe, e o motor precisa saber disso

**Onde:** [motor.js](../src/nucleo/motor.js) (`calcularDano` e `acertar`)

**Problema:** o ataque básico é representado por `golpe = null`. Por isso, cada lugar que usa o golpe precisa perguntar "é golpe de verdade?" antes (`golpe ? ... : ...`). O ataque básico não pode substituir um golpe: ele quebra o contrato `{ tipo, poder, precisao }`.

#### Antes

```js
function calcularDano(atacante, defensor, rng, golpe = null) {
  const multiplicadorTipo = golpe ? efetividade(golpe.tipo, defensor.tipos) : 1;
  if (multiplicadorTipo === 0) return { dano: 0, critico: false, efetividade: 0 };
  // ...
  const poder = golpe ? golpe.poder : config.PODER_ATAQUE;
  const stab = golpe && atacante.tipos?.includes(golpe.tipo) ? config.MULT_MESMO_TIPO : 1;
  // ...
}
```

#### Depois

```js
// O ataque básico cumpre o mesmo contrato de um golpe: sem tipo (neutro contra todos e sem STAB),
// com o poder fixo da configuração e sem precisão (nunca erra)
const ATAQUE_BASICO = Object.freeze({
  id: null, nome: null, tipo: null, classe: 'physical', poder: config.PODER_ATAQUE, precisao: null, pp: Infinity, ppMax: Infinity,
});

function calcularDano(atacante, defensor, rng, golpe = ATAQUE_BASICO) {
  const multiplicadorTipo = golpe.tipo ? efetividade(golpe.tipo, defensor.tipos) : 1;
  if (multiplicadorTipo === 0) return { dano: 0, critico: false, efetividade: 0 };
  // ...
  const poder = golpe.poder;
  const stab = golpe.tipo && atacante.tipos?.includes(golpe.tipo) ? config.MULT_MESMO_TIPO : 1;
  // ...
}
```

Quem chama passa a enviar `ATAQUE_BASICO` em vez de `null` (no `atacar` de `aplicarAcao` e no exemplo do O.1). Isso importa porque o valor padrão de um parâmetro só entra com `undefined`, não com `null`.

As fórmulas não precisam mais saber se é ataque básico ou golpe: qualquer objeto com `{ tipo, poder, precisao }` serve. O único lugar que continua diferenciando é o evento enviado ao front (`...(golpe !== ATAQUE_BASICO && { golpe: golpe.nome, ... })`), porque o front mostra os dois de jeitos diferentes.

**Ganho:** um golpe novo com regra própria (por exemplo, poder fixo ou precisão 100) entra pelo mesmo caminho, sem mais um `golpe ?` em cada fórmula.

---

### L.2 `Db` pode ser o pool ou um client, mas nem toda função aceita os dois

**Onde:** todos os models (o comentário "Toda função recebe `db` primeiro: o pool ou o client de uma transação") e as funções `travar*`

**Problema:** o contrato `Db = Pool | PoolClient` é um bom exemplo de LSP: para um `SELECT` simples, tanto faz qual dos dois chega. Mas as funções com `FOR UPDATE` quebram essa substituição sem avisar. Com o `pool`, cada consulta roda na própria transação automática, e a trava some assim que a consulta termina. O código "funciona" nos testes manuais e falha só com dois cliques ao mesmo tempo.

#### Antes

```js
// O nome do parâmetro (client) é a única pista de que o pool não serve
async function travarUsuario(client, usuarioId) {
  await client.query('SELECT 1 FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
}
```

#### Depois

```js
// src/banco/travas.js (o mesmo módulo proposto no DRY.md)
const { Pool } = require('pg');

/** As travas só valem dentro de uma transação: com o pool, a trava acabaria na mesma hora */
function exigirTransacao(client) {
  if (client instanceof Pool) throw new Error('Trava chamada fora de uma transação (recebeu o pool).');
}

/**
 * @param {import('pg').PoolClient} client  client de uma transação aberta com transacao()
 */
async function travarUsuarios(client, ids) {
  exigirTransacao(client);
  await client.query('SELECT 1 FROM usuarios WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids]);
}
```

**Ganho:** o contrato fica explícito (no JSDoc e numa checagem em tempo de execução), e o erro aparece no primeiro teste em vez de virar uma condição de corrida em produção. Coberto em [test/unit/travas.test.js](../test/unit/travas.test.js).

### O que já segue o LSP

- **O Pokémon selvagem como `Lado`** ([historia.batalha.js](../src/features/historia/historia.batalha.js) `montarSelvagem`): o selvagem é montado no mesmo formato do lado de um treinador (`usuarioId: null`, `pokemonId: 0`, `golpes: []`), e o motor de batalha funciona com ele sem nenhuma mudança. Para deixar o contrato completo, falta documentar no `@typedef Lado` de [motor.js](../src/nucleo/motor.js) que `usuarioId` pode ser `null`.
- **`ErroJogo extends Error`:** qualquer código que trata `Error` funciona com `ErroJogo`. A proposta do O.2 mantém isso: `NaoEncontrado` continua passando em `instanceof ErroJogo`.

---

## I — Interface Segregation Principle (ISP)

### I.1 O mercado busca o card completo para depois jogar metade fora

**Onde:** [trocas.model.js](../src/features/trocas/trocas.model.js) (`SELECT_ANUNCIO` usa `CAMPOS_CARD`) e [trocas.view.js](../src/features/trocas/trocas.view.js) (`cardPublico`)

**Problema:** `CAMPOS_CARD` foi feito para a coleção do dono e inclui três subconsultas por card (último cuidado de cada tipo, se está anunciado e os golpes). O mercado não usa nada disso: `cardPublico` monta o card inteiro e depois copia só os campos públicos. A troca depende de uma "interface" muito maior do que precisa. Qualquer mudança no card do dono pode afetar o mercado, e cada listagem de até 100 anúncios roda subconsultas desnecessárias.

#### Antes

```js
// trocas.model.js
const SELECT_ANUNCIO = `
  SELECT ${CAMPOS_CARD}, a.id AS anuncio_id, a.preco, /* ... */
    FROM anuncios a
    JOIN pokemons p ON p.id = a.pokemon_id
    /* ... */`;

// trocas.view.js
function cardPublico(linha) {
  const completo = card({ ...linha, afeto: 0 });
  return {
    id: completo.id,
    mintNumero: completo.mintNumero,
    // ... copia 11 campos do card completo
    ivTotal: Object.values(completo.ivs).reduce((soma, iv) => soma + iv, 0),
    status: completo.status,
    alturaM: completo.alturaM,
    pesoKg: completo.pesoKg,
  };
}
```

#### Depois

```js
// pokemons.model.js: só o que o card público usa
const CAMPOS_CARD_PUBLICO = `p.id, p.mint_numero, p.especie_id, p.shiny, p.nivel,
  p.iv_hp, p.iv_ataque, p.iv_defesa, p.iv_velocidade, p.mult_altura, p.mult_peso,
  p.bonus_hp, p.bonus_ataque, p.bonus_defesa, p.bonus_velocidade,
  e.nome, e.tipos, e.raridade, e.hp_base, e.ataque_base, e.defesa_base, e.velocidade_base,
  e.altura_base, e.peso_base`;

// pokemons.view.js: o card público mora com o card do dono, e cada um usa só o que precisa
/** O que qualquer treinador vê de um card. Sem afeto (ele zera na troca), então os status vêm sem esse bônus. */
function cardPublico(linha) {
  const ivs = {
    hp: linha.iv_hp, ataque: linha.iv_ataque, defesa: linha.iv_defesa, velocidade: linha.iv_velocidade,
  };
  return {
    id: linha.id,
    mintNumero: linha.mint_numero,
    especieId: linha.especie_id,
    nome: linha.nome,
    tipos: linha.tipos,
    raridade: linha.raridade,
    shiny: linha.shiny,
    nivel: linha.nivel,
    ivs,
    ivTotal: ivs.hp + ivs.ataque + ivs.defesa + ivs.velocidade,
    status: calcularStatus(linha, { ...linha, afeto: 0 }),
    ...medidas(linha, linha),
  };
}
```

```js
// trocas.model.js
const { CAMPOS_CARD_PUBLICO } = require('../pokemons');
const SELECT_ANUNCIO = `
  SELECT ${CAMPOS_CARD_PUBLICO}, a.id AS anuncio_id, a.preco, /* ... */`;

// trocas.view.js
const { cardPublico } = require('../pokemons');
// anuncio(linha) usa cardPublico(linha) como hoje
```

**Ganho:** o mercado depende só do contrato público do card, e a consulta fica mais leve. O card do dono pode ganhar campos novos sem afetar o mercado.

### O que já segue o ISP

- **`index.js` de cada feature:** cada feature expõe só o que as outras usam (`contas` expõe `autenticar`, `loja` expõe `sortearEspecieDaLoja`, `batalhas` expõe `carregarTime`...), não o service inteiro. As exceções estão em [YAGNI.md](YAGNI.md#1-a-vitrine-exporta-funções-que-ninguém-de-fora-usa).
- **[carteira.js](../src/banco/carteira.js):** quatro funções pequenas (`lerSaldo`, `creditar`, `debitar`, `registrarNoExtrato`). Quem só precisa ler o saldo não depende da lógica de débito.
- **`motor.montarLado(usuario, time)`:** do usuário, só pede `{ id, login }`. Por isso a história consegue chamá-lo com o resultado de `buscarTreinador`, sem montar um usuário completo.

---

## D — Dependency Inversion Principle (DIP)

### D.1 Os services buscam o banco e a PokeAPI direto no `require`

**Onde:** todos os services. O exemplo mais claro é [especies.service.js](../src/features/especies/especies.service.js)

**Problema:** a regra "busca no cache; se não tiver, busca na PokeAPI e guarda" depende das implementações concretas: o `pool` do Postgres e o módulo que faz `fetch`. Para testar só essa regra, hoje é preciso subir um banco de verdade e trocar o `fetch` global ([test/helpers/pokeapi-fake.js](../test/helpers/pokeapi-fake.js) faz isso com `mock.method(globalThis, 'fetch', ...)`). Funciona, mas qualquer outro `fetch` do processo é afetado junto, e o teste fica lento.

#### Antes

```js
// especies.service.js
const { pool } = require('../../banco/db');
const model = require('./especies.model');
const pokeapi = require('./especies.pokeapi');

async function garantirEspecie(id) {
  const salva = await model.buscarPorId(pool, id);
  if (salva) {
    if (salva.taxa_captura == null) salva.taxa_captura = await garantirTaxaCaptura(id);
    return salva;
  }
  const especie = await pokeapi.buscarEspecie(id);
  await model.inserir(pool, especie);
  return especie;
}

module.exports = { garantirEspecie, garantirTaxaCaptura };
```

#### Depois

```js
// especies.service.js
// A regra recebe de fora onde guardar (db) e de onde buscar (pokeapi).
// O módulo continua exportando uma instância pronta, então quem usa não muda nada.
const { pool } = require('../../banco/db');
const model = require('./especies.model');
const pokeapiReal = require('./especies.pokeapi');

function criarServicoEspecies({ db = pool, pokeapi = pokeapiReal } = {}) {
  async function garantirTaxaCaptura(id) {
    const salva = await model.lerTaxaCaptura(db, id);
    if (salva != null) return salva;
    const taxaCaptura = await pokeapi.buscarTaxaCaptura(id);
    await model.salvarTaxaCaptura(db, id, taxaCaptura);
    return taxaCaptura;
  }

  async function garantirEspecie(id) {
    const salva = await model.buscarPorId(db, id);
    if (salva) {
      if (salva.taxa_captura == null) salva.taxa_captura = await garantirTaxaCaptura(id);
      return salva;
    }
    const especie = await pokeapi.buscarEspecie(id);
    await model.inserir(db, especie);
    return especie;
  }

  return { garantirEspecie, garantirTaxaCaptura };
}

module.exports = { ...criarServicoEspecies(), criarServicoEspecies };
```

```js
// teste unitário, sem banco e sem rede
const { criarServicoEspecies } = require('../../src/features/especies/especies.service');

const consultas = [];
const dbFalso = { query: async (sql, params) => { consultas.push(sql); return { rows: [] }; } };
const pokeapiFalsa = { buscarEspecie: async (id) => ({ id, nome: 'pikachu', /* ... */ }) };

const { garantirEspecie } = criarServicoEspecies({ db: dbFalso, pokeapi: pokeapiFalsa });
const especie = await garantirEspecie(25);
// confere que buscou na PokeAPI e mandou um INSERT
```

**Ganho:** a regra do cache passa a ser testável em milissegundos, e os testes de integração com banco de verdade continuam existindo para o resto. Os testes estão em [test/unit/especies-servico.test.js](../test/unit/especies-servico.test.js) (espécie nova, espécie já salva e espécie antiga sem taxa de captura).

**Quando aplicar:** fazer isso em todos os services de uma vez seria muito trabalho para pouco ganho, porque os testes de integração já cobrem bem o projeto. Vale começar pelos services que falam com algo externo (PokeAPI): `especies` e `golpes`.

### O que já segue o DIP

- **Sorteios (`rng`):** as funções do jogo recebem o gerador de números aleatórios por parâmetro (`sortearAtributos(rng)`, `aplicarAcao(..., rng)`, `comprarPokemonAleatorio(..., rng)`), com o seguro como padrão. Os testes passam um `rng` fixo e o resultado fica previsível. É exatamente o padrão proposto no D.1, aplicado ao acaso.
- **`db` como primeiro parâmetro dos models:** quem chama decide se a consulta roda avulsa (`pool`) ou dentro de uma transação (`client`). O model não decide isso sozinho.
- **Relógio nas regras puras:** `bemEstarAtual(pokemon, agora)` e `aplicarCuidado(..., agora)` recebem a hora por parâmetro. O próximo passo seria fazer o mesmo nos services, que hoje criam `new Date()` direto.
