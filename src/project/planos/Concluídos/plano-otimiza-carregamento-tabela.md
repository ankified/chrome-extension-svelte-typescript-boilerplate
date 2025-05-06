# Plano de Ação: Melhorias na Aplicação

## Fase 1: Melhorar Performance de Inicialização da Tabela

**Objetivo:** Reduzir ou mascarar o tempo em que a tabela exibe "Nenhum resultado" enquanto os dados estão sendo carregados.

**Estratégia:** Indicador de Carregamento no DataTable.

*   [ ] **`src/options/views/table/DataTable.svelte`:**
    *   [ ] Adicionar um estado local (ex: `isLoadingInitialData = $state(true)`).
    *   [ ] Usar um `$effect` para observar a prop `data`. Quando `data` receber itens pela primeira vez (ou seja, passar de um array vazio ou `undefined` para um array com itens), ou se `data` já vier com itens na primeira renderização, definir `isLoadingInitialData` para `false`. É importante também considerar o caso em que `data` pode ser `undefined` inicialmente antes de se tornar um array.
    *   [ ] No template, se `isLoadingInitialData` for `true`, exibir um componente/mensagem de carregamento (ex: "Carregando dados..." ou um spinner). Pode-se usar um componente como `<Spinner />` se disponível em `shadcn-svelte`, ou um simples texto.
    *   [ ] A mensagem "Nenhum resultado encontrado." deve ser exibida somente quando `isLoadingInitialData` for `false` E `data` estiver realmente vazio (ou `undefined`).

## Fase 2: Placeholder para Favicons Ausentes

**Objetivo:** Exibir um ícone genérico ou um placeholder visual quando o URL do favicon de um `SavedItem` não puder ser carregado ou estiver ausente.

*   [ ] **`src/options/views/table/ItemCell.svelte`:**
    *   [ ] Adicionar um estado local (ex: `faviconError = $state(false)`).
    *   [ ] Na tag `<img>` do favicon, adicionar o manipulador de evento `onerror={() => faviconError = true}`.
    *   [ ] No template, usar uma condicional para exibir a imagem ou o placeholder:
        *   Se `item.favicon` (ou o `faviconUrl` derivado) existir E `!faviconError`, exibir a `<img>`.
        *   Caso contrário (se `item.favicon` for nulo/vazio OU `faviconError` for `true`), exibir um ícone de placeholder (ex: `<Bookmark class="w-10 h-10 text-muted-foreground" />` de `lucide-svelte` ou um componente de placeholder customizado).
    *   [ ] Resetar `faviconError` para `false` quando a prop `item` (especificamente `item.url` ou `item.favicon` que afeta `faviconUrl`) mudar. Isso pode ser feito com um `$effect` que observa `faviconUrl()`:
        ```ts
        $effect(() => {
          // Reseta o erro sempre que a URL do favicon mudar
          faviconError = false;
          // Opcional: se a URL for a do google favicons e não houver item.favicon,
          // poderíamos assumir um erro potencial mais cedo, mas o onerror é mais robusto.
        });
        ```
    *   [ ] Considerar o caso em que `faviconUrl()` pode ser a URL do Google Favicons. O `onerror` tratará falhas de carregamento dessa URL também. 