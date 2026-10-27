# Worklog de Desenvolvimento

Registro do "porquê" e do contexto entre sessões. Complementa o git (que registra o "o quê").
Entradas mais recentes no topo.

## [2026-09-24 13:25] — Seletor de loja organizado por locais VMPay
- **Autor:** Auto (Cursor)
- **Objetivo:** Em Novo chamado, listar lojas de forma organizada via GET /api/v1/locations (cidade/endereço) quando houver locais.
- **Arquivos alterados:**
  - `src/componentes/chamados/SeletorLoja.tsx` — modificado — agrupa por cidade/UF, mostra endereço; fallback clientes
  - `src/lib/vmpay.server.ts` — modificado — paginação em listarLocaisVmpay
  - `src/tipos/vmpay.ts` — criado — tipos ClienteVmpay/LocalVmpay compartilhados
  - `src/hooks/useLocaisVMPay.ts`, `src/utilitarios/vmpay-endereco.ts` — tipos de `@/tipos/vmpay`
  - `src/componentes/chamados/FormularioChamado.tsx` — texto de ajuda
  - `vite.config.vps.ts`, `vite.config.ts` — ignoreImporters para *.functions.ts (build)
- **Resumo das mudanças:** Se houver locais VMPay, o combobox agrupa por "Cidade (UF)", exibe bairro/rua e busca por nome/cidade/bairro. Clientes sem local ficam em "Outras lojas". Sem locais, mantém lista plana de clientes.
- **Decisões e justificativas:** Campo `loja` continua texto (nome do local); endereço já é resolvido no detalhe via `buscarLocalPorNomeLoja`.
- **Comandos executados:** `docker build` + `stack deploy` + `service update --force` → OK (1/1 Running)
- **Erros e resoluções:** Build falhava em import-protection (middleware.server em *.functions.ts). Resolvido com `importProtection.ignoreImporters` nos vite configs.
- **Pendências / TODO:** nenhuma
- **Próximos passos:** Validar em https://nutricarhub.nutricarbrasil.com.br/w/nutricar/chamados/novo com Ctrl+F5

---

## [2026-07-14 10:39] — Fix RLS: Gestor salvar departamentos do membro
- **Autor:** Cursor (Auto)
- **Objetivo:** Corrigir erro ao salvar usuários/departamentos: `new row violates row-level security policy for table "workspace_membro_departamentos"`.
- **Arquivos alterados:**
  - `scripts/db-init/26-wmd-rls-gestor.sql` — criado — Gestor em INSERT/UPDATE/DELETE de WMD + UPDATE de workspace_membros
  - `supabase/migrations/20260714120000_wmd_rls_gestor.sql` — criado — espelho
  - `ultimas_modificacoes.md` — atualizado
- **Resumo das mudanças:** UI/API já permitem Gestor gerenciar usuários; RLS de `workspace_membro_departamentos` e UPDATE de `workspace_membros` ainda restringiam a Proprietário/Administrador. Policies atualizadas. Aplicado direto no Postgres da VPS (sem rebuild da app).
- **Decisões e justificativas:** Mesmo critério de `exigirGerenciarUsuarios` / `podeGerenciarUsuarios` e do fix anterior de departamentos (Gestor).
- **Comandos executados:** `psql < 26-wmd-rls-gestor.sql` → OK; simulação JWT Gestor (`marco.antonio`) INSERT WMD → OK (rollback)
- **Erros e resoluções:** INSERT como Gestor falhava no WITH CHECK (só Admin/Proprietário). Após incluir Gestor, tem_papel=true e INSERT retorna linha.
- **Pendências / TODO:** nenhuma para este bug
- **Próximos passos:** Usuário retestar salvar vínculo de departamentos na tela de usuários

---

## [2026-07-08 11:40] — Diagnóstico: marco.antonio visão ampla de chamados
- **Autor:** Cursor (Auto)
- **Objetivo:** Entender por que marco.antonio@nutricarbrasil.com.br (Implantação) vê visão ampla de chamados.
- **Arquivos alterados:** nenhum (somente análise no Postgres).
- **Resumo das mudanças:** Usuário está com papel **Gestor** (não Suporte). RLS libera 9/147 chamados — só destino Implantação. Colegas do mesmo depto (fabio, leandro, matheus, gerson) estão como **Suporte** e veem só atribuídos. UI de Gestor = Painel/Lista completa (não “Minha área”).
- **Pendências / TODO:** Se ele for técnico de campo, alterar papel para **Suporte**. Se for gestor de Implantação, a visão atual (todos do depto) é o comportamento esperado.
- **Próximos passos:** Confirmar com o solicitante se Marco deve ser técnico (Suporte) ou gestor do setor; aplicar ajuste de papel se necessário.

## [2026-07-07 16:10] — Suporte: ver chamados abertos da equipe (mesmo departamento)
- **Autor:** Cursor (Auto)
- **Objetivo:** Técnico vê chamados abertos de colegas do departamento e pode assumir para resolver na loja.
- **Arquivos alterados:**
  - `scripts/db-init/25-suporte-visao-colegas-departamento.sql` — RLS SELECT/UPDATE + funções + comentário interno do responsável.
  - `src/paginas/suporte/PainelColegasSuporte.tsx`, rota `suporte/equipe`, item **Equipe** na sidebar.
  - `DetalheChamado.tsx`, `DetalheChamadoSuporte.tsx` — botão **Assumir chamado**.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-07 12:12] — Lista: redimensionar largura das colunas
- **Autor:** Cursor (Auto)
- **Objetivo:** Usuário ajusta largura das colunas na lista de chamados conforme necessidade.
- **Arquivos alterados:**
  - `src/utilitarios/colunas-lista-chamados.ts` — larguras padrão, min/max, persistência localStorage.
  - `src/hooks/useColunasListaChamados.ts` — `redimensionarColuna` + restaurar larguras no padrão.
  - `src/componentes/chamados/CabecalhoColunaRedimensionavel.tsx` — arraste na borda + duplo clique restaura.
  - `src/paginas/chamados/ListaChamados.tsx` — colgroup, scroll horizontal quando necessário.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-07 12:05] — Lista: mostrar/ocultar colunas personalizável
- **Autor:** Cursor (Auto)
- **Objetivo:** Usuário escolhe quais colunas ver na lista de chamados para melhor acompanhamento.
- **Arquivos alterados:**
  - `src/utilitarios/colunas-lista-chamados.ts` — definição e persistência localStorage por workspace.
  - `src/hooks/useColunasListaChamados.ts` — estado e alternância.
  - `src/componentes/chamados/MenuColunasListaChamados.tsx` — menu dropdown com checkboxes.
  - `src/paginas/chamados/ListaChamados.tsx` — tabela condicional + resumo inline quando coluna oculta.
- **Resumo das mudanças:** Botão "Colunas" na barra de filtros; preferência salva por workspace; "Restaurar padrão"; dados ocultos aparecem resumidos sob o título do chamado.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-07 11:28] — Subchamado: descrição do pai + do sub (sem alterar RLS)
- **Autor:** Cursor (Auto)
- **Objetivo:** Usuário que recebe subchamado vê descrição do chamado principal e do subchamado, sem policy recursiva.
- **Arquivos alterados:**
  - `scripts/db-init/24-chamado-descricao-pai.sql` — colunas snapshot + trigger INSERT + backfill.
  - `src/componentes/chamados/BlocoDescricaoChamadoPrincipal.tsx` — bloco visual.
  - `src/paginas/chamados/DetalheChamado.tsx`, `DetalheChamadoSuporte.tsx`.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-07 11:10] — Lista: subchamados visíveis + flag proposta criada (projetos)
- **Autor:** Cursor (Auto)
- **Objetivo:** Incluir subchamados na lista completa; flag "proposta criada" em encerrados das 4 categorias de projeto com filtro.
- **Arquivos alterados:**
  - `scripts/db-init/23-chamado-proposta-criada.sql` — coluna `proposta_criada`.
  - `src/paginas/chamados/ListaChamados.tsx` — `somenteRaiz: false` padrão; filtro proposta; coluna checkbox.
  - `src/componentes/chamados/CheckboxPropostaCriada.tsx`, `DetalheChamado.tsx`, `PreviaIndicador.tsx`.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-07 10:52] — Rollback: RLS chamado pai (chamados sumiram + lentidão)
- **Autor:** Cursor (Auto)
- **Objetivo:** Reverter alteração de visibilidade do chamado pai via subchamado — sumiu lista de chamados e sistema ficou lento.
- **Causa:** policy com EXISTS recursivo em `chamados` + função `usuario_pode_ver_chamado`.
- **Arquivos alterados:**
  - `scripts/db-init/22-chamados-pai-visivel-via-sub.sql` — restaura policy de `20-papel-suporte.sql`.
  - Revert UI: `DetalheChamado.tsx`, `DetalheChamadoSuporte.tsx`, removido `SecaoContextoChamadoPai.tsx`.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-07 10:45] — Subchamado: descrição do chamado principal visível ao dept. destino
- **Autor:** Cursor (Auto)
- **Objetivo:** Dept. que recebe subchamado deve ver a descrição do chamado pai.
- **Arquivos alterados:**
  - `scripts/db-init/22-chamados-pai-visivel-via-sub.sql` — RLS: quem vê subchamado pode ler o pai.
  - `src/hooks/useChamado.ts` — `useChamadoPorId` para resumo do pai.
  - `src/componentes/chamados/SecaoContextoChamadoPai.tsx` — bloco de contexto com descrição do pai.
  - `src/paginas/chamados/DetalheChamado.tsx`, `DetalheChamadoSuporte.tsx` — exibição no detalhe.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-07 10:32] — Projetos: todas categorias visíveis, auto-título só nas 4 fixas
- **Autor:** Cursor (Auto)
- **Objetivo:** Restaurar demais categorias do dept. Projetos; preencher título automaticamente apenas nas 4 de solicitação de projeto.
- **Arquivos alterados:**
  - `src/utilitarios/categorias-projetos.ts` — `mesclarCategoriasDepartamentoProjetos`; auto-título só nas 4.
  - `src/componentes/chamados/FormularioChamado.tsx` — lista mesclada banco + 4 fixas.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-07 10:28] — Fix: título automático ao selecionar categoria Projetos
