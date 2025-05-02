# Plano de Implementação - Menu de Opções Gerais da Tabela

Este documento detalha os passos para implementar o menu de opções gerais no cabeçalho da tabela de itens salvos, conforme definido em `progresso-visualizacao-tabela.md` e `plano-acoes-prioritarias.md`.

## Tarefa Geral

- [ ] **Implementar menu de opções gerais**
    - [ ] Selecionar quais colunas serão exibidas;
    - [ ] Remover todos os itens do banco de dados;
    - [ ] Gerenciamento global de grupos;
    - [ ] Gerenciamento global de tags;

## Análise Prévia

*   **Componentes Principais Envolvidos:** `DataTable.svelte`, `DropdownMenuHeaderButton.svelte`, `SavedItemsTableView.svelte`, `SavedItemsView.svelte`, `ManageGroupsDialog.svelte`, `ManageTagsDialog.svelte`.
*   **Lógica Existente:** `DataTable.svelte` já possui controle de visibilidade de colunas e lógica de ações em lote. `SavedItemsView.svelte` já renderiza e controla os diálogos de gerenciamento global (`ManageGroupsDialog`, `ManageTagsDialog`) e passa callbacks para o `FilterSheet.svelte`.
*   **Refatoração Necessária:** `ManageGroupsDialog.svelte` precisa ser refatorado para remover a dependência de um `item` específico e operar de forma puramente global, utilizando os callbacks já fornecidos por `SavedItemsView.svelte`.
*   **Estratégia de Estado:** Utilizar um store central (`src/lib/stores/uiState.ts`) para gerenciar o estado de abertura dos diálogos globais (`showManageGroupsDialog`, `showManageTagsDialog`), permitindo que tanto o `FilterSheet` (via `SavedItemsView`) quanto o novo menu da tabela controlem sua visibilidade sem prop drilling excessivo.

## Plano Detalhado

1.  **[✅] Criar Store de Estado da UI:**
    *   **Arquivo:** `src/lib/stores/uiState.ts` (novo)
    *   **Ação:** Criar um arquivo de store Svelte 5 (`.svelte.ts`) exportando estados reativos para controlar a visibilidade dos diálogos globais:
        ```typescript
        // src/lib/stores/uiState.ts
        export const showManageGroupsDialog = $state(false);
        export const showManageTagsDialog = $state(false);
        ```

2.  **[✅] Refatorar `SavedItemsView` para usar o Store:**
    *   **Arquivo:** `src/options/views/SavedItemsView.svelte`
    *   **Ação:**
        *   Remover as variáveis de estado locais `showManageGroupsDialog` e `showManageTagsDialog`.
        *   Importar `showManageGroupsDialog`, `showManageTagsDialog` do novo store `uiState`.
        *   Modificar as funções `handleOpenManageGroupsDialog` e `handleOpenManageTagsDialog` para alterar os valores no store (ex: `uiState.showManageGroupsDialog = true`).
        *   Atualizar a prop `bind:open` nos componentes `<ManageGroupsDialog>` e `<ManageTagsDialog>` para usar os valores do store `uiState`.

3.  **[✅] Refatorar `ManageGroupsDialog`:**
    *   **Arquivo:** `src/options/components/ManageGroupsDialog.svelte`
    *   **Ação:**
        *   Remover a prop `item`.
        *   Remover a lógica interna dependente da prop `item` (ex: `addItemToGroup`, `removeItemFromGroup`).
        *   Garantir que o componente utilize corretamente os callbacks globais recebidos (`onCreate`, `onUpdate`, `onDelete`, `onDeleteAll`).
        *   Atualizar a prop `bind:open` para usar `uiState.showManageGroupsDialog` (será indiretamente via `SavedItemsView`, que usa o store).

