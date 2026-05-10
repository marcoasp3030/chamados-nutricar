## Objetivo

Restringir a visibilidade dos chamados por departamento e introduzir um fluxo de resolução com status obrigatórios e campos de justificativa.

---

## 1. Regras de visibilidade (RLS)

Atualmente, qualquer membro com papel `Proprietario / Administrador / Gestor / Atendente` enxerga todos os chamados (`pode_ver_todos_chamados`). Vamos restringir:

Um usuário poderá visualizar um chamado quando:
- Ele é o solicitante OU criador OU responsável; **OU**
- O chamado pertence (origem) a um departamento ao qual ele está vinculado (`workspace_membro_departamentos`); **OU**
- O chamado é **destinado** a um departamento ao qual ele está vinculado.

Para isso, o campo `chamados.departamento_id` passa a representar o **departamento destino** (já é como vem sendo usado). Vamos adicionar um novo campo `departamento_origem_id` para guardar o departamento do solicitante no momento da abertura (preenchido automaticamente).

Proprietário e Administrador continuam vendo tudo (gestão).

### Mudanças no banco
- `ALTER TABLE chamados ADD COLUMN departamento_origem_id uuid`.
- Trigger `before insert` em `chamados`: se `departamento_origem_id` for nulo, preencher com o primeiro departamento do solicitante.
- Função `pode_ver_chamado(chamado_id)` (security definer) checando as regras acima.
- Reescrever policies `chamados_selecionar` e `chamados_atualizar` (esta passa a permitir update por qualquer membro do depto destino — necessário para self-assign).
- Atualizar policies de `chamado_comentarios`, `chamado_anexos`, `chamado_historico`, `chamado_ia_execucoes`, `chamado_requisicao_itens` para usar `pode_ver_chamado`.

---

## 2. Self-assign

Como qualquer membro do departamento destino poderá atualizar `responsavel_id`, basta um botão **"Atribuir a mim"** / **"Reassumir chamado"** no detalhe do chamado, visível quando o usuário pertence ao depto destino. O update já será permitido via RLS revisada.

---

## 3. Novo fluxo de status

Substituir/ajustar o enum `status_chamado` para o fluxo:

```
Aberto → Em andamento → (Agendado | Pausado) → Em andamento → Resolvido → Fechado
                                                                ↘ Cancelado
```

Regras aplicadas no front (e validadas no back via trigger):
- Sair de `Aberto` exige `responsavel_id` definido.
- Mudar para `Agendado`: obrigatório `motivo_agendamento` + `agendado_para` (data).
- Mudar para `Pausado`: obrigatório `motivo_pausa`.
- Mudar para `Resolvido`: obrigatório `tratativa` (texto da resolução).

### Mudanças no banco
- Novas colunas em `chamados`: `motivo_agendamento text`, `agendado_para timestamptz`, `motivo_pausa text`, `tratativa text`.
- Trigger `validar_transicao_status_chamado` (before update) que bloqueia transições inválidas e exige os campos.
- Histórico já registra mudanças de status; adicionar registro específico quando motivo/tratativa forem informados.

---

## 4. Frontend

- **`FormularioChamado`**: ao abrir, mostrar select de "Departamento destino" (obrigatório).
- **`DetalheChamado`**:
  - Botão **"Atribuir a mim"** quando o usuário é do depto destino e não é o responsável.
  - Ao trocar o status, abrir um Dialog específico:
    - Para **Em andamento**: bloqueia se não houver responsável e oferece atribuir.
    - **Agendado**: form com motivo + data/hora.
    - **Pausado**: form com motivo.
    - **Resolvido**: form com tratativa (textarea).
  - Exibir banner com info atual (motivo/tratativa) quando aplicável.
- **`useChamados` / `useChamado`**: nada além de buscar os novos campos (a RLS já filtra).
- **`QuadroChamados`**: incluir colunas Agendado e Pausado se ainda não cobertas (já existe Aguardando — vamos manter os existentes e agregar; ou substituir? — manter os atuais e adicionar Agendado/Pausado ao enum como aliases não é trivial; vamos **adicionar** "Agendado" e "Pausado" ao enum, mantendo os antigos para compat).

### Tipos
- Atualizar `src/tipos/chamado.ts` com `Agendado | Pausado` e os novos campos.

---

## 5. Detalhes técnicos

- A função helper `pode_ver_chamado(_chamado_id uuid)` será SECURITY DEFINER, evitando recursão na policy do próprio `chamados`. Internamente checa:
  - admins do workspace (via `tem_papel_workspace`),
  - solicitante/criador/responsavel,
  - depto origem ∈ deptos do usuário,
  - depto destino ∈ deptos do usuário.
- Para a **policy do próprio `chamados`** (não dá para chamar a função sobre a própria linha sem recursão) usaremos uma policy que repete a lógica diretamente sobre `OLD/NEW`, sem subselect em `chamados`.
- Adicionar `Agendado` e `Pausado` ao enum `status_chamado` via `ALTER TYPE`.

---

## 6. Ordem de execução

1. Migração SQL (colunas, enum values, função helper, policies, triggers).
2. Atualizar `src/tipos/chamado.ts`, traduções e cores (Kanban).
3. Ajustar `FormularioChamado` para exigir depto destino.
4. Implementar diálogos de transição de status em `DetalheChamado`.
5. Botão "Atribuir a mim".
6. Validar que listagem/quadro funcionam com a nova RLS.