- **Autor:** Cursor (Auto)
- **Objetivo:** Corrigir preenchimento do título ao escolher categoria de Projetos; sempre sobrescrever título anterior com o nome da categoria.
- **Arquivos alterados:**
  - `src/utilitarios/categorias-projetos.ts` — matching normalizado + `tituloAoSelecionarCategoriaProjetos`.
  - `src/componentes/chamados/FormularioChamado.tsx` — usa dept destino para forçar título; fallback enquanto departamentos carregam.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-07 10:20] — Projetos: 4 categorias fixas e título automático
- **Autor:** Cursor (Auto)
- **Objetivo:** Ao selecionar departamento Projetos, exibir 4 categorias específicas; ao escolher categoria, preencher o título com o mesmo nome.
- **Arquivos alterados:**
  - `src/utilitarios/categorias-projetos.ts` — constantes e helpers.
  - `src/componentes/chamados/FormularioChamado.tsx` — lista fixa para Projetos + auto título.
  - `scripts/db-init/21-categorias-projetos.sql` — seed idempotente no banco.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-07 09:20] — Gestor: coluna Loja, atribuição com data e em massa
- **Autor:** Cursor (Auto)
- **Objetivo:** Na listagem de chamados do gestor: coluna Loja com ordenação A–Z; seleção por checkbox; atribuição em massa a técnico; ao atribuir (unitário ou massa), opção de definir data de execução.
- **Arquivos alterados:**
  - `src/componentes/chamados/DialogAtribuirTecnico.tsx` — diálogo reutilizável (técnico + data opcional).
  - `src/utilitarios/atribuir-chamado-tecnico.ts` — monta payload (status Agendado quando há data).
  - `src/paginas/chamados/DetalheChamado.tsx` — atribuição ao técnico abre diálogo com data opcional.
  - `src/paginas/chamados/ListaChamados.tsx` — coluna Loja, ordenação, checkboxes, barra de atribuição em massa.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.
- **Próximos passos:** Validar fluxo gestor → técnico com data agendada; considerar filtro por loja na listagem.

## [2026-07-06 22:26] — Suporte: prioridade interativa, sem aguardando aceite, devolver chamado
- **Autor:** Cursor (Auto)
- **Objetivo:** Remover fluxo "aguardando aceite"; prioridade visível e filtros interativos; técnico pode devolver chamado com justificativa para o gestor.
- **Arquivos alterados:**
  - `src/componentes/suporte/FaixaPrioridade.tsx`, `FiltrosPrioridade.tsx` — faixa de prioridade e chips com contagem.
  - `src/paginas/suporte/PainelSuporte.tsx` — lista única "Meus chamados" + filtro por prioridade; removido aceite.
  - `src/paginas/suporte/LinhaChamadoSuporte.tsx` — badge e borda por prioridade.
  - `src/paginas/suporte/DetalheChamadoSuporte.tsx` — faixa de prioridade, botão devolver + diálogo.
  - `src/paginas/chamados/DetalheChamado.tsx` — mutation devolver (comentário interno destacado, remove responsável).
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-06 22:16] — Suporte: descrição com quebras de linha + layout app
- **Autor:** Cursor (Auto)
- **Objetivo:** Descrição do chamado organizada com quebras de linha; interface dos técnicos com cara de app mobile.
- **Arquivos alterados:**
  - `src/utilitarios/texto-multilinha.ts`, `src/componentes/suporte/TextoMultilinha.tsx` — normaliza HTML/\\n e renderiza parágrafos e linhas.
  - `src/paginas/suporte/DetalheChamadoSuporte.tsx` — header fixo, cards, barra de ações no rodapé, fundo muted.
  - `src/paginas/suporte/PainelSuporte.tsx`, `ListaResolvidosSuporte.tsx`, `w.$slug.suporte.tsx` — coluna max-w-lg e visual app.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.

## [2026-07-06 22:10] — Suporte: endereço da loja via VMPay locations
- **Autor:** Cursor (Auto)
- **Objetivo:** Exibir endereço completo da loja no detalhe do chamado para técnicos, usando GET /api/v1/locations.
- **Arquivos alterados:**
  - `src/lib/vmpay.server.ts` — `listarLocaisVmpay`, tipo `LocalVmpay`, helper `buscarVmpayJson`.
  - `src/lib/vmpay.functions.ts` — `listarLocaisVmpayFn`.
  - `src/hooks/useLocaisVMPay.ts`, `src/utilitarios/vmpay-endereco.ts` — hook + formatação e link mapa.
  - `src/paginas/suporte/DetalheChamadoSuporte.tsx` — nome da loja + endereço, telefone e "Abrir no mapa".
- **Decisões:** Cruzamento pelo nome da loja salvo no chamado com `locations[].name` da VMPay; falha silenciosa se API indisponível.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.
- **Próximos passos:** Confirmar que nomes em chamados batem com `locations` na VMPay da empresa.

## [2026-07-06 22:02] — Suporte: página Resolvidos no menu lateral com pesquisa
- **Autor:** Cursor (Auto)
- **Objetivo:** Técnicos devem consultar todos os chamados resolvidos com pesquisa e filtros; item no menu lateral.
- **Arquivos alterados:**
  - `src/paginas/suporte/ListaResolvidosSuporte.tsx` — criado — lista com busca, loja, categoria e período.
  - `src/paginas/suporte/LinhaChamadoSuporte.tsx` — criado — linha reutilizável nas listas.
  - `src/routes/w.$slug.suporte.tsx` — layout com Outlet; `suporte.index` e `suporte.resolvidos`.
  - `src/componentes/layout/AppSidebar.tsx` — item "Resolvidos" para papel Suporte.
  - `src/paginas/suporte/PainelSuporte.tsx` — card Resolvidos clicável + link "Ver todos".
  - `src/paginas/chamados/DetalheChamado.tsx` — após resolver, redireciona técnico para Resolvidos.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.
- **Próximos passos:** Validar filtros com muitos chamados resolvidos.

## [2026-07-06 21:52] — Detalhe do chamado ultra-simplificado para Suporte
- **Autor:** Cursor (Auto)
- **Objetivo:** Técnicos ao abrir chamado devem ver só o essencial: loja, categoria, descrição e botões de ação (resolver, pausar, etc.).
- **Arquivos alterados:**
  - `src/paginas/suporte/DetalheChamadoSuporte.tsx` — criado — layout focado com loja/categoria em destaque, descrição completa e barra de ações.
  - `src/paginas/chamados/DetalheChamado.tsx` — modificado — early return para papel Suporte; diálogo de transição compartilhado.
- **Resumo das mudanças:** Removidos para Suporte: abas (timeline, comentários, anexos, histórico), sidebar de detalhes, prioridade/tipo, dropdown de status. Ações viram botões grandes: Aceitar, Resolver, Pausar, Retomar.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.
- **Próximos passos:** Validar no celular (barra de ações sticky).

## [2026-07-06 21:05] — Papel Suporte: visão simplificada para técnicos/manutenção
- **Autor:** Cursor (Auto)
- **Objetivo:** Criar nível de acesso Suporte com painel focado, visibilidade só de chamados atribuídos e fluxo de aceitar/resolver.
- **Arquivos alterados:**
  - `scripts/db-init/20-papel-suporte.sql` — criado — enum `Suporte`, RLS `chamados_selecionar/atualizar` restrito a `responsavel_id = auth.uid()`.
  - `src/lib/papel-acesso.ts` — criado — helpers de papel, rotas permitidas e redirect inicial.
  - `src/paginas/suporte/PainelSuporte.tsx`, `src/routes/w.$slug.suporte.tsx` — painel com KPIs, listas (aceitar/em atendimento/resolvidos).
  - `src/componentes/layout/AppSidebar.tsx`, `src/routes/w.$slug.tsx`, redirects em `index.tsx`/`w.$slug.index.tsx`/`SelecionarWorkspace.tsx` — menu e guards.
  - `src/paginas/chamados/DetalheChamado.tsx` — modo Suporte (aceitar, status, sem IA/admin); gestor atribui técnico no sidebar.
  - `src/componentes/configuracoes/AbaUsuarios.tsx`, tipos/schema/traduções, `src/integrations/supabase/types.ts`, `src/routeTree.gen.ts`.
- **Resumo das mudanças:** Técnicos com papel Suporte entram em `/w/{slug}/suporte`, veem só chamados onde são responsáveis (RLS + UI). Aceitam (Aberto → Em andamento), acompanham métricas e abrem detalhe simplificado. Gestor atribui pelo seletor "Responsável / técnico" no chamado.
- **Decisões e justificativas:** Suporte excluído de `pode_ver_todos_chamados`; assume/reassumir desabilitado para Suporte (atribuição pelo gestor); subchamados/IA/requisição compras ocultos no detalhe.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK (migration 20 aplicada, app 1/1, postgrest 1/1).
- **Pendências / TODO:** Criar usuário teste com papel Suporte; gestor atribui chamado; validar aceite e resolução.
- **Próximos passos:** Testar fluxo completo em produção; ajustar lista de técnicos se houver membros Suporte inativos no seletor.

## [2026-07-06 20:52] — Requisição de Compras: status Cotando + Excel do comprador
- **Autor:** Cursor (Auto)
- **Objetivo:** Corrigir erro ao alterar status para "Cotando"; melhorar layout da exportação Excel para o comprador.
- **Arquivos alterados:**
  - `scripts/db-init/19-status-item-compra-cotando.sql` — criado — `ALTER TYPE status_item_compra ADD VALUE 'Cotando'`.
  - `src/db/schema.ts`, `drizzle/0000_inicial.sql` — enum alinhado com Supabase (inclui Cotando).
  - `src/componentes/chamados/RequisicaoCompras.tsx` — modificado — planilha reorganizada: cabeçalho, colunas do comprador, fórmula total, autofiltro, freeze, aba Instruções, itens por prioridade.
- **Resumo das mudanças:** VPS tinha enum sem "Cotando" (só Pendente/Aprovado/…); UI e Supabase já usavam Cotando. Excel agora separa dados do solicitante vs campos a preencher (Fornecedor, valores, NF).
- **Comandos executados:** `psql` migration 19 → OK; `bash deploy/deploy-swarm.sh` → OK.
- **Pendências / TODO:** Nenhuma.
- **Próximos passos:** Testar status Cotando e exportar Excel em chamado de Compras.