4.  **[✅] Integrar Botão de Gatilho no Cabeçalho da Tabela:**
    *   **Arquivos:** `src/options/views/table/columns.ts` (ou onde as colunas são definidas), `src/options/views/table/DataTable.svelte`.
    *   **Ação:**
        *   Identificar a coluna de cabeçalho apropriada (ex: última coluna, coluna de ações) ou criar uma nova coluna pequena e vazia.
        *   Modificar a definição da célula do cabeçalho (`header`) dessa coluna para renderizar o componente `<DropdownMenuHeaderButton />` usando `FlexRender`.
        *   Passar a instância `table` (obtida com `createSvelteTable` em `DataTable.svelte`) como prop para o `DropdownMenuHeaderButton`.

5.  **[✅] Implementar Seleção de Visibilidade de Colunas:**
    *   **Arquivo:** `src/options/views/table/DropdownMenuHeaderButton.svelte`
    *   **Ação:**
        *   Receber a instância `table` como prop.
        *   Obter as colunas com `table.getAllLeafColumns()`.
        *   Filtrar colunas não ocultáveis (ex: seleção, expansão, coluna do menu).
        *   Gerar `DropdownMenu.CheckboxItem` para cada coluna ocultável.
        *   Vincular (`bind:checked`) cada item a `column.getIsVisible()`.
        *   No `onCheckedChange` (ou via `bind:checked`), chamar `column.toggleVisibility(checkedState)`.
        *   Adicionar `DropdownMenu.Separator` antes dos itens de coluna.

6.  **[✅] Implementar "Remover Todos os Itens":**
    *   **Arquivos:** `src/options/views/table/DropdownMenuHeaderButton.svelte`, `src/options/views/table/DataTable.svelte`, `src/storage.ts`.
    *   **Ação:**
        *   **`DropdownMenuHeaderButton`**: Adicionar `DropdownMenu.Item` (ex: "Remover Todos", com classe destrutiva). Este item chamará uma função passada por prop de `DataTable`.
        *   **`DataTable`**:
            *   Criar estado `$state` (ex: `isDeleteAllConfirmOpen = false`) para controlar um novo `AlertDialog`.
            *   Criar função (`openDeleteAllDialog`) para definir `isDeleteAllConfirmOpen = true` e passá-la como prop para `DropdownMenuHeaderButton`.
            *   Renderizar um `AlertDialog` para confirmação, vinculado a `isDeleteAllConfirmOpen`.
            *   A ação de confirmação no `AlertDialog` chamará `storage.deleteAllItems()`.
        *   **`storage.ts`**: Criar e exportar a função `async deleteAllItems()` que remove a chave `savedItems` (e potencialmente outras relacionadas, como limpar referências em grupos/tags se necessário) do `chrome.storage.local`.
        *   Adicionar `DropdownMenu.Separator` antes desta opção.

7.  **[✅] Implementar Link "Gerenciar Grupos":**
    *   **Arquivo:** `src/options/views/table/DropdownMenuHeaderButton.svelte`
    *   **Ação:**
        *   Adicionar `DropdownMenu.Item` "Gerenciar Grupos".
        *   Importar `showManageGroupsDialog` do store `uiState`.
        *   No clique do item, definir `uiState.showManageGroupsDialog = true`.

8.  **[✅] Implementar Link "Gerenciar Tags":**
    *   **Arquivo:** `src/options/views/table/DropdownMenuHeaderButton.svelte`
    *   **Ação:**
        *   Adicionar `DropdownMenu.Item` "Gerenciar Tags".
        *   Importar `showManageTagsDialog` do store `uiState`.
        *   No clique do item, definir `uiState.showManageTagsDialog = true`.

9.  **[✅] Refinamentos e Testes:**
    *   **Arquivo:** `src/options/views/table/DropdownMenuHeaderButton.svelte`
    *   **Ação:** Organizar os itens no menu com `DropdownMenu.Separator` (Visibilidade, Gerenciamento, Ações Destrutivas).
    *   Testar a abertura dos diálogos a partir do novo menu.
    *   Testar a seleção de visibilidade das colunas.
    *   Testar a função de remover todos os itens.
    *   Verificar se os diálogos ainda funcionam corretamente quando abertos pelo `FilterSheet`. 