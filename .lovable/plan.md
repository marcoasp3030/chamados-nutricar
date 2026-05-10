## Integração com Uazapi (WhatsApp)

Adicionar uma nova aba **"WhatsApp (Uazapi)"** em Configurações, permitindo conectar uma instância da Uazapi por workspace.

### O que será entregue

**1. Aba de configuração**
- Campos: Server URL e Admin Token (com mostrar/ocultar)
- Botão **Salvar e validar** — testa a conexão e salva
- Botão **Criar instância** (gera nome automático baseado no slug do workspace)
- Exibição do QR Code (atualiza automaticamente a cada 30s ou quando expira)
- Painel de status da instância:
  - Nome da instância
  - Status da conexão (badge: Desconectado / Aguardando QR / Conectando / Conectado)
  - Número conectado (JID/telefone)
  - Data/hora da conexão
  - Última sincronização
- Botões: **Reconectar**, **Desconectar**, **Excluir instância**
- Indicadores visuais (ícones + cores semânticas)
- Polling em tempo real (a cada 3s enquanto aguardando QR; 30s quando conectado)
- Tratamento de erros com toast e mensagens claras
- Tabela de **logs de integração** (últimos 50 eventos)

**2. Backend (Lovable Cloud)**
- Tabela `workspace_uazapi_config` — guarda server_url, admin_token (criptografado a nível de RLS), instance_token, instance_name, status, número conectado, timestamps
- Tabela `workspace_uazapi_logs` — histórico de chamadas (ação, status HTTP, mensagem, timestamp)
- RLS: apenas Proprietário/Administrador acessa
- **Server functions** (TanStack Start, em `src/lib/uazapi.functions.ts`):
  - `validarUazapi` — testa Server URL + Admin Token
  - `criarInstanciaUazapi` — cria instância via `/instance/init`, salva token
  - `obterStatusUazapi` — consulta status + QR Code via `/instance/status` ou `/instance/connect`
  - `desconectarUazapi` — `/instance/disconnect`
  - `reconectarUazapi` — `/instance/connect` (gera novo QR)
  - `excluirInstanciaUazapi` — remove instância e limpa config
- Logs gravados a cada chamada para diagnóstico

### Detalhes técnicos

- Endpoints Uazapi usados: `POST /instance/init`, `GET /instance/status`, `GET /instance/connect`, `POST /instance/disconnect` (Authorization: admin token / instance token via header `token`)
- Polling client-side via `useQuery` com `refetchInterval` dinâmico
- QR Code renderizado a partir do base64 retornado pela API
- Tokens armazenados apenas no servidor; nunca expostos ao cliente além do necessário para exibir status
- UI segue design system existente (cards, badges, ícones lucide), padrão da `AbaVMPay`

### Arquivos

- **Migration:** cria `workspace_uazapi_config` + `workspace_uazapi_logs` + RLS + trigger de updated_at
- **Novo:** `src/lib/uazapi.functions.ts` (server functions)
- **Novo:** `src/lib/uazapi.server.ts` (helpers HTTP + logger)
- **Novo:** `src/componentes/configuracoes/AbaUazapi.tsx`
- **Editar:** `src/paginas/configuracoes/PaginaConfiguracoes.tsx` (adicionar tab)
