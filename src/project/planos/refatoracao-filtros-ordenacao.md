# Plano Detalhado: Refatoração de Filtros e Ordenação

**Objetivo:** Refatorar o sistema de filtragem e ordenação de itens salvos na view `SavedItemsView.svelte` para torná-lo mais inteligente, flexível e com uma interface de usuário mais sofisticada e organizada.

**Abordagem:** Implementação faseada para gerenciar a complexidade.

---

## Fase 1: Fundação da UI (Sheet) e Melhorias Básicas de Filtro (CONCLUÍDO - 2025-04-09)

**Meta:** Substituir a barra de filtros/ordenação atual por um painel `Sheet` dedicado e implementar a seleção múltipla de grupos.

**Passos:**

~~1.  **Implementar UI Dedicada (`Sheet`):**~~
    *   ~~Em `SavedItemsView.svelte`, remover a `div` horizontal que contém os controles `Input[type=search]`, `Select` (Grupo), `DropdownMenu` (Tags), `Select` (Ordenar Por), `Select` (Direção).~~
    *   ~~Manter o `Input[type=search]` visível na barra principal (acima da lista de cards/abas).~~
    *   ~~Adicionar um `Button` com ícone `<Filter>` ao lado da barra de pesquisa.~~
    *   ~~Importar e configurar os componentes `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter` de `shadcn-svelte`.~~
    *   ~~Vincular o novo botão `<Filter>` ao `SheetTrigger`.~~
    *   ~~Configurar o `Sheet` para abrir do lado direito (`side="right"`).~~

~~2.  **Mover Controles para o `Sheet`:**~~
    *   ~~Dentro do `SheetContent`.~~
        *   ~~Criar seções distintas (ex: usando `div` com `Separator`) para "Filtros" e "Ordenação".~~
        *   ~~**Filtros:** Mover o `DropdownMenu` existente para seleção de Tags para esta seção.~~
        *   ~~**Ordenação:** Mover os dois componentes `Select` (Critério e Direção) para esta seção.~~

~~3.  **Filtro de Grupos Multi-Select:**~~
    *   ~~Dentro da seção "Filtros" do `Sheet`.~~
        *   ~~Remover o `Select` antigo de grupos.~~
        *   ~~Adicionar um `DropdownMenu` similar ao de Tags, usando `DropdownMenu.CheckboxItem` para cada grupo listado em `$groups`. (Nota: Implementado posteriormente com `Command.Dialog`)~~
        *   ~~Incluir opções "Todos os Grupos" (que limpa `selectedGroup`) e "Sem Grupo" (`NO_GROUP`).~~
        *   ~~Garantir que o estado `$state selectedGroup` seja tratado corretamente como `string[]`.~~
        *   ~~Modificar a função `filterItems`:~~
            *   ~~A condição `matchesGroup` deve verificar se `item.groupIds` contém *pelo menos um* dos IDs em `selectedGroup` (lógica OR), *a menos que* "Todos os Grupos" esteja implícito (array `selectedGroup` vazio) ou "Sem Grupo" esteja selecionado.~~
            *   ~~Lógica exemplo: implementada.~~

~~4.  **Botão "Limpar Filtros":**~~
    *   ~~Adicionar um `Button` (talvez no `SheetFooter` ou no topo da seção "Filtros") com o texto "Limpar Filtros/Ordenação".~~
    *   ~~O `onclick` deste botão deve resetar os estados relevantes.~~
        *   ~~`searchQuery = ""`~~
        *   ~~`selectedGroup = []`~~
        *   ~~`selectedTags = []`~~
        *   ~~`sortCriteria = ["dateAdded"]`~~
        *   ~~`sortDirection = ["desc"]`~~

~~5.  **Exibição Básica de Filtros Ativos:**~~
    *   ~~Em `SavedItemsView.svelte`, abaixo da barra de pesquisa/botão `<Filter>` e acima da área de cards (`Tabs.Content` ou a `div` que contém `SavedItemsCardView`), adicionar uma `div`.~~
    *   ~~Criar uma função ou `$derived` que gere uma string resumindo os filtros ativos. (Nota: Implementado posteriormente com Badges/Pills individuais).~~
    *   ~~Renderizar essa string (`activeFiltersSummary`) dentro da `div`. Adicionar estilo (`text-xs`, `text-muted-foreground`, etc.).~~

