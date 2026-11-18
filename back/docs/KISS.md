# KISS (Keep It Simple, Stupid)

> "A maioria dos sistemas funciona melhor quando é mantida simples, e não complicada."

KISS é escolher a forma **mais fácil de ler e de mudar** que ainda resolve o problema. Código simples não é código curto: uma linha esperta que precisa de um minuto para ser entendida é menos simples que três linhas óbvias.

Este documento mostra trechos do back do PokeBox que podem ficar mais diretos sem mudar o comportamento. Os exemplos são **propostas**: o "antes" é o código atual e o "depois" é a mudança sugerida.

---

## 1. Parâmetro booleano que muda o que a função devolve

**Onde:** [contas.controller.js](../src/features/contas/contas.controller.js)

**Problema:** `dadosConta(corpo, { comSenha })` devolve formatos diferentes conforme a flag. Quem lê `dadosConta(req.body, { comSenha: false })` precisa abrir a função para saber o que volta, e a flag cria um `return` no meio do caminho.

### Antes

```js
/** Login, celular e (se `comSenha`) senha do corpo, já validados */
function dadosConta(corpo, { comSenha = true } = {}) {
  const login = texto(corpo.login, 'o usuário');
  if (login.length > LOGIN_MAXIMO) throw new ErroJogo(`O usuário pode ter no máximo ${LOGIN_MAXIMO} caracteres.`);
  const celular = texto(corpo.celular, 'o celular');
  if (!CELULAR.test(celular)) throw new ErroJogo('Informe um celular válido com DDD.');
  if (!comSenha) return { login, celular };
  if (typeof corpo.senha !== 'string' || corpo.senha.length < SENHA_MINIMA) {
    throw new ErroJogo(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
  }
  return { login, celular, senha: corpo.senha };
}

async function verificar(req, res) {
  const { login, celular } = dadosConta(req.body, { comSenha: false });
  // ...
}
```

### Depois

```js
/** Login e celular do corpo, já validados */
function loginECelular(corpo) {
  const login = texto(corpo.login, 'o usuário');
  if (login.length > LOGIN_MAXIMO) throw new ErroJogo(`O usuário pode ter no máximo ${LOGIN_MAXIMO} caracteres.`);
  const celular = texto(corpo.celular, 'o celular');
  if (!CELULAR.test(celular)) throw new ErroJogo('Informe um celular válido com DDD.');
  return { login, celular };
}

/** Login, celular e senha nova do corpo, já validados */
function dadosConta(corpo) {
  if (typeof corpo.senha !== 'string' || corpo.senha.length < SENHA_MINIMA) {
    throw new ErroJogo(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
  }
  return { ...loginECelular(corpo), senha: corpo.senha };
}

async function verificar(req, res) {
  const { login, celular } = loginECelular(req.body);
  // ...
}
```

**Ganho:** cada função tem um formato de retorno só, e o nome já diz o que volta.

**Detalhe:** no código atual, o login e o celular são validados antes da senha, então quem manda os três inválidos recebe o erro do login. No "depois", a senha vem primeiro. Se a ordem das mensagens importar para o front, basta chamar `loginECelular` antes de validar a senha.

---

## 2. Desestruturar um array só para ter dois `await`

**Onde:** [batalhas.service.js](../src/features/batalhas/batalhas.service.js) (`responderDesafio`)

**Problema:** o formato `const [a, b] = [await x, await y]` parece um `Promise.all` (as duas buscas em paralelo), mas roda uma depois da outra. Quem lê pode achar que é paralelo, e quem "corrige" para `Promise.all` não ganha nada: as duas consultas usam o mesmo `client` de transação, que executa uma consulta por vez.

### Antes

```js
const [timeA, timeB] = [
  await carregarTime(client, batalha.desafiante_id),
  await carregarTime(client, batalha.desafiado_id),
];
```

### Depois

```js
const timeA = await carregarTime(client, batalha.desafiante_id);
const timeB = await carregarTime(client, batalha.desafiado_id);
```

