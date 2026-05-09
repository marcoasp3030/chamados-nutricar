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
      workspace_convites: {
        Row: {
          aceito: boolean
          convidado_por: string | null
          criado_em: string
          email: string
          expira_em: string
          id: string
          papel: Database["public"]["Enums"]["papel_membro"]
          token: string
          workspace_id: string
        }
        Insert: {
          aceito?: boolean
          convidado_por?: string | null
          criado_em?: string
          email: string
          expira_em?: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_membro"]
          token?: string
          workspace_id: string
        }
        Update: {
          aceito?: boolean
          convidado_por?: string | null
          criado_em?: string
          email?: string
          expira_em?: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_membro"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_convites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_membros: {
        Row: {
          aceito_em: string | null
          ativo: boolean
          convidado_por: string | null
          criado_em: string
          id: string
          papel: Database["public"]["Enums"]["papel_membro"]
          usuario_id: string
          workspace_id: string
        }
        Insert: {
          aceito_em?: string | null
          ativo?: boolean
          convidado_por?: string | null
          criado_em?: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_membro"]
          usuario_id: string
          workspace_id: string
        }
        Update: {
          aceito_em?: string | null
          ativo?: boolean
          convidado_por?: string | null
          criado_em?: string
          id?: string
          papel?: Database["public"]["Enums"]["papel_membro"]
          usuario_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_membros_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      papel_membro:
        | "Proprietario"
        | "Administrador"
        | "Gestor"
        | "Atendente"
        | "Solicitante"
      plano_workspace: "Gratuito" | "Inicial" | "Profissional" | "Empresarial"
      status_workspace: "Ativo" | "Suspenso" | "Cancelado"
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
      papel_membro: [
        "Proprietario",
        "Administrador",
        "Gestor",
        "Atendente",
        "Solicitante",
      ],
      plano_workspace: ["Gratuito", "Inicial", "Profissional", "Empresarial"],
      status_workspace: ["Ativo", "Suspenso", "Cancelado"],
    },
  },
} as const