**Notas Adicionais (Fase 1):**
- Durante esta fase, o próprio `Sheet` foi extraído para um componente dedicado (`FilterSheet.svelte`) para melhorar a modularidade (2025-04-11).

---

## Fase 2: Componentes Avançados (Command, DatePicker) e Pills Removíveis (CONCLUÍDO - 2025-04-09)

**Meta:** Substituir os seletores de Grupo/Tag por `Command` para busca, adicionar filtro de data e exibir filtros ativos como pills removíveis.

**Passos:**

~~1.  **Implementar `Command`:**~~
    *   ~~Substituir os `DropdownMenu` de Grupos e Tags no `Sheet` pelo componente `Command` de `shadcn-svelte` (Nota: Implementado como `Command.Dialog` acionado por botão no `Sheet`).~~
    *   ~~Configurar `CommandInput` para busca e `CommandList` com `CommandItem` (usando `Checkbox` interno) para grupos e tags.~~
~~2.  **Implementar `DatePicker`:**~~
    *   ~~Adicionar componente `DatePicker` (`RangeCalendar` em `Popover`) na seção "Filtros" do `Sheet`.~~
    *   ~~Adicionar estado `$state selectedDateRange`.~~
    *   ~~Modificar `filterItems` para incluir a lógica de filtro por data (usando `dateAdded`).~~
~~3.  **Pills Removíveis (Filtros Ativos):**~~
    *   ~~Substituir a string `activeFiltersSummary` por uma `div` que renderiza componentes `Badge` para cada filtro ativo (Busca, Grupo, Tag, Data).~~
    *   ~~Cada `Badge` deve ter um botão 'X' que remove o filtro correspondente (limpa busca, remove grupo/tag individual, limpa datas).~~

---

## Fase 3: Lógica Avançada (Busca em Tags, Filtro OR/Negativo)

**Meta:** Expandir as capacidades de busca e filtragem.

**Passos:**

~~1.  **Busca em Tags com `ToggleGroup`:**~~ (CONCLUÍDO - 2025-04-09)
    *   ~~Adicionar um `ToggleGroup` (de `shadcn-svelte`) próximo à barra de pesquisa principal, com opções como "Título/URL/Comentários" (padrão), "Tags", "Grupos".~~
    *   ~~Modificar a lógica de `filterItems` para considerar o estado do `ToggleGroup` e incluir busca nos campos `item.tags` ou `item.groupIds` (pelo nome do grupo) quando as respectivas opções estiverem ativas.~~
~~2.  **Lógica OR para Tags:**~~ (CONCLUÍDO - 2025-04-11)
    *   ~~Adicionar um `Switch` ou `ToggleGroup` na seção de Tags do `Sheet` para alternar entre lógica "E" (padrão atual) e "OU".~~
    *   ~~Modificar a condição `matchesTags` em `filterItems` para usar `tags.some(...)` (lógica OU) quando apropriado.~~
~~3.  **Filtros Negativos:**~~ (CONCLUÍDO - 2025-04-11)
    *   ~~Definir como o usuário indicará um filtro negativo (ex: prefixo `-` na busca do `Command`? Opção "não contém" no `DropdownMenu`/`Command`?).~~
    *   ~~Modificar `filterItems` para lidar com a lógica de exclusão para grupos e tags.~~

---

## Fase 4: Ordenação Múltipla (CONCLUÍDO - 2025-04-14)

**Meta:** Permitir ao usuário ordenar por mais de um critério com regras de seleção inteligentes.

**Passos:**

~~1.  **UI de Ordenação:** Modificar a UI na seção "Ordenação" do `Sheet` para permitir adicionar/remover/reordenar múltiplos critérios de ordenação (cada um com sua direção).~~
    *   ~~Implementado em `FilterSheet.svelte` usando um loop `#each` para os `sortDescriptors`.~~
    *   ~~Botão "+" adicionado ao cabeçalho da seção.~~
    *   ~~Botão "Remover" adicionado a cada nível (exceto o último).~~
    *   ~~Níveis contidos em uma `ScrollArea`.~~
~~2.  **Lógica de Ordenação:** Modificar a função `sortItems` para iterar sobre a lista de critérios de ordenação. Se a comparação para o primeiro critério for 0, passar para o próximo, e assim por diante.~~
    *   ~~Lógica já existente em `sortItems` em `SavedItemsView.svelte` (agora recomendada para refatoração para `src/utils/sorting.ts`).~~
