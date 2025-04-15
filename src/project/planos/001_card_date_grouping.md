# Plano de Implementação: Agrupamento por Data na Visualização de Cards

**Data:** 2025-04-14
**Autor:** Gemini

## 1. Objetivo

Implementar agrupamento visual e sub-ordenação na visualização de cards (`SavedItemsCardsTab.svelte`) quando o **critério de ordenação primário** for baseado em data ("Data Adição" - `dateAdded` ou "Data Agendada" - `scheduledDate`).

- Os cards devem ser agrupados em seções com títulos de data relativos/recentes (Hoje, Ontem, Esta Semana, etc.) ou por Mês/Ano para datas mais antigas.
- Os critérios de ordenação secundários e terciários definidos no `FilterSheet` devem ser aplicados *dentro* de cada grupo de data.

## 2. Estratégia de Agrupamento de Datas

Será utilizada a estratégia **Relativo/Recente + Datas**:

- **Categorias (Ordem de Exibição):**
    1. Hoje
    2. Ontem
    3. Esta Semana (excluindo Hoje e Ontem)
    4. Semana Passada
    5. Este Mês (excluindo Esta Semana e Semana Passada)
    6. Mês Passado
    7. [Nome do Mês] de [Ano] (para meses anteriores no ano corrente, do mais recente para o mais antigo)
    8. [Ano] (para anos anteriores)
- **Dependência:** `date-fns` (já disponível no projeto).

## 3. Arquivos Afetados e Novas Criações

- **Modificações:**
    - `src/options/views/SavedItemsView.svelte`: Passar `sortDescriptors` para `SavedItemsCardsTab`.
    - `src/options/components/SavedItemsCardsTab.svelte`: Implementar a lógica principal de agrupamento e sub-ordenação; modificar o template para renderizar grupos.
- **Possível Nova Criação (Recomendado):**
    - `src/utils/sorting.ts`: Para mover a função `sortItems` e torná-la reutilizável.
    - `src/utils/dateGrouping.ts`: Para encapsular a lógica complexa de agrupar itens por data relativa/recente.

## 4. Plano Detalhado

### Passo 4.1: Refatorar Função `sortItems` (Opcional, mas Recomendado)

1.  **Criar `src/utils/sorting.ts`**.
2.  Mover a função `sortItems` de `src/options/views/SavedItemsView.svelte` para `src/utils/sorting.ts`.
3.  Exportar `sortItems` de `src/utils/sorting.ts`.
4.  Importar `sortItems` em `SavedItemsView.svelte` de `../../utils/sorting`.
5.  Garantir que a tipagem (`SavedItem`, `SortDescriptor`) esteja correta ou importada no novo arquivo utilitário.

### Passo 4.2: Criar Utilitário de Agrupamento por Data (Recomendado)

1.  **Criar `src/utils/dateGrouping.ts`**.
2.  Importar tipos (`SavedItem`) e funções `date-fns` necessárias (`isToday`, `isYesterday`, `isThisWeek`, `startOfWeek`, `isPast`, `startOfMonth`, `format`, etc., com locale `ptBR`).
3.  **Implementar `getRelativeDateGroupKey(date: Date): string`:**
    - Recebe uma data.
    - Retorna a string da chave do grupo (ex: "Hoje", "Ontem", "Esta Semana", "Semana Passada", "Este Mês", "Mês Passado", "Abril de 2025", "2024").
    - Implementar a lógica de verificação na ordem correta (Hoje -> Ontem -> Esta Semana -> ...).
4.  **Implementar `groupItemsByDate(items: SavedItem[], dateField: 'dateAdded' | 'scheduledDate'): Map<string, SavedItem[]>`:**
    - Recebe a lista de itens (já ordenada primariamente pela data relevante) e o campo de data a ser usado.
    - Itera sobre os `items`.
    - Para cada item, obtém a data do `dateField`. Se a data for inválida/nula, pode agrupar em uma categoria "Sem Data" ou similar.
    - Chama `getRelativeDateGroupKey` para obter a chave do grupo.
    - Adiciona o item ao array correspondente no `Map`. Se a chave não existir, cria o array.
    - Retorna o `Map` preenchido.
