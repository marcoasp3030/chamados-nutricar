export interface Perfil {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  telefone: string | null;
  ultimo_workspace_id: string | null;
  super_admin: boolean;
}
