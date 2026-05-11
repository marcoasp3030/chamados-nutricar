// Schema Drizzle espelhando o banco atual (gerado a partir do dump SQL).
//
// Mantém os mesmos nomes de tabela/coluna que o Postgres já usa, para que
// os dados existentes sejam restaurados sem migração de dados extra.
//
// Convenções:
//   - todos os IDs são UUID v4
//   - timestamps com timezone, default now()
//   - enums Postgres replicados via pgEnum

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ===== ENUMS =====
export const papelMembro = pgEnum("papel_membro", [
  "Proprietario",
  "Administrador",
  "Gestor",
  "Atendente",
  "Solicitante",
]);
export const cargoMembro = pgEnum("cargo_membro", [
  "TI",
  "Compras",
  "Financeiro",
  "Operacional",
  "Comercial",
  "Outro",
]);
export const statusChamado = pgEnum("status_chamado", [
  "Aberto",
  "Em andamento",
  "Pausado",
  "Agendado",
  "Resolvido",
  "Fechado",
  "Cancelado",
]);
export const prioridadeChamado = pgEnum("prioridade_chamado", [
  "Baixa",
  "Media",
  "Alta",
  "Urgente",
]);
export const tipoChamado = pgEnum("tipo_chamado", [
  "Solicitacao",
  "Incidente",
  "Problema",
  "Mudanca",
]);
export const statusItemCompra = pgEnum("status_item_compra", [
  "Pendente",
  "Aprovado",
  "Comprado",
  "Recebido",
  "Cancelado",
]);
export const statusProjeto = pgEnum("status_projeto", [
  "Planejado",
  "Em andamento",
  "Pausado",
  "Concluido",
  "Cancelado",
]);
export const statusTarefa = pgEnum("status_tarefa", [
  "A fazer",
  "Em andamento",
  "Em revisao",
  "Concluida",
  "Cancelada",
]);
export const planoWorkspace = pgEnum("plano_workspace", [
  "Gratuito",
  "Pro",
  "Empresarial",
]);
export const statusWorkspace = pgEnum("status_workspace", [
  "Ativo",
  "Suspenso",
  "Cancelado",
]);

// ===== TABELAS DE AUTH (próprias da versão VPS) =====
// Substitui auth.users do Supabase.
export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  emailVerificado: boolean("email_verificado").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const sessoes = pgTable(
  "sessoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ip: text("ip"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porUsuario: index("idx_sessoes_usuario").on(t.usuarioId),
    porRefresh: uniqueIndex("idx_sessoes_refresh").on(t.refreshTokenHash),
  }),
);

// ===== APP =====
export const perfis = pgTable("perfis", {
  // mesmo UUID de usuarios.id (preserva todas as relações existentes)
  id: uuid("id").primaryKey(),
  nome: text("nome").notNull().default(""),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  telefone: text("telefone"),
  ultimoWorkspaceId: uuid("ultimo_workspace_id"),
  superAdmin: boolean("super_admin").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  slug: text("slug").notNull().unique(),
  cnpj: text("cnpj"),
  logoUrl: text("logo_url"),
  corPrimaria: text("cor_primaria").notNull().default("#88BE46"),
  fusoHorario: text("fuso_horario").notNull().default("America/Sao_Paulo"),
  proprietarioId: uuid("proprietario_id").notNull(),
  plano: planoWorkspace("plano").notNull().default("Gratuito"),
  status: statusWorkspace("status").notNull().default("Ativo"),
  limiteUsuarios: integer("limite_usuarios").notNull().default(5),
  limiteChamadosMes: integer("limite_chamados_mes").notNull().default(100),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembros = pgTable(
  "workspace_membros",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    usuarioId: uuid("usuario_id").notNull(),
    papel: papelMembro("papel").notNull().default("Solicitante"),
    cargo: cargoMembro("cargo"),
    departamentoId: uuid("departamento_id"),
    convidadoPor: uuid("convidado_por"),
    aceitoEm: timestamp("aceito_em", { withTimezone: true }),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porWsUsuario: uniqueIndex("idx_wm_ws_usuario").on(t.workspaceId, t.usuarioId),
  }),
);

export const departamentos = pgTable("departamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  criadoPor: uuid("criado_por").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembroDepartamentos = pgTable(
  "workspace_membro_departamentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    membroId: uuid("membro_id").notNull(),
    departamentoId: uuid("departamento_id").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porMembroDept: uniqueIndex("idx_wmd_membro_dept").on(t.membroId, t.departamentoId),
  }),
);