---

## 3. Dois nomes para a mesma coisa na view do card

**Onde:** [pokemons.view.js](../src/features/pokemons/pokemons.view.js)

**Problema:** a mesma função tem dois nomes (`descreverPokemon` e `card`) e, dentro dela, a mesma variável também tem dois nomes (`linha` e `especie`). Quem procura onde o card é montado acha `card(...)` em [trocas.view.js](../src/features/trocas/trocas.view.js), `view.card` no service e `descreverPokemon` nos testes, e precisa descobrir que são a mesma coisa.

### Antes

```js
function descreverPokemon(linha) {
  const especie = linha;
  return {
    // ...
    nome: especie.nome,
    tipos: especie.tipos,
    raridade: especie.raridade,
    // ...
    status: calcularStatus(especie, linha),
    ...medidas(especie, linha),
    // ...
    evolucoes: especie.evolucoes.map(/* ... */),
  };
}

/** Card completo a partir de uma linha com CAMPOS_CARD */
const card = descreverPokemon;

module.exports = {
  card, descreverPokemon, descreverAfeto, medidas,
};
```

### Depois

```js
/**
 * Card pronto para o front, a partir de uma linha com CAMPOS_CARD.
 * A linha junta pokemons + especies, então serve tanto de espécie quanto de Pokémon
 * para calcularStatus e medidas.
 */
function card(linha) {
  return {
    // ...
    nome: linha.nome,
    tipos: linha.tipos,
    raridade: linha.raridade,
    // ...
    status: calcularStatus(linha, linha),
    ...medidas(linha, linha),
    // ...
    evolucoes: linha.evolucoes.map(/* ... */),
  };
}

module.exports = { card, descreverAfeto, medidas };
```

Os testes em `test/unit/regras.test.js` passam a chamar `regras.card(linha)`.

**Ganho:** um conceito, um nome. O comentário explica uma única vez por que a linha é passada duas vezes, em vez de esconder isso atrás de um apelido.

---

## 4. Funções escondidas dentro do `module.exports`

**Onde:** [trocas.service.js](../src/features/trocas/trocas.service.js)

**Problema:** `recusarProposta` e `cancelarProposta` são chamadas pelo controller, mas não existem como funções no arquivo: são arrow functions criadas dentro do `module.exports`. Quem procura `function recusarProposta` não acha nada, e elas ficam sem JSDoc. Além disso, a string `papel` decide o status com um ternário que não diz o que significa cada lado.

### Antes

```js
/** Recusar (dono do anúncio) ou cancelar (quem mandou) uma proposta pendente */
async function encerrarProposta(usuarioId, propostaId, papel) {
  await lerProposta(propostaId, usuarioId, papel);
  await transacao(async (client) => {
    await travarPropostaPendente(client, propostaId);
    await model.responderProposta(client, propostaId, papel === 'vendedor' ? 'recusada' : 'cancelada');
  });
}

module.exports = {
  // ...
  aceitarProposta,
  recusarProposta: (usuarioId, propostaId) => encerrarProposta(usuarioId, propostaId, 'vendedor'),
  cancelarProposta: (usuarioId, propostaId) => encerrarProposta(usuarioId, propostaId, 'proponente'),
};
```

### Depois

```js
// Quem encerra a proposta define como ela fica
const STATUS_AO_ENCERRAR = { vendedor: 'recusada', proponente: 'cancelada' };

async function encerrarProposta(usuarioId, propostaId, papel) {
  await lerProposta(propostaId, usuarioId, papel);
  await transacao(async (client) => {
    await travarPropostaPendente(client, propostaId);
    await model.responderProposta(client, propostaId, STATUS_AO_ENCERRAR[papel]);
  });
}

/** O dono do anúncio recusa uma proposta pendente */
async function recusarProposta(usuarioId, propostaId) {
  await encerrarProposta(usuarioId, propostaId, 'vendedor');
}

/** Quem mandou a proposta desiste dela enquanto está pendente */
async function cancelarProposta(usuarioId, propostaId) {
  await encerrarProposta(usuarioId, propostaId, 'proponente');
}

module.exports = {
  // ...
  aceitarProposta,
  recusarProposta,
  cancelarProposta,
};
```

