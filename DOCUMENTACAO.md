# Documentação técnica — Chamados NUTRICAR

> Documento técnico e operacional do sistema localizado em `chamados-nutricar/`.
> Revisado a partir do código-fonte em 24/08/2026.

## 1. Visão geral

O Chamados NUTRICAR é uma plataforma multiempresa para organizar atendimento interno, suporte,
requisições de compra, projetos, tarefas, checklists, inventário e inaugurações. Cada empresa é um
`workspace`, identificado por slug e isolado por regras de autorização.

O ambiente principal da VPS usa:

- TanStack Start em Node para frontend SSR e endpoints;
- PostgreSQL como fonte dos dados;
- Drizzle ORM no backend;
- autenticação própria com JWT e refresh token;
- PostgREST como camada de compatibilidade para consultas existentes;
- storage persistente em disco;
- eventos em tempo real por SSE;
- Docker Swarm, Traefik e HTTPS.

## 2. Tecnologias

| Camada          | Tecnologia                                |
| --------------- | ----------------------------------------- |
| Interface e SSR | React 19 e TanStack Start/Router          |
| Build           | Vite 7, Nitro e Tailwind CSS 4            |
| Estado remoto   | TanStack React Query                      |
| Banco           | PostgreSQL e Drizzle ORM                  |
| API de dados    | Repositórios próprios e PostgREST 12      |
| Autenticação    | bcrypt, JOSE/JWT e cookie HTTP-only       |
| Estado local    | Zustand                                   |
| Validação       | Zod e React Hook Form                     |
| Relatórios      | Recharts, SheetJS e jsPDF                 |
| Storage         | filesystem persistente com URLs assinadas |
| Produção        | Docker, Node, Swarm e Traefik             |

## 3. Estrutura

```text
chamados-nutricar/
├── deploy/                  # scripts, Compose/Swarm, Caddy e runbooks
├── drizzle/                 # migration inicial e metadados Drizzle
├── scripts/
│   ├── db-init/             # patches SQL incrementais da base própria
│   └── *.ts/*.mjs           # migração e exportação legada
├── src/
│   ├── auth/                # login, cookies, JWT, sessões e usuários
│   ├── componentes/         # componentes funcionais em português
│   ├── components/ui/       # componentes visuais reutilizáveis
│   ├── dados/               # camada de acesso compatível
│   ├── db/                  # cliente, schema e autorização
│   ├── hooks/               # regras de tela e React Query
│   ├── lib/                 # IA, Uazapi, VMPay e administração
│   ├── paginas/             # páginas de domínio
│   ├── realtime/            # publicação e consumo SSE
│   ├── repos/               # persistência e autorização por entidade
│   ├── routes/              # rotas TanStack e endpoints HTTP
│   ├── storage/             # upload, download e URLs assinadas
│   └── workspaces/          # operações multiempresa
├── supabase/                # legado/migrations de transição ainda preservados
├── Dockerfile
├── docker-compose.yml       # modo dedicado com banco e Caddy
├── vite.config.ts
├── vite.config.vps.ts
└── DOCUMENTACAO.md
```

## 4. Arquitetura

```text
Navegador
   │
   ▼
Traefik/Caddy ──► TanStack Start (Node :3000)
                         │
                         ├── autenticação e rotas próprias
                         ├── Drizzle ───────► PostgreSQL
                         ├── proxy ─────────► PostgREST ─► PostgreSQL
                         ├── SSE/realtime
                         ├── /data/storage
                         ├── OpenAI
                         ├── Uazapi/WhatsApp
                         └── VMPay
```

O código contém adaptadores `atual.adapter.ts` e `atual.adapter.proprio.ts`. Eles existem para a
transição do backend anterior para a infraestrutura própria. Antes de remover a camada de
compatibilidade, confirme que nenhuma importação ativa depende dela.

## 5. Rotas

### Públicas e autenticação

| Rota                  | Uso                                      |
| --------------------- | ---------------------------------------- |
| `/`                   | redirecionamento inicial conforme sessão |
| `/login`              | autenticação                             |
| `/selecionar-empresa` | escolha de workspace                     |
| `/convite/:token`     | aceite de convite                        |
| `/api/health`         | saúde do app, banco e PostgREST          |

### Por workspace

Todas começam por `/w/:slug`.