export const categoriasChamado = pgTable("categorias_chamado", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  cor: text("cor").notNull().default("#88BE46"),
  slaRespostaHoras: integer("sla_resposta_horas"),
  slaResolucaoHoras: integer("sla_resolucao_horas"),
  criadoPor: uuid("criado_por").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const chamados = pgTable(
  "chamados",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    numero: integer("numero").notNull(),
    codigo: text("codigo"),
    titulo: text("titulo").notNull(),
    descricao: text("descricao"),
    status: statusChamado("status").notNull().default("Aberto"),
    prioridade: prioridadeChamado("prioridade").notNull().default("Media"),
    tipo: tipoChamado("tipo").notNull().default("Solicitacao"),
    categoria: text("categoria"),
    tags: text("tags").array().notNull().default([]),
    loja: text("loja"),
    requisicaoCompras: boolean("requisicao_compras").notNull().default(false),
    solicitanteId: uuid("solicitante_id").notNull(),
    responsavelId: uuid("responsavel_id"),
    departamentoId: uuid("departamento_id"),
    departamentoOrigemId: uuid("departamento_origem_id"),
    chamadoPaiId: uuid("chamado_pai_id"),
    prazo: timestamp("prazo", { withTimezone: true }),
    primeiroRespostaEm: timestamp("primeiro_resposta_em", { withTimezone: true }),
    resolvidoEm: timestamp("resolvido_em", { withTimezone: true }),
    fechadoEm: timestamp("fechado_em", { withTimezone: true }),
    motivoAgendamento: text("motivo_agendamento"),
    agendadoPara: timestamp("agendado_para", { withTimezone: true }),
    motivoPausa: text("motivo_pausa"),
    tratativa: text("tratativa"),
    criadoPor: uuid("criado_por").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porWsNumero: uniqueIndex("idx_chamados_ws_numero").on(t.workspaceId, t.numero),
    porStatus: index("idx_chamados_status").on(t.workspaceId, t.status),
    porResponsavel: index("idx_chamados_responsavel").on(t.responsavelId),
  }),
);