## [2026-07-06 20:44] — Remover logout por inatividade
- **Autor:** Cursor (Auto)
- **Objetivo:** Usuário não deve ser deslogado após ficar parado no sistema.
- **Arquivos alterados:**
  - `src/auth/jwt.server.ts` — modificado — `SESSION_TTL_DIAS` (padrão 365); access e refresh com mesmo TTL (antes access = 15 min).
  - `src/auth/cookies.server.ts` — modificado — cookie de access com maxAge igual ao refresh (browser não apagava cookie após 15 min).
  - `src/auth/sessoes.server.ts` — modificado — renovação estende `expiraEm` sem rotacionar refresh (evita invalidar abas após idle).
  - `deploy/.env.swarm`, `deploy/.env.swarm.example`, `.env.production.example` — `SESSION_TTL_DIAS=365`.
- **Resumo das mudanças:** Logout após ~15 min vinha do JWT/cookie de access curto; refresh existia mas cookie sumia e rotação invalidava token. Agora sessão dura 365 dias (configurável) independente de inatividade.
- **Decisões e justificativas:** Rotação de refresh a cada request removida — sliding expiration só em `expiraEm`; logout manual continua funcionando.
- **Comandos executados:** `bash deploy/deploy-swarm.sh` → OK.
- **Pendências / TODO:** Usuários já logados podem precisar entrar uma vez para obter cookies novos; depois disso sessão persistente.
- **Próximos passos:** Validar: login → aguardar 20+ min sem usar → voltar e navegar sem ir ao login.

## [2026-07-06 20:36] — Chamados: layout amplo, lista sem scroll e quadro Kanban mais rápido
- **Autor:** Cursor (Auto)
- **Objetivo:** Remover barra de scroll horizontal na lista de chamados; ampliar layout no modo Quadro; acelerar abertura do Kanban.
- **Arquivos alterados:**
  - `src/components/ui/table.tsx` — modificado — prop `semScroll` para tabelas que cabem na largura.
  - `src/paginas/chamados/ListaChamados.tsx` — modificado — tabela `table-fixed`, colunas responsivas, categoria/depto no subtítulo em telas menores, removida coluna "Criado" duplicada.
  - `src/routes/w.$slug.chamados.tsx` — modificado — largura até 1920px (lista) / full (quadro); prefetch ao passar mouse em "Quadro".
  - `src/paginas/chamados/QuadroChamados.tsx` — modificado — grid full-width (sem scroll horizontal); colunas com scroll vertical interno; skeleton em vez de spinner bloqueante.
  - `src/hooks/useChamados.ts` — modificado — `useChamadosQuadro` com cache dedicado + prefetch.
  - `src/hooks/useFunisKanban.ts` — modificado — funis padrão instantâneos via `placeholderData`; prefetch.
  - `src/lib/chamados-manutencao.ts` — modificado — RPC de fechamento automático no máximo 1×/min por workspace.
- **Resumo das mudanças:** Scroll horizontal vinha do wrapper `overflow-auto` da Table + ~1300px de colunas fixas em container estreito. Kanban demorava por esperar chamados + funis + seed no banco; agora mostra colunas padrão imediatamente e prefetch ao hover.
- **Decisões e justificativas:** Manutenção de chamados expirados não roda de novo no quadro se lista já rodou (<60s); grid `1fr` distribui colunas na tela toda.
- **Comandos executados:** ReadLints → OK; `bash deploy/deploy-swarm.sh` → OK.
- **Pendências / TODO:** Validar quadro com muitos funis customizados + "Mostrar encerrados".
- **Próximos passos:** Ctrl+F5 nos clientes; testar Lista e Quadro em monitor comum (1366px).

## [2026-07-06 20:30] — Correção "Esta página não carregou" + deploy
- **Autor:** Cursor (Auto)
- **Objetivo:** Investigar e corrigir erro genérico ao navegar no sistema ("Esta página não carregou").
- **Arquivos alterados:**
  - `src/lib/detectar-erro-carregamento.ts` — criado — detecta falha de chunk/asset após deploy e recarrega uma vez por sessão.
  - `src/routes/__root.tsx` — modificado — ErrorComponent e 404 em PT-BR; listener global de chunk error; mensagem específica pós-deploy.
  - `src/server.ts` — modificado — `Cache-Control: no-store` em respostas HTML (Traefik não aplicava; HTML em cache apontava para `/assets/*` antigos).
  - `src/componentes/chamados/FormularioChamado.tsx` — modificado — Selects de departamento/categoria com `undefined` em vez de `""` (Radix crashava sem item correspondente).
  - `src/componentes/layout/AppSidebar.tsx` — modificado — removidos links Clientes/Relatórios (rotas inexistentes, 404).
- **Resumo das mudanças:** Causa principal: após deploys frequentes, navegação client-side falhava ao carregar chunks com hash antigo. HTML sem no-store agravava. Select de categoria vazio também podia derrubar Novo/Editar chamado.
- **Decisões e justificativas:** Recarga automática limitada a 1× por sessão via `sessionStorage`; Clientes/Relatórios ocultos até existirem rotas.
- **Comandos executados:** ReadLints → OK; `bash deploy/deploy-swarm.sh` → OK; `curl -I` painel → `cache-control: no-store`.
- **Erros e resoluções:** Build local falhou (Node 18 vs Vite 20+) — deploy via Docker OK.
- **Pendências / TODO:** Validar com usuários (Ctrl+F5 uma vez se ainda tiverem aba antiga aberta).
- **Próximos passos:** Monitorar se erro persiste; reintroduzir Clientes/Relatórios quando rotas forem criadas.

## [2026-07-06 20:13] — Editar tratativa em chamado resolvido + deploy
- **Autor:** Cursor (Auto)
- **Objetivo:** Permitir editar a "Tratativa realizada" após resolver o chamado (correção de texto); deploy com alterações pendentes (categoria/departamento + tratativa).
- **Arquivos alterados:**
  - `src/paginas/chamados/DetalheChamado.tsx` — modificado — botão "Editar" no banner de tratativa (status Resolvido); textarea inline + Salvar/Cancelar; quem pode: responsável, atendentes do dept. destino ou admin/proprietário.
- **Resumo das mudanças:** Tratativa deixou de ser só leitura; update em `chamados.tratativa` sem mudar status (trigger do banco só exige tratativa ao transicionar para Resolvido).
- **Decisões e justificativas:** Edição só enquanto status = Resolvido (antes do fechamento automático); Fechado permanece somente leitura.
- **Comandos executados:** ReadLints → OK; `bash deploy/deploy-swarm.sh` → OK (`chamados_chamados_app` 1/1, `chamados_postgrest` 1/1).
- **Erros e resoluções:** Nenhum.
- **Pendências / TODO:** Nenhuma.
- **Próximos passos:** Validar: resolver chamado → Editar tratativa → salvar.

## [2026-07-06 20:10] — Novo chamado: departamento antes de categoria, filtro e obrigatoriedade
- **Autor:** Cursor (Auto)
- **Objetivo:** Em Novo chamado, inverter ordem Departamento destino ↔ Categoria; filtrar categorias pelo departamento selecionado; tornar Categoria obrigatória.
- **Arquivos alterados:**
  - `src/componentes/chamados/FormularioChamado.tsx` — modificado — Departamento destino movido para cartão Classificação; Categoria para Atribuição e prazo; categorias filtradas por `departamento_id`; categoria obrigatória (validação + botão desabilitado); ao trocar departamento limpa categoria incompatível; subchamado herda também `departamento_id` da categoria do pai.
- **Resumo das mudanças:** Fluxo: 1) escolhe departamento destino → 2) escolhe categoria (só as vinculadas ao depto em Configurações → Categorias). Removida opção "Sem categoria".
- **Decisões e justificativas:** Categorias sem `departamento_id` não aparecem até haver depto selecionado; em edição, categoria legada fora do filtro continua visível para não quebrar chamados antigos.
- **Comandos executados:** ReadLints → OK.
- **Pendências / TODO:** Nenhuma (incluído no deploy 20:13).
- **Próximos passos:** Validar fluxo Projetos → Comercial com categorias por departamento.

## [2026-07-06 19:58] — Busca e ordem alfabética em Usuários da empresa
- **Autor:** Cursor (Auto)
- **Objetivo:** Incluir busca de usuários e listar membros em ordem alfabética por nome na aba Usuários da empresa.
- **Arquivos alterados:**
  - `src/componentes/configuracoes/AbaUsuarios.tsx` — modificado — campo de busca (nome, e-mail, departamento, cargo, papel); filtros em membros e convites; contador "X de Y" ao buscar; convites também em ordem alfabética.
  - `src/hooks/useMembrosWorkspace.ts` — modificado — ordenação alfabética por `perfil.nome` (locale pt-BR) ao carregar membros.
- **Resumo das mudanças:** Administradores localizam usuários pela busca; listas de membros e convites ficam organizadas A–Z por nome.
- **Decisões e justificativas:** Ordenação no hook beneficia também dropdowns e a aba Usuários × Departamentos; busca só na UI de configuração para não alterar outros fluxos.
- **Comandos executados:** ReadLints → OK; `bash deploy/deploy-swarm.sh` → OK (`chamados_chamados_app` 1/1, `chamados_postgrest` 1/1).
- **Erros e resoluções:** Nenhum.
- **Pendências / TODO:** Nenhuma.
- **Próximos passos:** Validar busca com Ctrl+F5 em Configurações → Usuários da empresa.

## [2026-07-02 23:55] — Atribuir a mim, reabertura e fechamento automático
- **Autor:** Cursor (Auto)
- **Objetivo:** Ao clicar "Atribuir a mim" status vai para Em andamento; solicitante pode reabrir chamado resolvido em até 5 dias; após 5 dias fecha automaticamente.
- **Arquivos alterados:**
  - `scripts/db-init/18-chamados-atribuir-reabrir-fechar.sql` — criado — trigger ao atribuir responsável (Aberto→Em andamento); `fechar_chamados_resolvidos_expirados`; validação de reabertura só pelo solicitante.
  - `src/paginas/chamados/DetalheChamado.tsx` — modificado — botão Reabrir chamado + diálogo com motivo; banner de prazo; atribuir a mim já muda status.
  - `src/utilitarios/prazo-reabertura-chamado.ts` — criado — helpers de prazo (5 dias).
  - `src/lib/chamados-manutencao.ts` — criado — RPC fechar expirados.
  - `src/hooks/useChamados.ts`, `src/hooks/useChamado.ts` — modificado — chama fechamento automático ao carregar lista/detalhe.