| Rota                               | Uso                            |
| ---------------------------------- | ------------------------------ |
| `/w/:slug`                         | layout do workspace            |
| `/w/:slug/painel`                  | indicadores                    |
| `/w/:slug/chamados`                | lista                          |
| `/w/:slug/chamados/novo`           | abertura                       |
| `/w/:slug/chamados/quadro`         | Kanban                         |
| `/w/:slug/chamados/:numero`        | detalhes                       |
| `/w/:slug/suporte`                 | operação da equipe             |
| `/w/:slug/suporte/equipe`          | chamados dos colegas           |
| `/w/:slug/suporte/resolvidos`      | histórico resolvido            |
| `/w/:slug/projetos`                | projetos                       |
| `/w/:slug/projetos/:projetoId`     | projeto e tarefas              |
| `/w/:slug/checklists`              | checklists                     |
| `/w/:slug/checklists/:checklistId` | execução                       |
| `/w/:slug/checklists/template`     | editor do modelo               |
| `/w/:slug/inventario`              | ativos e inventário            |
| `/w/:slug/inauguracoes`            | acompanhamento de inaugurações |
| `/w/:slug/membros/:usuarioId`      | perfil do membro               |
| `/w/:slug/configuracoes`           | administração do workspace     |

### Endpoints internos

O diretório `src/routes/api` contém endpoints de:

- login, logout, sessão e token;
- criação e manutenção administrativa de usuários;
- workspace atual;
- proxy PostgREST autenticado;
- storage público controlado;
- notificações WhatsApp;
- realtime/SSE;
- sinalização de notificações;
- healthcheck.

## 6. Workspaces, papéis e acesso

Um usuário pode pertencer a vários workspaces. `workspace_membros` registra o papel, cargo,
departamento principal, estado ativo e aceite. `workspace_membro_departamentos` permite associação a
mais de um departamento.

Papéis:

- `Proprietario`;
- `Administrador`;
- `Gestor`;
- `Atendente`;
- `Suporte`;
- `Solicitante`.

Cargos organizacionais:

- `Funcionario`;
- `Supervisor`;
- `Gestor`;
- `Gerente`.

O backend verifica participação e papel em `src/db/autorizacao.ts` e nos repositórios. Visibilidade
de chamados considera solicitante, responsável, departamento, equipe de suporte, subchamados e
permissões de gestão. Restringir somente a interface não é considerado autorização.

## 7. Autenticação

A versão VPS usa as tabelas `usuarios` e `sessoes`.

Fluxo:

1. a senha é comparada com hash bcrypt;
2. o servidor cria JWT HS256 e refresh token aleatório;
3. somente o hash SHA-256 do refresh token é persistido;
4. cookies HTTP-only mantêm a sessão;
5. o middleware recupera o usuário para as rotas protegidas.

`JWT_SECRET` deve possuir no mínimo 32 caracteres. A validade vem de `SESSION_TTL_DIAS`, atualmente
com padrão de 365 dias. Para ambientes de maior risco, reduza esse prazo e implemente expiração por
inatividade.

## 8. Chamados e suporte

Um chamado possui número único dentro do workspace, título, descrição, status, prioridade, tipo,
categoria, tags, loja, departamentos, solicitante, responsável, prazo e datas do ciclo de vida.

Status:

- Aberto;
- Em andamento;
- Pausado;
- Agendado;
- Resolvido;
- Fechado;
- Cancelado.

Tipos atuais: Incidente, Solicitação, Dúvida, Melhoria e Bug. Prioridades: Baixa, Média, Alta e
Urgente.

Recursos relacionados:

- comentários públicos e internos;
- anexos;
- histórico de alterações;
- subchamados com vínculo ao chamado pai;
- atribuição a técnico;
- reabertura e fechamento;
- Kanban e funis configuráveis;
- SLA por categoria;
- proposta criada;
- notificações no sistema e WhatsApp;
- resumo, classificação, revisão e sugestão de resposta por IA.

### Requisições de compra

Chamados de compra possuem itens, quantidade, unidade, referência, necessidade, prioridade,
observação e status: Pendente, Cotando, Aprovado, Comprado, Recebido ou Cancelado.

## 9. Projetos, tarefas e checklists

Projetos registram responsável, período, cor e status. Tarefas pertencem ao projeto e possuem estado,
prioridade, prazo, responsável e ordenação.

Checklists seguem:

