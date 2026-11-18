# YAGNI (You Aren't Gonna Need It)

> "Sempre implemente as coisas quando você realmente precisar delas, nunca quando apenas prevê que vai precisar."

YAGNI pede para não escrever código "para o caso de um dia precisar". Esse código tem custo hoje: precisa ser lido, testado e mantido, e muitas vezes o "dia" nunca chega, ou chega com uma necessidade diferente da prevista.

No back do PokeBox, o YAGNI aparece de duas formas:

1. **Coisas expostas ou parametrizadas sem ninguém usar** (exports, parâmetros opcionais).
2. **Código que já foi necessário e pode estar sobrando** (compatibilidade com dados antigos).

Os exemplos são **propostas**: o "antes" é o código atual e o "depois" é a mudança sugerida.

---

## 1. A vitrine exporta funções que ninguém de fora usa

**Onde:** [vitrines/index.js](../src/features/vitrines/index.js)

**Problema:** o `index.js` de cada feature é a "API pública" dela (o comentário no arquivo diz isso). A vitrine expõe o service inteiro, mas nenhuma outra feature nem nenhum teste importa essas funções: só o controller usa, e ele importa direto do service. Cada export é uma promessa de que aquilo pode ser usado de fora e por isso não pode mudar à toa.

### Antes

```js
// API pública da feature: outras partes do back importam daqui, nunca dos arquivos internos
const rotas = require('./vitrines.rotas');
const { obterVitrine, salvarVitrine, listarVitrines } = require('./vitrines.service');

module.exports = {
  rotas, obterVitrine, salvarVitrine, listarVitrines,
};
```

### Depois

```js
// API pública da feature: outras partes do back importam daqui, nunca dos arquivos internos
const rotas = require('./vitrines.rotas');

module.exports = { rotas };
```

Igual ao que `time`, `trocas`, `treinadores` e `golpes` já fazem. Se um dia outra feature precisar da vitrine, o export volta junto com o uso.

---

## 2. Funções internas da roleta exportadas pelo service

**Onde:** [golpes.service.js](../src/features/golpes/golpes.service.js)

**Problema:** `garantirGolpe`, `garantirMovimentos` e `causaDano` são usadas só dentro do próprio arquivo. O `index.js` da feature não as repassa e nenhum teste as importa. O export não serve a ninguém e dá a impressão de que outras partes dependem delas.

### Antes

```js
module.exports = {
  garantirGolpe, garantirMovimentos, roletarGolpes, desbloquearGolpes, causaDano,
};
```

### Depois

```js
module.exports = { roletarGolpes, desbloquearGolpes };
```

**Quando voltar atrás:** se alguém escrever um teste unitário para `causaDano`, aí sim ela tem um usuário e o export volta.

---

## 3. Parâmetro opcional que nunca é passado

**Onde:** [batalhas.service.js](../src/features/batalhas/batalhas.service.js) (`processarPrazosVencidos`)

**Problema:** a função aceita um `limite`, mas o único chamador ([batalhas.agendador.js](../src/features/batalhas/batalhas.agendador.js)) e os testes sempre usam o padrão. O parâmetro sugere que existe outro uso, e quem lê vai procurar por ele.

### Antes

```js
async function processarPrazosVencidos(limite = 100) {
  const agora = new Date();
  const ids = await model.idsComJogadaVencida(pool, agora, limite);
  // ...
}
```

### Depois

```js
// Batalhas processadas por rodada do agendador; o resto fica para a próxima (10s depois)
const LOTE_DE_PRAZOS = 100;

async function processarPrazosVencidos() {
  const agora = new Date();
  const ids = await model.idsComJogadaVencida(pool, agora, LOTE_DE_PRAZOS);
  // ...
}
```

**Ganho:** o número continua num lugar só, agora com um nome e um comentário dizendo por que ele existe.

---

## 4. Código de compatibilidade com dados antigos (avaliar antes de remover)

**Onde:**
- [especies.service.js](../src/features/especies/especies.service.js) (`garantirTaxaCaptura`), [especies.model.js](../src/features/especies/especies.model.js) (`lerTaxaCaptura`, `salvarTaxaCaptura`) e [especies.pokeapi.js](../src/features/especies/especies.pokeapi.js) (`buscarTaxaCaptura`)
- [historia.service.js](../src/features/historia/historia.service.js) (o laço em `obterHistoria` e a busca antes da transação em `capturar`)
- [motor.js](../src/nucleo/motor.js) (`especie.tipos ?? []`, `atacante.tipos?.`, `atacante.golpes?.`, com o comentário "estados antigos não têm")

