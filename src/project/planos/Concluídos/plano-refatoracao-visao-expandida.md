# Plano: Refatoração da Visão Expandida da Tabela

Este plano detalha os passos para refatorar a visualização expandida das linhas da tabela (`DataTable.svelte`), extraindo-a para um novo componente (`ExpandedRowView.svelte`) que utiliza uma sidebar à direita para navegação interna.

## Objetivos

- Extrair a lógica e a marcação da linha expandida de `DataTable.svelte`.
- Criar um novo componente reutilizável `ExpandedRowView.svelte`.
- Implementar uma sidebar à direita (usando `shadcn-svelte/sidebar`) dentro do novo componente para navegar entre seções (Visão Geral, Notas, Flashcards, Agendamento, Histórico).
- Recriar as funcionalidades existentes (visualização de título/URL/ID, visualização/edição de comentário, listagem de notas e flashcards associados) dentro das seções apropriadas do novo componente.
- Integrar o novo componente de volta em `DataTable.svelte`.

## Plano de Implementação Detalhado

- [✅] **1. Criar Novo Componente (`src/options/views/table/ExpandedRowView.svelte`):**
    - [✅] Criar o arquivo `ExpandedRowView.svelte`.
    - [✅] Definir a prop de entrada: `itemId: string = $props()`.
    - [✅] Dentro do `<script>`, buscar o `SavedItem` reativamente usando o `itemId`: `const item = $derived($savedItems.find(i => i.id === itemId));`. Lidar com o caso de `item` ser `undefined` inicialmente ou se não for encontrado.
    - [✅] Importar componentes necessários (`Sidebar`, `Button`, `Input`, `Textarea`, `NoteCard`, `FlashcardCard`, `storage`, etc.).

- [✅] **2. Estruturar Layout de Duas Colunas:**
    - [✅] No template de `ExpandedRowView.svelte`, criar um container `div` principal.
    - [✅] Usar Flexbox (`flex`) para criar duas colunas: a coluna de conteúdo principal à esquerda (`flex-grow`) e a coluna da sidebar à direita (`flex-shrink-0`).

- [✅] **3. Implementar a Sidebar (Coluna Direita):**
    - [✅] Adicionar `<Sidebar.Root side="right" collapsible="none" class="border-l ...">`.
    - [✅] Adicionar `<Sidebar.Content>` dentro do `Root`.
    - [✅] Adicionar `<Sidebar.Menu>` dentro do `Content`.
    - [✅] Criar estado para controlar a seção ativa: `let activeSection = $state('overview');`.
    - [✅] Implementar os `<Sidebar.MenuItem>` e `<Sidebar.MenuButton>` para: "Visão geral", "Notas", "Flashcards", "Agendamento".
        - [✅] Usar `isActive={activeSection === 'valor'}` em cada `MenuButton`.
        - [✅] Adicionar `onclick={() => activeSection = 'valor'}` para atualizar o estado.
        - [✅] Adicionar contagem para Notas e Flashcards (ex: `Notas (${item?.noteIds?.length ?? 0})`).

- [✅] **4. Implementar Conteúdo Principal (Coluna Esquerda):**
    - [✅] Criar um container `div` para a coluna esquerda com `overflow-y-auto` se necessário.
    - [✅] **Seção "Visão geral" (`{#if activeSection === 'overview'}`):**
        - [✅] Exibir Título, URL (link clicável) e ID do item.
        - [✅] Implementar a área de Comentário:
            - [✅] Estado para modo de edição: `let isEditingComment = $state(false);`
            - [✅] Estado para o valor do comentário em edição: `let editedComment = $state(item?.comments ?? '');`.
            - [✅] Exibir o comentário (`item.comments`) ou um `<textarea>` (`bind:value={editedComment}`) com botões Salvar/Cancelar.
            - [✅] Botão "Editar" que define `isEditingComment = true`.
            - [✅] Função `saveComment()` que chama `storage.updateItem` e define `isEditingComment = false`.
            - [✅] Função `cancelEditComment()` que define `isEditingComment = false`.
        - [✅] Implementar a área de "Histórico de visualizações" (Placeholder).

    - [✅] **Seção "Notas" (`{#if activeSection === 'notes'}`):**
        - [✅] Buscar as notas associadas: `const relatedNotes = $derived($notes.filter(n => item?.noteIds?.includes(n.id)));`.
        - [✅] Iterar sobre `relatedNotes` usando `#each`.
        - [✅] Renderizar o componente `NoteCard` para cada nota.
        - [✅] Exibir mensagem se não houver notas.

    - [✅] **Seção "Flashcards" (`{#if activeSection === 'flashcards'}`):**
        - [✅] Buscar os flashcards associados: `const relatedFlashcards = $derived($flashcards.filter(fc => item?.flashcardIds?.includes(fc.id)));`.
        - [✅] Iterar sobre `relatedFlashcards` usando `#each`.
        - [✅] Renderizar o componente `FlashcardCard` para cada flashcard.
        - [✅] Exibir mensagem se não houver flashcards.

    - [✅] **Seção "Agendamento" (`{#if activeSection === 'scheduling'}`):**
        - [✅] Adicionar placeholder para a funcionalidade de agendamento.

- [✅] **5. Integrar em `DataTable.svelte`:**
    - [✅] Importar o novo componente `ExpandedRowView.svelte`.
    - [✅] Localizar o bloco `{#if row.getIsExpanded()}`.
    - [✅] Comentar o conteúdo antigo dentro do `<Table.Cell colspan={columns.length}>`.
    - [✅] Adicionar `<ExpandedRowView itemId={row.original.id} />` dentro da célula.

- [ ] **6. Estilização e Refinamento:**
    - [ ] Ajustar padding, margens, bordas e cores para combinar com o design geral e a imagem.
    - [ ] Garantir que a altura da linha expandida funcione corretamente e que o conteúdo seja rolável se necessário.
    - [ ] Testar a reatividade ao editar comentários e ao adicionar/remover notas/flashcards externamente.
    - [ ] Remover código comentado em `DataTable.svelte`. 