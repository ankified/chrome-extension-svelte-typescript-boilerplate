# Plano de Refatoração do Sidebar

Este documento detalha o plano de ação para refatorar o componente Sidebar do projeto, conforme a análise e os requisitos levantados.

## Tarefa 1: Corrigir Exibição de Ícones no Sidebar Recolhido

**Objetivo:** Garantir que, quando o sidebar estiver recolhido (`collapsible="icon"`), apenas os ícones dos menus sejam exibidos, com o texto completo aparecendo em um tooltip.

*   [x] **Modificar `src/lib/components/app-sidebar.svelte`:**
    *   [x] Para cada `Sidebar.MenuItem` (principal ou submenu que necessite de ícone), revisar a estrutura interna do `Sidebar.MenuButton` ou `Sidebar.MenuSubButton`.
    *   [x] **Remover o elemento `<button>` HTML aninhado** que atualmente encapsula o ícone e o texto dentro do slot `child`.
    *   [x] Passar o componente de ícone (ex: `<NomeDoIcone />`) e o `<span>` contendo o texto do menu diretamente como filhos do `Sidebar.MenuButton` (ou `Sidebar.MenuSubButton`).
    *   [x] Adicionar o snippet `#snippet tooltipContent()` dentro do `Sidebar.MenuButton` para fornecer o texto completo do menu para o tooltip.
        ```svelte
        // Exemplo de estrutura esperada:
        // <Sidebar.MenuButton ...>
        //     {#snippet child({ props })}
        //         <IconComponent class="size-5" />
        //         <span>Texto do Menu</span>
        //     {/snippet}
        //     {#snippet tooltipContent()}
        //         Texto do Menu
        //     {/snippet}
        // </Sidebar.MenuButton>
        ```
    *   [x] Confirmar que a propriedade `collapsible="icon"` em `<Sidebar.Root>` no arquivo `src/lib/components/app-sidebar.svelte` está ativa.

## Tarefa 2: Reestruturar o Sidebar Conforme a Imagem de Referência

**Objetivo:** Alterar a estrutura do sidebar para incluir um header (com seletor de projetos), um corpo com novos agrupamentos e itens de menu, e um footer (com configurações e alertas).

*   [x] **Atualizar Definição de Dados do Menu em `src/lib/components/app-sidebar.svelte`:**
    *   [x] Revisar/substituir as atuais estruturas de dados (`tabs`, `savedSubTabs`) para refletir a nova hierarquia:
        *   [x] **Header (Seletor de Projetos):** Será um componente separado (`project-switcher.svelte`).
        *   [x] **Corpo Principal:**
            *   [x] **Início** (Item de Menu Principal, clicável, ex: `id: 'home'`).
            *   [x] **Base de conhecimento** (Grupo expansível/colapsável dentro de "Início").
                *   [x] Vade-mécum (Sub-item de Menu).
                *   [x] Atualizações (Sub-item de Menu).
                *   [x] Wiki (Sub-item de Menu).
            *   [x] **Itens salvos** (Rótulo de Grupo).
                *   [x] Web (0) (Item de Menu).
                *   [x] Local (0) (Item de Menu).
            *   [x] **Projeto** (Rótulo de Grupo).
                *   [x] Kanban (0) (Item de Menu).
                *   [x] Fluxo (0) (Item de Menu).
                *   [x] Cronograma (0) (Item de Menu).
            *   [x] **Pessoal** (Rótulo de Grupo).
                *   [x] Heurísticas (0) (Item de Menu).
                *   [x] Notas (0) (Item de Menu expansível/colapsável).
                    *   [x] Notas curtas (0) (Sub-item de Menu).
                    *   [x] Anotações (0) (Sub-item de Menu).
                *   [x] Flashcards (0) (Item de Menu).
        *   [x] **Footer:**
            *   [x] Configurações (Item de Menu/Botão).
            *   [x] Alertas (0) (Item de Menu/Botão).
