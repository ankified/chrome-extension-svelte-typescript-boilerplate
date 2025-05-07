# Análise Detalhada do Projeto para Refatoração do Sidebar

Este documento resume a análise da estrutura do projeto, tecnologias utilizadas e arquivos principais relevantes para a refatoração do componente Sidebar.

## 1. Visão Geral do Projeto

O projeto é uma extensão para o Google Chrome desenvolvida com Svelte 5, TypeScript e Vite. Utiliza TailwindCSS para estilização e componentes da biblioteca Shadcn-Svelte (localizados em `src/lib/components/ui/`) para a interface do usuário. A gestão de estado e persistência de dados é feita através do `chrome.storage.local` e `chrome.storage.sync`, encapsulada em stores Svelte customizadas.

**Tecnologias Principais Identificadas (`package.json`):**

*   **Svelte:** v5.25.3
*   **TypeScript:** v5.8.2
*   **Vite:** v6.0.7 (Bundler)
*   **TailwindCSS:** v3.4.17
*   **Shadcn-Svelte / Bits UI:** `bits-ui: "^1.3.14"`, `tailwind-variants`, `clsx`, `tailwind-merge`
*   **Lucide Svelte:** `@lucide/svelte: "^0.503.0"` (Ícones)
*   **CRXJS Vite Plugin:** `@crxjs/vite-plugin: "2.0.0-beta.29"` (Desenvolvimento de Extensões Chrome)

## 2. Análise de Arquivos Relevantes

### a. `src/options/Options.svelte`

*   **Propósito:** Componente principal da página de opções da extensão.
*   **Funcionalidades:**
    *   Gerencia a navegação entre diferentes visualizações (`SavedItemsView`, `NotesView`, `FlashcardsView`, `SettingsView`).
    *   Utiliza o `AppSidebar` (`src/lib/components/app-sidebar.svelte`) para a navegação.
    *   Exibe um `Breadcrumb` no cabeçalho da área de conteúdo principal.
    *   A lógica de visualização para "Itens Salvos" (ex: `saved-table`, `saved-cards`) é baseada na variável `activeTab`.
    *   Invoca funções de manutenção do storage como `fixReferences()` e `verifyAndFixGroupRelations()` no `onMount`.

### b. `src/lib/components/app-sidebar.svelte` (Estado Atual)

*   **Propósito:** Define a estrutura de navegação do sidebar da aplicação.
*   **Funcionalidades:**
    *   Utiliza componentes Shadcn-Svelte de `src/lib/components/ui/sidebar/index.js`.
    *   A propriedade `collapsible="icon"` está ativa em `<Sidebar.Root>`.
    *   **Problema Identificado:** Ao recolher, exibe o texto do menu em vez dos ícones. Isso ocorre porque um `<button>` HTML é usado dentro do slot `child` do `Sidebar.MenuButton`, interferindo no comportamento esperado do componente Shadcn-Svelte.
    *   Menus e submenus são definidos estaticamente em `tabs` e `savedSubTabs`.
    *   "Itens Salvos" é o único item com submenus (Tabela, Cartões, Kanban, Fluxo).

### c. `src/storage.ts`

*   **Propósito:** Gerencia o estado da aplicação e a persistência de dados.
*   **Funcionalidades:**
    *   Utiliza `chrome.storage.local` e `chrome.storage.sync`.
    *   Define stores Svelte personalizadas (`persistentStore`, `createPersistentStore`) para `savedItems`, `notes`, `flashcards`, `groups`, `itemLinks`, `knownTags`.
    *   Contém funções CRUD e de manutenção para os dados (ex: `fixReferences`, `verifyAndFixGroupRelations`, `createGroup`, `updateItem`).
    *   A estrutura dos dados aqui será importante ao definir como os novos itens de menu (Vade-mécum, Wiki, etc.) serão armazenados e recuperados.

### d. `src/types.ts`

*   **Propósito:** Define as interfaces TypeScript para os tipos de dados da aplicação.
*   **Interfaces Principais:** `SavedItem`, `Group`, `ItemLink`, `Note`, `Flashcard`.
*   A interface `SavedItem` é central para os "Itens Salvos". A refatoração pode exigir a adição de uma nova propriedade (ex: `category`) a esta interface ou a criação de novas interfaces se os novos itens de menu tiverem estruturas de dados significativamente diferentes.

### e. `src/app.d.ts`

*   **Propósito:** Contém declarações de tipo globais e augmentations de módulo.
*   **Conteúdo Relevante:** Principalmente augmentations para `@tanstack/table-core`. Não impacta diretamente a refatoração do sidebar, mas indica o uso de TanStack Table.

### f. Arquivos de Exemplo (`src/examples/sidebar-07/`)

*   **Propósito:** Fornecem um exemplo funcional de um sidebar mais complexo usando Shadcn-Svelte, servindo como referência crucial para a refatoração.
*   **Componentes Chave Analisados:**
    *   **`src/examples/sidebar-07/components/app-sidebar.svelte`:** Mostra uma estrutura com header, corpo e footer, utilizando `flex-col` e `flex-1` para o layout correto.
    *   **`src/examples/sidebar-07/components/team-switcher.svelte`:** Exemplo de um seletor de "times" (adaptável para "projetos") usando `DropdownMenu` e `Sidebar.MenuButton`. Será a base para o header do novo sidebar.
    *   **`src/examples/sidebar-07/components/nav-main.svelte`:** Demonstra a maneira correta de incluir ícones e texto em `Sidebar.MenuButton` para que o modo `collapsible="icon"` funcione como esperado (ícone visível, texto no tooltip). A chave é passar o componente de ícone e o `<span>` de texto como filhos diretos do `Sidebar.MenuButton` e usar o snippet `tooltipContent`.

## 3. Principal Desafio para Correção Imediata

O comportamento do sidebar atual quando recolhido (`collapsible="icon"`) não exibe apenas os ícones. Isso se deve à forma como os `Sidebar.MenuButton`s são construídos em `src/lib/components/app-sidebar.svelte`, com um elemento `<button>` customizado aninhado. A referência de `nav-main.svelte` mostra a abordagem correta, que será aplicada. 