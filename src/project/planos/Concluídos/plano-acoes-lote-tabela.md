# Planejamento Detalhado: Ações em Lote na Tabela

Este documento descreve o plano para implementar funcionalidades de ações em lote (seleção múltipla, exclusão, alteração de grupos/tags, abertura de links) na visualização de tabela (`DataTable.svelte`).

**1. Novas Funções no `storage.ts`:**

É necessário criar funções específicas no `storage.ts` para lidar com operações em múltiplos itens de forma eficiente e consistente.

*   **`deleteItems(itemIds: string[]): Promise<void>`:**
    *   **Objetivo:** Remover múltiplos `SavedItem` do armazenamento e limpar suas referências em `Group`.
    *   **Implementação:**
        *   Recebe um array de IDs de `SavedItem`.
        *   Atualiza a store `savedItems`: Filtra os itens, mantendo apenas aqueles cujo `id` *não* está em `itemIds`.
        *   Atualiza a store `groups`: Itera sobre cada grupo. Para cada grupo, filtra sua propriedade `itemIds`, removendo qualquer ID presente no array `itemIds` recebido.
        *   Chama `savedItems.forceSync()` e `groups.forceSync()` para persistir as alterações no `chrome.storage.local`.
        *   Retorna uma `Promise` que resolve após a conclusão das operações de sincronização.
    *   **Considerações:** Tratamento de erros durante a sincronização.

*   **`updateItemsGroups(itemIds: string[], groupUpdates: { add?: string[], remove?: string[] }): Promise<void>`:**
    *   **Objetivo:** Adicionar ou remover associações de múltiplos `SavedItem` a um ou mais `Group`.
    *   **Implementação:**
        *   Recebe um array de `itemIds` e um objeto `groupUpdates` contendo arrays opcionais `add` (IDs de grupos a adicionar) e `remove` (IDs de grupos a remover).
        *   Atualiza a store `savedItems`: Mapeia os itens. Para cada item cujo `id` está em `itemIds`:
            *   Garante que `item.groupIds` seja um array.
            *   Filtra `item.groupIds` para remover IDs presentes em `groupUpdates.remove`.
            *   Adiciona IDs de `groupUpdates.add` ao `item.groupIds`, garantindo unicidade (usando `Set` ou verificação).
        *   Atualiza a store `groups`: Mapeia os grupos.
            *   Para cada grupo cujo `id` está em `groupUpdates.add`: Adiciona todos os `itemIds` recebidos ao `group.itemIds`, garantindo unicidade.
            *   Para cada grupo cujo `id` está em `groupUpdates.remove`: Filtra `group.itemIds`, removendo os `itemIds` recebidos.
        *   Chama `savedItems.forceSync()` e `groups.forceSync()`.
        *   Retorna uma `Promise`.
    *   **Considerações:** Garantir consistência bidirecional (item -> grupo, grupo -> item).

*   **`updateItemsTags(itemIds: string[], tagUpdates: { add?: string[], remove?: string[] }): Promise<void>`:**
    *   **Objetivo:** Adicionar ou remover tags de múltiplos `SavedItem`.
    *   **Implementação:**
        *   Recebe um array de `itemIds` e um objeto `tagUpdates` com arrays opcionais `add` (strings de tags a adicionar) e `remove` (strings de tags a remover).
        *   Atualiza a store `savedItems`: Mapeia os itens. Para cada item cujo `id` está em `itemIds`:
            *   Garante que `item.tags` seja um array.
            *   Normaliza as tags em `tagUpdates.add` e `tagUpdates.remove` (ex: trim, lowercase para comparação).
            *   Filtra `item.tags` para remover tags presentes em `tagUpdates.remove` (comparação normalizada).
            *   Adiciona tags de `tagUpdates.add` ao `item.tags`, garantindo unicidade (comparação normalizada).
        *   Para cada tag (original, não normalizada) em `tagUpdates.add`, chama `addKnownTagIfNotExists(tag)` para atualizar a lista global de tags conhecidas.
        *   Chama `savedItems.forceSync()`. A store `knownTags` será atualizada reativamente.
        *   Retorna uma `Promise`.
    *   **Considerações:** Normalização de tags (case-insensitivity, trim).