3.  **Melhorias na Seleção de Critérios:**
    *   ~~Implementada exclusão mútua para os pares "Data Adição"/"Data Agendada" e "Título"/"URL" (opções desabilitadas no `<Select.Item>`).~~
    *   ~~Implementada prevenção de repetição (critério já selecionado em outro nível é desabilitado).~~
    *   ~~Removido critério padrão ("Título") ao adicionar novo nível; agora exibe placeholder "Critério...".~~

4.  **Agrupamento Visual por Data:** (CONCLUÍDO - 2025-04-15)
    *   ~~Implementado agrupamento visual por data na visualização de cards quando o critério primário é `dateAdded` ou `scheduledDate`.~~
    *   ~~A lógica de agrupamento utiliza categorias relativas (Hoje, Ontem, Esta Semana, etc.) e agrupa corretamente por mês/ano para datas antigas.~~
    *   ~~A sub-ordenação dentro de cada grupo respeita os critérios secundários e terciários definidos pelo usuário.~~
    *   ~~O utilitário `getSortedDateGroupKeys` foi aprimorado para aceitar a direção de ordenação e inverter a ordem dos grupos conforme o usuário alterna entre ascendente/descendente.~~
    *   ~~O componente de visualização de cards foi atualizado para passar a direção correta ao utilitário de agrupamento.~~
    *   ~~Refatoração para uso correto de `$derived` em Svelte 5, eliminando autodependências e problemas de reatividade.~~
    *   ~~Ajustes de tipagem explícita para garantir compatibilidade com TypeScript e Svelte 5.~~
    *   ~~Correção de diversos erros de linter relacionados a stores, reatividade e tipagem.~~
    *   **Novidade (2025-04-15 19:29:36):** Os tooltips dos títulos dos grupos de data agora exibem o intervalo real de datas para todos os agrupamentos, incluindo grupos dinâmicos de mês (ex: "Abril de 2025") e ano (ex: "2024"). Veja registro detalhado no diário.

**Próximos Passos:**
- Refinar estilos visuais dos títulos dos grupos de data.
- Adicionar tooltips ou informações complementares nos agrupamentos.
- Implementar visualização Kanban e Fluxo.
- Realizar testes de performance com grandes volumes de dados.

---

## Fase 5: Persistência de Filtros (CONCLUÍDO - 2025-04-12)

**Meta:** Salvar as configurações de filtro/ordenação do usuário.

**Passos:**

~~1.  **Salvar Estado Atual:** Usar `chrome.storage.sync` ou `local` para salvar o estado das variáveis (`searchQuery`, `selectedGroup`, `selectedTags`, `sortCriteria`, `sortDirection`, filtro de data, lógica AND/OR, etc.) sempre que forem modificados.~~
    *   *Nota: A persistência individual de cada estado não foi explicitamente implementada nesta fase, mas a funcionalidade de "Filtros Nomeados" cobre a necessidade principal.*
~~2.  **Carregar Estado:** Ao montar `SavedItemsView`, carregar os valores salvos e aplicá-los aos estados `$state`.~~
    *   *Nota: A persistência individual de cada estado não foi explicitamente implementada.*
~~3.  **(Opcional) Filtros Nomeados:** Implementar UI (talvez no `Sheet`) para salvar o conjunto atual de filtros/ordenação com um nome e depois carregar rapidamente esses conjuntos salvos.~~
    *   ~~Implementado com `SaveFilterDialog` e `LoadFilterDialog` acionados por botões no `SheetFooter`.~~
    *   ~~Estado `namedFilterSets` adicionado a `SavedItemsView.svelte`.~~
    *   ~~Funções `saveNamedFilterSet`, `applyNamedFilterSet`, `deleteNamedFilterSet` implementadas.~~

---

**Considerações Gerais:**

*   **Testes:** Testar exaustivamente cada fase antes de prosseguir para a próxima.
*   **Performance:** Monitorar a performance da filtragem/ordenação com um número crescente de itens, especialmente ao introduzir lógicas mais complexas. O uso de `$derived` ajuda, mas a complexidade das funções `filterItems` e `sortItems` é crucial.
*   **Componentização:** Extrair partes da UI (ex: seleção de grupos/tags no `Sheet`, pills de filtros ativos) para componentes menores se a complexidade aumentar. (Feito para `Sheet` e conteúdo da aba 'Cartões' em 2025-04-11). 