- **Resumo das mudanças:** Reabertura volta para Aberto, remove responsável e registra comentário. Prazo contado a partir de `resolvido_em` (fuso Brasília). Fechamento automático ao abrir lista ou detalhe.
- **Decisões e justificativas:** Regra no banco (triggers + RPC) garante consistência; UI só para solicitante reabrir. Tratativa anterior preservada no histórico.
- **Comandos executados:** `psql` migration 18 → OK; `docker build` → OK; `docker service update --force` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar fluxo Projetos→Comercial: atribuir, resolver, reabrir em <5 dias; após 5 dias status Fechado.
- **Próximos passos:** Commit quando autorizado.

## [2026-07-02 23:40] — Notificações automáticas de chamados
- **Autor:** Cursor (Auto)
- **Objetivo:** Usuários recebem no sino eventos de criação e atualização de chamados (ex.: Projetos abre para Comercial; mudanças de status, comentários, anexos).
- **Arquivos alterados:**
  - `scripts/db-init/17-notificacoes-chamados.sql` — criado — triggers e funções SQL para inserir notificações; destinatários: solicitante, responsável, dept. destino e origem (exceto quem agiu).
  - `src/lib/notificacoes-chamado.ts` — criado — sinalização realtime pós-mutação no cliente.
  - `src/routes/api/notificacoes/sinalizar.ts` — criado — endpoint SSE para invalidar sino.
  - `src/hooks/useNotificacoes.ts` — modificado — filtro por `destinatario_id`; polling 60s + realtime.
  - `src/componentes/layout/Cabecalho.tsx` — modificado — rótulos por tipo (Novo chamado, Status, Comentário, etc.).
  - `NovoChamado.tsx`, `DetalheChamado.tsx`, `ComentariosChamado.tsx`, `AnexosChamado.tsx`, `QuadroChamados.tsx` — modificado — chamam `sinalizarNotificacoesWorkspace` após mutações.
- **Resumo das mudanças:** Banco gera notificações via trigger em INSERT/UPDATE de `chamados`, INSERT em `chamado_comentarios` e `chamado_anexos`. Comentários internos não notificam o solicitante. UI atualiza em tempo real ou no máximo em 1 min.
- **Decisões e justificativas:** Lógica no Postgres garante cobertura mesmo se o cliente falhar; sinalização SSE acelera o sino. Arquivo sem sufixo `.client` para compatibilidade com build TanStack Start.
- **Comandos executados:** SQL aplicado no Postgres → OK; `docker build` → OK (após correção import); `docker service update --force` → converged.
- **Erros e resoluções:** build falhou com `import-protection` em `*.client.*` — renomeado para `notificacoes-chamado.ts` com guard `typeof window`.
- **Pendências / TODO:** Validar na UI: Projetos→Comercial novo chamado; comentário/anexo/status chegam ao responsável e ao dept. destino.
- **Próximos passos:** Commit quando autorizado; teste com dois usuários em departamentos diferentes.

## [2026-07-02 23:25] — Anexos: organização em pastas colapsáveis por envio
- **Autor:** Cursor (Auto)
- **Objetivo:** Muitos anexos desorganizados — usuário pediu layout tipo pasta para acompanhar envios (Comercial vs Projetos, etc.).
- **Arquivos alterados:**
  - `src/componentes/chamados/AnexosChamado.tsx` — modificado — pastas por lote de envio (mesmo autor + janela 5 min); accordion expandir/recolher; Pasta 1, 2… com ícone; resumo por tipo; pasta mais recente abre automaticamente.
- **Resumo das mudanças:** Cada clique em "Enviar N arquivos" vira uma pasta. Vários envios da mesma pessoa em momentos diferentes = pastas separadas. Dentro: Fotos / Vídeos / Documentos.
- **Decisões e justificativas:** Sem campo novo no banco — agrupamento por `enviado_por` + proximidade de `criado_em`. Numeração cronológica (Pasta 1 = envio mais antigo).
- **Comandos executados:** ReadLints → OK; `docker build` → OK; `docker service update --force` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar chamado com múltiplos envios de departamentos diferentes.
- **Próximos passos:** Commit quando autorizado.

## [2026-07-02 23:15] — Anexos do chamado: organização por autor e tipo
- **Autor:** Cursor (Auto)
- **Objetivo:** Aba Anexos desorganizada — não mostrava quem enviou o quê (ex.: Comercial vs Projetos).
- **Arquivos alterados:**
  - `src/componentes/chamados/AnexosChamado.tsx` — reescrito — agrupamento por colaborador (nome, departamentos, badge "Você"); subseções Fotos / Vídeos / Documentos; galeria com miniaturas; resumo total; lightbox com navegação.
- **Resumo das mudanças:** Cada pessoa tem um bloco com avatar, departamento(s), quantidade e período dos envios. Mídias em grade; documentos em lista. Vídeos com player no modal.
- **Decisões e justificativas:** Sem mudança de schema — `enviado_por` + vínculos de departamento já existem. Ordem dos blocos: quem enviou mais recentemente primeiro; arquivos do autor em ordem cronológica.
- **Comandos executados:** ReadLints → OK; `docker build` → OK; `docker service update --force` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar na UI com chamado Comercial→Projetos com fotos e vídeos de pessoas diferentes.
- **Próximos passos:** Commit quando autorizado.

## [2026-07-02 23:05] — Lista de Chamados: indicador de anexo + coluna Atualizado
- **Autor:** Cursor (Auto)
- **Objetivo:** Na listagem, identificar chamados com anexo e exibir data/hora da última atualização.
- **Arquivos alterados:**
  - `src/paginas/chamados/ListaChamados.tsx` — modificado — query `chamado_anexos` (contagem por chamado); badge com ícone de clipe; coluna "Atualizado" (`atualizado_em` dd/MM/yyyy HH:mm) com ordenação.
- **Resumo das mudanças:** Chamados com anexo mostram badge 📎 + quantidade ao lado do título. Nova coluna ordenável com última atualização do registro.
- **Decisões e justificativas:** Contagem em batch (1 query por workspace), mesmo padrão de subchamados. `atualizado_em` já é mantido por trigger no banco.
- **Comandos executados:** ReadLints → OK; `docker build` → OK; `docker service update --force chamados_chamados_app` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar na UI: badge de anexo e coluna Atualizado.
- **Próximos passos:** `docker build` + `service update`.

## [2026-07-02 22:55] — Fechados no mês: cartão 1 / modal 0 + deploy
- **Autor:** Cursor (Auto)
- **Objetivo:** ti@nutricarbrasil.com.br via 1 em Fechados no mês mas modal vazio; confirmar correções e build.
- **Diagnóstico:** (1) Container estava há 10 dias sem deploy — correções anteriores não estavam em produção. (2) NB-0088: passou Fechado→Resolvido em 02/07; `fechado_em` permaneceu preenchido mas `status=Resolvido`. Cartão contava só `fechado_em`; modal filtrava `status=Fechado` → divergência.
- **Arquivos alterados:**
  - `src/hooks/useIndicadoresPainel.ts` — modificado — `fechadosMes` exige `status=Fechado`; `resolvidosMes` exige `status=Resolvido`.
- **Resumo das mudanças:** Contagem alinhada ao modal. Após deploy, Fechados no mês deve ser 0; o NB-0088 aparece em Resolvidos no mês.
- **Decisões e justificativas:** Não limpar `fechado_em` ao reabrir status — apenas não contar em Fechados se não estiver Fechado.
- **Comandos executados:** consulta SQL NB-0088 → OK; `docker build -t chamados-nutricar:latest` → OK (~142s); `docker service update --force chamados_chamados_app` → converged.
- **Erros e resoluções:** build anterior da sessão não rodou (Node 18 local); produção corrigida via Docker.
- **Pendências / TODO:** Usuário recarregar painel (Ctrl+Shift+R); validar Fechados=0 e Resolvidos≥1.
- **Próximos passos:** Commit quando autorizado.

## [2026-07-02 22:45] — Painel: correção das visões de período e Aguardando
- **Autor:** Cursor (Auto)
- **Objetivo:** Alinhar modal/prévia e lista com os números dos cartões (fechado_em, resolvido_em, ambos Aguardando).
- **Arquivos alterados:**
  - `src/componentes/painel/PreviaIndicador.tsx` — modificado — `campoData` + `statusIn`; filtro de mês via `useChamados` no campo correto; URL repassa `campoData` e `statusIn`.
  - `src/hooks/useChamados.ts` — modificado — suporte a `statusIn` e `resolvido_em` em `campoData`.
  - `src/routes/w.$slug.painel.tsx` — modificado — cartões passam `campoData` adequado; Aguardando usa os dois status.
  - `src/routes/w.$slug.chamados.index.tsx` — modificado — `campoData` e `statusIn` na busca validada.
  - `src/paginas/chamados/ListaChamados.tsx` — modificado — lê `campoData`/`statusIn` da URL; rótulo "Resolução" para `resolvido_em`.
- **Resumo das mudanças:** Fechados/Resolvidos no mês filtram por data de fechamento/resolução (não mais por criação). Aguardando lista solicitante + terceiros. Link "Ver lista completa" preserva o critério de data.
- **Decisões e justificativas:** Filtro de mês no servidor (`dataInicio` + `campoData`) espelha a lógica de `useIndicadoresPainel`. `statusIn` serializado por vírgula na URL (nomes de status não contêm vírgula).
- **Comandos executados:** ReadLints → OK; `npm run build` → ERRO (Node 18 vs Vite 20+ no ambiente).
- **Erros e resoluções:** build local falhou por versão do Node, não por alteração de código.
- **Pendências / TODO:** Validar na UI: cartão Fechados no mês = mesma contagem do modal e da lista; idem Resolvidos; Aguardando inclui terceiros.
- **Próximos passos:** Deploy e validação com usuário de TI + filtro de departamento.