**2. Modificações na UI (`DataTable.svelte`):**

*   **Rodapé Dinâmico com Barra de Ações:**
    *   O `div` no final do componente será modificado para exibir condicionalmente:
        *   **Se nenhum item selecionado:** Texto indicando o número total de itens filtrados (ex: `"{table.getFilteredRowModel().rows.length} item(ns) exibido(s)."`). Controles de paginação podem ser adicionados aqui no futuro.
        *   **Se um ou more itens selecionados:**
            *   Texto indicando o número de itens selecionados (ex: `"{table.getFilteredSelectedRowModel().rows.length} selecionado(s)"`).
            *   Botões para as ações em lote (`Button` do Shadcn):
                *   **Excluir:** Ícone `Trash2`, `variant="destructive"`. Chama `handleBulkDelete`.
                *   **Alterar Grupos:** Ícone `Folder`, `variant="outline"`. Chama `openBulkGroupDialog`.
                *   **Alterar Tags:** Ícone `Tags`, `variant="outline"`. Chama `openBulkTagDialog`.
                *   **Abrir em...:** Ícone `ExternalLink`, `variant="outline"`. Será um `DropdownMenu.Trigger` para oferecer opções.
                    *   **DropdownMenu.Content:** Itens para:
                        *   "Aba(s) na Janela Atual" (chama `handleBulkOpen('current')`)
                        *   "Nova Janela" (chama `handleBulkOpen('new')`)
                        *   "Nova Janela Anônima" (chama `handleBulkOpen('incognito')`)
    *   A exibição condicional será controlada por `{#if table.getFilteredSelectedRowModel().rows.length > 0}`.
    *   Importar os ícones (`Trash2`, `Folder`, `Tags`, `ExternalLink`) e componentes `Button`, `DropdownMenu` necessários.

*   **Diálogos Modais para Grupos e Tags em Lote:**
    *   **`BulkGroupAssignDialog.svelte`:**
        *   **Propósito:** Permitir ao usuário selecionar grupos para adicionar e/ou remover dos itens selecionados.
        *   **UI:** Poderia usar duas listas com checkboxes (uma para adicionar, outra para remover) ou um componente multi-select mais avançado. Deve listar todos os grupos existentes (`$groupsStore`).
        *   **Interação:** Recebe `isOpen` (bindable), `itemCount`. Emite um evento `update` com `{ add: string[], remove: string[] }` ao confirmar.
        *   **Chamado por:** `openBulkGroupDialog` em `DataTable.svelte`.
    *   **`BulkTagAssignDialog.svelte`:**
        *   **Propósito:** Permitir ao usuário adicionar novas tags e/ou selecionar/remover tags existentes dos itens selecionados.
        *   **UI:** Um campo de input para adicionar novas tags (com autocomplete/sugestões de `$knownTags`). Listas separadas ou um componente multi-select com checkboxes para selecionar tags existentes para adicionar/remover.
        *   **Interação:** Recebe `isOpen` (bindable), `itemCount`. Emite um evento `update` com `{ add: string[], remove: string[] }` ao confirmar.
        *   **Chamado por:** `openBulkTagDialog` em `DataTable.svelte`.

*   **Diálogo de Confirmação para Exclusão:**
    *   Usar `AlertDialog` do Shadcn.
    *   **UI:** Título "Confirmar Exclusão", Descrição "Tem certeza que deseja excluir {n} item(ns) selecionado(s)? Esta ação não pode ser desfeita.", Botões "Cancelar" e "Excluir" (`variant="destructive"`).
    *   **Chamado por:** `handleBulkDelete` em `DataTable.svelte`. Ao confirmar, chama `confirmBulkDelete`.

**3. Lógica na `DataTable.svelte`:**