5.  **Implementar `getSortedDateGroupKeys(groupKeys: string[]): string[]`:**
    - Recebe um array com as chaves de grupo geradas (ex: ["Hoje", "Abril de 2025", "Ontem", "2024"]).
    - Retorna um *novo* array com as chaves ordenadas na sequência desejada (Hoje, Ontem, Esta Semana, Semana Passada, Este Mês, Mês Passado, Meses/Ano decrescente, Anos decrescentes).
    - Requer lógica para mapear as strings para uma ordem numérica/lógica e depois ordenar.

### Passo 4.3: Modificar `SavedItemsView.svelte`

1.  Importar `sortDescriptors` (se ainda não estiver importado/disponível no escopo).
2.  Na instanciação de `<SavedItemsCardsTab>`, passar a prop `sortDescriptors`:
    ```svelte
    <SavedItemsCardsTab 
      items={sortedItems} 
      groups={$groups ?? []} 
      availableSystemTags={availableTags} 
      sortDescriptors={sortDescriptors} {/* <--- ADICIONAR */}
    />
    ```
    *(Nota: Verificar se `sortedItems` já está corretamente ordenado pelo primeiro critério. A função `sortItems` existente deve garantir isso).*

### Passo 4.4: Modificar `SavedItemsCardsTab.svelte`

1.  **Importações:**
    - Importar `SortDescriptor` de `../../types`.
    - Importar `groupItemsByDate`, `getSortedDateGroupKeys` de `../../utils/dateGrouping` (se criado).
    - Importar `sortItems` de `../../utils/sorting` (se refatorado).
2.  **Props:**
    - Adicionar `sortDescriptors: SortDescriptor[]` à definição de props.
    - Opcional: Renomear prop `sortedItems` para `items` para evitar confusão, já que a sub-ordenação ocorrerá aqui.
3.  **Lógica Derivada (`$derived`):**
    - Criar uma variável derivada (ex: `groupedAndSortedData`).
    - Dentro da derivação:
        - Obter `primarySortCriterion = sortDescriptors[0].criterion`.
        - `isDateSort = primarySortCriterion === 'dateAdded' || primarySortCriterion === 'scheduledDate'`.
        - **SE `!isDateSort`:** Retornar `[{ groupTitle: null, items: sortItems(items, sortDescriptors) }]`. (Aplica ordenação completa normalmente).
        - **SE `isDateSort`:**
            - Chamar `groupedItemsMap = groupItemsByDate(items, primarySortCriterion)`.
            - Obter `allGroupKeys = Array.from(groupedItemsMap.keys())`.
            - Obter `sortedGroupKeys = getSortedDateGroupKeys(allGroupKeys)`.
            - Criar `secondarySortDescriptors = sortDescriptors.slice(1)`.
            - Mapear `sortedGroupKeys` para a estrutura final:
                ```typescript
                const finalGroupedData = sortedGroupKeys.map(key => {
                  const groupItems = groupedItemsMap.get(key) || [];
                  const subSortedItems = secondarySortDescriptors.length > 0 
                    ? sortItems(groupItems, secondarySortDescriptors) 
                    : groupItems; // Não sub-ordena se não houver critérios secundários
                  return { groupTitle: key, items: subSortedItems };
                });
                return finalGroupedData;
                ```
4.  **Template:**
    - Remover o loop `{#each sortedItems}` atual que renderiza `SavedItemsCardView`.
    - Adicionar um loop externo: `{#each groupedAndSortedData as group}`.
    - Dentro deste loop:
        - Renderizar um cabeçalho se `group.groupTitle` não for nulo: `{#if group.groupTitle}<h2>{group.groupTitle}</h2>{/if}` (estilizar conforme necessário).
        - Renderizar o componente `SavedItemsCardView` passando os itens do grupo atual:
            ```svelte
            <SavedItemsCardView 
              data={group.items} 
              groups={groups ?? []} 
              availableSystemTags={availableSystemTags} 
            /> 
            ```
            *(Nota: A passagem de `groups` e `availableSystemTags` para `SavedItemsCardView` permanece a mesma).*

## 5. Considerações

- **Performance:** Agrupar e sub-ordenar a cada mudança pode ter impacto na performance com muitos itens. O uso de `$derived` ajuda, mas a complexidade das funções de agrupamento/ordenação deve ser monitorada.
- **Experiência do Usuário:** Garantir que os títulos dos grupos de data sejam claros e a ordem seja lógica.
- **Tratamento de Datas Inválidas:** Decidir como tratar itens com `dateAdded` ou `scheduledDate` nulos/inválidos no agrupamento. 