```text
checklist_templates
  └── checklist_template_itens

checklists
  ├── checklist_respostas
  ├── checklist_anexos
  ├── checklist_comentarios
  └── checklist_historico
```

Respostas possuem unicidade por checklist/item. Exclusões em cascata e patches SQL posteriores
protegem a consistência dos anexos e respostas.

## 10. Inventário e inaugurações

O módulo de inventário registra ativos por workspace, patrimônio, categoria, marca/modelo, número de
série, localização, responsável, estado, aquisição, garantia, valor e observações. Consulte as
tabelas adicionadas por `scripts/db-init/12-inventario.sql` e o hook `useInventario` para o modelo
operacional vigente.

Inaugurações agregam indicadores e atividades preparatórias usando chamados, projetos e/ou registros
específicos conforme as consultas do hook `useInauguracoes`.

## 11. Banco de dados

### Identidade e organização

| Tabela                           | Finalidade                                |
| -------------------------------- | ----------------------------------------- |
| `usuarios`                       | credenciais locais                        |
| `sessoes`                        | refresh tokens e expiração                |
| `perfis`                         | nome, contato, avatar e workspace recente |
| `workspaces`                     | empresas/ambientes                        |
| `workspace_membros`              | vínculo, papel e cargo                    |
| `workspace_membro_departamentos` | departamentos adicionais                  |
| `workspace_convites`             | convites temporários                      |
| `departamentos`                  | organização interna                       |
| `categorias_chamado`             | classificação e SLA                       |

### Chamados

| Tabela                          | Finalidade                    |
| ------------------------------- | ----------------------------- |
| `chamados`                      | registro principal            |
| `chamado_comentarios`           | conversas públicas/internas   |
| `chamado_anexos`                | metadados dos arquivos        |
| `chamado_historico`             | auditoria                     |
| `chamado_ia_execucoes`          | execução e resultado da IA    |
| `chamado_requisicao_itens`      | compras                       |
| `chamado_whatsapp_notificacoes` | envio e deduplicação          |
| `notificacoes`                  | caixa de notificações interna |

### Projetos e checklists

| Tabela                     | Finalidade            |
| -------------------------- | --------------------- |
| `projetos`                 | projetos do workspace |
| `tarefas`                  | tarefas dos projetos  |
| `checklist_templates`      | modelos               |
| `checklist_template_itens` | perguntas/itens       |
| `checklists`               | execuções             |
| `checklist_respostas`      | valores preenchidos   |
| `checklist_anexos`         | evidências            |
| `checklist_comentarios`    | discussões e menções  |
| `checklist_historico`      | auditoria             |

### Configurações e integrações

| Tabela                    | Finalidade                         |
| ------------------------- | ---------------------------------- |
| `workspace_ia_config`     | habilitação, modelo e chave OpenAI |
| `workspace_vmpay_config`  | chave VMPay                        |
| `workspace_uazapi_config` | instância WhatsApp                 |
| `workspace_uazapi_logs`   | auditoria da integração            |
| `app_config`              | configuração global chave/valor    |

`src/db/schema.ts` é a referência tipada do backend próprio. `drizzle/0000_inicial.sql` cria a base e
`scripts/db-init/01...26` contém correções incrementais, RLS, funções, índices, campos e módulos
adicionados após o corte inicial.

## 12. PostgREST e RLS

O serviço PostgREST expõe o schema `public`, usa o papel anônimo `anon` e valida o mesmo
`JWT_SECRET`. O app encaminha requisições pelo endpoint interno autenticado.

Scripts importantes:

- `01-postgrest-roles.sql`: papéis e permissões básicas;
- `02-rls-e-funcoes.sql`: funções e políticas;
- `03-fks-postgrest.sql`: relacionamentos;
- patches 08, 10, 11, 16, 18, 20, 22, 25 e 26: evolução da visibilidade.

Toda mudança de regra deve ser refletida tanto na autorização TypeScript quanto nas policies ainda
usadas pelo PostgREST. Divergência entre as duas camadas pode causar bloqueio ou exposição indevida.

## 13. Storage

Diretório padrão: `/data/storage`. Buckets:

| Bucket             | Limite | Público |
| ------------------ | -----: | ------: |
| `chamado-anexos`   |  50 MB |     não |
| `checklist-anexos` |  25 MB |     não |
| `avatares`         |   5 MB |     sim |
| `logos-workspace`  |   5 MB |     sim |