*   [x] **Criar Componente `src/lib/components/project-switcher.svelte`:**
    *   [x] Basear-se em `src/examples/sidebar-07/components/team-switcher.svelte`.
    *   [x] Adaptar para "Projetos".
    *   [x] Definir estrutura de dados de exemplo para projetos.
    *   [x] O `DropdownMenu.Trigger` deve exibir emoji, nome e descrição do projeto ativo.
    *   [x] `DropdownMenu.Content` deve listar outros projetos e opção "Adicionar projeto".
    *   [x] Integrar no topo do `<Sidebar.Content>` em `src/lib/components/app-sidebar.svelte`.
*   [x] **Renderizar Nova Estrutura de Menu em `src/lib/components/app-sidebar.svelte`:**
    *   [x] Utilizar `<Sidebar.Group>` e `<Sidebar.GroupLabel>`.
    *   [x] Utilizar `<Sidebar.MenuItem>` e `<Sidebar.MenuButton>` / `<Sidebar.MenuSubButton>`.
    *   [x] Implementar itens colapsáveis com `<Collapsible.Root>`, `<Collapsible.Trigger>`, `<Collapsible.Content>`.
*   [x] **Criar Footer do Sidebar em `src/lib/components/app-sidebar.svelte`:**
    *   [x] Adicionar seção no final do `<Sidebar.Content>` para "Configurações" e "Alertas".
    *   [x] Garantir layout flex para posicionamento correto.

## Tarefa 3: Mover Seleção de Visualização (Tabela/Cartões) para `Options.svelte`

**Objetivo:** Remover os submenus "Tabela" e "Cartões" de "Itens Salvos" no sidebar e adicionar um `ToggleGroup` em `src/options/Options.svelte` para controlar o modo de visualização (Tabela/Cartões) quando um item da categoria "Itens Salvos" (Web ou Local) estiver ativo.

*   [x] **Remover Submenus "Tabela" e "Cartões" do Sidebar:**
    *   [x] Em `src/lib/components/app-sidebar.svelte`, atualizar a definição de dados do menu para que "Itens Salvos" contenha apenas "Web" e "Local" como sub-itens diretos. (Concluído com a nova estrutura `mainNavigation`)
*   [x] **Adicionar `ToggleGroup` em `src/options/Options.svelte`:**
    *   [x] Importar `ToggleGroup` e `ToggleGroupItem` de `src/lib/components/ui/toggle-group/index.js`.
    *   [x] No `<header>` de `<Sidebar.Inset>` em `src/options/Options.svelte`, adicionar o `ToggleGroup`.
        ```svelte
        // <ToggleGroup type="single" bind:value={currentViewModeForSavedItems} ... >
        //     <ToggleGroupItem value="table" ...> Tabela </ToggleGroupItem>
        //     <ToggleGroupItem value="cards" ...> Cartões </ToggleGroupItem>
        // </ToggleGroup>
        ```
    *   [x] Criar uma nova variável de estado, ex: `let savedItemsViewMode = $state('table');`.
    *   [x] Modificar a lógica de `onTabChange` (ou uma função reativa/efeito): Se o `activeTab` for `'saved-web'` ou `'saved-local'`, este `ToggleGroup` deve se tornar visível/ativo. Se `activeTab` for `'saved-web'`, `savedItemsViewMode` deve ser definido como `'table'` por padrão.
    *   [x] Ajustar a passagem de props para `SavedItemsView`: `<SavedItemsView itemCategory={extractCategoryFromTab(activeTab)} viewMode={savedItemsViewMode} />`.
    *   [x] O `ToggleGroup` só deve ser visível/interativo quando `activeTab` for `saved-web` ou `saved-local`.

## Considerações Adicionais e Próximas Etapas

*   **Ícones Lucide:** Importar todos os ícones necessários para os novos menus.
*   **Estado de Navegação:** Atualizar `activeTab` e `onTabChange` para a nova estrutura.
*   **Estilização:** Ajustes de CSS podem ser necessários.
*   **Persistência do ViewMode:** Considerar se `currentViewModeForSavedItems` deve ser persistido (ex: no `localStorage` ou `chrome.storage`). 