## [2026-06-22 19:35] — Lista de Chamados: visão "Resolvidos" + KPIs viram visões clicáveis
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Faltava a visão "Resolvidos" na tela de Chamados.
- **Diagnóstico:** O Kanban (funis) não tem registros no banco (0), então o usuário se refere à Lista. Os cartões de KPI tinham só Total/Abertos/Em andamento/Atrasados.
- **Arquivos alterados:**
  - `src/paginas/chamados/ListaChamados.tsx` — modificado —
    - Novo cartão "Resolvidos" (ícone `CheckCircle2`), contado a partir de `dadosBrutos` (ignora a ocultação de encerrados da visão padrão e respeita "Meus chamados").
    - Cartões de KPI agora são **botões clicáveis** (visões rápidas): clicar aplica o status correspondente (Total=Todos, Aberto, Em andamento, Resolvido) ou "Atrasados" (somenteVencidos). Cartão ativo fica destacado (`ring`/borda primária). Grid ajustado para até 5 colunas.
- **Resumo das mudanças:** Um clique em "Resolvidos" filtra a lista para status Resolvido (a lista já exibe encerrados quando o status específico é encerrado). Demais cartões também filtram.
- **Decisões e justificativas:** "Resolvidos" contado do conjunto bruto para mostrar número útil mesmo com a visão padrão ocultando encerrados. KPIs clicáveis = "visões" pedidas pelo usuário.
- **Comandos executados:** consulta SQL (kanban_funis: 0 linhas); ReadLints → OK; `docker build` → OK; `docker service update --force` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar na UI: cartão "Resolvidos" mostra contagem e, ao clicar, lista os resolvidos; destaque do cartão ativo.
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 19:20] — Lista de Chamados: coluna "Departamento responsável" + filtro "Meus chamados"
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** (1) Exibir o departamento de destino na lista, rotulado como "Departamento responsável"; (2) adicionar filtro "Meus chamados" para ver só os chamados abertos pelo usuário (solicitante), já que a lista mostra todos do departamento.
- **Arquivos alterados:**
  - `src/paginas/chamados/ListaChamados.tsx` — modificado —
    - Nova coluna "Departamento responsável" (após Categoria) mostrando o nome do `departamento_id` (destino), via `mapaDepartamentos` (id→nome) construído a partir de `useDepartamentos`.
    - Novo filtro client-side `somenteMeus` (botão-toggle "Meus chamados" com ícone `UserCheck`): filtra `c.solicitante_id === usuarioId`. Integrado a `temFiltro`, `limparTudo` e aos chips de filtros ativos.
- **Resumo das mudanças:** A Bianca (Comercial) vê todos os chamados do departamento por padrão; ao ativar "Meus chamados", a lista passa a mostrar só os que ela abriu. A coluna deixa claro qual o departamento responsável (destino) de cada chamado.
- **Decisões e justificativas:** "Meus chamados" = solicitante (quem abriu), distinto de "Atribuídos a mim" (responsável). Filtro client-side pois todos os chamados visíveis já vêm no fetch; sem mudança no hook/DB. Nome do departamento resolvido no cliente (o hook traz `departamento_id` via `select *`).
- **Comandos executados:** ReadLints → OK; `docker build` → OK; `docker service update --force` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar na UI: coluna aparece com o departamento destino; "Meus chamados" reduz a lista aos abertos pelo usuário; chip e "Limpar" funcionam.
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 19:05] — Painel: visões (modais) não respeitavam o filtro ativo de "Meus atalhos"
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Com "Meus atalhos" filtrando por departamento (ex.: Comercial), o cartão "Chamados abertos" mostrava 2, mas ao clicar a visão abria listando 55. As visões deviam respeitar o filtro ativo.
- **Causa raiz:** `abrir()` em `src/routes/w.$slug.painel.tsx` montava o `PreviaIndicador` passando SÓ o filtro do cartão (ex.: `{ status: "Aberto" }`), ignorando `filtroAtalho.filtros`. Os números dos cartões já vêm do `useIndicadoresPainel` com o filtro aplicado, mas o modal não recebia o mesmo filtro.
- **Arquivos alterados:**
  - `src/routes/w.$slug.painel.tsx` — modificado — `abrir()` agora mescla `filtroAtalho?.filtros` (base) com o filtro do cartão (sobrepõe nas chaves em conflito, ex.: status do cartão vence). Em rankings (`chamadoIds`) não re-aplica, pois os ids já são calculados a partir da lista filtrada.
- **Resumo das mudanças:** As visões/modais agora refletem o mesmo recorte dos cartões. Ex.: Comercial → "Chamados abertos" mostra 2 e a visão lista os mesmos 2. Vale para todos os cartões (Operação atual, Resultados do mês) e barras de status/prioridade.
- **Decisões e justificativas:** `FiltrosPainel` é compatível com `FiltrosPrevia` (responsavel "MEUS", status, encerrados, vencidos, departamento_id, categoria), então a mescla é direta. Cartão vence em conflito de chave por representar a intenção do clique.
- **Comandos executados:** ReadLints → OK; `docker build` → OK; `docker service update --force` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar na UI: filtro Comercial + clicar "Chamados abertos" → modal lista os mesmos N do cartão; conferir demais cartões e as barras.
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 18:55] — Diagnóstico NB-0078 (filtro Comercial) + edição de e-mail por administrador
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** (1) NB-0078 não aparecia ao filtrar "Comercial"; (2) permitir que administrador edite o e-mail de um usuário.
- **Diagnóstico NB-0078:** destino=Projetos, origem=Comercial, solicitante=Bianca (2 deptos: Comercial e Pós-vendas). A query do `useChamados` com RLS da Bianca + filtro origem-OU-destino **retorna** o chamado no banco; os bundles em produção (client/server `useChamados` e `painel`) já contêm o filtro `departamento_origem_id.eq` e o dropdown. Não há refiltragem client-side por departamento na Lista. Conclusão: backend correto; o que o usuário viu era **cache do navegador** (bundle antigo) → resolver com recarregamento forçado (Ctrl+Shift+R).
- **Arquivos alterados:**
  - `src/lib/admin-usuarios.server.ts` — modificado — nova função `atualizarEmailUsuario` (autoriza Proprietário/Administrador/super_admin; protege e-mail do Proprietário; valida formato e unicidade; atualiza `usuarios.email` + `perfis.email`).
  - `src/routes/api/admin/usuarios/atualizar-email.ts` — criado — rota POST que valida sessão e payload e chama a função de servidor.
  - `src/lib/admin-usuarios.functions.ts` — modificado — caller HTTP `atualizarEmailUsuario` + tipo `InputAtualizarEmail`.
  - `src/componentes/configuracoes/AbaUsuarios.tsx` — modificado — no diálogo "Editar membro" o e-mail fica editável para administradores (campo controlado em `formMembro.email`); ao salvar, se mudou e o usuário é admin, chama a função de servidor antes do update de perfil. Para não-admin permanece desabilitado.
- **Resumo das mudanças:** Admin/Proprietário pode trocar o e-mail (login + perfil) de um usuário pela aba Usuários, com validação de unicidade e proteção do Proprietário.
- **Decisões e justificativas:** A troca de e-mail toca a credencial de login (tabela `usuarios`), então é feita via server function (não pelo PostgREST), espelhando o padrão de `definir-senha`. Restrito a Proprietário/Administrador (Gestor não pode), por ser dado de identidade.
- **Comandos executados:** consultas SQL de diagnóstico → OK; ReadLints (4 arquivos) → OK; `docker build` → OK; `docker service update --force` → converged; grep nos bundles confirma rota `atualizar-email` (server) e UI (client).
- **Erros e resoluções:** "NB-0078 não filtra" → não era bug de código (já corrigido na entrada anterior), e sim cache do navegador; orientado recarregamento forçado.
- **Pendências / TODO:** Validar na UI: admin abre Editar membro → altera e-mail → salva → login passa a usar o novo e-mail; tentativa de e-mail duplicado mostra erro.
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 18:30] — Atalhos: dropdowns (Departamento/Categoria) + fix filtro por departamento (origem OU destino)
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** (1) "Por categoria" virar lista suspensa; (2) incluir filtro por departamento (dropdown com todos); (3) corrigir "Minha área" que não filtrava; (4) corrigir o filtro de departamento na Lista de Chamados.
- **Causa raiz dos itens 3 e 4:** o filtro de departamento só casava o DESTINO (`departamento_id`). Chamados abertos "em nome de" um departamento guardam esse setor em `departamento_origem_id`. Logo, filtrar pela própria área (origem) não trazia nada. Confirmado no banco: 16/78 chamados têm origem ≠ destino.
- **Arquivos alterados:**
  - `src/hooks/useChamados.ts` — modificado — filtro `departamento_id` passou de `eq` para `or(departamento_id.eq.X, departamento_origem_id.eq.X)`. Corrige a Lista de Chamados e a prévia.
  - `src/hooks/useIndicadoresPainel.ts` — modificado — select inclui `departamento_origem_id`; filtro de departamento casa origem OU destino.
  - `src/routes/w.$slug.painel.tsx` — modificado — em "Meus atalhos", os chips de "Minha área" e "Por categoria" viraram dois `Select`: Departamento (todos; os do usuário aparecem primeiro como "(minha área)") e Categoria (todas, de `useCategoriasChamado`). Mantidos os chips de status. Selecionar "Todos/Todas" limpa o respectivo filtro.
- **Resumo das mudanças:** Filtro por departamento agora funciona de fato (origem ou destino). UX dos atalhos simplificada com listas suspensas.
- **Decisões e justificativas:** Semântica origem-OU-destino reflete "chamados daquele departamento" (recebidos e abertos em nome dele). Modelo de filtro único do painel mantido (dropdown substitui o filtro ativo). Sem mudança de schema/DB.
- **Comandos executados:** ReadLints (3 arquivos) → OK; `docker build` → OK; `docker service update --force --image ... chamados_chamados_app` → converged. Verificação no banco: 76/78 com origem, 16 com origem≠destino.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar na UI: Bianca (Comercial) filtra "Comercial" → vê os que abriu em nome do Comercial; filtra "Projetos" → vê os que abriu para Projetos; o mesmo filtro na Lista de Chamados também traz resultado.
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 18:18] — Meus atalhos passam a FILTRAR as visões do painel (não abrir modal)
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Os chips de "Meus atalhos" devem filtrar as visões do painel (ex.: clicar "Atribuídos a mim" recalcula os cards/gráficos/rankings), em vez de abrir um modal.
- **Arquivos alterados:**
  - `src/hooks/useIndicadoresPainel.ts` — modificado — novo `FiltrosPainel` (responsavel MEUS, status, encerrados, vencidos, departamento_id, categoria); o hook recebe filtros e os aplica na lista ANTES de qualquer agregação, então todas as visões refletem o filtro; `queryKey` inclui os filtros.
  - `src/routes/w.$slug.painel.tsx` — modificado — estado `filtroAtalho` + `alternarFiltro` (toggle); o hook é chamado com `filtroAtalho?.filtros`; `ChipAtalho` ganhou estado `ativo` (destaque); chips agora alternam o filtro em vez de chamar `abrir`; cabeçalho mostra "Visões filtradas por: …" + botão "Limpar filtro". Categorias sem definição (`__sem__`) ficam fora dos atalhos.
