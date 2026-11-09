import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// O CSS global vem antes de tudo: os estilos dos componentes podem sobrescrevê-lo
import './index.css';
import App from './App';
import { SessaoProvider } from '@/features/auth';

/* Arquitetura do front: MVVM organizado por funcionalidade (feature-first).
 *
 *   features/<feature>/   uma pasta por funcionalidade: auth, pokedex, colecao, time, loja,
 *                         batalhas, historia, vitrine e trocas
 *     components/<Nome>/  VIEW + VIEWMODEL de cada componente, lado a lado:
 *                           index.jsx            VIEW: só JSX e estado puramente visual
 *                           index_viewmodels.js  VIEWMODEL: estado e ações do componente (sem JSX)
 *                           <Nome>.css           estilos
 *     services/           acesso ao back (endpoints da feature)
 *     models/             MODEL: regras de negócio puras, sem React
 *     constants/ types/ utils/ hooks/ context/ validators/   só quando a feature precisa
 *     index.js            FACHADA: a API pública da feature. Quem está fora importa só daqui.
 *   shared/               o que várias features usam (componentes base, utilitários, constantes)
 *   core/                 o que é global (cliente HTTP do back)
 *
 * Nomes: index.js é sempre a fachada pública de uma pasta; os arquivos internos de cada camada se
 * chamam index_<camada>.js (index_viewmodels, index_services, index_models...).
 * Imports: entre features e para shared/core, use o alias '@/' e a fachada ('@/features/loja',
 * '@/shared', '@/core'); dentro da própria feature, use caminhos relativos.
 *
 * Tags:
 *   [MVVM]     separação entre Model, View e ViewModel
 *   [SOLID-S]  Responsabilidade única: cada arquivo tem um só motivo para mudar
 *   [SOLID-O]  Aberto/fechado: dá para estender sem editar o que já funciona
 *   [SOLID-I]  Segregação de interface: cada componente recebe só o que usa
 *   [SOLID-D]  Inversão de dependência: as telas dependem de abstrações (useSessao, ViewModels),
 *              não de detalhes (fetch, props vindas do App)
 *   [DRY]      não repetir código
 *   [KISS]     manter simples
 *   [YAGNI]    não manter o que ninguém usa
 *   (O "L" do SOLID, substituição de Liskov, não guiou nenhuma mudança: o projeto não usa herança.)
 *
 * [MVVM][SOLID-D] O SessaoProvider envolve o App: qualquer tela lê o usuário logado com useSessao().
 */

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SessaoProvider>
      <App />
    </SessaoProvider>
  </StrictMode>,
);
