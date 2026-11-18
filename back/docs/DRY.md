# DRY (Don't Repeat Yourself)

> "Todo conhecimento deve ter uma representação única, inequívoca e oficial dentro do sistema."

DRY não é "nunca escrever duas linhas parecidas". É **não espalhar a mesma regra ou decisão em vários lugares**: quando ela mudar, só um lugar precisa mudar. Duas linhas iguais que representam coisas diferentes podem (e às vezes devem) continuar separadas.

Este documento mostra onde o back do PokeBox repetia conhecimento e como essa repetição foi centralizada. **Todas as mudanças abaixo, inclusive as da tabela "Outras repetições menores", já foram aplicadas no código**: o "antes" é como o código era e o "depois" é como ficou.

---

## 1. Travar o usuário: a mesma função em 5 models

**Onde:** [loja.model.js](../src/features/loja/loja.model.js), [time.model.js](../src/features/time/time.model.js), [vitrines.model.js](../src/features/vitrines/vitrines.model.js), [batalhas.model.js](../src/features/batalhas/batalhas.model.js), [historia.model.js](../src/features/historia/historia.model.js) e uma variação em [trocas.model.js](../src/features/trocas/trocas.model.js)

**Problema:** a trava contra "dois cliques ao mesmo tempo" é uma regra do sistema inteiro, mas está copiada em cada feature. Se um dia a trava precisar mudar (por exemplo, `FOR NO KEY UPDATE` para travar menos), é preciso lembrar de 6 lugares, e é fácil esquecer um.

### Antes

```js
// loja.model.js
async function travarUsuario(client, usuarioId) {
  await client.query('SELECT 1 FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
}

// time.model.js (igual)
async function travarUsuario(client, usuarioId) {
  await client.query('SELECT 1 FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
}

// vitrines.model.js, batalhas.model.js, historia.model.js: a mesma função de novo

// trocas.model.js (a versão para vários usuários)
async function travarUsuarios(client, ids) {
  await client.query('SELECT 1 FROM usuarios WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids]);
}
```

### Depois

Um módulo em `src/banco/`, ao lado de `carteira.js` e `busca.js`, que já guardam ajudas de banco usadas por várias features:

```js
// src/banco/travas.js
// Travas de linha usadas por várias features para dois cliques não passarem juntos.
// Só funcionam com o client de uma transação: com o pool a trava acaba na hora.

/** Trava vários usuários, sempre em ordem de id, para duas operações cruzadas não se travarem */
async function travarUsuarios(client, ids) {
  await client.query('SELECT 1 FROM usuarios WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids]);
}

/** Trava a linha do usuário até o fim da transação */
const travarUsuario = (client, usuarioId) => travarUsuarios(client, [usuarioId]);

module.exports = { travarUsuario, travarUsuarios };
```

```js
// loja.service.js (e time, vitrines, batalhas, historia, trocas)
const { travarUsuario } = require('../../banco/travas');

return transacao(async (client) => {
  await travarUsuario(client, usuarioId);
  // ...
});
```

**Ganho:** a regra "como travar um usuário" passa a existir num lugar só, e os 6 models perdem uma função que não era deles.

---

## 2. Ler a lista `pokemonIds` do corpo: o mesmo bloco em 3 controllers

**Onde:** [time.controller.js](../src/features/time/time.controller.js), [vitrines.controller.js](../src/features/vitrines/vitrines.controller.js), [trocas.controller.js](../src/features/trocas/trocas.controller.js) e as validações "Pokémon diferentes" em [time.service.js](../src/features/time/time.service.js), [vitrines.service.js](../src/features/vitrines/vitrines.service.js) e [trocas.service.js](../src/features/trocas/trocas.service.js)

**Problema:** o formato de entrada "lista de ids de Pokémon" aparece em três rotas, e cada uma repete a checagem de array, a conversão de cada id e a checagem de repetidos.

### Antes

```js
// time.controller.js
if (!Array.isArray(req.body.pokemonIds)) throw new ErroJogo('Envie a lista pokemonIds.');
await service.definirTime(req.usuario.id, req.body.pokemonIds.map((id) => inteiro(id, 'Pokémon')));

// vitrines.controller.js
if (!Array.isArray(pokemonIds)) throw new ErroJogo('Envie a lista pokemonIds.');
// ...
pokemonIds: pokemonIds.map((id) => inteiro(id, 'Pokémon')),

// trocas.controller.js
if (!Array.isArray(pokemonIds)) throw new ErroJogo('Envie a lista pokemonIds.');
// ...
pokemonIds: pokemonIds.map((id) => inteiro(id, 'Pokémon')),
```

