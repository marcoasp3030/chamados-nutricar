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
      categorias_chamado: {
        Row: {
          atualizado_em: string
          cor: string
          criado_em: string
          criado_por: string
          descricao: string | null
          id: string
          nome: string
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
      chamados: {
        Row: {
          atualizado_em: string
          categoria: string | null
          chamado_pai_id: string | null
          criado_em: string
          criado_por: string
          descricao: string | null
          fechado_em: string | null
          id: string
          numero: number
          prazo: string | null
          primeiro_resposta_em: string | null
          prioridade: Database["public"]["Enums"]["prioridade_chamado"]
          resolvido_em: string | null
          responsavel_id: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["status_chamado"]
          tags: string[]
          tipo: Database["public"]["Enums"]["tipo_chamado"]
          titulo: string
          workspace_id: string
        }
        Insert: {
          atualizado_em?: string
          categoria?: string | null
          chamado_pai_id?: string | null
          criado_em?: string
          criado_por: string
          descricao?: string | null
          fechado_em?: string | null
          id?: string
          numero: number
          prazo?: string | null
          primeiro_resposta_em?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"]
          resolvido_em?: string | null
          responsavel_id?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["status_chamado"]
          tags?: string[]
          tipo?: Database["public"]["Enums"]["tipo_chamado"]
          titulo: string
          workspace_id: string
        }
        Update: {
          atualizado_em?: string
          categoria?: string | null
          chamado_pai_id?: string | null
          criado_em?: string
          criado_por?: string
          descricao?: string | null
          fechado_em?: string | null
          id?: string
          numero?: number
          prazo?: string | null
          primeiro_resposta_em?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_chamado"]
          resolvido_em?: string | null
          responsavel_id?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["status_chamado"]
          tags?: string[]
          tipo?: Database["public"]["Enums"]["tipo_chamado"]
          titulo?: string
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
      pode_ver_todos_chamados: {
        Args: { _workspace_id: string }
        Returns: boolean
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
