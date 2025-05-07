## Plano de Ação para Refatoração do Sidebar (V2)

O objetivo é reestruturar o `app-sidebar.svelte` para que cada seção principal seja um componente próprio, similar ao `sidebar-07`, e para que "Itens salvos", "Projeto", e "Pessoal" sejam menus colapsáveis, além de corrigir o alinhamento de ícone e texto.

### Tarefas:

-   [x] **1. Modificar Estrutura de Dados `mainNavigation` em `app-sidebar.svelte`**:
    -   [x] Alterar "Itens salvos" para ser um menu colapsável (`collapsible: true`).
        -   [x] Adicionar `subItems`: "Web" (`saved-web`) e "Local" (`saved-local`).
        -   [x] Remover os `isGroupLabel: true` e os itens individuais "Web" e "Local" que estão soltos.
    -   [x] Alterar "Projeto" para ser um menu colapsável (`collapsible: true`).
        -   [x] Adicionar `subItems`: "Kanban" (`project-kanban`), "Fluxo" (`project-flow`), e "Cronograma" (`project-schedule`).
        -   [x] Remover os `isGroupLabel: true` e os itens individuais "Kanban", "Fluxo", e "Cronograma" que estão soltos.
    -   [x] Alterar "Pessoal" para ser um menu colapsável (`collapsible: true`).
        -   [x] Adicionar `subItems`: "Heurísticas" (`personal-heuristics`), "Notas" (que será outro menu colapsável), e "Flashcards" (`personal-flashcards`).
        -   [x] Remover os `isGroupLabel: true` e os itens individuais "Heurísticas" e "Flashcards" que estão soltos.
    -   [x] Dentro do submenu "Pessoal", o item "Notas" (`personal-notes-group`) já é colapsável e deve permanecer assim, contendo "Notas curtas" e "Anotações".
    -   [x] Garantir que os ícones corretos estejam associados aos novos menus principais e seus subitens.

-   [x] **2. Criar Componentes Separados para Seções do Sidebar**:
    -   Inspirado por `nav-main.svelte` e `nav-projects.svelte` do exemplo `sidebar-07`.
    -   [x] Criar `src/lib/components/sidebar/nav-knowledge-base.svelte` para a seção "Base de conhecimento".
    -   [x] Criar `src/lib/components/sidebar/nav-saved-items.svelte` para a nova seção/menu "Itens salvos".
    -   [x] Criar `src/lib/components/sidebar/nav-project.svelte` para a nova seção/menu "Projeto".
    -   [x] Criar `src/lib/components/sidebar/nav-personal.svelte` para a nova seção/menu "Pessoal".
        -   Este componente irá conter a lógica para o submenu aninhado "Notas".
    -   [x] Criar `src/lib/components/sidebar/nav-footer.svelte` para as seções "Configurações" e "Alertas".
    -   Cada um desses componentes receberá `activeTab`, `onTabChange`, e `openCollapsibles` (ou um subconjunto relevante dele) como props, e talvez callbacks específicos para `toggleCollapsible` se o estado de `openCollapsibles` for gerenciado de forma mais granular dentro deles ou se passarmos apenas a fatia relevante de `openCollapsibles`. A abordagem mais simples é passar `openCollapsibles` e `toggleCollapsible` diretamente.

-   [x] **3. Refatorar `app-sidebar.svelte` para Usar os Novos Componentes**:
    -   [x] Importar os novos componentes criados na etapa 2.
    -   [x] Remover a lógica de iteração (`{#each mainNavigation...}`) e (`{#each footerNavigation...}`) que renderiza diretamente os itens.
    -   [x] Em vez disso, instanciar cada novo componente, passando as props necessárias (`activeTab`, `onTabChange`, `openCollapsibles`, `toggleCollapsible`, e os dados de navegação relevantes para cada um).
        -   Por exemplo, `nav-knowledge-base.svelte` receberá a parte de `mainNavigation` referente à "Base de Conhecimento".
    -   [x] O `ProjectSwitcher` permanece no topo.

-   [x] **4. Ajustar Estilos e Estrutura dos Itens de Menu para Corrigir Layout**:
    -   A imagem mostra o título abaixo do ícone, e eles devem estar lado aLado.
    -   [x] No `Sidebar.MenuButton` e `Collapsible.Trigger` (e `Sidebar.MenuSubButton`), garantir que o ícone e o `span` com o texto estejam em um contêiner flexível com `items-center` para alinhamento vertical.
        -   Exemplo de estrutura interna para `MenuButton` ou `Collapsible.Trigger`:
            ```html
            <svelte:fragment slot="child" let:props>
                {#if item.icon}<item.icon {...props} class="h-4 w-4 mr-2 shrink-0" />{/if} // Adicionar mr-2 para espaçamento
                <span class="flex-1 text-sm text-left truncate">{item.label}</span>
                {#if item.collapsible}
                    <ChevronDown class="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 {openCollapsibles[item.id] ? 'rotate-180' : ''}" />
                {/if}
            </svelte:fragment>
            ```
        -   A classe `flex` já está no `baseMenuButtonClasses` e `Sidebar.MenuButton`, mas o conteúdo do slot `child` precisa ser estruturado para que o ícone e o texto fiquem na mesma linha e o texto ocupe o espaço restante.
        -   Verificar a implementação atual dos slots nos componentes `Sidebar.MenuButton` e `Sidebar.MenuSubButton` para garantir que essa estrutura seja aplicada corretamente. A atual já usa `flex` e `items-center` no `MenuButton` e `Collapsible.Trigger`. A questão pode ser mais sutil, talvez relacionada a como os slots são renderizados ou alguma classe CSS herdada.
        -   A classe `gap-2` no `baseMenuButtonClasses` deve garantir o espaçamento entre o ícone e o texto. Se o problema for o ícone ficar em cima e o texto embaixo, pode ser que o `span` do texto não esteja se comportando como `flex-1` ou que haja um `flex-direction: column` inesperado em algum lugar. A estrutura atual dentro do `MenuButton` já parece correta com `<item.icon ... />` e `<span ...>{item.label}</span>` como irmãos diretos.

-   [ ] **5. Testar Funcionalidade**:
    -   [ ] Verificar se todos os menus e submenus colapsam e expandem corretamente.
    -   [ ] Verificar se clicar nos itens de menu atualiza a `activeTab` e o conteúdo da página de opções.
    -   [ ] Verificar se o estado aberto/fechado dos menus colapsáveis é preservado (se essa for a intenção, `openCollapsibles` já faz isso).
    -   [ ] Verificar se o layout (ícone e texto lado a lado) está correto em todos os itens de menu e submenu.
    -   [ ] Confirmar que o `ProjectSwitcher` continua funcionando.
    -   [ ] Assegurar que os `Tooltip`s ainda funcionam como esperado. 