**Situação:** esse código existe porque a coluna `taxa_captura` e os campos `tipos`/`golpes` no estado da batalha foram criados **depois** que já havia dados no banco. Ele foi necessário na época. Mas toda espécie nova já é salva com a taxa (`buscarEspecie` a inclui), e batalhas entre jogadores acabam em minutos (o prazo de 1 min por jogada termina em W.O.). Com o tempo, o caminho "dado antigo" deixa de acontecer, mas o código continua sendo lido e mantido.

Este é o YAGNI "ao contrário": não é código feito antes da hora, é código que pode ter ficado depois da hora.

### Antes

```js
// historia.service.js
async function obterHistoria(usuarioId) {
  const encontros = await model.listarUltimosPorPonto(pool, usuarioId);
  // Espécies salvas antes da taxa de captura existir: completa uma vez (cada espécie só vai à PokeAPI uma vez)
  for (const linha of encontros) {
    if (linha.taxa_captura == null) linha.taxa_captura = await garantirTaxaCaptura(linha.especie_id);
  }
  const totais = await model.contarTotais(pool, usuarioId);
  return view.historia({ encontros, totais, proximo: proximoPonto(totais.vencidos) });
}

// especies.service.js
async function garantirEspecie(id) {
  const salva = await model.buscarPorId(pool, id);
  if (salva) {
    if (salva.taxa_captura == null) salva.taxa_captura = await garantirTaxaCaptura(id);
    return salva;
  }
  // ...
}
```

### Depois (só depois de conferir os bancos)

```js
// historia.service.js
async function obterHistoria(usuarioId) {
  const encontros = await model.listarUltimosPorPonto(pool, usuarioId);
  const totais = await model.contarTotais(pool, usuarioId);
  return view.historia({ encontros, totais, proximo: proximoPonto(totais.vencidos) });
}

// especies.service.js
async function garantirEspecie(id) {
  const salva = await model.buscarPorId(pool, id);
  if (salva) return salva;
  // ...
}
```

Com isso, `garantirTaxaCaptura`, `lerTaxaCaptura`, `salvarTaxaCaptura` e `buscarTaxaCaptura` deixam de ter uso e podem sair. Em `capturar`, a busca da taxa antes da transação também deixa de ser necessária, porque `travarEncontro` já traz `e.taxa_captura`.

### Como conferir antes de remover

Rodar em **todos** os bancos que estão no ar (local, Neon, máquina própria):

```sql
-- Precisa dar 0: nenhuma espécie sem taxa de captura
SELECT count(*) FROM especies WHERE taxa_captura IS NULL;

-- Precisa dar 0: nenhuma batalha da história em andamento com estado de antes dos tipos.
-- (A história não tem prazo por jogada, então uma batalha antiga pode continuar aberta.)
SELECT count(*) FROM historia_encontros
 WHERE estado IS NOT NULL
   AND NOT (estado -> 'lados' -> 0 -> 'pokemons' -> 0 ? 'tipos');
```

Se algum der mais que 0, o caminho mais limpo é uma migração ou um script que complete os dados uma vez, e só então tirar o código.

---

## Onde o YAGNI já está aplicado

- **[batalhas.agendador.js](../src/features/batalhas/batalhas.agendador.js):** `iniciarAgendador` guardava e devolvia o timer "para o caso de precisar parar um dia", mas ninguém usava o retorno. Isso já foi removido (o comentário no arquivo mostra o antes).
- **Sem WebSocket:** o tempo real é feito com polling do front e um agendador simples no back. Para o tamanho do jogo isso basta, e a decisão está registrada em [BACKEND.md](BACKEND.md).
- **Sem ORM:** as consultas são SQL escrito à mão com `pg`. Uma camada de ORM traria recursos que o projeto não usa.
- **Token opaco em vez de JWT:** a sessão é um token aleatório com o hash no banco. Não há refresh token, claims ou chaves de assinatura, porque nada no jogo precisa disso.

## O que parece YAGNI mas não é

- **`FOR UPDATE SKIP LOCKED` em `travarBatalhaSeLivre`:** o comentário diz que ele "permite rodar o agendador em mais de uma instância", o que soa como preparação para o futuro. Mas o motivo principal vale hoje: o agendador pula a batalha que está recebendo uma jogada agora, em vez de ficar parado esperando.
- **`pg_advisory_lock` nas migrações:** no Render, um deploy sobe o back novo enquanto o antigo ainda está no ar, então dois processos aplicando migrações ao mesmo tempo é um cenário real.
- **`config.js` com todos os números do balanceamento:** ajustar preços e chances é uma necessidade que já aparece nos comentários do próprio arquivo, não uma previsão.
