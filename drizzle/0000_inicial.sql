CREATE TYPE "public"."cargo_membro" AS ENUM('TI', 'Compras', 'Financeiro', 'Operacional', 'Comercial', 'Outro');--> statement-breakpoint
CREATE TYPE "public"."papel_membro" AS ENUM('Proprietario', 'Administrador', 'Gestor', 'Atendente', 'Solicitante');--> statement-breakpoint
CREATE TYPE "public"."plano_workspace" AS ENUM('Gratuito', 'Pro', 'Empresarial');--> statement-breakpoint
CREATE TYPE "public"."prioridade_chamado" AS ENUM('Baixa', 'Media', 'Alta', 'Urgente');--> statement-breakpoint
CREATE TYPE "public"."status_chamado" AS ENUM('Aberto', 'Em andamento', 'Pausado', 'Agendado', 'Resolvido', 'Fechado', 'Cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_item_compra" AS ENUM('Pendente', 'Aprovado', 'Comprado', 'Recebido', 'Cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_projeto" AS ENUM('Planejado', 'Em andamento', 'Pausado', 'Concluido', 'Cancelado');--> statement-breakpoint
CREATE TYPE "public"."status_tarefa" AS ENUM('A fazer', 'Em andamento', 'Em revisao', 'Concluida', 'Cancelada');--> statement-breakpoint
CREATE TYPE "public"."status_workspace" AS ENUM('Ativo', 'Suspenso', 'Cancelado');--> statement-breakpoint
CREATE TYPE "public"."tipo_chamado" AS ENUM('Solicitacao', 'Incidente', 'Problema', 'Mudanca');--> statement-breakpoint
CREATE TABLE "app_config" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias_chamado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"cor" text DEFAULT '#88BE46' NOT NULL,
	"sla_resposta_horas" integer,
	"sla_resolucao_horas" integer,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamado_anexos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"chamado_id" uuid NOT NULL,
	"comentario_id" uuid,
	"enviado_por" uuid NOT NULL,
	"nome_arquivo" text NOT NULL,
	"caminho_storage" text NOT NULL,
	"tipo_mime" text,
	"tamanho_bytes" bigint DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamado_comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"chamado_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"conteudo" text NOT NULL,
	"interno" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamado_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"chamado_id" uuid NOT NULL,
	"usuario_id" uuid,
	"acao" text NOT NULL,
	"campo" text,
	"valor_anterior" text,
	"valor_novo" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamado_ia_execucoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"chamado_id" uuid NOT NULL,
	"usuario_id" uuid,
	"acao" text NOT NULL,
	"modelo" text,
	"resultado" text,
	"erro" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamado_requisicao_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"chamado_id" uuid NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"quantidade" numeric DEFAULT '1' NOT NULL,
	"unidade" text,
	"descricao" text NOT NULL,
	"referencia" text,
	"data_necessidade" date,
	"prioridade" "prioridade_chamado" DEFAULT 'Media' NOT NULL,
	"status_compra" "status_item_compra" DEFAULT 'Pendente' NOT NULL,
	"observacao_compra" text,
	"atualizado_compra_por" uuid,
	"atualizado_compra_em" timestamp with time zone,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamado_whatsapp_notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"chamado_id" uuid NOT NULL,
	"evento" text NOT NULL,
	"destinatario_perfil_id" uuid NOT NULL,
	"telefone" text NOT NULL,
	"mensagem" text,
	"sucesso" boolean DEFAULT false NOT NULL,
	"status_http" integer,
	"erro" text,
	"dedup_key" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chamados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"numero" integer NOT NULL,
	"codigo" text,
	"titulo" text NOT NULL,
	"descricao" text,
	"status" "status_chamado" DEFAULT 'Aberto' NOT NULL,
	"prioridade" "prioridade_chamado" DEFAULT 'Media' NOT NULL,
	"tipo" "tipo_chamado" DEFAULT 'Solicitacao' NOT NULL,
	"categoria" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"loja" text,
	"requisicao_compras" boolean DEFAULT false NOT NULL,
	"solicitante_id" uuid NOT NULL,
	"responsavel_id" uuid,
	"departamento_id" uuid,
	"departamento_origem_id" uuid,
	"chamado_pai_id" uuid,
	"prazo" timestamp with time zone,
	"primeiro_resposta_em" timestamp with time zone,
	"resolvido_em" timestamp with time zone,
	"fechado_em" timestamp with time zone,
	"motivo_agendamento" text,
	"agendado_para" timestamp with time zone,
	"motivo_pausa" text,
	"tratativa" text,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"checklist_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"conteudo" text NOT NULL,
	"mencionados" uuid[] DEFAULT '{}' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"checklist_id" uuid NOT NULL,
	"item_id" uuid,
	"usuario_id" uuid,
	"acao" text NOT NULL,
	"rotulo" text,
	"valor_anterior" jsonb,
	"valor_novo" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_respostas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"checklist_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"valor" jsonb,
	"atualizado_por" uuid,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_template_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"secao" text NOT NULL,
	"subsecao" text,
	"rotulo" text NOT NULL,
	"tipo" text DEFAULT 'checkbox' NOT NULL,
	"opcoes" jsonb,
	"obrigatorio" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"padrao" boolean DEFAULT false NOT NULL,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"status" text DEFAULT 'Em andamento' NOT NULL,
	"responsavel_id" uuid,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"destinatario_id" uuid NOT NULL,
	"ator_id" uuid,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"mensagem" text,
	"link" text,
	"recurso_tipo" text,
	"recurso_id" uuid,
	"lida_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perfis" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nome" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"telefone" text,
	"ultimo_workspace_id" uuid,
	"super_admin" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projetos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"cor" text DEFAULT '#88BE46' NOT NULL,
	"status" "status_projeto" DEFAULT 'Planejado' NOT NULL,
	"inicio_em" date,
	"fim_previsto" date,
	"responsavel_id" uuid,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"user_agent" text,
	"ip" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarefas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"projeto_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"status" "status_tarefa" DEFAULT 'A fazer' NOT NULL,
	"prioridade" "prioridade_chamado" DEFAULT 'Media' NOT NULL,
	"responsavel_id" uuid,
	"prazo" timestamp with time zone,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"email_verificado" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace_convites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"nome" text,
	"telefone" text,
	"papel" "papel_membro" DEFAULT 'Solicitante' NOT NULL,
	"cargo" "cargo_membro",
	"departamento_id" uuid,
	"token" text NOT NULL,
	"aceito" boolean DEFAULT false NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"convidado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_convites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "workspace_ia_config" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"modelo" text DEFAULT 'gpt-5-mini' NOT NULL,
	"openai_api_key" text,
	"atualizado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_membro_departamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"membro_id" uuid NOT NULL,
	"departamento_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_membros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"papel" "papel_membro" DEFAULT 'Solicitante' NOT NULL,
	"cargo" "cargo_membro",
	"departamento_id" uuid,
	"convidado_por" uuid,
	"aceito_em" timestamp with time zone,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_uazapi_config" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"server_url" text,
	"admin_token" text,
	"instance_id" text,
	"instance_name" text,
	"instance_token" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"qr_code" text,
	"numero_conectado" text,
	"conectado_em" timestamp with time zone,
	"ultima_sincronizacao" timestamp with time zone,
	"ativo" boolean DEFAULT false NOT NULL,
	"atualizado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_uazapi_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"sucesso" boolean DEFAULT true NOT NULL,
	"status_http" integer,
	"mensagem" text,
	"detalhes" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_vmpay_config" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"api_key" text,
	"atualizado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"cnpj" text,
	"logo_url" text,
	"cor_primaria" text DEFAULT '#88BE46' NOT NULL,
	"fuso_horario" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"proprietario_id" uuid NOT NULL,
	"plano" "plano_workspace" DEFAULT 'Gratuito' NOT NULL,
	"status" "status_workspace" DEFAULT 'Ativo' NOT NULL,
	"limite_usuarios" integer DEFAULT 5 NOT NULL,
	"limite_chamados_mes" integer DEFAULT 100 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_whatsapp_dedup" ON "chamado_whatsapp_notificacoes" USING btree ("dedup_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_chamados_ws_numero" ON "chamados" USING btree ("workspace_id","numero");--> statement-breakpoint
CREATE INDEX "idx_chamados_status" ON "chamados" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "idx_chamados_responsavel" ON "chamados" USING btree ("responsavel_id");--> statement-breakpoint
CREATE INDEX "idx_sessoes_usuario" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sessoes_refresh" ON "sessoes" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wmd_membro_dept" ON "workspace_membro_departamentos" USING btree ("membro_id","departamento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wm_ws_usuario" ON "workspace_membros" USING btree ("workspace_id","usuario_id");