**Ganho:** o `module.exports` volta a ser só a lista do que o arquivo oferece, e a relação papel → status fica escrita uma vez, em forma de tabela.

---

## 5. Ternário com `await` dos dois lados e `??` no fim

**Onde:** [vitrines.service.js](../src/features/vitrines/vitrines.service.js) (`obterVitrine`)

**Problema:** numa linha só acontecem três coisas: escolher entre ler e registrar visita, esperar o banco e cair no padrão se não houver linha. O efeito colateral mais importante (somar uma visita) fica escondido no meio do ternário.

### Antes

```js
// A primeira visita de outro treinador já cria a linha
const dados = (souDono ? await model.lerVitrine(pool, dono.id) : await model.registrarVisita(pool, dono.id))
  ?? VITRINE_PADRAO;
```

### Depois

```js
// O dono só lê; a visita de outro treinador soma no contador (e cria a linha na primeira vez)
const vitrine = souDono
  ? await model.lerVitrine(pool, dono.id)
  : await model.registrarVisita(pool, dono.id);
const dados = vitrine ?? VITRINE_PADRAO;
```

---

## Outros pontos menores

| Onde | Hoje | Mais simples |
|---|---|---|
| [batalhas.service.js](../src/features/batalhas/batalhas.service.js) (`listarBatalhas`) | `for (const id of await model.idsVencidosDoUsuario(pool, usuarioId)) await atualizarPrazos(id);` | Guardar os ids numa variável antes do `for`: a consulta e o laço ficam em linhas separadas |
| [batalhas.service.js](../src/features/batalhas/batalhas.service.js) (`distribuirRecompensas`) | `const perdedor = fim.vencedor === 0 ? 1 : 0;`, enquanto o motor já tem a função `outro(indice)` para isso | Exportar `outro` do motor (ou chamá-la de `oponenteDe`) e reutilizar |
| [historia.service.js](../src/features/historia/historia.service.js) (`capturar`) | `let status = encontro.status; if (capturou) ... else if (fugiu) ...` no meio da transação | Uma função pura `statusAposCaptura({ capturou, fugiu, atual })` em `historia.regras.js`, que também fica fácil de testar |

---

## Onde a complexidade é justificada (não simplificar)

Algumas partes parecem complicadas, mas cada linha resolve um problema real. Simplificar essas partes traria bugs de volta:

- **Débito condicional em [carteira.js](../src/banco/carteira.js)** (`UPDATE ... WHERE pokecoins >= $2`): um `SELECT` do saldo seguido de um `UPDATE` seria mais fácil de ler, mas deixaria dois cliques gastarem o mesmo saldo.
- **A trava `rodando` em [batalhas.agendador.js](../src/features/batalhas/batalhas.agendador.js):** impede duas rodadas do agendador ao mesmo tempo se o banco demorar mais que o intervalo.
- **`FOR UPDATE SKIP LOCKED` em `travarBatalhaSeLivre`:** o agendador pula a batalha que está recebendo uma jogada agora, em vez de ficar esperando por ela.
- **`pg_advisory_lock` em [migracoes.js](../src/banco/migracoes.js):** num deploy, o back novo e o antigo podem subir juntos e tentar aplicar a mesma migração.
- **`sortearECobrar(regras)` em [golpes.service.js](../src/features/golpes/golpes.service.js):** um objeto de regras com funções parece demais para dois usos, mas o fluxo (conferir fora da transação, sortear na PokeAPI, conferir de novo com o card travado, cobrar) é longo e delicado. Copiá-lo duas vezes seria pior. Ver também [SOLID.md](SOLID.md#o--openclosed-principle-ocp).
