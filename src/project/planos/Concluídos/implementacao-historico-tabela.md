# Plano de Implementação - Visualização de Histórico (Pré-busca)

Este documento detalha os passos para implementar a funcionalidade de visualização do histórico de visitas na linha expandida da tabela, usando uma estratégia de pré-busca ao expandir a linha.

## Passos

1.  **Permissões:**
    *   [x] Verificar e adicionar a permissão `"history"` ao array `permissions` no arquivo `manifest.json`.
2.  **Tipos:**
    *   [x] Definir a interface `VisitItem` e `VisitTransition` em `src/types.ts`.
    *   [x] ~~Adicionar o campo opcional `visitHistory?: VisitItem[];` à interface `SavedItem` em `src/types.ts`.~~ -> Removido, não mais necessário.
3.  **Armazenamento (População de Dados):**
    *   [x] ~~Localizar a função/lógica responsável por **salvar um novo `SavedItem`**. -> Identificado em `SaveItemForm.svelte` (`handleSave`).~~
    *   [x] ~~Modificar essa lógica para buscar e armazenar o histórico.~~ -> Revertido. O histórico não será armazenado com o item.
4.  **Pré-busca (`DataTable.svelte`):**
    *   [x] Adicionar estado `prefetchedHistories` para armazenar status e dados do histórico por `itemId`.
    *   [x] Implementar `$effect` que reage à expansão de linhas (`table.getState().expanded`).
    *   [x] Dentro do `$effect`, para cada linha recém-expandida e sem histórico pré-buscado:
        *   [x] Obter a URL do item.
        *   [x] Atualizar `prefetchedHistories[itemId]` para `{ status: 'loading' }`.
        *   [x] Chamar `chrome.history.getVisits`.
        *   [x] No callback, atualizar `prefetchedHistories[itemId]` com `{ status: 'loaded', data: [...] }` ou `{ status: 'error', error: '...' }`.
    *   [x] Passar `prefetchedHistories[row.original.id]` como prop `historyFetchResult` para `ExpandedRowView`.
5.  **Interface (Modificação do `ExpandedRowView.svelte`):**
    *   [x] **Habilitar o botão "Histórico"**: Remover o atributo `disabled`.
    *   [x] **Remover busca interna**: Eliminar estados (`isLoadingHistory`, etc.) e `$effect` de busca.
    *   [x] **Adicionar prop**: Receber `historyFetchResult` do `DataTable`.
    *   [x] **Implementar exibição**: Atualizar a seção "Histórico" para mostrar:
        *   [x] Indicador de carregamento se `status === 'loading'`.
        *   [x] Mensagem de erro se `status === 'error'`.
        *   [x] Lista de histórico formatada se `status === 'loaded'` e `data` existe.
        *   [x] Mensagem de "Nenhum histórico" se `status === 'loaded'` mas `data` está vazio.
        *   [x] Mensagem padrão se `status` for `idle` ou `undefined`.
6.  **Testes:**
    *   [ ] Expandir uma linha e verificar se a busca de histórico é iniciada (via console.log).
    *   [ ] Clicar na aba "Histórico" e verificar se o estado de carregamento é exibido corretamente.
    *   [ ] Verificar se a lista de histórico é exibida após o carregamento.
    *   [ ] Validar a formatação das datas/horas.
    *   [ ] Testar com itens que não têm histórico (URLs não visitadas).
    *   [ ] Testar o que acontece se a permissão `"history"` não for concedida (deve mostrar erro).
    *   [ ] Expandir múltiplas linhas e verificar se a pré-busca funciona para todas.
    *   [ ] Colapsar uma linha e verificar se o histórico (opcionalmente) é limpo do estado `prefetchedHistories`.

*Última atualização: 2025-05-01* 