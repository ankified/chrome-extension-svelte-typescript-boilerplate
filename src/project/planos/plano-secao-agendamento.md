# Plano: Implementação da Seção de Agendamento (Concluído)

Este documento detalha os passos que **foram realizados** para implementar a seção "Agendamento" na visualização expandida da linha da tabela (`ExpandedRowView.svelte`), incluindo a modificação da estrutura de dados para suportar múltiplas datas de agendamento.

## Objetivos Atingidos

- Permitido o agendamento de múltiplas datas para itens marcados como "Ler Mais Tarde".
- Modificada a estrutura de dados (`SavedItem`) para usar `scheduledDates: number[]`.
- Implementada interface da seção "Agendamento" em `ExpandedRowView.svelte` com calendário de seleção múltipla e lista de datas.
- Implementadas funcionalidades: adicionar datas selecionadas no calendário, visualizar datas agendadas, excluir datas individualmente, excluir todas as datas.
- Implementada lógica para ativar a interface de agendamento para "Bookmarks" sem alterar o tipo imediatamente.
- Atualizados componentes existentes (visualização de cards e colunas da tabela) para compatibilidade com `scheduledDates`.

## Implementação Realizada

1.  **[✅] Modificação da Estrutura de Dados:**
    *   **[✅] `src/types.ts`:** Alterada a interface `SavedItem`, substituindo `scheduledDate?: number` por `scheduledDates?: number[]`.
    *   **[ℹ️] `src/storage.ts` (Migração/Revisão):** Nenhuma lógica explícita de *migração* foi adicionada neste momento (itens antigos sem `scheduledDates` serão tratados como não agendados). As funções de `updateItem` foram verificadas e funcionam corretamente com a nova estrutura devido ao uso de `Partial<SavedItem>`. Validações na carga (`createPersistentStore`) não foram alteradas especificamente para `scheduledDates`.
    *   **[✅] `src/options/views/table/columns.ts`:**
        *   **[✅] Coluna `scheduledDate` (`id: 'scheduledDate'`):** `accessorFn` e `cell` modificados para usar `scheduledDates?.[0]`. `sortingFn` usa `datetime` (que opera sobre o timestamp da primeira data). `filterFn` ajustado para verificar se *qualquer* data em `scheduledDates` está no intervalo.
        *   **[✅] Coluna `status`:** Lógica em `accessorFn` atualizada para verificar `item.readLater` e a existência/conteúdo de `scheduledDates`, usando `scheduledDates[0]` para determinar o status ('Hoje', 'Atrasado', etc.). `StatusCellButton.svelte` não necessitou de alterações diretas nesta etapa.

2.  **[✅] Implementação da UI e Lógica em `ExpandedRowView.svelte` (Seção `scheduling`):**
    *   **[✅] Importações:** Adicionados `Calendar`, `ScrollArea`, ícones `CalendarPlus`, `CalendarX2`, `X`, funções/tipos de `@internationalized/date` e `date-fns`.
    *   **[✅] Estado:** Adicionados estados `$state` para `calendarMonth`, `selectedCalendarDates`, e `isSchedulingModeActive`.
    *   **[✅] Lógica Condicional:** Renderização principal da seção agora usa `{#if item.readLater || isSchedulingModeActive}`.
    *   **[✅] Caso `item.readLater || isSchedulingModeActive`:**
        *   **[✅] Layout:** Estrutura `flex` com duas colunas implementada.
        *   **[✅] Coluna Esquerda (Calendário):** Renderizado `<Calendar type="multiple" bind:value={selectedCalendarDates} placeholder={calendarMonth} ... />`.
        *   **[✅] Coluna Direita (Lista):**
            *   Usado `<ScrollArea>`.
            *   **Header:** Botões "Adicionar Data(s)" (`onclick={addDatesToSchedule}`) e "Excluir Todas" (`onclick={removeAllDates}`) implementados.
            *   **Lista:** Renderizada com `{#each sortedScheduledDates ...}`, exibindo datas formatadas e botão de exclusão individual (`onclick={() => removeDateFromSchedule(timestamp)}`). Navegação do calendário ao clicar na data implementada (`onclick={() => navigateCalendarToDate(dateTimestamp)}`).
    *   **[✅] Caso `!item.readLater && !isSchedulingModeActive`:**
        *   Renderizado botão "Adicionar Agendamento" (`onclick={() => isSchedulingModeActive = true}`) para ativar a UI sem modificar o item.
    *   **[✅] Funções:** Implementadas ou ajustadas:
        *   `addDatesToSchedule`: Adiciona datas selecionadas (não duplicadas), define `readLater: true` e salva.
        *   `removeDateFromSchedule`: Remove data específica. **[Atualizado]** Define `readLater = false` se o array `scheduledDates` ficar vazio após a remoção.
        *   `tryDeleteAllDates`: Abre o `AlertDialog` de confirmação.
        *   `confirmDeleteAllDates`: Chamada pelo `AlertDialog`, remove todas as datas e define `readLater = false`.
        *   `navigateCalendarToDate`: Atualiza `calendarMonth`.
        *   `formatListedDate`: Formata data para exibição na lista.
        *   Função `addFirstSchedule` foi removida.
    *   **[✅] Diálogos:**
        *   **[✅] Exclusão Total:** Implementado `AlertDialog` (importado como `AlertDialog`) para confirmar a exclusão de todas as datas, substituindo o `confirm()` nativo.
        *   **[ℹ️] Exclusão Individual:** Nenhuma confirmação adicional implementada para exclusão individual.
    *   **[✅] Sidebar:** Link "Agendamento" habilitado (remoção da condição `disabled`).
    *   **[✅] Correção de Linter:** Erros de tipo `ZonedDateTime`/`CalendarDate` corrigidos com `toCalendarDate`. Uso do componente `<Calendar>` corrigido. Avisos `$derived` corrigidos com closure.

3.  **[✅] Ajustes em Componentes Impactados:**
    *   **[✅] `src/options/views/card/SavedItemsCardView.svelte`:** Atualizada a constante `isScheduled` e a função `formatScheduleTooltip` para usar `item.scheduledDates`.
    *   **[✅] `src/options/components/SavedItemsCardsTab.svelte`:** Atualizada a lógica `filteredByType` para usar `item.readLater`.

4.  **[✅] Registro das Modificações:** Entradas adicionadas ao diário `src/project/diario/2025-05-01.md`. 