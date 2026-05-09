
-- Fix search_path mutable
CREATE OR REPLACE FUNCTION public.atualizar_coluna_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Restringe execução das funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.workspaces_do_usuario() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tem_papel_workspace(uuid, public.papel_membro[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.criar_perfil_novo_usuario() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.workspaces_do_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_papel_workspace(uuid, public.papel_membro[]) TO authenticated;
