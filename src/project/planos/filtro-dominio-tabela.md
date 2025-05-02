# Plano de Implementação: Filtro por Domínio na Coluna "Item"

Este documento descreve os passos para adicionar a funcionalidade de filtragem por domínio à coluna "Item" na tabela de itens salvos.

1.  **[✅] Criar Componente de Diálogo (`DomainFilterDialog.svelte`)**:
    *   Criar um novo arquivo em `src/options/components/DomainFilterDialog.svelte`.
    *   Utilizar componentes Shadcn-Svelte (`Dialog`, `Checkbox`, `Button`, `ScrollArea`, `Badge`).
    *   **Props:**
        *   `bind:open` (boolean): Controla a visibilidade do diálogo.
        *   `allItems` (SavedItem[]): Lista completa de itens para extrair domínios.
        *   `initialSelectedDomains` (string[]): Domínios atualmente selecionados.
        *   `onApply` (callback: `(selectedDomains: string[]) => void`): Chamado ao confirmar a seleção.
        *   `onClose` (callback: `() => void`): Chamado ao cancelar ou fechar.
    *   **Lógica Interna:**
        *   Implementar função `getDomain(url: string): string | null` para extrair o hostname da URL (lidar com URLs inválidas).
        *   Derivar uma lista de `{ domain: string, count: number }` a partir de `allItems`.
        *   Manter um estado interno (`$state`) para a seleção temporária de domínios dentro do diálogo.
        *   Exibir a lista de domínios com contagem e checkboxes para seleção.
        *   Botão "Aplicar Filtro": Chama `onApply` com os domínios selecionados no estado interno.
        *   Botão "Cancelar": Chama `onClose`.

2.  **[✅] Modificar Definição de Colunas (`columns.ts`)**:
    *   Localizar a definição da coluna `id: 'item'` no arquivo `src/options/views/table/columns.ts`.
    *   Na *segunda* definição de `header` para esta coluna (a que corresponde à linha de filtros), substituir o comentário `<!-- Sem filtro de coluna para Item -->` por um `renderComponent` que renderize um `Button`.
    *   Este botão deve:
        *   Exibir um ícone de funil (`Funnel`) ou similar.
        *   Exibir os domínios selecionados (como `Badge`) ou um indicador visual se um filtro de domínio estiver ativo.
        *   Ter um `onclick` que chama uma função (ex: `openDomainFilterDialog`) passada através de `table.options.meta`.
    *   Adicionar a propriedade `filterFn` à definição da coluna `item`.
    *   A `filterFn` deve:
        *   Extrair o domínio da `row.original.url`.
        *   Retornar `true` se o `filterValue` (array de domínios) estiver vazio.
        *   Retornar `true` se o domínio extraído estiver incluído no `filterValue`.
        *   Retornar `false` caso contrário.

3.  **[✅] Atualizar Componente da Tabela (`DataTable.svelte`)**:
    *   **Estado:**
        *   Adicionar estado para controlar a abertura do diálogo: `let isDomainFilterOpen = $state(false);`
        *   Adicionar estado para armazenar os domínios selecionados: `let selectedDomains = $state<string[]>([]);`
    *   **Funções:**
        *   Criar `openDomainFilterDialog`, `handleApplyDomainFilter`, `handleCloseDomainFilter`.
    *   **Meta:**
        *   Adicionar `openDomainFilterDialog` ao objeto `meta` na configuração `createSvelteTable`.
    *   **Template:**
        *   Importar e instanciar `<DomainFilterDialog>` com as props corretas.
    *   **Efeito (Opcional):** Resetar `selectedDomains` se `data` mudar.

4.  **[✅] Refinar e Testar**:
    *   Garantir que o botão na coluna "Item" mostre o estado do filtro.
    *   Verificar a extração de domínios.
    *   Testar a seleção/desseleção no diálogo.
    *   Confirmar que os botões "Aplicar" e "Cancelar" funcionam.
    *   Verificar a filtragem da tabela.
    *   Testar a limpeza do filtro.
    *   Verificar erros no console.

## Melhorias Adicionais no Filtro de Domínio

1.  **[ ] Atualizar `DomainFilterDialog.svelte` - Adicionar Campo de Busca:**
    *   Importar o componente `Input` de `../../lib/components/ui/input/index.js`.
    *   Adicionar um estado `$state` para a query de busca (ex: `let domainSearchQuery = $state('');`).
    *   Adicionar o componente `Input` no template, acima da `ScrollArea`.
    *   Vincular o valor do `Input` ao estado `domainSearchQuery` (`bind:value`).
    *   Modificar a função `calculateDomains` para incluir a filtragem pela `domainSearchQuery` (case-insensitive) na lista de domínios *antes* de retorná-la.

2.  **[ ] Atualizar `DomainFilterDialog.svelte` - Adicionar ToggleGroup Alfanumérico:**
    *   Importar `Root as ToggleGroupRoot` e `Item as ToggleGroupItem` de `../../lib/components/ui/toggle-group/index.js`.
    *   Definir um array com os caracteres de filtro (ex: `const alphaChars = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];`).
    *   Adicionar um estado `$state` para o caractere alfanumérico selecionado (ex: `let alphaFilter = $state<string | null>(null);`).
    *   Adicionar o `ToggleGroupRoot` (`type="single"`, `variant="outline"`, `size="sm"`) no template, possivelmente acima do campo de busca.
    *   Iterar sobre `alphaChars` para criar os `ToggleGroupItem`s, usando o caractere como `value`.
    *   Vincular o valor do `ToggleGroupRoot` ao estado `alphaFilter` (`bind:value`).
    *   Modificar a função `calculateDomains` para filtrar os domínios com base no `alphaFilter` *antes* de aplicar o filtro de busca.
        *   Se `alphaFilter` for uma letra, filtrar domínios que começam com essa letra (case-insensitive).
        *   Se `alphaFilter` for '#', filtrar domínios que começam com números ou símbolos.
        *   Se `alphaFilter` for `null`, não aplicar este filtro.

3.  **[ ] Refinar UI e Testar:**
    *   Ajustar layout do `Input` e `ToggleGroup`.
    *   Testar a filtragem por busca.
    *   Testar a filtragem pelo `ToggleGroup`.
    *   Testar a combinação dos dois filtros.
    *   Verificar a limpeza dos filtros.
    *   Garantir que a seleção/desseleção de domínios ainda funcione corretamente com a lista filtrada. 