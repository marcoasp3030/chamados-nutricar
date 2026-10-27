UPDATE public.app_config
SET valor = 'https://nutricarhub.nutricarbrasil.com.br/api/public/whatsapp-notify',
    atualizado_em = now()
WHERE chave = 'whatsapp_notify_url';
