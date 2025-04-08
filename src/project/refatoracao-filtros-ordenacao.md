# Plano Detalhado: Refatoração de Filtros e Ordenação

**Objetivo:** Refatorar o sistema de filtragem e ordenação de itens salvos na view `SavedItemsView.svelte` para torná-lo mais inteligente, flexível e com uma interface de usuário mais sofisticada e organizada.

**Abordagem:** Implementação faseada para gerenciar a complexidade.

---

## Fase 1: Fundação da UI (Sheet) e Melhorias Básicas de Filtro

**Meta:** Substituir a barra de filtros/ordenação atual por um painel `Sheet` dedicado e implementar a seleção múltipla de grupos.

**Passos:**

1.  **Implementar UI Dedicada (`Sheet`):**
    *   Em `SavedItemsView.svelte`, remover a `div` horizontal que contém os controles `Input[type=search]`, `Select` (Grupo), `DropdownMenu` (Tags), `Select` (Ordenar Por), `Select` (Direção).
    *   Manter o `Input[type=search]` visível na barra principal (acima da lista de cards/abas).
    *   Adicionar um `Button` com ícone `<Filter>` ao lado da barra de pesquisa.
    *   Importar e configurar os componentes `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter` de `shadcn-svelte`.
    *   Vincular o novo botão `<Filter>` ao `SheetTrigger`.
    *   Configurar o `Sheet` para abrir do lado direito (`side="right"`).

2.  **Mover Controles para o `Sheet`:**
    *   Dentro do `SheetContent`:
        *   Criar seções distintas (ex: usando `div` com `Separator`) para "Filtros" e "Ordenação".
        *   **Filtros:** Mover o `DropdownMenu` existente para seleção de Tags para esta seção.
        *   **Ordenação:** Mover os dois componentes `Select` (Critério e Direção) para esta seção.

3.  **Filtro de Grupos Multi-Select:**
    *   Dentro da seção "Filtros" do `Sheet`:
        *   Remover o `Select` antigo de grupos.
        *   Adicionar um `DropdownMenu` similar ao de Tags, usando `DropdownMenu.CheckboxItem` para cada grupo listado em `$groups`.
        *   Incluir opções "Todos os Grupos" (que limpa `selectedGroup`) e "Sem Grupo" (`NO_GROUP`).
        *   Garantir que o estado `$state selectedGroup` seja tratado corretamente como `string[]`.
        *   Modificar a função `filterItems`:
            *   A condição `matchesGroup` deve verificar se `item.groupIds` contém *pelo menos um* dos IDs em `selectedGroup` (lógica OR), *a menos que* "Todos os Grupos" esteja implícito (array `selectedGroup` vazio) ou "Sem Grupo" esteja selecionado.
            *   Lógica exemplo:
                ```javascript
                let matchesGroup = true; // Default to true if no group filter
                if (selectedGroup.length > 0) {
                  if (selectedGroup.includes('NO_GROUP')) {
                    matchesGroup = !item.groupIds || item.groupIds.length === 0;
                  } else {
                    matchesGroup = item.groupIds && item.groupIds.some(gId => selectedGroup.includes(gId));
                  }
                }
                ```

4.  **Botão "Limpar Filtros":**
    *   Adicionar um `Button` (talvez no `SheetFooter` ou no topo da seção "Filtros") com o texto "Limpar Filtros/Ordenação".
    *   O `onclick` deste botão deve resetar os estados relevantes:
        *   `searchQuery = ""`
        *   `selectedGroup = []`
        *   `selectedTags = []`
        *   `sortCriteria = ["dateAdded"]` (ou o padrão desejado)
        *   `sortDirection = ["desc"]` (ou o padrão desejado)

5.  **Exibição Básica de Filtros Ativos:**
    *   Em `SavedItemsView.svelte`, abaixo da barra de pesquisa/botão `<Filter>` e acima da área de cards (`Tabs.Content` ou a `div` que contém `SavedItemsCardView`), adicionar uma `div`.
    *   Criar uma função ou `$derived` que gere uma string resumindo os filtros ativos. Ex:
        ```javascript
        let activeFiltersSummary = $derived(() => {
          let parts = [];
          if (searchQuery) parts.push(`Busca: "${searchQuery}"`);
          if (selectedGroup.length > 0) {
             if (selectedGroup.includes('NO_GROUP')) parts.push("Grupo: Sem Grupo");
             else parts.push(`Grupos: ${selectedGroup.map(gId => $groups.find(g=>g.id===gId)?.name || '?').join(', ')}`);
          }
          if (selectedTags.length > 0) parts.push(`Tags: ${selectedTags.join(', ')}`);
          if (parts.length === 0) return ""; // Nenhum filtro ativo
          return `Filtrando por: ${parts.join(' | ')}.`;
        });
        ```
    *   Renderizar essa string (`activeFiltersSummary`) dentro da `div`. Adicionar estilo (`text-xs`, `text-muted-foreground`, etc.).