export const chamadoComentarios = pgTable("chamado_comentarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  chamadoId: uuid("chamado_id").notNull(),
  autorId: uuid("autor_id").notNull(),
  conteudo: text("conteudo").notNull(),
  interno: boolean("interno").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const chamadoAnexos = pgTable("chamado_anexos", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  chamadoId: uuid("chamado_id").notNull(),
  comentarioId: uuid("comentario_id"),
  enviadoPor: uuid("enviado_por").notNull(),
  nomeArquivo: text("nome_arquivo").notNull(),
  caminhoStorage: text("caminho_storage").notNull(),
  tipoMime: text("tipo_mime"),
  tamanhoBytes: bigint("tamanho_bytes", { mode: "number" }).notNull().default(0),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const chamadoHistorico = pgTable("chamado_historico", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  chamadoId: uuid("chamado_id").notNull(),
  usuarioId: uuid("usuario_id"),
  acao: text("acao").notNull(),
  campo: text("campo"),
  valorAnterior: text("valor_anterior"),
  valorNovo: text("valor_novo"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const chamadoIaExecucoes = pgTable("chamado_ia_execucoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  chamadoId: uuid("chamado_id").notNull(),
  usuarioId: uuid("usuario_id"),
  acao: text("acao").notNull(),
  modelo: text("modelo"),
  resultado: text("resultado"),
  erro: text("erro"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const chamadoRequisicaoItens = pgTable("chamado_requisicao_itens", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  chamadoId: uuid("chamado_id").notNull(),
  ordem: integer("ordem").notNull().default(0),
  quantidade: numeric("quantidade").notNull().default("1"),
  unidade: text("unidade"),
  descricao: text("descricao").notNull(),
  referencia: text("referencia"),
  dataNecessidade: date("data_necessidade"),
  prioridade: prioridadeChamado("prioridade").notNull().default("Media"),
  statusCompra: statusItemCompra("status_compra").notNull().default("Pendente"),
  observacaoCompra: text("observacao_compra"),
  atualizadoCompraPor: uuid("atualizado_compra_por"),
  atualizadoCompraEm: timestamp("atualizado_compra_em", { withTimezone: true }),
  criadoPor: uuid("criado_por").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const chamadoWhatsappNotificacoes = pgTable(
  "chamado_whatsapp_notificacoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").notNull(),
    chamadoId: uuid("chamado_id").notNull(),
    evento: text("evento").notNull(),
    destinatarioPerfilId: uuid("destinatario_perfil_id").notNull(),
    telefone: text("telefone").notNull(),
    mensagem: text("mensagem"),
    sucesso: boolean("sucesso").notNull().default(false),
    statusHttp: integer("status_http"),
    erro: text("erro"),
    dedupKey: text("dedup_key").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    porDedup: uniqueIndex("idx_whatsapp_dedup").on(t.dedupKey),
  }),
);

export const projetos = pgTable("projetos", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  cor: text("cor").notNull().default("#88BE46"),
  status: statusProjeto("status").notNull().default("Planejado"),
  inicioEm: date("inicio_em"),
  fimPrevisto: date("fim_previsto"),
  responsavelId: uuid("responsavel_id"),
  criadoPor: uuid("criado_por").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const tarefas = pgTable("tarefas", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  projetoId: uuid("projeto_id").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  status: statusTarefa("status").notNull().default("A fazer"),
  prioridade: prioridadeChamado("prioridade").notNull().default("Media"),
  responsavelId: uuid("responsavel_id"),
  prazo: timestamp("prazo", { withTimezone: true }),
  ordem: integer("ordem").notNull().default(0),
  criadoPor: uuid("criado_por").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const checklistTemplates = pgTable("checklist_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  padrao: boolean("padrao").notNull().default(false),
  criadoPor: uuid("criado_por").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const checklistTemplateItens = pgTable("checklist_template_itens", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  templateId: uuid("template_id").notNull(),
  secao: text("secao").notNull(),
  subsecao: text("subsecao"),
  rotulo: text("rotulo").notNull(),
  tipo: text("tipo").notNull().default("checkbox"),
  opcoes: jsonb("opcoes"),
  obrigatorio: boolean("obrigatorio").notNull().default(false),
  ativo: boolean("ativo").notNull().default(true),
  ordem: integer("ordem").notNull().default(0),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const checklists = pgTable("checklists", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  templateId: uuid("template_id").notNull(),
  nome: text("nome").notNull(),
  status: text("status").notNull().default("Em andamento"),
  responsavelId: uuid("responsavel_id"),
  criadoPor: uuid("criado_por").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const checklistRespostas = pgTable("checklist_respostas", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  checklistId: uuid("checklist_id").notNull(),
  itemId: uuid("item_id").notNull(),
  valor: jsonb("valor"),
  atualizadoPor: uuid("atualizado_por"),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const checklistComentarios = pgTable("checklist_comentarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  checklistId: uuid("checklist_id").notNull(),
  autorId: uuid("autor_id").notNull(),
  conteudo: text("conteudo").notNull(),
  mencionados: uuid("mencionados").array().notNull().default([]),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const checklistHistorico = pgTable("checklist_historico", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  checklistId: uuid("checklist_id").notNull(),
  itemId: uuid("item_id"),
  usuarioId: uuid("usuario_id"),
  acao: text("acao").notNull(),
  rotulo: text("rotulo"),
  valorAnterior: jsonb("valor_anterior"),
  valorNovo: jsonb("valor_novo"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const notificacoes = pgTable("notificacoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  destinatarioId: uuid("destinatario_id").notNull(),
  atorId: uuid("ator_id"),
  tipo: text("tipo").notNull(),
  titulo: text("titulo").notNull(),
  mensagem: text("mensagem"),
  link: text("link"),
  recursoTipo: text("recurso_tipo"),
  recursoId: uuid("recurso_id"),
  lidaEm: timestamp("lida_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceConvites = pgTable("workspace_convites", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  email: text("email").notNull(),
  nome: text("nome"),
  telefone: text("telefone"),
  papel: papelMembro("papel").notNull().default("Solicitante"),
  cargo: cargoMembro("cargo"),
  departamentoId: uuid("departamento_id"),
  token: text("token").notNull().unique(),
  aceito: boolean("aceito").notNull().default(false),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  convidadoPor: uuid("convidado_por"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceIaConfig = pgTable("workspace_ia_config", {
  workspaceId: uuid("workspace_id").primaryKey(),
  ativo: boolean("ativo").notNull().default(false),
  modelo: text("modelo").notNull().default("gpt-5-mini"),
  openaiApiKey: text("openai_api_key"),
  atualizadoPor: uuid("atualizado_por"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceVmpayConfig = pgTable("workspace_vmpay_config", {
  workspaceId: uuid("workspace_id").primaryKey(),
  ativo: boolean("ativo").notNull().default(false),
  apiKey: text("api_key"),
  atualizadoPor: uuid("atualizado_por"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceUazapiConfig = pgTable("workspace_uazapi_config", {
  workspaceId: uuid("workspace_id").primaryKey(),
  serverUrl: text("server_url"),
  adminToken: text("admin_token"),
  instanceId: text("instance_id"),
  instanceName: text("instance_name"),
  instanceToken: text("instance_token"),
  status: text("status").notNull().default("disconnected"),
  qrCode: text("qr_code"),
  numeroConectado: text("numero_conectado"),
  conectadoEm: timestamp("conectado_em", { withTimezone: true }),
  ultimaSincronizacao: timestamp("ultima_sincronizacao", { withTimezone: true }),
  ativo: boolean("ativo").notNull().default(false),
  atualizadoPor: uuid("atualizado_por"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceUazapiLogs = pgTable("workspace_uazapi_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  acao: text("acao").notNull(),
  sucesso: boolean("sucesso").notNull().default(true),
  statusHttp: integer("status_http"),
  mensagem: text("mensagem"),
  detalhes: jsonb("detalhes"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const appConfig = pgTable("app_config", {
  chave: text("chave").primaryKey(),
  valor: text("valor").notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});