- **Resumo das mudanças:** Clicar num atalho filtra o painel inteiro (cards de Operação atual/Resultados, distribuições, últimos e indicadores). Clicar de novo no mesmo chip limpa.
- **Decisões e justificativas:** Filtragem feita no próprio hook (client-side, sobre os ≤1000 chamados já carregados) para reaproveitar toda a agregação sem duplicar lógica. Cards individuais continuam abrindo a prévia (modal) — comportamento pré-existente preservado. A "Árvore de chamados" segue global (não filtrada) por ter dados próprios.
- **Comandos executados:** ReadLints (2 arquivos) → OK; `docker build` → OK; `docker service update --force --image ... chamados_chamados_app` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar na UI: clicar "Atribuídos a mim" muda os números; chip fica destacado; "Limpar filtro" volta ao geral.
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 18:05] — Painel: barra de atalhos pessoais + prévia com categoria/área/encerrados
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** No painel, logo acima de "Operação atual", uma barra interativa para filtrar meus chamados (abertos, em andamento, resolvidos, encerrados, vencidos), chamados da minha área e por categorias. Todas as visões clicáveis.
- **Arquivos alterados:**
  - `src/componentes/painel/PreviaIndicador.tsx` — modificado — `FiltrosPrevia` ganhou `encerrados`, `categoria`, `departamento_id`; o `useChamados` recebe categoria/departamento; filtro client-side de encerrados (Fechado/Cancelado); chip "Apenas encerrados"; `search` do "Ver lista completa" leva os novos filtros.
  - `src/routes/w.$slug.painel.tsx` — modificado — nova seção "Meus atalhos" (componentes `ChipAtalho` e `GrupoAtalhos`) acima de "Operação atual", com grupos: Meus chamados, Minha área (por departamento do usuário, via `useMembrosWorkspace` + `useDepartamentos` + `useUsuarioAtualId`) e Por categoria (de `data.topCategorias`). Cada chip abre a prévia interativa.
  - `src/routes/w.$slug.chamados.index.tsx` — modificado — `ChamadosSearch`/`validateSearch` aceitam `encerrados`, `categoria`, `departamento`.
  - `src/paginas/chamados/ListaChamados.tsx` — modificado — lê os novos search params (categoria/departamento nos filtros; encerrados → `incluirEncerrados`) na inicialização e na sincronização por URL.
- **Resumo das mudanças:** O usuário tem atalhos rápidos e interativos no topo do painel; clicar abre a prévia já filtrada e o "Ver lista completa" leva o filtro para a Lista.
- **Decisões e justificativas:** Reaproveitei o modal `PreviaIndicador` (já era o mecanismo "interativo" do painel) em vez de criar telas novas. "Minha área" usa os departamentos do próprio usuário. "Encerrados" é client-side (Fechado/Cancelado) para não exigir mudança no hook. Sem mudança de schema/DB.
- **Comandos executados:** ReadLints (4 arquivos) → OK; `docker build` → OK; `docker service update --force --image ... chamados_chamados_app` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar na UI: barra "Meus atalhos" aparece acima de "Operação atual"; cada chip abre a prévia certa; "Minha área" lista os departamentos do usuário; categorias refletem os dados.
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 17:40] — Escolha do departamento de origem na abertura (usuário multi-departamento)
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Quando o solicitante pertence a mais de um departamento (ex.: TI e Comercial), ele deve escolher, na abertura, por qual departamento está abrindo o chamado.
- **Arquivos alterados:**
  - `src/componentes/chamados/FormularioChamado.tsx` — modificado — novo campo `departamento_origem_id` em `DadosFormularioChamado`; `useUsuarioAtualId` para descobrir os departamentos do próprio usuário (`meusDepartamentos`); seletor "Abrir em nome do departamento" exibido só na criação e só quando há 2+ departamentos (`escolherOrigem`); validação obrigatória + estado de erro + desabilita o botão; quando há só 1 departamento, fixa a origem nele automaticamente.
  - `src/paginas/chamados/NovoChamado.tsx` — modificado — insert passa `departamento_origem_id`.
  - `src/paginas/chamados/DetalheChamado.tsx` — modificado — insert de subchamado passa `departamento_origem_id`.
- **Resumo das mudanças:** A origem do chamado deixa de ser sempre o "primeiro departamento" (escolhido arbitrariamente pelo trigger `preencher_departamento_origem`) e passa a ser escolhida pelo usuário quando ele tem múltiplos vínculos.
- **Decisões e justificativas:** A coluna `departamento_origem_id` e o trigger já existiam; o trigger só preenche quando vem NULL (LIMIT 1). Enviando o valor escolhido, o trigger respeita. Mostro o seletor só na criação (não na edição, `ehEdicao = !!inicial.id`) e só para multi-departamento, evitando ruído para quem tem 1. Sem mudança de schema/DB.
- **Comandos executados:** ReadLints (3 arquivos) → OK; `docker build -t chamados-nutricar:latest .` → OK; `docker service update --force --image chamados-nutricar:latest chamados_chamados_app` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar na UI com um usuário de 2+ departamentos: o seletor aparece e é obrigatório; o chamado fica com a origem escolhida (e a visão por departamento do solicitante reflete isso).
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 17:24] — Responsável somente leitura (definido só ao "Atribuir a mim")
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** No detalhe do chamado, o campo Responsável não pode ser um seletor; o responsável deve aparecer quando alguém atribui o chamado a si (botão "Atribuir a mim").
- **Arquivos alterados:**
  - `src/paginas/chamados/DetalheChamado.tsx` — modificado — removido o `<Select>` de Responsável (que aparecia para `podeAtender`); agora o campo é só leitura (`chamado.responsavel?.nome ?? "Sem responsável"`). Mensagem de "atribua um responsável" ajustada para apontar só o botão "Atribuir a mim".
- **Resumo das mudanças:** Responsável vira informação somente leitura. A única forma de definir/assumir é o botão "Atribuir a mim" / "Reassumir chamado" (que continua setando `responsavel_id = usuário logado`, restrito a quem é do departamento de destino via `podeAssumir`).
- **Decisões e justificativas:** Evita que qualquer atendente designe outra pessoa manualmente; a posse do chamado passa a ser sempre auto-atribuição pelo próprio membro do departamento. Sem mudança de schema/DB; `membros` segue usado para `meuMembro`/`ehDoDeptoDestino`.
- **Comandos executados:** ReadLints → OK; `docker build -t chamados-nutricar:latest .` → OK; `docker service update --force --image chamados-nutricar:latest chamados_chamados_app` → converged.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar na UI: campo Responsável aparece como texto (sem dropdown) e só muda ao clicar "Atribuir a mim".
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 17:05] — Visão de chamados por colegas do mesmo departamento do solicitante
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Se a Bianca (Comercial) abre um chamado, todos os funcionários do Comercial precisam ver esse chamado — mesmo que o destino seja outro setor.
- **Arquivos alterados:**
  - `scripts/db-init/16-chamados-visao-mesmo-departamento.sql` — criado — função `public.compartilha_departamento(_workspace_id, _usuario_alvo)` (SECURITY DEFINER) + recriação da policy `chamados_selecionar` adicionando a cláusula de colegas do mesmo departamento do solicitante.
- **Resumo das mudanças:** A policy de SELECT antes só mostrava o chamado para Prop/Admin, o próprio solicitante ou quem é do departamento de DESTINO. Agora também mostra para quem compartilha qualquer departamento (ativo) com o SOLICITANTE.
- **Decisões e justificativas:** A visibilidade certa é pelo departamento de quem ABRE (solicitante), não pelo destino — por isso a função `compartilha_departamento` (espelha `departamentos_do_usuario`, mas para um usuário-alvo) e SECURITY DEFINER para ler vínculos de outros membros sem esbarrar na RLS. Mudança só de DB/RLS: sem rebuild do app e sem reload de schema do PostgREST (função usada só pela policy).
- **Comandos executados:** aplicar SQL no Postgres (`CREATE FUNCTION/GRANT/CREATE POLICY` → OK). Teste de RLS simulando sessão (`SET ROLE authenticated` + `request.jwt.claim.sub`): colega do Comercial vê o chamado da colega (count=1); função `compartilha_departamento`=true. Teste negativo: Gestor de outro setor não vê (count=0), compartilha=false.
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar em produção pela UI (login de um funcionário do Comercial deve listar os chamados abertos pelos colegas do Comercial).
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 16:03] — Responsável só os dos chamados + filtro por departamento do usuário
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** (1) Filtro de Responsável deve listar só quem é responsável por chamados que o usuário vê (não todos os membros). (2) Usuário em vários departamentos pode escolher ver um, outro ou todos os seus departamentos.
- **Arquivos alterados:**
  - `src/hooks/useChamados.ts` — modificado — `FiltrosChamados.departamento_id` + filtro `eq("departamento_id", ...)`.
  - `src/paginas/chamados/ListaChamados.tsx` — modificado:
    - `responsaveisDisponiveis`: derivado dos chamados visíveis (query auxiliar `filtrosParaOpcoes` = filtros com `responsavel_id: "Todos"`, para a lista não colapsar ao escolher um responsável; mesma queryKey quando "Todos" → sem fetch extra). Considera só não-encerrados, salvo "Incluir encerrados".
    - Select de Responsável agora usa `responsaveisDisponiveis` (não mais todos os membros).
    - Novo Select de Departamento, visível só quando o usuário pertence a 2+ departamentos (`useDepartamentos` + `departamento_ids` do membro): "Todos os meus departamentos" + cada departamento dele.
    - Chips e `temFiltro` para departamento; chip de responsável resolve o nome via `responsaveisDisponiveis` (fallback em membros).
