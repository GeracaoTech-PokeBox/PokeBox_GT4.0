/*"Cron" simples dentro do próprio back: a cada minuto aplica as jogadas com prazo vencido
e expira desafios não respondidos. Um atraso de até 1 minuto não importa, porque toda
leitura/jogada também confere os prazos.*/

//OBS: Cron é um agendador de tarefas baseado em tempo em sistemas operacionais

const { processarPrazosVencidos, expirarDesafios } = require('./batalhas');

const INTERVALO_MS = 60 * 1000;

/* ===================== rodarUmaVez =====================
 * [DRY] As duas linhas de log repetiam a mesma estrutura: "se a quantidade for > 0,
 * imprime 'Agendador: <n> <descrição>'". Só mudavam o número e o texto. Centralizar
 * isso em logSeHouver() deixa um único lugar para mudar o formato/prefixo do log e
 * evita que as duas mensagens divirjam com o tempo.
 *
 * Código original:
 *
 * async function rodarUmaVez() {
 *   const expirados = await expirarDesafios();
 *   const processadas = await processarPrazosVencidos();
 *   if (expirados > 0) console.log(`Agendador: ${expirados} desafio(s) expirado(s)`);
 *   if (processadas > 0) console.log(`Agendador: ${processadas} jogada(s) automática(s) aplicada(s)`);
 * }
 */

function logSeHouver(quantidade, descricao) {
  if (quantidade > 0) console.log(`Agendador: ${quantidade} ${descricao}`);
}

// Exportada porque os testes de integração a chamam diretamente (sem esperar o intervalo).
async function rodarUmaVez() {
  logSeHouver(await expirarDesafios(), 'desafio(s) expirado(s)');
  logSeHouver(await processarPrazosVencidos(), 'jogada(s) automática(s) aplicada(s)');
}

/* ===================== iniciarAgendador =====================
 * [YAGNI] A função guardava o timer numa variável só para retorná-lo, mas o único
 * chamador (server.js) ignora o retorno, e nada no projeto chama clearInterval nele.
 * Retornar o timer era uma abstração "para o caso de precisar parar um dia".
 * Removido: se surgir a necessidade, basta voltar a retornar o valor de setInterval.
 *
 * [KISS] O callback do setInterval misturava duas responsabilidades — a trava contra
 * execuções sobrepostas e o tratamento de erro — dentro de uma arrow function anônima.
 * Extraí o corpo para a função nomeada `tick`, o que deixa iniciarAgendador com uma
 * linha só e torna explícito o que acontece a cada intervalo. A trava (`rodando`)
 * foi MANTIDA: ela não é complexidade desnecessária, protege contra duas execuções
 * simultâneas caso o banco demore mais que 1 minuto.
 *
 * Código original:
 *
 * function iniciarAgendador() {
 *   let rodando = false;
 *   const timer = setInterval(async () => {
 *     if (rodando) return; // não sobrepõe duas execuções se uma demorar mais que o intervalo
 *     rodando = true;
 *     try {
 *       await rodarUmaVez();
 *     } catch (erro) {
 *       console.error('Agendador:', erro);
 *     } finally {
 *       rodando = false;
 *     }
 *   }, INTERVALO_MS);
 *   timer.unref(); // não impede o processo de encerrar
 *   return timer;
 * }
 */

function iniciarAgendador() {
  let rodando = false;

  async function tick() {
    if (rodando) return; // não sobrepõe duas execuções se uma demorar mais que o intervalo
    rodando = true;
    try {
      await rodarUmaVez();
    } catch (erro) {
      console.error('Agendador:', erro);
    } finally {
      rodando = false;
    }
  }

  setInterval(tick, INTERVALO_MS).unref(); // unref: não impede o processo de encerrar
}

module.exports = { iniciarAgendador, rodarUmaVez };



//  OBS: eu fiz nesse arquivo e como já tinha começado, acabei terminando logo ele, mas eu vou me restringir a fazer apenas o dry, kiss e yagni para as coisas do front. mas esse vai ser a linha de mudanças que vou fazer.
