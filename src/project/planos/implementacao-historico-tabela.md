# Plano de Implementação - Visualização de Histórico na Tabela Expandida

Este documento detalha os passos para implementar a funcionalidade de visualização do histórico de visitas na linha expandida da tabela de itens salvos.

## Passos

1.  **Permissões:**
    *   [x] Verificar e adicionar a permissão `"history"` ao array `permissions` no arquivo `manifest.json`.
2.  **Tipos:**
    *   [x] Definir a interface `VisitItem` em `src/types.ts` com base na documentação da API `chrome.history` (incluir `visitId`, `visitTime`, `transition`).
    *   [x] Adicionar o campo opcional `visitHistory?: VisitItem[];` à interface `SavedItem` em `src/types.ts`.
3.  **Armazenamento (População de Dados):**
    *   [x] Localizar a função/lógica responsável por **salvar um novo `SavedItem`** (investigar Popup/Background e chamadas a `storage.ts`). -> Identificado em `SaveItemForm.svelte` (`handleSave`).
    *   [x] Modificar essa lógica para, *antes* de salvar o item:
        *   [x] Chamar `chrome.history.getVisits({ url: newItem.url }, (visits) => { ... });` para buscar o histórico da URL.
        *   [x] Dentro do callback de `getVisits`:
            *   [x] Ordenar as visitas por `visitTime` decrescente (mais recentes primeiro).
            *   [x] Limitar o número de visitas a serem armazenadas (definido limite de 20).
            *   [x] Mapear as visitas selecionadas para a estrutura `VisitItem` definida em `types.ts`.
            *   [x] Atribuir o array resultante ao campo `newItem.visitHistory`.
        *   [x] Garantir que a lógica de salvamento no storage (`chrome.storage.local.set` ou `savedItems.update`) ocorra *após* a conclusão do callback de `getVisits`.
4.  **Interface (Modificação do `ExpandedRowView.svelte`):**
    *   [x] **Habilitar o botão "Histórico"**: Remover o atributo `disabled` e o `#snippet` do `Sidebar.MenuButton` existente para a seção de histórico.
    *   [x] **Implementar a seção "Histórico"**: Substituir o conteúdo placeholder dentro do bloco `{#if activeSection === 'history'}`:
        *   [x] Adicionar um título (ex: "Histórico de Visitas").
        *   [x] Utilizar `ScrollArea` para a lista de histórico.
        *   [x] Adicionar lógica condicional (`{#if item.visitHistory && item.visitHistory.length > 0}`).
        *   [x] Dentro do `{#if}`, iterar (`{#each item.visitHistory as visit}`) sobre o histórico armazenado.
        *   [x] Exibir a data/hora formatada (`dd/MM/yyyy HH:mm:ss`) de cada `visit.visitTime`.
        *   [x] (Opcional) Exibir o tipo de transição (`visit.transition`).
        *   [x] Dentro do `{:else}`, exibir uma mensagem indicando que não há histórico disponível.
5.  **Testes:**
    *   [ ] Testar o salvamento de um novo item, verificando se `visitHistory` é populado no storage.
    *   [ ] Testar a exibição do histórico na seção correspondente da linha expandida.
    *   [ ] Validar a formatação das datas/horas.
    *   [ ] Testar com itens sem histórico (salvos anteriormente ou URLs não visitadas).
    *   [ ] Verificar o comportamento caso a permissão `"history"` não seja concedida.

*Última atualização: 2025-04-19* 