Arquivos privados usam URL assinada, por padrão válida por 10 minutos. O caminho deve ser validado
contra travessia de diretório e o usuário precisa ter acesso ao recurso associado.

No Swarm, `/data/storage/chamados` do host é montado em `/data/storage` no container.

## 14. Realtime e notificações

O sistema publica eventos e mantém conexão SSE em `/api/realtime/:canal`. O cliente invalida queries
para atualizar telas. Notificações internas permitem marcar leitura e apontar para o recurso.

WhatsApp usa Uazapi configurada por workspace. `chamado_whatsapp_notificacoes.dedup_key` evita envio
duplicado. O endpoint público de notificação deve validar segredo e nunca confiar apenas no payload.

## 15. Integrações

### OpenAI

Executa resumo, sugestão de resposta, classificação e correção de escrita. A chave fica em
`workspace_ia_config`, e o resultado/erro pode ser auditado em `chamado_ia_execucoes`. O backend
chama diretamente a API OpenAI.

### VMPay

Consulta clientes e locais com chave do workspace, paginação, timeout e retentativas. Não registre a
URL completa porque ela contém o token no query string.

### Uazapi

Gerencia servidor, token administrativo, instância, QR code, conexão e logs. Tokens devem ser
mascarados na interface e nos logs.

## 16. Variáveis de ambiente