```js
// time.service.js
if (pokemonIds.length !== config.TAMANHO_TIME || new Set(pokemonIds).size !== pokemonIds.length) { ... }

// vitrines.service.js
if (pokemonIds.length > config.DESTAQUES_VITRINE || new Set(pokemonIds).size !== pokemonIds.length) { ... }

// trocas.service.js
if (pokemonIds.length > config.POKEMONS_POR_PROPOSTA || new Set(pokemonIds).size !== pokemonIds.length) { ... }
```

### Depois

```js
// src/compartilhado/validacao.js
/** Lista de ids de Pokémon vinda do corpo, cada um já validado como inteiro positivo */
function pokemonIds(valor) {
  if (!Array.isArray(valor)) throw new ErroJogo('Envie a lista pokemonIds.');
  return valor.map((id) => inteiro(id, 'Pokémon'));
}

/** true se algum item aparece mais de uma vez */
const temRepetidos = (lista) => new Set(lista).size !== lista.length;
```

```js
// time.controller.js
await service.definirTime(req.usuario.id, pokemonIds(req.body.pokemonIds));

// vitrines.controller.js
pokemonIds: pokemonIds(req.body.pokemonIds),

// trocas.controller.js (a proposta aceita lista vazia)
pokemonIds: pokemonIds(req.body.pokemonIds ?? []),
```

```js
// time.service.js
if (ids.length !== config.TAMANHO_TIME || temRepetidos(ids)) { ... }
```

**Ganho:** o contrato de entrada fica num lugar só (mensagem de erro igual em todas as rotas) e o `new Set(...).size !== ...length`, que pede um segundo para ser entendido, ganha um nome.

---

## 3. Time e vitrine: mesmas consultas, só muda a coluna

**Onde:** [time.model.js](../src/features/time/time.model.js) e [vitrines.model.js](../src/features/vitrines/vitrines.model.js), com a regra "algum desses Pokémon não é seu" repetida em [time.service.js](../src/features/time/time.service.js) e [vitrines.service.js](../src/features/vitrines/vitrines.service.js)

**Problema:** `contarPokemonsDoDono` é idêntica nos dois models, e `definirPosicoes`/`definirDestaques` só diferem no nome da coluna (`posicao_time` × `posicao_vitrine`). As duas mexem na tabela `pokemons`, que pertence à feature `pokemons`.

### Antes

```js
// time.model.js
async function contarPokemonsDoDono(db, pokemonIds, usuarioId) {
  const { rowCount } = await db.query('SELECT 1 FROM pokemons WHERE id = ANY($1) AND dono_id = $2', [pokemonIds, usuarioId]);
  return rowCount;
}

async function definirPosicoes(client, usuarioId, pokemonIds) {
  await client.query('UPDATE pokemons SET posicao_time = NULL WHERE dono_id = $1', [usuarioId]);
  for (const [i, id] of pokemonIds.entries()) {
    await client.query('UPDATE pokemons SET posicao_time = $2 WHERE id = $1', [id, i + 1]);
  }
}

// vitrines.model.js: contarPokemonsDoDono igual, e definirDestaques igual trocando a coluna
async function definirDestaques(client, usuarioId, pokemonIds) {
  await client.query('UPDATE pokemons SET posicao_vitrine = NULL WHERE dono_id = $1', [usuarioId]);
  for (const [i, id] of pokemonIds.entries()) {
    await client.query('UPDATE pokemons SET posicao_vitrine = $2 WHERE id = $1', [id, i + 1]);
  }
}
```

```js
// time.service.js e vitrines.service.js
const meus = await model.contarPokemonsDoDono(client, pokemonIds, usuarioId);
if (meus !== pokemonIds.length) throw new ErroJogo('Algum desses Pokémon não é seu.');
```

### Depois

```js
// pokemons.model.js
// Colunas de ordem do card. A coluna entra no SQL, então só nomes desta lista são aceitos.
const COLUNAS_DE_POSICAO = new Set(['posicao_time', 'posicao_vitrine']);

async function contarDoDono(db, pokemonIds, donoId) {
  const { rowCount } = await db.query('SELECT 1 FROM pokemons WHERE id = ANY($1) AND dono_id = $2', [pokemonIds, donoId]);
  return rowCount;
}

/** Grava a ordem recebida (posição 1, 2, 3...) na coluna escolhida */
async function definirPosicoes(client, donoId, coluna, pokemonIds) {
  if (!COLUNAS_DE_POSICAO.has(coluna)) throw new Error(`Coluna de posição inválida: ${coluna}`);
  // Limpa antes de gravar para não esbarrar no UNIQUE (dono_id, coluna)
  await client.query(`UPDATE pokemons SET ${coluna} = NULL WHERE dono_id = $1`, [donoId]);
  for (const [i, id] of pokemonIds.entries()) {
    await client.query(`UPDATE pokemons SET ${coluna} = $2 WHERE id = $1`, [id, i + 1]);
  }
}
```