---

## Fase 2: Componentes Avançados (Command, DatePicker) e Pills Removíveis

**Meta:** Substituir os seletores de Grupo/Tag por `Command` para busca, adicionar filtro de data e exibir filtros ativos como pills removíveis.

**Passos:**

1.  **Implementar `Command`:**
    *   Substituir os `DropdownMenu` de Grupos e Tags no `Sheet` pelo componente `Command` de `shadcn-svelte`.
    *   Configurar `CommandInput` para busca e `CommandList` com `CommandItem` (usando `Checkbox` interno ou lógica de seleção) para grupos e tags.
2.  **Implementar `DatePicker`:**
    *   Adicionar componente `DatePicker` (provavelmente `DateRangePicker` de `shadcn-svelte/range-calendar`) na seção "Filtros" do `Sheet`.
    *   Adicionar estado `$state` para o intervalo de datas selecionado.
    *   Modificar `filterItems` para incluir a lógica de filtro por data (Data de Adição ou Data Agendada, a definir).
3.  **Pills Removíveis (Filtros Ativos):**
    *   Substituir a string `activeFiltersSummary` por uma `div` que renderiza componentes `Badge` (com variante `secondary` ou `outline`) para cada filtro ativo (Busca, cada Grupo, cada Tag, Intervalo de Datas).
    *   Cada `Badge` deve ter um botão 'X' (`lucide-svelte/X`) que, ao ser clicado, remove o filtro correspondente (limpa `searchQuery`, remove do array `selectedGroup`/`selectedTags`, limpa datas).

---

## Fase 3: Lógica Avançada (Busca em Tags, Filtro OR/Negativo)

**Meta:** Expandir as capacidades de busca e filtragem.

**Passos:**

1.  **Busca em Tags com `ToggleGroup`:**
    *   Adicionar um `ToggleGroup` (de `shadcn-svelte`) próximo à barra de pesquisa principal, com opções como "Título/URL/Comentários" (padrão), "Tags", "Grupos".
    *   Modificar a lógica de `filterItems` para considerar o estado do `ToggleGroup` e incluir busca nos campos `item.tags` ou `item.groupIds` (pelo nome do grupo) quando as respectivas opções estiverem ativas.
2.  **Lógica OR para Tags:**
    *   Adicionar um `Switch` ou `ToggleGroup` na seção de Tags do `Sheet` para alternar entre lógica "E" (padrão atual) e "OU".
    *   Modificar a condição `matchesTags` em `filterItems` para usar `tags.some(...)` (lógica OU) quando apropriado.
3.  **Filtros Negativos:**
    *   Definir como o usuário indicará um filtro negativo (ex: prefixo `-` na busca do `Command`? Opção "não contém" no `DropdownMenu`/`Command`?).
    *   Modificar `filterItems` para lidar com a lógica de exclusão para grupos e tags.

---

## Fase 4: Ordenação Múltipla

**Meta:** Permitir ao usuário ordenar por mais de um critério.

**Passos:**

1.  **UI de Ordenação:** Modificar a UI na seção "Ordenação" do `Sheet` para permitir adicionar/remover/reordenar múltiplos critérios de ordenação (cada um com sua direção). (Ex: Lista reordenável de `Select`s).
2.  **Lógica de Ordenação:** Modificar a função `sortItems` para iterar sobre a lista de critérios de ordenação. Se a comparação para o primeiro critério for 0, passar para o próximo, e assim por diante.

---

## Fase 5: Persistência de Filtros

**Meta:** Salvar as configurações de filtro/ordenação do usuário.

**Passos:**

1.  **Salvar Estado Atual:** Usar `chrome.storage.sync` ou `local` para salvar o estado das variáveis (`searchQuery`, `selectedGroup`, `selectedTags`, `sortCriteria`, `sortDirection`, filtro de data, lógica AND/OR, etc.) sempre que forem modificados.
2.  **Carregar Estado:** Ao montar `SavedItemsView`, carregar os valores salvos e aplicá-los aos estados `$state`.
3.  **(Opcional) Filtros Nomeados:** Implementar UI (talvez no `Sheet`) para salvar o conjunto atual de filtros/ordenação com um nome e depois carregar rapidamente esses conjuntos salvos.

---

**Considerações Gerais:**

*   **Testes:** Testar exaustivamente cada fase antes de prosseguir para a próxima.
*   **Performance:** Monitorar a performance da filtragem/ordenação com um número crescente de itens, especialmente ao introduzir lógicas mais complexas. O uso de `$derived` ajuda, mas a complexidade das funções `filterItems` e `sortItems` é crucial.
*   **Componentização:** Extrair partes da UI (ex: seleção de grupos/tags no `Sheet`, pills de filtros ativos) para componentes menores se a complexidade aumentar. 