| Variável                        | Uso                                                |
| ------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`                  | conexão da aplicação/Drizzle                       |
| `POSTGREST_URL`                 | endereço interno do PostgREST                      |
| `POSTGREST_DB_URI`              | conexão usada pelo PostgREST                       |
| `JWT_SECRET`                    | JWT da aplicação e PostgREST; mínimo 32 caracteres |
| `SESSION_COOKIE_NAME`           | nome do cookie                                     |
| `SESSION_TTL_DIAS`              | validade da sessão                                 |
| `STORAGE_DIR`                   | raiz dos arquivos                                  |
| `STORAGE_URL_SECRET`            | assinatura de URLs                                 |
| `APP_BASE_URL`                  | URL pública                                        |
| `OPENAI_API_KEY`                | fallback/integração de IA conforme ambiente        |
| `VMPAY_API_KEY`                 | fallback VMPay conforme ambiente                   |
| `DOMAIN`                        | host usado por Traefik/Caddy                       |
| `PORT` / `HOST`                 | servidor Node                                      |
| `VITE_SUPABASE_URL`             | compatibilidade do frontend legado                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave pública de compatibilidade                   |

Não versione `.env`, `.env.production`, `deploy/.env.swarm`, dumps ou chaves. Variáveis `VITE_*` são
embutidas no JavaScript e nunca podem receber segredos.

## 17. Desenvolvimento

Pré-requisitos: Node 20+ ou Bun, PostgreSQL e variáveis configuradas.

```bash
cd /opt/chamados-nutricar
npm install
npm run dev
```

Comandos:

```bash
npm run dev
npm run build
npm run build:vps
npm run lint
npm run format
npm run db:generate
npm run db:migrate
npm run db:studio
```

Não há script de teste automatizado no `package.json`. Valide lint, build e os fluxos críticos
manualmente antes de publicar.

## 18. Banco e migrations

Nova instalação:

1. crie PostgreSQL e usuário;
2. configure `DATABASE_URL`;
3. aplique `drizzle/0000_inicial.sql`/migration Drizzle;
4. aplique `scripts/db-init` na ordem numérica;
5. valide as tabelas, enums, FKs, índices e policies;
6. aplique o seed somente no ambiente correto.

```bash
npm run db:migrate
```

Os scripts `exportar-dados-supabase.ts`, `importar-dados-supabase.ts`, `migrar-usuarios.ts` e
`migrar-storage.ts` são ferramentas de transição, não tarefas recorrentes. Exigem backup e conferência
de origem/destino antes da execução.

## 19. Deploy Swarm/Traefik

É o modo recomendado para a VPS compartilhada da Nutricar.

```bash
cp deploy/.env.swarm.example deploy/.env.swarm
# preencher segredos sem versionar
bash deploy/deploy-swarm.sh
```

A stack cria `chamados_app` e `postgrest`, usa a rede externa `network_swarm_public`, banco já
existente no hostname `postgres`, domínio `nutricarhub.nutricarbrasil.com.br` e bind mount do storage.

Operação:

```bash
docker service ps chamados_chamados_app --no-trunc
docker service logs --tail=100 -f chamados_chamados_app
docker service logs --tail=100 -f chamados_postgrest
curl -fsS https://nutricarhub.nutricarbrasil.com.br/api/health
```

Rollback da aplicação:

```bash
docker service rollback chamados_chamados_app
```

Rollback não desfaz migrations.

## 20. Deploy dedicado com Compose/Caddy

Para uma VPS sem Traefik e com portas 80/443 livres:

```bash
cp .env.production.example .env.production
bash deploy/deploy.sh
```

Esse modo sobe aplicação, PostgreSQL e Caddy. Não execute junto com o stack Swarm na mesma porta.
Consulte `deploy/README.md`.

## 21. Backup e restore

```bash
bash deploy/backup.sh
bash deploy/restore.sh ARQUIVO.dump STORAGE.tar.gz
```

O backup deve incluir:

- PostgreSQL;
- `/data/storage/chamados`;
- configuração do serviço sem valores secretos;
- secrets em cofre separado;
- teste periódico de restauração.

Nunca assuma que um dump existe: valide tamanho, integridade e restauração em ambiente isolado.

## 22. Segurança e privacidade

- usar HTTPS e cookies Secure em produção;
- restringir PostgreSQL e PostgREST à rede interna;
- rotacionar JWT, storage, OpenAI, VMPay e Uazapi;
- revisar RLS e autorização dos repositórios em conjunto;
- impedir acesso cruzado entre workspaces;
- validar MIME, tamanho, extensão e caminho dos uploads;
- não registrar tokens, senhas, URLs assinadas ou conteúdo sensível;
- auditar ações administrativas e mudanças de chamado;
- limitar tentativas de login e endpoints públicos;
- definir retenção para anexos, comentários, histórico e dados pessoais;
- remover contas e sessões de pessoas desligadas.

## 23. Checklist pós-deploy

- `/api/health` retorna `ok`, banco e PostgREST saudáveis;
- login, renovação e logout funcionam;
- usuário acessa somente seus workspaces;
- papéis e departamentos limitam os chamados corretamente;
- criação, atribuição, comentário, anexo e mudança de status funcionam;
- chamado pai/subchamado mantém visibilidade;
- Kanban e funis persistem;
- requisição de compra e status funcionam;
- checklists salvam resposta única, anexos e histórico;
- projetos, tarefas, inventário e inaugurações carregam;
- SSE atualiza notificações sem loop;
- OpenAI, VMPay e Uazapi falham de forma segura quando desconfiguradas;
- backup é criado e pode ser restaurado.

## 24. Diagnóstico

### Aplicação não inicia

Verifique `DATABASE_URL`, `JWT_SECRET`, arquivos em `dist/server`, versão Node e logs do serviço.

### Healthcheck retorna 503

O JSON informa se falhou banco ou PostgREST. Teste DNS interno, rede overlay e credenciais.

### Login falha

Confirme `usuarios.senha_hash`, perfil correspondente, cookie, HTTPS, relógio do host e segredo JWT.

### Dados somem em determinado workspace

Confira slug, vínculo ativo, papel, departamentos, autorização do repositório e policy PostgREST.

### Anexo não abre

Confira mount, permissões do host, bucket, caminho, assinatura e expiração de 10 minutos.

### Atualização não aparece em tempo real

Inspecione a conexão SSE, proxy/timeout, canal publicado e invalidação React Query.

## 25. Arquivos de referência

- `src/db/schema.ts`: schema tipado atual;
- `drizzle/0000_inicial.sql`: migration inicial;
- `scripts/db-init/`: evolução da base própria;
- `src/db/autorizacao.ts`: regras centrais;
- `src/repos/`: acesso por entidade;
- `src/auth/`: autenticação e sessões;
- `src/storage/`: arquivos e URLs assinadas;
- `deploy/docker-compose.swarm.yml`: stack Swarm;
- `deploy/README-SWARM.md`: runbook Swarm;
- `docker-compose.yml` e `deploy/README.md`: modo dedicado;
- `ultimas_modificacoes.md`: histórico operacional.

Este documento representa o código versionado. Antes de qualquer ação em produção, compare com o
serviço ativo, banco, mounts, labels, rede e secrets da VPS.