```js
// pokemons.service.js (exportado pelo index.js da feature)
async function garantirQueSaoDoDono(client, donoId, pokemonIds) {
  const meus = await model.contarDoDono(client, pokemonIds, donoId);
  if (meus !== pokemonIds.length) throw new ErroJogo('Algum desses Pokémon não é seu.');
}

const definirOrdem = (client, donoId, coluna, pokemonIds) => model.definirPosicoes(client, donoId, coluna, pokemonIds);
```

```js
// time.service.js
const { garantirQueSaoDoDono, definirOrdem } = require('../pokemons');

await garantirQueSaoDoDono(client, usuarioId, pokemonIds);
// ... checagem de anúncio ativo, que é só do time
await definirOrdem(client, usuarioId, 'posicao_time', pokemonIds);

// vitrines.service.js
await garantirQueSaoDoDono(client, usuarioId, pokemonIds);
await model.salvarApresentacao(client, usuarioId, { bio, estilo });
await definirOrdem(client, usuarioId, 'posicao_vitrine', pokemonIds);
```

**Cuidado:** o nome da coluna é interpolado no SQL. Por isso a lista `COLUNAS_DE_POSICAO`: o valor nunca pode vir do usuário.

---

## 4. Colunas do encontro da história escritas duas vezes

**Onde:** [historia.model.js](../src/features/historia/historia.model.js)

**Problema:** a lista de colunas que a tela e a batalha precisam da espécie está em `SELECT_ENCONTRO` e de novo, à mão, em `listarUltimosPorPonto` (que precisa do `DISTINCT ON`). Se a batalha passar a usar mais um campo da espécie e só a constante for atualizada, a tela da trilha recebe o encontro sem esse campo, e o erro só aparece em produção.

### Antes

```js
const SELECT_ENCONTRO = `
  SELECT h.*, e.nome, e.tipos, e.raridade, e.taxa_captura, e.hp_base, e.ataque_base, e.defesa_base, e.velocidade_base
    FROM historia_encontros h JOIN especies e ON e.id = h.especie_id`;

async function listarUltimosPorPonto(db, usuarioId) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (h.trilha, h.ponto)
            h.*, e.nome, e.tipos, e.raridade, e.taxa_captura, e.hp_base, e.ataque_base, e.defesa_base, e.velocidade_base
       FROM historia_encontros h JOIN especies e ON e.id = h.especie_id
      WHERE h.usuario_id = $1
      ORDER BY h.trilha, h.ponto, h.id DESC`,
    [usuarioId],
  );
  return rows;
}
```

### Depois

```js
// Encontro + o que a tela e a batalha precisam da espécie
const CAMPOS_ENCONTRO = `h.*, e.nome, e.tipos, e.raridade, e.taxa_captura,
  e.hp_base, e.ataque_base, e.defesa_base, e.velocidade_base`;
const FROM_ENCONTRO = 'historia_encontros h JOIN especies e ON e.id = h.especie_id';
const SELECT_ENCONTRO = `SELECT ${CAMPOS_ENCONTRO} FROM ${FROM_ENCONTRO}`;

async function listarUltimosPorPonto(db, usuarioId) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (h.trilha, h.ponto) ${CAMPOS_ENCONTRO}
       FROM ${FROM_ENCONTRO}
      WHERE h.usuario_id = $1
      ORDER BY h.trilha, h.ponto, h.id DESC`,
    [usuarioId],
  );
  return rows;
}
```

**Ganho:** é o mesmo padrão que `pokemons.model.js` já usa com `CAMPOS_CARD`: uma lista de campos, usada em todas as consultas que montam o mesmo objeto.

---

## 5. "Pokémon não encontrado" checado do mesmo jeito em 3 lugares

**Onde:** [pokemons.service.js](../src/features/pokemons/pokemons.service.js) (`evoluir` e `cuidar`) e [golpes.service.js](../src/features/golpes/golpes.service.js) (`buscarPokemonDoUsuario`)

**Problema:** a regra "um card que não é seu é tratado como inexistente", que é de segurança, está escrita três vezes. A golpes já tem uma função para isso; a pokemons repete o `if`.