- **Resumo das mudanças:** Responsável vira uma lista contextual (só os realmente usados nos chamados visíveis). Quem está em múltiplos departamentos filtra por um específico ou todos os seus.
- **Decisões e justificativas:** Lista contextual evita um dropdown gigante e reflete o pedido ("listar apenas a Bianca"). A query auxiliar evita o efeito de "sumir" as opções ao filtrar por um responsável. Filtro de depto só aparece com 2+ vínculos (sem ruído para quem tem 1). Sem mudança de schema/DB.
- **Comandos executados:** ReadLints → OK; `docker build` → OK; `docker service update --force ... chamados_chamados_app` → converged, Running (healthy).
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar: responsável deve listar só quem aparece nos chamados; usuário multi-departamento deve ver o seletor de departamento e alternar entre eles.
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 15:53] — Filtros (Categoria, Responsável) + encerrados nas visões
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Em Chamados, filtrar por Categoria e por Responsável (pessoa específica), filtrar encerrados, e incluir nas visões (Kanban) a opção de encerrados.
- **Arquivos alterados:**
  - `src/hooks/useChamados.ts` — modificado — `FiltrosChamados.categoria` + filtro server-side `eq("categoria", ...)`. (Filtro por `responsavel_id` específico já existia.)
  - `src/paginas/chamados/ListaChamados.tsx` — modificado — novo `<Select>` de Categoria (de `useCategoriasChamado`); o `<Select>` de Responsável agora lista os membros do workspace (`useMembrosWorkspace`) além de "Todos"/"Atribuídos a mim"; `categoria` em FILTROS_INICIAIS, `temFiltro`, chips (responsável mostra o nome) e `limparTudo`. (Encerrados: o checkbox "Incluir encerrados" e o status específico já cobriam — mantidos.)
  - `src/paginas/chamados/QuadroChamados.tsx` — modificado — botão toggle "Mostrar/Ocultar encerrados" que adiciona colunas virtuais (não persistidas) de Fechado e Cancelado ao quadro; `funisExibidos` (funis do usuário + extras) usado nas colunas e na renderização. Arrastar para essas colunas muda o status normalmente (com confirmação).
- **Resumo das mudanças:** Lista ganhou filtros de Categoria e Responsável (pessoa). Kanban ganhou opção de exibir os encerrados como colunas, sem mexer nos funis salvos do usuário.
- **Decisões e justificativas:** Colunas de encerrados são "virtuais" (state local) em vez de novos funis no banco, para não poluir os funis salvos de cada usuário e funcionar para quem já tem funis seedados sem Fechado/Cancelado. `useChamados` no Quadro já traz encerrados (eles só não tinham coluna). Sem mudança de schema/DB.
- **Comandos executados:** ReadLints (3 arquivos) → OK; `docker build` → OK; `docker service update --force ... chamados_chamados_app` → converged, Running (healthy).
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar no navegador: filtrar por categoria e por um responsável específico; no Quadro, ativar "Mostrar encerrados" e ver as colunas Fechado/Cancelado.
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 12:48] — Fix: "Erro ao enviar" anexos de checklist (PostgREST schema cache)
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Corrigir "Erro ao enviar. Falha ao enviar: <arquivos>" ao anexar imagens no checklist.
- **Arquivos alterados:** nenhum (correção operacional no PostgREST).
- **Diagnóstico (log → causa):**
  - Os arquivos JÁ estavam no disco (`/data/storage/checklist-anexos/<ws>/<checklist>/...`) → o upload no storage funcionou; a falha era no `INSERT` via PostgREST.
  - Log do `chamados_postgrest`: "Schema cache loaded **34 Relations**" e nenhum reload após a criação da tabela. O `NOTIFY pgrst, 'reload schema'` não disparou reload aqui (este PostgREST só recarrega o cache ao reconectar). Resultado: tabela `checklist_anexos` desconhecida → insert falhava → `0` registros no banco.
- **Correção:** `docker service update --force chamados_postgrest` → schema recarregado para **35 Relations / 13 Relationships** (inclui `checklist_anexos` + FK). Removidos os 4 arquivos órfãos das tentativas que falharam.
- **Comandos executados:**
  - `ls`/`find` no volume de storage → arquivos presentes (upload OK).
  - `docker logs chamados_postgrest` → 34 relations (cache velho).
  - `docker service update --force chamados_postgrest` → 35 relations.
  - `SELECT count(*) FROM checklist_anexos` → 0 (confirmou que só os inserts falhavam); `rm -rf` da pasta órfã.
- **Lição/Pendência:** O caminho de deploy completo (`deploy/deploy-swarm.sh`) já faz `docker service update --force chamados_postgrest`, o que recarrega o schema. Como usei o caminho mínimo (build do app + update só do `chamados_app`), o PostgREST ficou com cache velho. Em mudanças que criam/alteram tabelas, **sempre** forçar reload do `chamados_postgrest` (ou rodar o deploy completo).
- **Próximos passos:** Reusuário re-testar o anexo de imagens (deve funcionar agora, sem rebuild do app).

## [2026-06-22 12:37] — Galeria de imagens nos Checklists
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Em Checklists, permitir anexar imagens do projeto e visualizá-las de forma organizada.
- **Arquivos alterados:**
  - `scripts/db-init/15-checklist-anexos.sql` — criado — tabela `checklist_anexos` (FK `checklist_id` → `checklists` ON DELETE CASCADE) + RLS (select por membro do workspace; insert exige `enviado_por = auth.uid()`; delete por autor ou Prop/Admin) + grants `anon/authenticated` + `NOTIFY pgrst`. Espelha `chamado_anexos`.
  - `src/db/schema.ts` — modificado — tabela Drizzle `checklistAnexos`.
  - `src/storage/config.ts` — modificado — novo bucket `checklist-anexos` (privado, 25 MB).
  - `src/componentes/chamados/SeletorAnexos.tsx` — modificado — prop opcional `aceitar` (atributo `accept` + filtro de imagens no drag/drop/colar), retrocompatível.
  - `src/componentes/checklists/GaleriaAnexosChecklist.tsx` — criado — upload (SeletorAnexos só imagens) + galeria responsiva de miniaturas (grid 2→5 colunas) + lightbox com navegação anterior/próxima, baixar e remover; fallback de lista para não-imagens.
  - `src/paginas/checklists/DetalheChecklist.tsx` — modificado — nova seção "Imagens do projeto" antes dos Comentários, com `podeExcluirTodos={ehAdmin}`.
- **Resumo das mudanças:** Reaproveitei toda a infra de storage local (bucket = diretório em `/data/storage`, autorização de domínio via RLS na tabela de metadados). A galeria mostra as imagens em grade com hover (baixar/remover) e visualizador ampliado navegável.
- **Decisões e justificativas:** Criei bucket e tabela próprios (em vez de reusar `chamado-anexos`) para separação limpa por domínio e cascade na exclusão do checklist. SELECT segue a mesma visibilidade de `checklists` (qualquer membro do workspace).
- **Comandos executados:**
  - `psql < scripts/db-init/15-checklist-anexos.sql` → CREATE TABLE/POLICY/GRANT OK; 3 policies e 7 grants para `authenticated` confirmados.
  - ReadLints nos arquivos novos/alterados → OK.
  - `docker build` → OK; `docker service update --force ... chamados_chamados_app` → converged, Running (healthy).
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar no navegador: anexar 2-3 imagens em um checklist, ver a grade, abrir o lightbox e navegar, baixar e remover; conferir que excluir o checklist remove os anexos (cascade).
- **Próximos passos:** Commit quando o usuário autorizar (inclui o novo SQL de db-init).

## [2026-06-22 12:22] — Anexar imagens/arquivos ao resolver chamado
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Em "Resolver chamado", permitir anexar imagens e arquivos mostrando como foi resolvido.
- **Arquivos alterados:**
  - `src/paginas/chamados/DetalheChamado.tsx` — modificado — diálogo de transição para `Resolvido` agora exibe um `SeletorAnexos` (drag/drop/colar) abaixo da tratativa; novo estado `anexosResolucao`/`enviandoAnexos`; helper `enviarAnexosResolucao` (upload no bucket `chamado-anexos` + insert em `chamado_anexos`); após a tratativa salvar com sucesso, os anexos são enviados, a query `["anexos", id]` é invalidada e o diálogo fecha; botão mostra "Enviando anexos..." e bloqueia fechamento durante o envio.
- **Resumo das mudanças:** Reaproveitei a infra de anexos já existente (bucket/tabela/`SeletorAnexos`/aba "Anexos"). Os arquivos enviados na resolução aparecem normalmente na aba Anexos do chamado.
- **Decisões e justificativas:** Não criei tabela nem bucket novos — o fluxo de anexos do chamado já existe e é o lugar natural para esses arquivos. Upload roda no `onSuccess` da mudança de status (a resolução é prioritária; anexo é complementar) com `toast.warning` se algum arquivo falhar, sem reverter o status.
- **Comandos executados:**
  - ReadLints em `DetalheChamado.tsx` → OK.
  - `docker build -t chamados-nutricar:latest .` → OK.
  - `docker service update --force --image chamados-nutricar:latest chamados_chamados_app` → converged, tarefa Running (healthy).
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar no navegador: resolver chamado anexando 1 imagem + 1 PDF; conferir que aparecem na aba Anexos.
- **Próximos passos:** Commit quando o usuário autorizar.

## [2026-06-22 12:15] — Rebuild + redeploy (Swarm) da mudança de status
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** "Veja se precisa rodar o build pois ainda não atualizou" — publicar em produção a mudança de "Salvar e confirmar".
- **Arquivos alterados:** nenhum (apenas build/deploy).
- **Resumo das mudanças:** A app roda como serviço Swarm `chamados_chamados_app` (imagem `chamados-nutricar:latest`), que estava no ar há 4 dias — por isso a mudança só de frontend não aparecia. Rebuildei a imagem e forcei o update do serviço.
- **Decisões e justificativas:** Mudança é só de frontend, sem migração de banco, então usei o caminho mínimo (`docker build` + `docker service update --force --image`) em vez do `deploy/deploy-swarm.sh` completo (que reaplica SQL/RLS e roda Drizzle) — mais rápido e menor risco. O build de Swarm não passa args VITE (usa PostgREST próprio), igual ao que o script faz.
- **Comandos executados:**
  - `docker build -t chamados-nutricar:latest .` → OK (~2 min).
  - `docker service update --force --image chamados-nutricar:latest chamados_chamados_app` → "converged".
  - `docker service ps` / `docker ps` → tarefa nova **Running (healthy)** com a imagem recém-criada (2026-06-22T15:14Z).
