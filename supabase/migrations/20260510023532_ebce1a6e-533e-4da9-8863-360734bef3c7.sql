REVOKE ALL ON FUNCTION public.disparar_whatsapp_chamado(uuid,uuid,text,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_chamado_whatsapp_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_chamado_whatsapp_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_comentario_whatsapp_insert() FROM PUBLIC, anon, authenticated;