### Antes

```js
// pokemons.service.js, em evoluir
const pokemon = await model.travarParaEvolucao(client, pokemonId);
if (!pokemon || pokemon.dono_id !== usuarioId) throw new ErroJogo('Pokémon não encontrado.');

// pokemons.service.js, em cuidar
const pokemon = await model.travarParaCuidado(client, pokemonId);
if (!pokemon || pokemon.dono_id !== usuarioId) throw new ErroJogo('Pokémon não encontrado.');

// golpes.service.js
const pokemon = await model.buscarPokemon(db, pokemonId, opcoes);
if (!pokemon || pokemon.dono_id !== usuarioId) throw new ErroJogo('Pokémon não encontrado.');
```

### Depois

```js
// pokemons.service.js (exportado pelo index.js para a golpes usar também)
/** Devolve o card se for do usuário; senão age como se ele não existisse */
function doDono(pokemon, usuarioId) {
  if (!pokemon || pokemon.dono_id !== usuarioId) throw new ErroJogo('Pokémon não encontrado.');
  return pokemon;
}

// em evoluir
const pokemon = doDono(await model.travarParaEvolucao(client, pokemonId), usuarioId);

// em cuidar
const pokemon = doDono(await model.travarParaCuidado(client, pokemonId), usuarioId);
```

---

## Outras repetições menores

| Onde | O que se repete | Sugestão |
|---|---|---|
| [batalhas.service.js](../src/features/batalhas/batalhas.service.js) (2x) e [historia.service.js](../src/features/historia/historia.service.js) | `time.length !== config.TAMANHO_TIME` antes de batalhar | `timeCompleto(time)` exportada junto com `carregarTime` |
| [contas.model.js](../src/features/contas/contas.model.js), [batalhas.model.js](../src/features/batalhas/batalhas.model.js), [vitrines.model.js](../src/features/vitrines/vitrines.model.js) | `WHERE lower(login) = lower($1)` | Uma função `buscarPorLogin` na feature contas, que é dona da tabela `usuarios` |
| [motor.js](../src/nucleo/motor.js) (`montarLado`) e [pokemons.view.js](../src/features/pokemons/pokemons.view.js) | O mapeamento `{ id, nome, tipo, classe, poder, precisao, pp }` de um golpe | Uma função `resumoGolpe(g)` no núcleo |
| [pokemons.controller.js](../src/features/pokemons/pokemons.controller.js) e [regras.js](../src/nucleo/regras.js) (`aplicarCuidado`) | `Object.hasOwn(config.CUIDADOS, tipo)` com a mesma mensagem | Exportar de `regras.js` uma `tipoDeCuidado(tipo)` e usar nos dois |
| [regras.js](../src/nucleo/regras.js) (`calcularStatus`) | `comBonus(escala(base, iv) + 5) + (bonus ?? 0)` para ataque, defesa e velocidade | Uma função interna `statusComum('ataque')`; o PS continua separado porque a fórmula é outra |

---

## Onde o DRY já está aplicado

- **[carteira.js](../src/banco/carteira.js):** toda entrada e saída de Pokécoins passa por `creditar`/`debitar`, então ninguém esquece de registrar no extrato.
- **[config.js](../src/compartilhado/config.js):** preços, chances e limites ficam num lugar só, e as mensagens de erro leem de lá (`` `Você já tem ${config.ANUNCIOS_ATIVOS_MAXIMO} anúncios ativos.` ``), em vez de repetir o número no texto.
- **[validacao.js](../src/compartilhado/validacao.js) (`acaoDe`):** batalhas e história leem a jogada do corpo com a mesma função.
- **[busca.js](../src/banco/busca.js):** o escape do `ILIKE` é escrito uma vez e usado por `comecaCom` e `contem`.
- **[batalhas.agendador.js](../src/features/batalhas/batalhas.agendador.js):** `logSeHouver` substituiu duas linhas de log com a mesma estrutura (o comentário no arquivo mostra o antes).

## Quando NÃO aplicar DRY

- **Coincidência não é repetição.** `RECOMPENSA_VENCEDOR` e `RECOMPENSA_PERDEDOR` têm o mesmo formato, mas são regras de balanceamento diferentes e mudam por motivos diferentes. Juntá-las numa coisa só atrapalharia.
- **Abstração cedo demais custa caro.** Se duas funções ficaram parecidas por acaso e a abstração precisaria de vários `if` para atender as duas, a cópia é mais barata. A regra prática é esperar a terceira repetição.