- **Erros e resoluções:** nenhum.
- **Pendências / TODO:** Validar no navegador (forçar reload/limpar cache): trocar status pelo dropdown e por arrasto deve sempre abrir confirmação.
- **Próximos passos:** Commit quando o usuário autorizar (worklog + mudanças de frontend ainda não commitados).

## [2026-06-22 12:05] — Toda mudança de status exige botão "Salvar e confirmar"
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Em Chamados, nenhuma mudança de status deve ser aplicada direto — sempre exigir confirmação explícita com botão de salvar.
- **Arquivos alterados:**
  - `src/paginas/chamados/DetalheChamado.tsx` — modificado — `iniciarTransicao` agora abre o diálogo para TODOS os status (antes `Aberto/Em andamento/Cancelado/Fechado` aplicavam na hora via `atualizar.mutate`); diálogo ganhou título/corpo genérico de confirmação para status sem motivo; botão renomeado para "Salvar e confirmar"; fecha e dá toast só no `onSuccess`.
  - `src/paginas/chamados/QuadroChamados.tsx` — modificado — soltar card (drag-and-drop) não aplica direto: abre diálogo de confirmação ("Salvar e confirmar") com título do chamado e status destino; `moverStatus` fecha o diálogo no `onSuccess`.
- **Resumo das mudanças:** Dropdown de status no detalhe e o arrastar no Kanban agora pedem confirmação antes de gravar. Status que exigem dados (Agendado/Pausado/Resolvido) mantêm seus campos no mesmo diálogo.
- **Decisões e justificativas:** Reaproveitei o diálogo de transição já existente no detalhe (que só cobria Agendado/Pausado/Resolvido) para cobrir todos os status, evitando duplicação. No Kanban, confirmar no drop previne mudanças acidentais por arrasto.
- **Comandos executados:** ReadLints nos dois arquivos → OK.
- **Pendências / TODO:** Rebuild/redeploy do app para refletir em produção (mudança só de frontend).
- **Próximos passos:** Validar em produção: trocar status pelo dropdown e por arrasto deve sempre abrir confirmação; cancelar não altera nada.

## [2026-06-17 14:48] — Exclusão de checklist por administrador
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Permitir que administrador/proprietário exclua um checklist.
- **Arquivos alterados:**
  - `src/paginas/checklists/DetalheChecklist.tsx` — modificado — botão "Excluir" (visível só para Proprietário/Administrador) no cabeçalho + `AlertDialog` de confirmação + mutation que apaga `checklists` por id e redireciona para a lista.
  - `src/db/schema.ts` — modificado — `checklistId` em `checklist_respostas`, `checklist_comentarios` e `checklist_historico` agora com `.references(() => checklists.id, { onDelete: "cascade" })`.
  - `scripts/db-init/14-checklist-fks-cascade.sql` — criado — adiciona FKs `ON DELETE CASCADE` (idempotente, limpa órfãos antes).
- **Resumo das mudanças:** Admin consegue excluir o checklist; ao excluir, respostas/histórico/comentários são removidos em cascata via FK no banco.
- **Decisões e justificativas:** A VPS não tinha FKs nas tabelas de checklist (sem cascade) e `checklist_historico` não tem policy de DELETE — apagar pelo frontend deixaria órfãos. Optei por restaurar as FKs `ON DELETE CASCADE` (como no desenho original Supabase): assim basta `DELETE` no checklist e o Postgres limpa os filhos (cascade ignora RLS dos filhos). A policy `c_delete` já restringe a exclusão a Prop/Admin; o botão também só aparece para admin.
- **Comandos executados:**
  - Inspeção de policies/FKs na VPS → confirmado: sem FKs, `checklist_historico` sem DELETE.
  - `psql < scripts/db-init/14-checklist-fks-cascade.sql` → 0 órfãos, 3 FKs criadas com `confdeltype = c`. `NOTIFY pgrst` OK.
  - ReadLints em `DetalheChecklist.tsx` e `schema.ts` → OK.
- **Erros e resoluções:** Nenhum.
- **Pendências / TODO:** Rebuild/redeploy do app para o botão "Excluir" aparecer em produção (mudança de frontend). As FKs já estão aplicadas na VPS.
- **Próximos passos:** Confirmar deploy com o usuário; validar exclusão em produção.

## [2026-06-17 14:42] — Fix: upsert de checklist (ON CONFLICT sem constraint)
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Corrigir erro ao salvar/criar checklist: "there is no unique or exclusion constraint matching the ON CONFLICT specification".
- **Arquivos alterados:**
  - `src/db/schema.ts` — modificado — adicionado `uniqueIndex("idx_cr_checklist_item")` em `checklist_respostas (checklist_id, item_id)`.
  - `scripts/db-init/13-checklist-respostas-unique.sql` — criado — `CREATE UNIQUE INDEX IF NOT EXISTS idx_cr_checklist_item` (idempotente) para futuros deploys.
- **Resumo das mudanças:** Restaurada a unicidade `(checklist_id, item_id)` exigida pelo `upsert` do frontend (`DetalheChecklist.tsx`, `onConflict: "checklist_id,item_id"`).
- **Diagnóstico (log → causa → solução):** Erro PostgREST/Postgres indica ON CONFLICT sem constraint correspondente. Inspeção do banco da VPS (`\d public.checklist_respostas`) mostrou só PK em `id` e índice simples em `checklist_id` — sem UNIQUE em `(checklist_id, item_id)`. A migration original Supabase (`20260510003812...sql`) tinha `UNIQUE(checklist_id, item_id)`, mas o schema Drizzle não recriou. Solução: recriar o índice único.
- **Comandos executados:**
  - Checagem de duplicatas `(checklist_id,item_id)` → 0 linhas (seguro criar o índice).
  - `psql < scripts/db-init/13-checklist-respostas-unique.sql` na VPS → `CREATE INDEX` OK; `\d` confirma `idx_cr_checklist_item UNIQUE`.
  - `NOTIFY pgrst, 'reload schema'` → OK (recarrega cache do PostgREST).
  - ReadLints em `schema.ts` → OK.
- **Erros e resoluções:** Erro do ON CONFLICT resolvido pela criação do índice único; aplicado direto no Postgres (fix de banco, não exige rebuild do app).
- **Pendências / TODO:** Nenhuma. (Mudança em `schema.ts`/db-init é de consistência para futuros builds; não requer redeploy imediato.)
- **Próximos passos:** Validar criação/preenchimento de checklist em produção.

## [2026-06-17 14:24] — Departamento destino obrigatório no formulário de chamado
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Tornar "Departamento destino" obrigatório ao criar chamado, pois a visibilidade por departamento depende dele.
- **Arquivos alterados:**
  - `src/componentes/chamados/FormularioChamado.tsx` — modificado — botão de envio agora desabilita também quando `!dados.departamento_id` (antes só `!titulo`). A validação em `submeter` já bloqueava e o campo já exibia `*`.
- **Resumo das mudanças:** Reforço de UX/obrigatoriedade do departamento destino. Sem departamento, o chamado fica invisível para os membros do depto (a RLS só libera por `departamento_id`), então o campo precisa ser obrigatório.
- **Decisões e justificativas:** Visibilidade por departamento JÁ está implementada via RLS em `scripts/db-init/11-chamados-visibilidade-depto.sql` (policy `chamados_selecionar`: Prop/Admin veem tudo; solicitante vê o seu; demais só veem chamados cujo `departamento_id` pertence aos seus departamentos). Não alterei o banco; o foco foi garantir o preenchimento no front. Não adicionei `NOT NULL` em `chamados.departamento_id` para não quebrar chamados antigos com valor nulo.
- **Comandos executados:**
  - ReadLints em `FormularioChamado.tsx` → OK (sem erros).
  - `bash deploy/deploy-swarm.sh` → OK. Imagem rebuildada e serviços Swarm convergidos (`chamados_chamados_app` 1/1, `chamados_postgrest` 1/1). Alteração no ar.
- **Erros e resoluções:** Nenhum.
- **Pendências / TODO:** Avaliar migration para `departamento_id NOT NULL` após backfill dos chamados antigos sem departamento.
- **Próximos passos:** Validar em produção (Ctrl+F5).

## [2026-06-17 14:10] — Modal "Novo subchamado" responsivo
- **Autor:** Cursor (Claude Opus 4.8)
- **Objetivo:** Corrigir layout cortado/não responsivo ao abrir "Novo subchamado".
- **Arquivos alterados:**
  - `src/paginas/chamados/DetalheChamado.tsx` — modificado — `DialogContent` do "Novo subchamado" passou de `max-w-2xl` para o mesmo padrão do modal "Editar chamado" (`max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0`), com `DialogHeader` com borda/padding e um container interno com `flex-1 overflow-y-auto px-6 py-5` envolvendo o `NovoChamadoEmbutido`.
- **Resumo das mudanças:** O modal agora limita a altura a 90vh e adiciona rolagem vertical interna, evitando que o formulário (layout de 2 colunas com barra de ação fixa no rodapé) seja cortado em telas menores.
- **Decisões e justificativas:** Reaproveitei exatamente o padrão já validado do modal "Editar chamado" no mesmo arquivo, garantindo consistência visual e comportamento de rolagem com o footer sticky do `FormularioChamado`.
- **Comandos executados:**
  - ReadLints em `DetalheChamado.tsx` → OK (sem erros).
  - `bash deploy/deploy-swarm.sh` → OK. `build:vps` compilou (3984 módulos), imagem `chamados-nutricar:latest` publicada, migrations Drizzle OK, serviços Swarm convergidos (`chamados_chamados_app` 1/1, `chamados_postgrest` 1/1).
- **Erros e resoluções:** Os erros SQL "already exists" / NOTICE no início do deploy são idempotentes/esperados (scripts db-init rodam com `ON_ERROR_STOP=0` e `|| true`); não interromperam o deploy.
- **Pendências / TODO:** Validar visualmente em resoluções menores (ex.: 1366x768) na produção.
- **Próximos passos:** Caso outros diálogos com `FormularioChamado` apresentem corte, aplicar o mesmo padrão.
