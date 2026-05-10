export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          atualizado_em: string
          chave: string
          valor: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          valor: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          valor?: string
        }
        Relationships: []
      }
      categorias_chamado: {
        Row: {
          atualizado_em: string
          cor: string
          criado_em: string
          criado_por: string
          descricao: string | null
          id: string
          nome: string
          sla_resolucao_horas: number | null
          sla_resposta_horas: number | null
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          cor?: string
          criado_em?: string
          criado_por: string
          descricao?: string | null
          id?: string
          nome: string
          sla_resolucao_horas?: number | null
          sla_resposta_horas?: number | null
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          cor?: string
          criado_em?: string
          criado_por?: string
          descricao?: string | null
          id?: string
          nome?: string
          sla_resolucao_horas?: number | null
          sla_resposta_horas?: number | null
          workspace_id?: string
        }
        Relationships: []
      }
      chamado_anexos: {
        Row: {
          caminho_storage: string
          chamado_id: string
          comentario_id: string | null
          criado_em: string
          enviado_por: string
          id: string
          nome_arquivo: string
          tamanho_bytes: number
          tipo_mime: string | null
          workspace_id: string
        }
        Insert: {
          caminho_storage: string
          chamado_id: string
          comentario_id?: string | null
          criado_em?: string
          enviado_por: string
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number
          tipo_mime?: string | null
          workspace_id: string
        }
        Update: {
          caminho_storage?: string
          chamado_id?: string
          comentario_id?: string | null
          criado_em?: string
          enviado_por?: string
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number
          tipo_mime?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamado_anexos_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamado_anexos_comentario_id_fkey"
            columns: ["comentario_id"]
            isOneToOne: false
            referencedRelation: "chamado_comentarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamado_anexos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_comentarios: {
        Row: {
          atualizado_em: string
          autor_id: string
          chamado_id: string
          conteudo: string
          criado_em: string
          id: string
          interno: boolean
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          autor_id: string
          chamado_id: string
          conteudo: string
          criado_em?: string
          id?: string
          interno?: boolean
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          autor_id?: string
          chamado_id?: string
          conteudo?: string
          criado_em?: string
          id?: string
          interno?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamado_comentarios_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamado_comentarios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_historico: {
        Row: {
          acao: string
          campo: string | null
          chamado_id: string
          criado_em: string
          id: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
          workspace_id: string
        }
        Insert: {
          acao: string
          campo?: string | null
          chamado_id: string
          criado_em?: string
          id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
          workspace_id: string
        }
        Update: {
          acao?: string
          campo?: string | null
          chamado_id?: string
          criado_em?: string
          id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamado_historico_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamado_historico_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_ia_execucoes: {
        Row: {
          acao: string
          chamado_id: string
          criado_em: string
          erro: string | null
          id: string
          modelo: string | null
          resultado: string | null
          usuario_id: string | null
          workspace_id: string
        }
        Insert: {
          acao: string
          chamado_id: string
          criado_em?: string
          erro?: string | null
          id?: string
          modelo?: string | null
          resultado?: string | null
          usuario_id?: string | null
          workspace_id: string
        }
        Update: {
          acao?: string
          chamado_id?: string
          criado_em?: string
          erro?: string | null
          id?: string
          modelo?: string | null
          resultado?: string | null
          usuario_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamado_ia_execucoes_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_requisicao_itens: {
        Row: {
          atualizado_compra_em: string | null
          atualizado_compra_por: string | null
          atualizado_em: string
          chamado_id: string
          criado_em: string
          criado_por: string
          data_necessidade: string | null
          descricao: string
          id: string
          observacao_compra: string | null
          ordem: number
          prioridade: Database["public"]["Enums"]["prioridade_chamado"]
          quantidade: number
          referencia: string | null
          status_compra: Database["public"]["Enums"]["status_item_compra"]
          unidade: string | null
          workspace_id: string
        }
        Insert: {
          atualizado_compra_em?: string | null
          atualizado_compra_por?: string | null
          atualizado_em?: string
          chamado_id: string
          criado_em?: string
          criado_por: string
          data_necessidade?: string | null
          descricao: string
          id?: string
          observacao_compra?: string | null
          ordem?: number
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"]
          quantidade?: number
          referencia?: string | null
          status_compra?: Database["public"]["Enums"]["status_item_compra"]
          unidade?: string | null
          workspace_id: string
        }
        Update: {
          atualizado_compra_em?: string | null
          atualizado_compra_por?: string | null
          atualizado_em?: string
          chamado_id?: string
          criado_em?: string
          criado_por?: string
          data_necessidade?: string | null
          descricao?: string
          id?: string
          observacao_compra?: string | null
          ordem?: number
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"]
          quantidade?: number
          referencia?: string | null
          status_compra?: Database["public"]["Enums"]["status_item_compra"]
          unidade?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamado_requisicao_itens_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chamado_whatsapp_notificacoes: {
        Row: {
          chamado_id: string
          criado_em: string
          dedup_key: string
          destinatario_perfil_id: string
          erro: string | null
          evento: string
          id: string
          mensagem: string | null
          status_http: number | null
          sucesso: boolean
          telefone: string
          workspace_id: string
        }
        Insert: {
          chamado_id: string
          criado_em?: string
          dedup_key: string
          destinatario_perfil_id: string
          erro?: string | null
          evento: string
          id?: string
          mensagem?: string | null
          status_http?: number | null
          sucesso?: boolean
          telefone: string
          workspace_id: string
        }
        Update: {
          chamado_id?: string
          criado_em?: string
          dedup_key?: string
          destinatario_perfil_id?: string
          erro?: string | null
          evento?: string
          id?: string
          mensagem?: string | null
          status_http?: number | null
          sucesso?: boolean
          telefone?: string
          workspace_id?: string
        }
        Relationships: []
      }
      chamados: {
        Row: {
          agendado_para: string | null
          atualizado_em: string
          categoria: string | null
          chamado_pai_id: string | null
          codigo: string | null
          criado_em: string
          criado_por: string
          departamento_id: string | null
          departamento_origem_id: string | null
          descricao: string | null
          fechado_em: string | null
          id: string
          loja: string | null
          motivo_agendamento: string | null
          motivo_pausa: string | null
          numero: number
          prazo: string | null
          primeiro_resposta_em: string | null
          prioridade: Database["public"]["Enums"]["prioridade_chamado"]
          requisicao_compras: boolean
          resolvido_em: string | null
          responsavel_id: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["status_chamado"]
          tags: string[]
          tipo: Database["public"]["Enums"]["tipo_chamado"]
          titulo: string
          tratativa: string | null
          workspace_id: string
        }
        Insert: {
          agendado_para?: string | null
          atualizado_em?: string
          categoria?: string | null
          chamado_pai_id?: string | null
          codigo?: string | null
          criado_em?: string
          criado_por: string
          departamento_id?: string | null
          departamento_origem_id?: string | null
          descricao?: string | null
          fechado_em?: string | null
          id?: string
          loja?: string | null
          motivo_agendamento?: string | null
          motivo_pausa?: string | null
          numero: number
          prazo?: string | null
          primeiro_resposta_em?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"]
          requisicao_compras?: boolean
          resolvido_em?: string | null
          responsavel_id?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["status_chamado"]
          tags?: string[]
          tipo?: Database["public"]["Enums"]["tipo_chamado"]
          titulo: string
          tratativa?: string | null
          workspace_id: string
        }
        Update: {
          agendado_para?: string | null
          atualizado_em?: string
          categoria?: string | null
          chamado_pai_id?: string | null
          codigo?: string | null
          criado_em?: string
          criado_por?: string
          departamento_id?: string | null
          departamento_origem_id?: string | null
          descricao?: string | null
          fechado_em?: string | null
          id?: string
          loja?: string | null
          motivo_agendamento?: string | null
          motivo_pausa?: string | null
          numero?: number
          prazo?: string | null
          primeiro_resposta_em?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"]
          requisicao_compras?: boolean
          resolvido_em?: string | null
          responsavel_id?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["status_chamado"]
          tags?: string[]
          tipo?: Database["public"]["Enums"]["tipo_chamado"]
          titulo?: string
          tratativa?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_chamado_pai_id_fkey"
            columns: ["chamado_pai_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_comentarios: {
        Row: {
          atualizado_em: string
          autor_id: string
          checklist_id: string
          conteudo: string
          criado_em: string
          id: string
          mencionados: string[]
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          autor_id: string
          checklist_id: string
          conteudo: string
          criado_em?: string
          id?: string
          mencionados?: string[]
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          autor_id?: string
          checklist_id?: string
          conteudo?: string
          criado_em?: string
          id?: string
          mencionados?: string[]
          workspace_id?: string
        }
        Relationships: []
      }
      checklist_historico: {
        Row: {
          acao: string
          checklist_id: string
          criado_em: string
          id: string
          item_id: string | null
          rotulo: string | null
          usuario_id: string | null
          valor_anterior: Json | null
          valor_novo: Json | null
          workspace_id: string
        }
        Insert: {
          acao: string
          checklist_id: string
          criado_em?: string
          id?: string
          item_id?: string | null
          rotulo?: string | null
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
          workspace_id: string
        }
        Update: {
          acao?: string
          checklist_id?: string
          criado_em?: string
          id?: string
          item_id?: string | null
          rotulo?: string | null
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_historico_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_respostas: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          checklist_id: string
          id: string
          item_id: string
          valor: Json | null
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          checklist_id: string
          id?: string
          item_id: string
          valor?: Json | null
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          checklist_id?: string
          id?: string
          item_id?: string
          valor?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_respostas_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_respostas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "checklist_template_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_itens: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          id: string
          obrigatorio: boolean
          opcoes: Json | null
          ordem: number
          rotulo: string
          secao: string
          subsecao: string | null
          template_id: string
          tipo: string
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          rotulo: string
          secao: string
          subsecao?: string | null
          template_id: string
          tipo?: string
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          id?: string
          obrigatorio?: boolean
          opcoes?: Json | null
          ordem?: number
          rotulo?: string
          secao?: string
          subsecao?: string | null
          template_id?: string
          tipo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_itens_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string
          descricao: string | null
          id: string
          nome: string
          padrao: boolean
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por: string
          descricao?: string | null
          id?: string
          nome: string
          padrao?: boolean
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          descricao?: string | null
          id?: string
          nome?: string
          padrao?: boolean
          workspace_id?: string
        }
        Relationships: []
      }
      checklists: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string
          id: string
          nome: string
          responsavel_id: string | null
          status: string
          template_id: string
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por: string
          id?: string
          nome: string
          responsavel_id?: string | null
          status?: string
          template_id: string
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          id?: string
          nome?: string
          responsavel_id?: string | null
          status?: string
          template_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string
          descricao: string | null
          id: string
          nome: string
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por: string
          descricao?: string | null
          id?: string
          nome: string
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          descricao?: string | null
          id?: string
          nome?: string
          workspace_id?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          ator_id: string | null
          criado_em: string
          destinatario_id: string
          id: string
          lida_em: string | null
          link: string | null
          mensagem: string | null
          recurso_id: string | null
          recurso_tipo: string | null
          tipo: string
          titulo: string
          workspace_id: string
        }
        Insert: {
          ator_id?: string | null
          criado_em?: string
          destinatario_id: string
          id?: string
          lida_em?: string | null
          link?: string | null
          mensagem?: string | null
          recurso_id?: string | null
          recurso_tipo?: string | null
          tipo: string
          titulo: string
          workspace_id: string
        }
        Update: {
          ator_id?: string | null
          criado_em?: string
          destinatario_id?: string
          id?: string
          lida_em?: string | null
          link?: string | null
          mensagem?: string | null
          recurso_id?: string | null
          recurso_tipo?: string | null
          tipo?: string
          titulo?: string
          workspace_id?: string
        }
        Relationships: []
      }
      perfis: {
        Row: {
          atualizado_em: string
          avatar_url: string | null
          criado_em: string
          email: string
          id: string
          nome: string
          super_admin: boolean
          telefone: string | null
          ultimo_workspace_id: string | null
        }
        Insert: {
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          email: string
          id: string
          nome?: string
          super_admin?: boolean
          telefone?: string | null
          ultimo_workspace_id?: string | null
        }
        Update: {
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          super_admin?: boolean
          telefone?: string | null
          ultimo_workspace_id?: string | null
        }
        Relationships: []
      }
      projetos: {
        Row: {
          atualizado_em: string
          cor: string
          criado_em: string
          criado_por: string
          descricao: string | null
          fim_previsto: string | null
          id: string
          inicio_em: string | null
          nome: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_projeto"]
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          cor?: string
          criado_em?: string
          criado_por: string
          descricao?: string | null
          fim_previsto?: string | null
          id?: string
          inicio_em?: string | null
          nome: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_projeto"]
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          cor?: string
          criado_em?: string
          criado_por?: string
          descricao?: string | null
          fim_previsto?: string | null
          id?: string
          inicio_em?: string | null
          nome?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_projeto"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string
          descricao: string | null
          id: string
          ordem: number
          prazo: string | null
          prioridade: Database["public"]["Enums"]["prioridade_chamado"]
          projeto_id: string
          responsavel_id: string | null
          status: Database["public"]["Enums"]["status_tarefa"]
          titulo: string
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por: string
          descricao?: string | null
          id?: string
          ordem?: number
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"]
          projeto_id: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_tarefa"]
          titulo: string
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string
          descricao?: string | null
          id?: string
          ordem?: number
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"]
          projeto_id?: string
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["status_tarefa"]
          titulo?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_convites: {
        Row: {
          aceito: boolean
          cargo: Database["public"]["Enums"]["cargo_workspace"] | null
          convidado_por: string | null
          criado_em: string
          departamento_id: string | null
          email: string
          expira_em: string
          id: string
          nome: string | null
          papel: Database["public"]["Enums"]["papel_membro"]
          telefone: string | null
          token: string
          workspace_id: string
        }
        Insert: {
          aceito?: boolean
          cargo?: Database["public"]["Enums"]["cargo_workspace"] | null
          convidado_por?: string | null
          criado_em?: string
          departamento_id?: string | null
          email: string
          expira_em?: string
          id?: string
          nome?: string | null
          papel?: Database["public"]["Enums"]["papel_membro"]
          telefone?: string | null
          token?: string
          workspace_id: string
        }
        Update: {
          aceito?: boolean
          cargo?: Database["public"]["Enums"]["cargo_workspace"] | null
          convidado_por?: string | null
          criado_em?: string
          departamento_id?: string | null
          email?: string
          expira_em?: string
          id?: string
          nome?: string | null
          papel?: Database["public"]["Enums"]["papel_membro"]
          telefone?: string | null
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_convites_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_convites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ia_config: {
        Row: {
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          criado_em: string
          modelo: string
          openai_api_key: string | null
          workspace_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          modelo?: string
          openai_api_key?: string | null
          workspace_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          modelo?: string
          openai_api_key?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ia_config_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_membro_departamentos: {
        Row: {
          criado_em: string
          departamento_id: string
          id: string
          membro_id: string
          workspace_id: string
        }
        Insert: {
          criado_em?: string
          departamento_id: string
          id?: string
          membro_id: string
          workspace_id: string
        }
        Update: {
          criado_em?: string
          departamento_id?: string
          id?: string
          membro_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_membro_departamentos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_membro_departamentos_membro_id_fkey"
            columns: ["membro_id"]
            isOneToOne: false
            referencedRelation: "workspace_membros"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_membros: {
        Row: {
          aceito_em: string | null
          ativo: boolean
          cargo: Database["public"]["Enums"]["cargo_workspace"] | null
          convidado_por: string | null
          criado_em: string
          departamento_id: string | null
          id: string
          papel: Database["public"]["Enums"]["papel_membro"]
          usuario_id: string
          workspace_id: string
        }
        Insert: {
          aceito_em?: string | null
          ativo?: boolean
          cargo?: Database["public"]["Enums"]["cargo_workspace"] | null
          convidado_por?: string | null
          criado_em?: string
          departamento_id?: string | null
          id?: string
          papel?: Database["public"]["Enums"]["papel_membro"]
          usuario_id: string
          workspace_id: string
        }
        Update: {
          aceito_em?: string | null
          ativo?: boolean
          cargo?: Database["public"]["Enums"]["cargo_workspace"] | null
          convidado_por?: string | null
          criado_em?: string
          departamento_id?: string | null
          id?: string
          papel?: Database["public"]["Enums"]["papel_membro"]
          usuario_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_membros_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_membros_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_uazapi_config: {
        Row: {
          admin_token: string | null
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          conectado_em: string | null
          criado_em: string
          instance_id: string | null
          instance_name: string | null
          instance_token: string | null
          numero_conectado: string | null
          qr_code: string | null
          server_url: string | null
          status: string
          ultima_sincronizacao: string | null
          workspace_id: string
        }
        Insert: {
          admin_token?: string | null
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          conectado_em?: string | null
          criado_em?: string
          instance_id?: string | null
          instance_name?: string | null
          instance_token?: string | null
          numero_conectado?: string | null
          qr_code?: string | null
          server_url?: string | null
          status?: string
          ultima_sincronizacao?: string | null
          workspace_id: string
        }
        Update: {
          admin_token?: string | null
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          conectado_em?: string | null
          criado_em?: string
          instance_id?: string | null
          instance_name?: string | null
          instance_token?: string | null
          numero_conectado?: string | null
          qr_code?: string | null
          server_url?: string | null
          status?: string
          ultima_sincronizacao?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_uazapi_logs: {
        Row: {
          acao: string
          criado_em: string
          detalhes: Json | null
          id: string
          mensagem: string | null
          status_http: number | null
          sucesso: boolean
          workspace_id: string
        }
        Insert: {
          acao: string
          criado_em?: string
          detalhes?: Json | null
          id?: string
          mensagem?: string | null
          status_http?: number | null
          sucesso?: boolean
          workspace_id: string
        }
        Update: {
          acao?: string
          criado_em?: string
          detalhes?: Json | null
          id?: string
          mensagem?: string | null
          status_http?: number | null
          sucesso?: boolean
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_vmpay_config: {
        Row: {
          api_key: string | null
          ativo: boolean
          atualizado_em: string
          atualizado_por: string | null
          criado_em: string
          workspace_id: string
        }
        Insert: {
          api_key?: string | null
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          workspace_id: string
        }
        Update: {
          api_key?: string | null
          ativo?: boolean
          atualizado_em?: string
          atualizado_por?: string | null
          criado_em?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          atualizado_em: string
          cnpj: string | null
          cor_primaria: string
          criado_em: string
          fuso_horario: string
          id: string
          limite_chamados_mes: number
          limite_usuarios: number
          logo_url: string | null
          nome: string
          plano: Database["public"]["Enums"]["plano_workspace"]
          proprietario_id: string
          slug: string
          status: Database["public"]["Enums"]["status_workspace"]
        }
        Insert: {
          atualizado_em?: string
          cnpj?: string | null
          cor_primaria?: string
          criado_em?: string
          fuso_horario?: string
          id?: string
          limite_chamados_mes?: number
          limite_usuarios?: number
          logo_url?: string | null
          nome: string
          plano?: Database["public"]["Enums"]["plano_workspace"]
          proprietario_id: string
          slug: string
          status?: Database["public"]["Enums"]["status_workspace"]
        }
        Update: {
          atualizado_em?: string
          cnpj?: string | null
          cor_primaria?: string
          criado_em?: string
          fuso_horario?: string
          id?: string
          limite_chamados_mes?: number
          limite_usuarios?: number
          logo_url?: string | null
          nome?: string
          plano?: Database["public"]["Enums"]["plano_workspace"]
          proprietario_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["status_workspace"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_sigla_workspace: { Args: { _nome: string }; Returns: string }
      departamentos_do_usuario: {
        Args: { _workspace_id: string }
        Returns: string[]
      }
      disparar_whatsapp_chamado: {
        Args: {
          _ator_id: string
          _chamado_id: string
          _comentario_id?: string
          _detalhes?: Json
          _evento: string
          _workspace_id: string
        }
        Returns: undefined
      }
      pode_ver_todos_chamados: {
        Args: { _workspace_id: string }
        Returns: boolean
      }
      seed_checklist_condominio: {
        Args: { _criado_por: string; _workspace_id: string }
        Returns: string
      }
      tem_papel_workspace: {
        Args: {
          _papeis: Database["public"]["Enums"]["papel_membro"][]
          _workspace_id: string
        }
        Returns: boolean
      }
      workspaces_do_usuario: { Args: never; Returns: string[] }
    }
    Enums: {
      cargo_workspace: "Funcionario" | "Supervisor" | "Gestor" | "Gerente"
      papel_membro:
        | "Proprietario"
        | "Administrador"
        | "Gestor"
        | "Atendente"
        | "Solicitante"
      plano_workspace: "Gratuito" | "Inicial" | "Profissional" | "Empresarial"
      prioridade_chamado: "Baixa" | "Media" | "Alta" | "Urgente"
      status_chamado:
        | "Aberto"
        | "Em andamento"
        | "Aguardando solicitante"
        | "Aguardando terceiros"
        | "Resolvido"
        | "Fechado"
        | "Cancelado"
        | "Agendado"
        | "Pausado"
      status_item_compra:
        | "Pendente"
        | "Cotando"
        | "Aprovado"
        | "Comprado"
        | "Recebido"
        | "Cancelado"
      status_projeto:
        | "Planejado"
        | "Em andamento"
        | "Pausado"
        | "Concluido"
        | "Arquivado"
      status_tarefa: "A fazer" | "Em andamento" | "Em revisao" | "Concluido"
      status_workspace: "Ativo" | "Suspenso" | "Cancelado"
      tipo_chamado: "Incidente" | "Solicitacao" | "Duvida" | "Melhoria" | "Bug"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      cargo_workspace: ["Funcionario", "Supervisor", "Gestor", "Gerente"],
      papel_membro: [
        "Proprietario",
        "Administrador",
        "Gestor",
        "Atendente",
        "Solicitante",
      ],
      plano_workspace: ["Gratuito", "Inicial", "Profissional", "Empresarial"],
      prioridade_chamado: ["Baixa", "Media", "Alta", "Urgente"],
      status_chamado: [
        "Aberto",
        "Em andamento",
        "Aguardando solicitante",
        "Aguardando terceiros",
        "Resolvido",
        "Fechado",
        "Cancelado",
        "Agendado",
        "Pausado",
      ],
      status_item_compra: [
        "Pendente",
        "Cotando",
        "Aprovado",
        "Comprado",
        "Recebido",
        "Cancelado",
      ],
      status_projeto: [
        "Planejado",
        "Em andamento",
        "Pausado",
        "Concluido",
        "Arquivado",
      ],
      status_tarefa: ["A fazer", "Em andamento", "Em revisao", "Concluido"],
      status_workspace: ["Ativo", "Suspenso", "Cancelado"],
      tipo_chamado: ["Incidente", "Solicitacao", "Duvida", "Melhoria", "Bug"],
    },
  },
} as const
