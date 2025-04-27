# Plano de Implementação: Paginação na Tabela de Itens Salvos

Este documento detalha os passos para implementar a funcionalidade de paginação na `DataTable.svelte`, utilizando a abordagem de paginação no lado do cliente (client-side) do TanStack Table, integrada com Svelte 5 e Shadcn-Svelte.

**Objetivo:** Adicionar controles de navegação entre páginas e seleção de tamanho de página, mantendo a compatibilidade com as funcionalidades existentes (filtragem, ordenação, seleção, expansão, ações em lote).

**Abordagem:** Paginação Client-Side. O componente `SavedItemsView.svelte` já fornece os dados filtrados e ordenados (`sortedItems`) para a `DataTable.svelte`.

**Passos Detalhados:**

1.  **Atualizar Configuração do TanStack Table em `DataTable.svelte`:**
    *   **Importar Módulos:**
        *   Adicionar `getPaginationRowModel` de `@tanstack/table-core`.
        *   Adicionar `PaginationState` de `@tanstack/table-core` (para tipagem).
        ```typescript
        import { 
          // ... outros imports ...
          getPaginationRowModel, 
          type PaginationState 
        } from '@tanstack/table-core';
        ```
    *   **Habilitar Modelo de Paginação:**
        *   Incluir `getPaginationRowModel: getPaginationRowModel()` nas opções de `createSvelteTable`.
    *   **Gerenciar Estado de Paginação:**
        *   Definir estado `$state` para `pagination`:
            ```typescript
            let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 25 }); // Exemplo: 25 itens/página
            ```
        *   Passar `pagination` para a opção `state` da tabela:
            ```typescript
            state: {
              // ... outros estados ...
              get pagination() { return pagination; }, 
            },
            ```
        *   Implementar `onPaginationChange` para atualizar o estado local:
            ```typescript
            onPaginationChange: (updater) => {
              if (typeof updater === 'function') {
                pagination = updater(pagination);
              } else {
                pagination = updater;
              }
            },
            ```
    *   **`autoResetPageIndex`:** Manter o comportamento padrão (implícito `true`) para resetar para a página 1 ao filtrar/ordenar.

2.  **Implementar Controles de UI no Rodapé da `DataTable.svelte`:**
    *   **Localização:** No `div` de rodapé existente.
    *   **Estrutura (Flexbox):**
        *   Esquerda: Contagem de itens selecionados/exibidos (lógica atual).
        *   Direita: Novos controles de paginação.
    *   **Controles (Usar componentes Shadcn-Svelte):**
        *   **Seleção de Tamanho de Página (`<Select.Root>`):**
            *   Opções: [10, 25, 50, 100].
            *   Vincular valor a `table.getState().pagination.pageSize`.
            *   Chamar `table.setPageSize(Number(novoValor))` na mudança.
        *   **Indicador de Página:**
            *   Texto: `Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}`.
        *   **Botões de Navegação (`<Button>`):**
            *   Primeira (`<<`): `onclick={table.firstPage}`, `disabled={!table.getCanPreviousPage()}`.
            *   Anterior (`<`): `onclick={table.previousPage}`, `disabled={!table.getCanPreviousPage()}`.
            *   Próxima (`>`): `onclick={table.nextPage}`, `disabled={!table.getCanNextPage()}`.
            *   Última (`>>`): `onclick={table.lastPage}`, `disabled={!table.getCanNextPage()}`.

3.  **Garantir Compatibilidade:**
    *   **Filtragem/Ordenação:** Paginação opera sobre os dados já processados. `autoResetPageIndex` lida com resets.
    *   **Seleção (`rowSelection`):** Deve persistir entre páginas.
    *   **Ações em Lote:** Devem continuar operando sobre *todos* os itens selecionados, independentemente da página atual.
    *   **Expansão (`expanded`):** Deve persistir entre páginas.

4.  **Ajustes e Testes:**
    *   Verificar consistência visual dos novos controles.
    *   Testar navegação, mudança de tamanho de página, desabilitação de botões.
    *   Testar interações com filtros, ordenação, seleção, ações em lote.
    *   Confirmar a precisão da contagem de itens no rodapé.

**Arquivos Principais a Modificar:**

*   `src/options/views/table/DataTable.svelte`

**Próximo Passo:** Iniciar a implementação conforme este plano. 