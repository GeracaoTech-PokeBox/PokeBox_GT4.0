// Lê back/.env (DATABASE_URL, PORT) antes de tudo; variáveis já definidas no terminal têm prioridade
require('dotenv').config({ path: `${__dirname}/.env`, quiet: true });

const app = require('./src/app');

const PORTA = process.env.PORT || 8080;

function iniciar() {
  // No Express 5, erros como "porta ocupada" chegam aqui em vez de derrubar o processo
  app.listen(PORTA, (erro) => {
    if (erro) throw erro;
    console.log(`Back do PokeBox rodando na porta ${PORTA}`);
  });
}

if (process.env.DATABASE_URL) {
  // Antes de atender, deixa o banco com as migrações novas de db/migracoes. Se uma falhar,
  // o back nem sobe: melhor que ficar no ar devolvendo erro interno por falta de coluna.
  require('./src/migracoes').aplicarMigracoes()
    .then(() => {
      iniciar();
      // Jogadas automáticas das batalhas com prazo vencido
      require('./src/jogo/agendador').iniciarAgendador();
    })
    .catch((erro) => {
      console.error('Migrações: falhou, o back não vai subir.', erro);
      process.exit(1);
    });
} else {
  console.warn('DATABASE_URL não configurada: só o proxy da PokeAPI vai funcionar. Copie back/.env.example para back/.env.');
  iniciar();
}
