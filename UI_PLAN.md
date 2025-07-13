# Plano de Refatoração da UI do Popup

Este documento detalha o plano para refatorar a interface de utilizador (UI) do popup da extensão, utilizando a biblioteca de componentes **Shadcn-Svelte**. O plano leva em consideração a estrutura de projeto baseada em **WXT**, a necessidade de preservar e expandir as funcionalidades existentes, e a adição de um modo claro/escuro (*dark mode*).

## 1. Análise da Estrutura e Preparação

- **Ponto de Entrada**: O popup é renderizado a partir de `src/entrypoints/popup/index.html`.
- **Componente Raiz**: O componente Svelte principal a ser refatorado é o `src/components/Popup.svelte`.
- **Foco da Refatoração**: O popup serve como uma ferramenta de captura para **adicionar um novo item** com detalhes ricos. A visualização da lista de itens guardados é da responsabilidade do **Sidepanel**.
- **Preservação da Lógica**: A lógica de `salvar item` será expandida para acomodar os novos campos de dados (grupos, notas, tags, etc.). A lógica de autenticação e comunicação com a API será preservada.

## 2. Implementação do Dark Mode

- **Instalar Dependência**: `pnpm add mode-watcher`
- **Componente de Layout**: Criar `src/components/Layout.svelte` para encapsular o popup e conter o `<ModeWatcher />`.
- **Componente de Toggle**: Criar `src/components/ModeToggle.svelte` para o botão de troca de tema.

## 3. Plano de Refatoração da UI (`Popup.svelte`)

O componente será reestruturado nas seguintes secções:

### 3.1. Secção Superior (Cabeçalho)

- **Objetivo**: Controlos globais da aplicação e navegação.
- **Componentes**:
  - `div` com Flexbox.
  - **Avatar** com **DropdownMenu** para Login/Logout, Backup Manual e Restauro.
  - **Badge** para o estado do backup.
  - **Botões de Ação**:
    - `Button` para abrir o **Sidepanel**.
    - `Button` para abrir as **Opções**.
    - O componente `ModeToggle.svelte`.

### 3.2. Secção Central (Captura de Item)

- **Objetivo**: Recolher toda a informação sobre o novo item a ser guardado.
- **Componentes**:
  - **Seletor de Grupo**: `Select` (`Select.Root`, `Select.Trigger`, `Select.Content`) para escolher ou criar um grupo para o item.
  - **Pré-visualização do Item**: Um `Card` ou `div` estilizado para exibir o favicon, título e URL da página atual (informação a ser obtida via content script).
  - **Campos de Edição**:
    - `Label` e `Input` para um **título personalizado**.
    - `Label` e `Textarea` para adicionar **comentários ou notas**.
  - **Metadados**:
    - **Etiquetas (Tags)**: `Button` ("+ Etiqueta") para adicionar tags. As tags serão exibidas como componentes `Badge` dentro de um `Carousel` para permitir a navegação horizontal.
    - **Lembrete**: `Button` ("+ Lembrete") que abrirá um `Popover` contendo um `Calendar` para selecionar uma data e um `Input` para a hora.

### 3.3. Secção Inferior (Ações)

- **Objetivo**: Concluir a operação de adição do item.
- **Componentes**:
  - `div` com Flexbox, alinhado à direita.
  - **Botão Cancelar**: `Button` com `variant="outline"` que descarta as alterações e fecha o popup.
  - **Botão Salvar**: `Button` (variante principal) que aciona a lógica para salvar o item com todas as informações fornecidas.

## 4. Ordem de Implementação Sugerida

1.  Instalar `mode-watcher`.
2.  Criar os componentes `Layout.svelte` e `ModeToggle.svelte`.
3.  Integrar o `Layout` no `Popup.svelte`.
4.  Refatorar a **Secção Superior** (Cabeçalho) conforme o plano.
5.  Refatorar a **Secção Central**, implementando componente a componente:
    - Seletor de Grupo.
    - Área de Pré-visualização.
    - Inputs para Título e Notas.
    - Funcionalidade de Tags com `Button`, `Badge` e `Carousel`.
    - Funcionalidade de Lembrete com `Popover` e `Calendar`.
6.  Refatorar a **Secção Inferior** com os botões "Cancelar" e "Salvar".
7.  Adaptar a estrutura de dados e a função de `salvar` no `storage.ts` para lidar com os novos campos (grupo, notas, tags, lembrete).
8.  Testar exaustivamente todo o fluxo de adição de um novo item, garantindo que todos os dados são salvos e que as funcionalidades do cabeçalho (auth, backup, navegação) continuam operacionais. 