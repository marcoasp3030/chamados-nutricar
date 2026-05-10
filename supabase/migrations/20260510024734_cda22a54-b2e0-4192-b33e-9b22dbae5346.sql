UPDATE public.app_config
SET valor = 'https://project--98165f9e-498c-4810-868e-07ed8362bbd9-dev.lovable.app/api/public/whatsapp-notify',
    atualizado_em = now()
WHERE chave = 'whatsapp_notify_url';