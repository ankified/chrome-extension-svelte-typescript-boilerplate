# Plano de Implementação: Ações Individuais na Tabela de Itens

Este documento detalha o plano para implementar e/ou aperfeiçoar as opções do menu de ações individuais (`DataTableActions.svelte`) para cada item na tabela (`DataTable.svelte`).

## Objetivos

- **Visualizar**: Abrir um Dialog contendo um `iframe` que exibe a URL do item.
- **Editar**: Abrir um Dialog (placeholder) para futura implementação da edição do item.
- **Excluir**: Exibir um `AlertDialog` de confirmação antes de excluir o item individualmente.
- **Copiar ID**: Copiar o ID do item para a área de transferência e exibir um toast de confirmação/erro.

## Análise do Fluxo

1.  **`Options.svelte`**: Container principal, gerencia abas e `Toaster`.
2.  **`SavedItemsView.svelte`**: Orquestra visualizações, filtros, ordenação, passa dados (`sortedItems`) para a tabela e gerencia diálogos globais.
3.  **`SavedItemsTableView.svelte`**: Wrapper que passa `data` para `DataTable`.
4.  **`DataTable.svelte`**: Componente central da tabela (`@tanstack/svelte-table`), gerencia estado interno (paginação, seleção, ordenação, filtros), renderiza linhas/células e lida com ações em lote. **Será o local principal para adicionar estado e lógica dos diálogos individuais.**
5.  **`columns.ts`**: Define as colunas. A coluna `actions` renderiza `DataTableActions`, passando o `id` do item. *Possui um erro de linter a ser corrigido.*
6.  **`DataTableActions.svelte`**: (Componente a ser modificado/criado) Recebe o `id` e renderiza o `DropdownMenu` com as ações. **Disparará eventos/funções para `DataTable`.**
7.  **`storage.ts`**: Contém stores e funções de acesso ao `chrome.storage` (`deleteItems`, `updateItem`).
8.  **`types.ts`**: Define as interfaces (`SavedItem`).

## Estratégia

Centralizar o controle dos diálogos ("Visualizar", "Editar", "Excluir") em `DataTable.svelte`. O componente `DataTableActions.svelte` atuará como um disparador, chamando funções definidas em `DataTable.svelte` através do mecanismo `meta` da tabela TanStack.

## Plano de Implementação Detalhado

- [✅] **1. Corrigir Erro de Linter em `columns.ts`**:
    - [✅] **Problema**: `DropdownMenuHeaderButton` (no header da coluna `actions`) espera a prop `onOpenDeleteAllDialog`.
    - [✅] **Solução**:
        - [✅] Em `DataTable.svelte`, adicionar a função `openDeleteAllDialog` ao `meta` da tabela.
        - [✅] Em `columns.ts`, na definição do `header` da coluna `actions`, acessar `table.options.meta?.openDeleteAllDialog` e passá-la como prop `onOpenDeleteAllDialog` para `DropdownMenuHeaderButton`.

- [✅] **2. Modificar `DataTable.svelte`**:
    - [ ] **Adicionar Estado para Diálogos Individuais:**
        ```typescript
        let editItemId: string | null = $state(null);
        let isEditDialogOpen: boolean = $state(false);
        let deleteItemId: string | null = $state(null);
        let isConfirmDeleteDialogOpen: boolean = $state(false);
        ```
    - [✅] **Criar Funções Handler:**
        - [ ] `handleOpenViewDialog(itemId: string)`:
        - [✅] `handleOpenEditDialog(itemId: string)`: Define `editItemId` e abre o diálogo (`isEditDialogOpen = true`).
        - [✅] `handleOpenDeleteConfirmDialog(itemId: string)`: Define `deleteItemId` e abre o `AlertDialog` (`isConfirmDeleteDialogOpen = true`).
        - [✅] `handleConfirmDelete()`: Chama `storage.deleteItems([deleteItemId])`, fecha o `AlertDialog`, limpa `deleteItemId` e mostra toast.
    - [✅] **Implementar Diálogos no Template:**
        - [ ] `<Dialog.Root bind:open={isViewDialogOpen}>`:
        - [✅] `<Dialog.Root bind:open={isEditDialogOpen}>` com placeholder de edição.
        - [✅] `<AlertDialog.Root bind:open={isConfirmDeleteDialogOpen}>` para confirmar exclusão individual.
    - [✅] **Passar Handlers via `meta`:**
        ```typescript
        meta: {
          openEditDialog: handleOpenEditDialog,
          openDeleteConfirmDialog: handleOpenDeleteConfirmDialog,
          openDeleteAllDialog: openDeleteAllDialog
        }
        ```

- [✅] **3. Modificar `columns.ts`**:
    - [✅] **Célula da Coluna `actions`:**
        - [✅] Obter as funções do `meta` (`onEdit`, `onDelete`) e passá-las como props para `DataTableActions`. Adicionar prop `url`.
            ```typescript
            cell: ({ row, table }) => renderComponent(DataTableActions, { 
              id: row.original.id,
              url: row.original.url,
              onEdit: table.options.meta?.openEditDialog,
              onDelete: table.options.meta?.openDeleteConfirmDialog
            }),
            ```
    - [✅] **Header da Coluna `actions` (Correção Linter):**
        - [✅] Passar `onOpenDeleteAllDialog` do `meta` para `DropdownMenuHeaderButton`.

- [✅] **4. Criar/Modificar `DataTableActions.svelte`**:
    - [✅] **Props**: `id: string`, `url: string`, `onEdit?: (id: string) => void`, `onDelete?: (id: string) => void`.
    - [✅] **DropdownMenu Items**:
        - [✅] "Visualizar / Abrir": Implementar submenu com opções para abrir link (`chrome.tabs.create`, `chrome.windows.create`).
        - [✅] "Editar": Chamar `onEdit?.(id)` no `onclick`.
        - [✅] "Excluir": Chamar `onDelete?.(id)` no `onclick`.
        - [✅] "Copiar ID": Implementar lógica com `navigator.clipboard.writeText(id)` e `toast` no `onclick`.

- [✅] **5. Revisar `storage.ts`**: Confirmado que `deleteItems([id])` funciona para exclusão individual.

## Próximos Passos Imediatos

- [✅] 1. Corrigir o erro de linter em `columns.ts`.
- [✅] 2. Implementar a funcionalidade de "Copiar ID" em `DataTableActions.svelte`.
- [✅] 3. Implementar a funcionalidade de "Excluir" (requer modificações em `DataTable.svelte`, `columns.ts` e `DataTableActions.svelte`).
- [✅] 4. Implementar a funcionalidade de "Visualizar" (modificado para submenu).
- [✅] 5. Implementar a funcionalidade de "Editar" (placeholder). 