*   **Estados Reativos:**
    ```typescript
    import { AlertDialog } from '$lib/components/ui/alert-dialog'; // Ou caminho correto
    // ... outros imports ...
    import BulkGroupAssignDialog from './BulkGroupAssignDialog.svelte'; // Criar este
    import BulkTagAssignDialog from './BulkTagAssignDialog.svelte'; // Criar este

    let isBulkGroupDialogOpen = $state(false);
    let isBulkTagDialogOpen = $state(false);
    let isDeleteDialogOpen = $state(false);

    let selectedRows = $derived(table.getFilteredSelectedRowModel().rows);
    let selectedItemIds = $derived(selectedRows.map(row => row.original.id));
    let selectedItemUrls = $derived(selectedRows.map(row => row.original.url));
    let selectedItemCount = $derived(selectedItemIds.length); // Para usar na UI
    ```

*   **Manipuladores de Evento (Handlers):**
    *   `handleBulkDelete()`: Define `isDeleteDialogOpen = true`.
    *   `confirmBulkDelete()`:
        *   Se `selectedItemCount() === 0`, retorna.
        *   Chama `await storage.deleteItems(selectedItemIds())`.
        *   Trata sucesso/erro com `toast()`.
        *   Limpa a seleção: `rowSelection = {}`.
        *   Fecha o diálogo: `isDeleteDialogOpen = false`.
    *   `openBulkGroupDialog()`: Define `isBulkGroupDialogOpen = true`.
    *   `handleBulkGroupUpdate(event: CustomEvent<{ add?: string[], remove?: string[] }>)`:
        *   Obtém `updates = event.detail`.
        *   Se `selectedItemCount() === 0`, retorna.
        *   Chama `await storage.updateItemsGroups(selectedItemIds(), updates)`.
        *   Trata sucesso/erro com `toast()`.
        *   Limpa a seleção.
        *   Fecha o diálogo: `isBulkGroupDialogOpen = false`.
    *   `openBulkTagDialog()`: Define `isBulkTagDialogOpen = true`.
    *   `handleBulkTagUpdate(event: CustomEvent<{ add?: string[], remove?: string[] }>)`:
        *   Obtém `updates = event.detail`.
        *   Se `selectedItemCount() === 0`, retorna.
        *   Chama `await storage.updateItemsTags(selectedItemIds(), updates)`.
        *   Trata sucesso/erro com `toast()`.
        *   Limpa a seleção.
        *   Fecha o diálogo: `isBulkTagDialogOpen = false`.
    *   `handleBulkOpen(mode: 'current' | 'new' | 'incognito')`:
        *   Obtém `urls = selectedItemUrls()`. Se `urls.length === 0`, retorna.
        *   Usa `switch (mode)`:
            *   `case 'current'`: `urls.forEach((url, index) => chrome.tabs.create({ url, active: index === 0 }))` (Abre a primeira ativa, as outras em background).
            *   `case 'new'`: `chrome.windows.create({ url: urls })`.
            *   `case 'incognito'`: `chrome.windows.create({ url: urls, incognito: true })`.
        *   Exibe `toast()` informando sucesso e modo (ex: "{n} abas abertas na janela atual").
        *   Limpa a seleção.

*   **Feedback ao Usuário:** Usar `import { toast } from 'svelte-sonner';` e chamar `toast.success(...)` ou `toast.error(...)` nos handlers.

**4. Considerações Adicionais:**

*   **Performance:** Para muitas seleções (>100), as operações em `storage.ts` podem demorar. Exibir feedback de carregamento (ex: desabilitar botões, spinner no toast) pode ser necessário.
*   **Tratamento de Erros:** Envolver chamadas a `storage` e `chrome.windows/tabs` em blocos `try...catch` nos handlers para exibir toasts de erro detalhados. As funções do `storage` também devem logar erros.
*   **Consistência de Dados:** As funções de lote no `storage` devem garantir atomicidade ou, no mínimo, consistência eventual, especialmente para grupos.
*   **Permissões:** Verificar se a permissão `tabs` está no `manifest.json` para `chrome.tabs.create` e `chrome.windows.create`.

Este planejamento detalhado servirá como guia para a implementação da funcionalidade de ações em lote. 