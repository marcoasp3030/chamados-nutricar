-- Funções não precisam de SECURITY DEFINER: o usuário já tem acesso ao seu workspace via RLS
ALTER FUNCTION public.calcular_sigla_workspace(text) SECURITY INVOKER;
ALTER FUNCTION public.gerar_codigo_chamado() SECURITY INVOKER;

-- Revoga EXECUTE público das funções auxiliares (só o trigger precisa chamar)
REVOKE EXECUTE ON FUNCTION public.calcular_sigla_workspace(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gerar_codigo_chamado() FROM PUBLIC, anon, authenticated;