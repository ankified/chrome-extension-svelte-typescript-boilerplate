# Plano de Ações Prioritárias

Este documento registra as correções, melhorias e novas implementações que devem ser priorizadas no desenvolvimento da extensão. As ações estão organizadas por categoria e nível de prioridade.

## Correções Críticas

### Correção Urgente: Problema na Exibição/Gerenciamento de Grupos nos Cards

- **Problema**:
    - Pills de grupo não são exibidas no carrossel do card.
    - Contador de grupos no botão do rodapé não aparece.
    - Clicar no botão "Gerenciar Grupos" no rodapé causa erro no console (`TypeError: item.groupIds?.includes is not a function`).
    - Diálogo de gerenciamento de grupos não abre devido ao erro.
- **Causa Provável**: A propriedade `item.groupIds` em alguns `SavedItem` não está sendo tratada consistentemente como um array (`string[]`), sendo salva como um objeto `{ id: true }` ao criar o item no Popup.
- **Ação**:
    1.  Investigar e corrigir a tipagem/inicialização de `item.groupIds` em `storage.ts` (na criação de itens e na função `verifyAndFixGroupRelations`) para garantir que seja sempre `undefined` ou `string[]`.
    2.  Adicionar verificações defensivas (`Array.isArray(item.groupIds)`) no template (`SavedItemsCardView.svelte`) antes de tentar iterar (`#each`) ou usar `.includes()` na propriedade `item.groupIds`.
    3.  Depurar o valor de `item.groupIds` no momento da renderização do card e do diálogo para confirmar o tipo incorreto.
- **Prioridade**: Alta (Impede funcionalidade central)

**Detalhes da Resolução:**
- **Data**: 2025-04-08
- **Solução implementada**: Corrigido o problema na origem, dentro de `SaveItemForm.svelte`. Ao criar o objeto `newItem` na função `handleSave`, a atribuição de `groupIds` foi modificada de `groupIds: selectedGroups` para `groupIds: [...selectedGroups]`, garantindo que uma cópia "pura" do array seja passada para o `chrome.storage.local.set`, evitando a serialização incorreta como objeto. As verificações em `storage.ts` (`verifyAndFixGroupRelations` e `createPersistentStore`) já tratavam a correção na carga, mas a correção na origem previne o erro inicial.
- **Resultado**: `groupIds` agora são salvos corretamente como `string[]` desde a criação do item. As pills, o contador e o diálogo de gerenciamento de grupos funcionam imediatamente na página de opções, sem necessidade de recarregar.

### ~~1. Problemas de Exibição na Página de Opções~~ (RESOLVIDO - 2025-04-02)

- ~~**Problema**: Notas não estão sendo exibidas na aba "Notas" da página de opções, enquanto são exibidas corretamente no popup.~~
- ~~**Ação**: Investigar a diferença de implementação entre o popup e a página de opções para entender por que as notas são exibidas em um contexto mas não no outro.~~
- ~~**Hipóteses a verificar**:~~
  - ~~Diferenças na forma como os dados são carregados~~
  - ~~Possíveis erros na lógica de filtro ou agrupamento~~
  - ~~Problemas de timing na inicialização dos componentes~~
  - ~~Verificar se há diferenças na estrutura dos stores utilizados~~

**Detalhes da Resolução:**
- **Data**: 2025-04-02
- **Solução implementada**: Corrigida a navegação entre abas na página de opções substituindo a implementação com `$state activeTab` por uma abordagem mais estável usando estado local padrão do componente. Adicionado tratamento para o erro "Extension context invalidated" com reload automático da página. Migrados todos os blocos reativos `$:` para `$derived` no componente `NotesView.svelte` e corrigido o acesso a variáveis reativas nos templates.
- **Resultado**: Agora todas as abas na página de opções (Itens Salvos, Notas, Flashcards, Configurações) são exibidas corretamente ao clicar nelas. Os erros de tipo relacionados a arrays e operações join/forEach foram corrigidos.

### ~~2. Flashcards Ausentes na Página de Opções~~ (RESOLVIDO - 2025-04-02)

- ~~**Problema**: Flashcards são exibidos corretamente no popup quando a opção "Visualizar" está selecionada, mas não aparecem na aba Flashcards da página de opções.~~
- ~~**Ação**: Similar ao problema das notas, investigar as diferenças de implementação entre os contextos.~~
- ~~**Hipóteses a verificar**:~~
  - ~~Comparar o código de carregamento de flashcards entre popup e página de opções~~
  - ~~Verificar se existem condicionais que possam estar impedindo a exibição~~
  - ~~Examinar os logs para possíveis erros silenciosos~~

**Detalhes da Resolução:**
- **Data**: 2025-04-02
- **Solução implementada**: Corrigida a navegação entre abas na página de opções conforme descrito na solução anterior. Adicionalmente, foram corrigidos problemas de tipo e acesso a variáveis reativas em todos os componentes de visualização, assegurando que os arrays de tags e outros dados sejam tratados corretamente.
- **Resultado**: Flashcards agora são exibidos corretamente na aba correspondente da página de opções, com suas tags, cores e vínculos a itens funcionando conforme esperado.

### ~~3. Problemas de Performance no Popup~~ (RESOLVIDO - 2025-04-01)

- ~~**Problema**: Ao clicar na action que exibe o popup ele demora a ser exibido, além disso, a alternação entre abas e modos de visualização (criar/visualizar, favorito/ler depois) também demora.~~
- ~~**Ação**: Investigar problemas de performance e otimizar o carregamento e renderização dos componentes.~~
- ~~**Hipóteses a verificar**:~~
  - ~~Excesso de operações síncronas que bloqueiam a UI~~
  - ~~Carregamento desnecessário de dados em componentes não visíveis~~
  - ~~Otimização de consultas ao storage~~
  - ~~Implementação de lazy loading para componentes pesados~~

**Detalhes da Resolução:**
- **Data**: 2025-04-01
- **Solução implementada**: Aplicadas otimizações de performance usando carregamento seletivo de dados, redução de operações síncronas e melhorias na gestão do storage. Corrigidos problemas com efeitos reativos e referências a funções unsubscribe. Ver detalhes no diário de desenvolvimento (src/project/diario/2025-04-01.md).
- **Resultado**: Performance do popup significativamente melhorada, com carregamento mais rápido e transição fluida entre abas. Corrigidos erros relacionados a estados reativos e loops infinitos.

### ~~4. Problemas de Sincronização entre Storage Local e Storage Sync~~ (RESOLVIDO - 2025-04-04)

- ~~**Problema**: Itens recém-salvos não aparecem imediatamente na lista de itens salvos, e tags recém-criadas não aparecem nas sugestões.~~
- ~~**Ação**: Revisar e aprimorar o mecanismo de sincronização entre chrome.storage.local e chrome.storage.sync.~~
- ~~**Hipóteses a verificar**:~~
  - ~~Tempos de sincronização entre os dois sistemas de armazenamento~~
  - ~~Possíveis conflitos ou sobreposições de dados~~
  - ~~Mecanismos para forçar a sincronização quando necessário~~

**Detalhes da Resolução:**
- **Data**: 2025-04-04
- **Solução implementada**: Reformulada a estratégia de sincronização no arquivo `storage.ts`, corrigindo os problemas de atualização imediata dos dados no `storage.local`. Implementado um sistema de callbacks para garantir que as alterações sejam refletidas corretamente em diferentes partes da extensão sem depender exclusivamente de eventos do chrome.storage. Adicionado mecanismo para garantir que novos itens, tags e modificações apareçam imediatamente nas listagens e sugestões.
- **Resultado**: Itens recém-salvos agora aparecem imediatamente na lista de itens salvos, e tags recém-criadas são exibidas corretamente nas sugestões. A sincronização entre diferentes partes da extensão funciona de maneira consistente e confiável.

## Melhorias de Experiência do Usuário

### ~~1. Feedback de Salvamento~~ (RESOLVIDO - 2025-04-02)

- ~~**Melhoria**: Eliminar a janela de diálogo do navegador ao salvar uma nota.~~
- ~~**Implementação**: Substituir o alerta padrão do navegador por um toast ou snackbar personalizado usando o componente do shadcn-svelte.~~

**Detalhes da Resolução:**
- **Data**: 2025-04-02
- **Solução implementada**: Substituídos todos os alertas do navegador por toast notifications usando o componente Toaster do shadcn-svelte. Adicionado `event.preventDefault()` aos manipuladores de eventos para evitar o comportamento padrão. Simplificada a interface após o salvamento, removendo a caixa verde de sucesso e botões redundantes.
- **Resultado**: Feedback de usuário mais moderno e consistente em todas as operações de salvamento, com menor intrusividade na interface.

### ~~2. Aprimoramento de Interface de Seleção~~ (RESOLVIDO - 2025-04-01)

- ~~**Melhoria**: Usar um dropdown do shadcn-svelte no seletor de grupos na aba de salvar item no popup.~~
- ~~**Implementação**: Substituir o elemento select atual pelo componente Select do shadcn-svelte, mantendo a mesma funcionalidade mas com uma aparência mais moderna e consistente.~~

**Detalhes da Resolução:**
- **Data**: 2025-04-01
- **Solução implementada**: Implementado o componente DropdownMenu do shadcn-svelte para selecionar grupos, com suporte a seleção múltipla usando CheckboxItems.
- **Resultado**: Interface mais moderna, consistente e acessível para seleção de grupos.

### ~~3. Visualização Melhorada de URL e Título~~ (RESOLVIDO - 2025-04-01/02)

- ~~**Melhoria**: Tornar a exibição dos campos de título e URL da aba Salvar semelhantes a cards de social media, incluindo favicon.~~
- ~~**Implementação**:~~ 
  - ~~Criar um componente de card que exiba o título, URL e favicon da página~~
  - ~~Implementar um modo de edição que seja ativado apenas quando o usuário clicar no card~~
  - ~~Adicionar lógica para extrair e exibir o favicon da URL~~

**Detalhes da Resolução:**
- **Data**: 2025-04-01, refinado em 2025-04-02
- **Solução implementada**: Criado o componente PagePreviewCard para exibição de URLs e títulos no estilo de card, com suporte a exibição de favicon usando o serviço do Google, edição de título via popover usando o componente Popover do shadcn-svelte, e limitação de altura com truncamento de texto para consistência visual. Em 2025-04-02, reformulado o layout para usar duas colunas mais limpas, com favicon à esquerda e informações à direita.
- **Resultado**: Interface mais moderna e visual para exibição de URLs e títulos, semelhante a cards de mídia social, com uma experiência de usuário mais intuitiva para edição.

### ~~4. Sistema de Tags Aprimorado~~ (RESOLVIDO - 2025-04-01)

- ~~**Melhoria**: Permitir selecionar tags existentes nas abas Salvar, Notas e Flashcards do Popup, exibindo-as como tags visuais.~~
- ~~**Implementação**:~~
  - ~~Criar um componente de seleção de múltiplas tags que busque as tags existentes~~
  - ~~Implementar visualização de tags como elementos visuais distintos (chips/badges)~~
  - ~~Adicionar funcionalidade de autocompletar baseada nas tags já cadastradas~~

**Detalhes da Resolução:**
- **Data**: 2025-04-01
- **Solução implementada**: Desenvolvido um sistema avançado de seleção e visualização de tags, com sugestões baseadas em tags existentes, exibição como etiquetas visuais, e funcionalidade para adicionar e remover tags facilmente.
- **Resultado**: Interface intuitiva para gerenciar tags, com melhor experiência do usuário e consistência visual.

### ~~5. Dimensões Consistentes do Popup~~ (RESOLVIDO - 2025-04-01)

- ~~**Melhoria**: Padronizar o tamanho do popup para que não varie dependendo da aba ativa.~~
- ~~**Implementação**: Definir dimensões mínimas fixas para o popup e garantir que o conteúdo se adapte a essas dimensões sem causar redimensionamento da janela.~~

**Detalhes da Resolução:**
- **Data**: 2025-04-01
- **Solução implementada**: Estabelecidas dimensões fixas de 400px × 500px para o popup, com regras CSS para garantir largura e altura adequadas, controle de overflow para evitar barras de rolagem desnecessárias e aplicação de layout flexbox para garantir dimensionamento consistente dos contêineres. Foi implementada uma classe `content-container` para padronizar o comportamento das abas.
- **Resultado**: Popup com tamanho consistente entre todas as abas, melhorando a experiência do usuário ao eliminar redimensionamentos indesejados durante a navegação entre diferentes seções.

### 6. Visualização Embarcada de Links

- **Melhoria**: Na aba Itens Salvos do painel de Opções, exibir a página associada dentro de um Dialog com iframe ao clicar no link.
- **Implementação**:
  - Criar um componente Dialog que contenha um iframe
  - Implementar manipulador de eventos para intercepção de cliques em links
  - Garantir que o iframe tenha tamanho adequado e controles para fechar

### 7. Visualização Rápida de Conteúdo Associado

- **Melhoria**: Na aba Itens Salvos do painel de Opções, exibir um Dialog com notas e flashcards ao clicar no número correspondente.
- **Implementação**:
  - Criar componentes de Dialog específicos para exibição de notas e flashcards
  - Implementar lógica para filtrar apenas as notas/flashcards do item selecionado
  - Adição de controles para navegação entre múltiplos itens quando aplicável

### 8. Filtro de Flashcards e Notas por Item Vinculado

- **Melhoria**: Tornar possível filtrar os flashcards e as notas no painel de opções em função do item ao qual estão vinculados.
- **Implementação**:
  - Adicionar filtros por item na interface de visualização de flashcards e notas
  - Criar uma barra de pesquisa que permita filtrar por título ou URL do item
  - Implementar um dropdown com os itens mais recentes para facilitar a seleção

### 9. Identificação de Item Vinculado em Notas

- **Melhoria**: Adicionar a cada uma das notas a identificação do item ao qual ela está vinculada.
- **Implementação**:
  - Criar um componente visual similar ao já implementado nos flashcards
  - Exibir favicon, título e link para o item vinculado
  - Garantir visibilidade tanto no modo de visualização quanto de edição

### 10. Ferramentas na Sidebar

- **Melhoria**: Criar uma seção colapsável de ferramentas na sidebar e mover os botões "Corrigir Referências" e "Mostrar Debug" para lá.
- **Implementação**:
  - Implementar uma seção colapsável na sidebar usando componentes do shadcn-svelte
  - Realocar botões de utilidades para esta seção
  - Adicionar ícones apropriados e tooltip para melhor usabilidade

### 11. Debug em Dialog

- **Melhoria**: Fazer com que os dados exibidos ao clicar em "Mostrar Debug" sejam mostrados em um Dialog.
- **Implementação**:
  - Criar um Dialog específico para exibição de informações de debug
  - Formatar os dados de debug em uma visualização clara e estruturada
  - Adicionar opções para copiar as informações para a área de transferência

### 12. Título para Notas

- **Melhoria**: Fazer com que seja possível adicionar um título às Notas quando elas são criadas.
- **Implementação**:
  - Adicionar um campo de título no formulário de criação e edição de notas
  - Atualizar o modelo de dados para incluir a propriedade de título
  - Modificar a visualização de notas para exibir o título de forma destacada

### 13. Edição de Notas em Dialog

- **Melhoria**: Fazer com que a edição de Notas ocorra em um Dialog, similar aos flashcards.
- **Implementação**:
  - Criar um Dialog específico para edição de notas
  - Adaptar a interface atual de edição para funcionar dentro do Dialog
  - Garantir que todas as funcionalidades existentes sejam mantidas no novo formato

### ~~14. Refinamento do Indicador "Ler Mais Tarde" nos Cards~~ (RESOLVIDO - 2025-04-06)

- ~~**Melhoria**: Aprimorar a exibição e interatividade do indicador de agendamento nos cards de itens salvos.~~
- ~~**Implementação**:~~
    - ~~No card (`SavedItemsCardView`), exibir apenas o ícone `<CalendarClock>` quando um item estiver agendado.~~
    - ~~Implementar lógica de formatação específica para o *tooltip* do ícone `<CalendarClock>` (Hoje/Amanhã/Em X dias/Ontem/Há X dias, às HH:mmh).~~
    - ~~Posicionar o ícone/botão `<CalendarClock>` no rodapé do card, à direita, próximo ao botão de Ações/Editar.~~
    - ~~O ícone `<Info>` (data de adição) deve permanecer na posição atual para itens não agendados.~~
    - ~~Transformar o ícone `<CalendarClock>` em um botão clicável para editar o agendamento.~~

**Detalhes da Resolução:**
- **Data**: 2025-04-06
- **Solução implementada**: Refinado o indicador de agendamento nos cards (`SavedItemsCardView.svelte`). O ícone `<Info>` agora é sempre visível à esquerda. O ícone `<CalendarClock>` aparece apenas para itens agendados, à direita, como um botão clicável (chama `editSchedule` placeholder) com tooltip formatado (ex: "Hoje, às 15:30h").
- **Resultado**: Exibição clara e consistente da data de adição e do status de agendamento, com interação preparada para edição futura.

### ~~15. Remover Título Redundante (Itens Salvos)~~
(CONCLUIDO - 2025-04-08)

- **Melhoria**: Remover o título "Itens Salvos" do corpo principal da página (`SavedItemsView`), pois o título já existe na navegação.
- **Implementação**:
    - Remover o elemento `<h1>Itens Salvos</h1>` do template de `SavedItemsView.svelte`.

### ~~16. Reorganizar Layout Superior (Itens Salvos)~~
(CONCLUIDO - 2025-04-08)

- **Melhoria**: Posicionar as abas de visualização (Tabela, Cartões, etc.) acima da barra de pesquisa e filtros.
- **Implementação**:
    - Mover o bloco `<Tabs.Root>` para antes do `div` que contém `Input type="search"` e os `Select`/`DropdownMenu` de filtros/ordenação em `SavedItemsView.svelte`.

### ~~17. Área de Rolagem para Cartões com Cabeçalho/Rodapé Fixos~~
(CONCLUIDO - 2025-04-08)

- **Melhoria**: Fazer com que apenas a área dos cartões de itens salvos seja rolável, mantendo as abas, filtros e botões de gerenciamento global fixos.
- **Implementação**:
    - Em `SavedItemsView.svelte`, estruturar o layout principal usando flexbox (`flex flex-col h-full` ou similar no container geral da página de opções se necessário).
    - O cabeçalho (Abas + Filtros/Ordenação) e o rodapé (Botões Gerenciar Grupos/Tags) devem ter altura fixa (`flex-shrink-0`).
    - A área de conteúdo (`Tabs.Content`) que contém `SavedItemsCardView` deve ocupar o espaço restante (`flex-grow`) e ter `overflow-y-auto` ou ser envolvida por um componente `ScrollArea` configurado para ocupar o espaço disponível.

### ~~18. Truncar Título do Card~~
(CONCLUIDO - 2025-04-08)

- **Melhoria**: Garantir que títulos longos nos cartões sejam truncados em uma única linha com reticências.
- **Implementação**:
    - No componente `SavedItemsCardView.svelte`, aplicar a classe `truncate` do TailwindCSS ao elemento `<h3>` que exibe `item.title` (substituindo ou complementando `line-clamp-2` se necessário).

### ~~19. Refinar Rolagem Horizontal das Pills (Grupos/Tags)~~ (CONCLUÍDO - 2025-04-08)

- **Melhoria**: Aprimorar a experiência de rolagem horizontal para as pills de Grupos e Tags dentro dos cards quando excedem a largura.
- **Implementação**:
    - Em `SavedItemsCardView.svelte`, a solução com `Carousel` e `overflow-x-auto` foi implementada.
    - **Correção (2025-04-08):** Removida a condição (`> 3` itens) para renderização dos botões de navegação do carrossel (`Carousel.Previous`, `Carousel.Next`). Agora, os botões são sempre renderizados (mas ocultos por `opacity-0`) e a biblioteca do carrossel controla sua visibilidade (`disabled:opacity-0`) com base no overflow real, garantindo que apareçam quando necessário, independentemente do número de itens.
    - Considerar adicionar botões de navegação ("<" e ">") que aparecem condicionalmente para facilitar a rolagem.
    - Explorar a possibilidade de ocultar a barra de rolagem visualmente, mantendo a funcionalidade.
    - Como alternativa, implementar um indicador "+X mais" se a lista for muito longa.

### ~~20. Refinar Diálogos de Gerenciamento de Grupos e Tags~~ (CONCLUÍDO - 2025-04-08)

- **Melhoria**: ~~Aprimorar a UI/UX dos diálogos modais para gerenciar grupos e tags diretamente dos cards de itens salvos.~~
- **Detalhes da Resolução:**
  - **Data**: 2025-04-08
  - **Solução implementada**: Refatorados os diálogos em `SavedItemsCardView.svelte`:
     - **Geral (Ambos Diálogos):**
        - Adicionado cabeçalho idêntico ao do card principal (Favicon 32px, Título, URL) com truncamento correto.
        - Adicionados contadores (ex: "Grupos Selecionados: 2 / 5", "Tags Selecionadas: 3 / 10").
     - **Diálogo de Grupos:**
        - Implementada funcionalidade para criar novo grupo (nome + cor) diretamente no diálogo.
        - Substituídos checkboxes por pills clicáveis (usando `button`) para selecionar/desselecionar grupos, com indicador visual (borda + ícone Check).
     - **Diálogo de Tags:**
        - Exibição de *todas* as tags do sistema (`getAllTags`) como pills clicáveis para seleção/desseleção, com indicador visual.
        - Mantida a funcionalidade de adicionar novas tags via input.
        - Corrigida lógica de abertura do diálogo e reatividade do contador.
- **Resultado**: Diálogos de gerenciamento de grupos e tags nos cards mais informativos, consistentes com a UI geral e funcionais.

### ~~21. Exibir Mensagem para Grupos/Tags Vazios nos Cards~~ (CONCLUÍDO - 2025-04-08)

- **Melhoria**: ~~Nos cards de itens salvos, exibir uma mensagem indicativa quando não houver grupos ou tags atribuídos.~~
- **Detalhes da Resolução:**
  - **Data**: 2025-04-08
  - **Solução implementada**: Adicionados blocos `{:else}` aos `#if` que controlam a exibição dos carrosséis de grupos e tags em `SavedItemsCardView.svelte`, mostrando um texto como "Nenhum grupo atribuído" ou "Nenhuma tag atribuída".
- **Resultado**: Melhor feedback visual para o usuário quando um item não possui grupos ou tags.

## Novas Implementações

### 1. Refatorar Sistema de Filtros e Ordenação (Prioridade: Alta) (CONCLUÍDO)

- **Feature**: Modernizar e tornar mais poderosa a funcionalidade de filtrar e ordenar os itens salvos na página de opções.
- **Implementação**: Abordagem faseada (ver detalhes no plano original `refatoracao-filtros-ordenacao.md`, agora arquivado/integrado aqui e no diário).
  - ~~Fase 1 (Fundação UI Sheet): Concluída (2025-04-11).~~ 
  - ~~Fase 2 (Componentes Avançados + Pills): Concluída (2025-04-09).~~
  - ~~Fase 3 (Lógica Avançada - Busca, OR, Negativo): Concluída (2025-04-11).~~
  - ~~Fase 4 (Ordenação Múltipla): Concluída (2025-04-14).~~ 
    - ~~UI com múltiplos níveis, add/remove, ScrollArea.~~
    - ~~Lógica de ordenação multi-nível funcional.~~
    - ~~Implementada exclusão mútua (Data/Data, Título/URL) e prevenção de repetição na seleção de critérios.~~
    - ~~Removido critério padrão ao adicionar novo nível.~~
  - ~~Fase 5 (Persistência - Filtros Nomeados): Concluída (2025-04-12).~~
  - ~~Agrupamento visual por data: Concluído (2025-04-15).~~
    - ~~Implementado agrupamento visual por data na visualização de cards quando o critério primário é `dateAdded` ou `scheduledDate`.~~
    - ~~A lógica de agrupamento utiliza categorias relativas (Hoje, Ontem, Esta Semana, etc.) e agrupa corretamente por mês/ano para datas antigas.~~
    - ~~A sub-ordenação dentro de cada grupo respeita os critérios secundários e terciários definidos pelo usuário.~~
    - ~~O utilitário `getSortedDateGroupKeys` foi aprimorado para aceitar a direção de ordenação e inverter a ordem dos grupos conforme o usuário alterna entre ascendente/descendente.~~
    - ~~O componente de visualização de cards foi atualizado para passar a direção correta ao utilitário de agrupamento.~~
    - ~~Refatoração para uso correto de `$derived` em Svelte 5, eliminando autodependências e problemas de reatividade.~~
    - ~~Ajustes de tipagem explícita para garantir compatibilidade com TypeScript e Svelte 5.~~
    - ~~Correção de diversos erros de linter relacionados a stores, reatividade e tipagem.~~
    - **Novidade (2025-04-15 19:29:36):** Os tooltips dos títulos dos grupos de data agora exibem o intervalo real de datas para todos os agrupamentos, incluindo grupos dinâmicos de mês (ex: "Abril de 2025") e ano (ex: "2024"). Veja registro detalhado no diário.
- **Próximos Passos:**
  - Refinar estilos visuais dos títulos dos grupos de data.
  - Adicionar tooltips ou informações complementares nos agrupamentos.
  - Implementar visualização Kanban e Fluxo.
  - Realizar testes de performance com grandes volumes de dados.

### 2. Verificação de Duplicatas 
// Renumerado (era NI#1 duplicado)

- **Feature**: Ao salvar um item, verificar se a URL correspondente já existe no banco de dados.
- **Implementação**:
  - Adicionar função para buscar URLs existentes antes de salvar
  - Implementar diálogo de confirmação com opções para atualizar o item existente ou criar um novo
  - Garantir que metadados como data de modificação sejam atualizados apropriadamente

### 3. Visualização em Modo KanBan 
// Renumerado (era NI#2)

- **Feature**: Implementar visualização de itens salvos em modo KanBan.
- **Implementação**:
  - Criar componentes para quadro Kanban, colunas e cartões
  - Adicionar lógica para agrupar itens por status ou categorias personalizáveis
  - Implementar funcionalidade de drag-and-drop para mover itens entre colunas
  - Salvar o estado das colunas nas preferências do usuário

### 4. Sidebar para Painel de Opções 
// Renumerado (era NI#3)

- **Feature**: Implementar sidebar para o painel de opções usando o componente sidebar do shadcn-svelte.
- **Implementação**:
  - Integrar o componente sidebar do shadcn-svelte
  - Reorganizar a navegação do painel de opções para usar a sidebar
  - Garantir responsividade para diferentes tamanhos de tela

### 5. Seletor de Tema Aprimorado

- **Feature**: Na aba Configurações, seção Aparência, substituir a implementação atual por um switch entre modo claro, modo escuro e padrão do navegador.
- **Implementação**:
  - Criar componente de seleção com três opções (claro, escuro, sistema)
  - Implementar lógica para aplicar o tema selecionado imediatamente
  - Garantir persistência da preferência entre sessões

### 6. Dashboard de Atividades

- **Feature**: No painel de opções, adicionar aba para exibir atividade em heatmap, próximas revisões, leituras agendadas e estatísticas gerais.
- **Implementação**:
  - Criar componente de heatmap para visualização de atividade
  - Implementar visualizações para próximas revisões de flashcards
  - Adicionar seção para itens marcados para leitura posterior
  - Criar dashboards com estatísticas gerais de uso (total de itens, notas, flashcards, etc.)
  - Implementar gráficos de progresso de estudo com flashcards

### 7. Visualização de Flashcards em KanBan
// Renumerado (era NI#4)

- **Feature**: Adicionar ao switch de opções de exibição de flashcards a visualização em KanBan.
- **Implementação**:
  - Adaptar a implementação do KanBan de itens para os flashcards
  - Criar opções para agrupar por dificuldade, tags ou datas de revisão
  - Implementar funcionalidade para mover flashcards entre grupos (por exemplo, de "Para revisar" para "Revisados")

### 8. Dashboard de Flashcards
// Renumerado (era NI#5)

- **Feature**: Adicionar a visualização de atividade, desempenho, agendamento, etc., na aba de flashcards no painel de opções.
- **Implementação**:
  - Criar gráficos e visualizações para métricas de desempenho de estudo
  - Implementar uma linha do tempo de revisões passadas e agendadas
  - Adicionar estatísticas sobre retenção e progresso
  - Criar um sistema visual para identificar flashcards que precisam de atenção

### 9. Respostas a Notas
// Renumerado (era NI#6)

- **Feature**: Adicionar a possibilidade de "responder" às notas.
- **Implementação**:
  - Expandir o modelo de dados para incluir respostas aninhadas
  - Criar UI para exibir e criar respostas a notas existentes
  - Implementar um sistema de notificações para novas respostas
  - Adicionar funcionalidades para ordenar e filtrar respostas

### 10. Anotações de Texto Selecionado
// Renumerado (era NI#7)

- **Feature**: Adicionar a possibilidade de criar anotações relativas a trechos de texto selecionado em páginas da web (similar ao Hypothesis).
- **Implementação**:
  - Criar um sistema para capturar e armazenar seleções de texto
  - Implementar um popup contextual quando texto é selecionado
  - Desenvolver um mecanismo para destacar texto anotado quando a página é revisitada
  - Criar uma visualização agregada de todas as anotações por página

### 11. Anotações em Vídeos
// Renumerado (era NI#8)

- **Feature**: Adicionar a possibilidade de adicionar anotações a vídeos (similar ao Annotate.tv).
- **Implementação**:
  - Criar sistema para capturar timestamps em vídeos
  - Implementar interface para adicionar e visualizar anotações em pontos específicos
  - Desenvolver funcionalidade para buscar e navegar entre anotações
  - Adicionar suporte para exportar anotações de vídeo

### 12. Editor Rich Text (TipTap)
// Renumerado (era NI#9)

- **Feature**: Implementar o TipTap aos campos de criação e edição de Notas e Flashcards.
- **Implementação**:
  - Integrar a biblioteca TipTap nos componentes de edição
  - Configurar as extensões relevantes (negrito, itálico, listas, links, etc.)
  - Adaptar o armazenamento para suportar conteúdo formatado
  - Garantir que a renderização preserve a formatação em todos os contextos

### 13. Visualizações Múltiplas para Itens Salvos (Tabela, Cartões, Kanban, Fluxo)
// Renumerado (era NI#10)

- **Feature**: Refatorar a `SavedItemsView` para oferecer múltiplos modos de visualização dos itens salvos.
- **Implementação**:
    - ~~Utilizar o componente `Tabs` do `shadcn-svelte` para permitir a alternância entre as visualizações.~~ (CONCLUÍDO em 2025-04-05)
    - **Visualização em Tabela**: Implementar usando o componente `DataTable` do `shadcn-svelte` e `@tanstack/table-core`, exibindo colunas como Título, URL, Favorito, Ler Mais Tarde (Data), Grupos, Tags, Notas, Flashcards, Criado em, e Ações. Incluir funcionalidades de ordenação, filtragem e seleção.
    - ~~**Visualização em Cartões**: Manter e refatorar a visualização atual baseada em cards (`SavedItemCard`) em um componente separado (`SavedItemsCardView`).~~ (CONCLUÍDO em 2025-04-05)
    - **Visualização em Kanban**: Implementar uma visualização em quadros, provavelmente agrupando por Grupos (ver item existente NI#2).
    - **Visualização em Fluxo**: Implementar usando a biblioteca `@xyflow/svelte` para visualizar conexões entre itens (ver item existente no `planejamento.md`).
    - Cada visualização será implementada em um componente Svelte separado (`SavedItemsTableView`, `SavedItemsCardView`, `SavedItemsKanbanView`, `SavedItemsFlowView`).

### 22. Ajuste Definitivo da Rolagem dos Cartões na Aba Itens Salvos (CONCLUÍDO - 2025-04-15)

- **Melhoria**: Garantir que apenas a área dos cartões seja rolável, sem ultrapassar o limite visual da tab.
- **Implementação**:
    - Refatoração do layout usando flexbox moderno (`flex flex-col h-full min-h-0` nos containers principais).
    - Uso de `flex-grow`, `min-h-0` e `overflow-hidden` para garantir que a `ScrollArea` dos cartões respeite o espaço da tab.
    - Remoção de alturas fixas e backgrounds de debug após validação visual.
- **Resultado**: A rolagem dos cartões está perfeita, sem overflow, com barra de rolagem visível apenas na área correta, proporcionando experiência profissional e responsiva.

## Plano de Execução

### ~~Fase 1: Correções Críticas (Prioridade Alta)~~ (CONCLUÍDA em 2025-04-04)
- ~~Focar na resolução dos problemas de performance do popup~~ (CONCLUÍDO em 2025-04-01)
- ~~Corrigir problemas de exibição na página de opções~~ (CONCLUÍDO em 2025-04-02)
- ~~Resolver problemas de sincronização entre storage.local e componentes~~ (CONCLUÍDO em 2025-04-04)
- ~~Estimar 3 dias para investigação e otimização~~

### Fase 2: Melhorias de UI/UX (Prioridade Média)
- ~~Implementar melhorias 2 (dropdowns) e 4 (sistema de tags)~~ (CONCLUÍDA em 2025-04-01)
- ~~Implementar melhoria 3 (cards de URL/título)~~ (CONCLUÍDA em 2025-04-01/02)
- ~~Implementar melhoria 1 (feedback de salvamento)~~ (CONCLUÍDA em 2025-04-02)
- ~~Implementar melhoria 5 (dimensões do popup)~~ (CONCLUÍDA em 2025-04-01)
- Estimar 5-7 dias para estas implementações

### Fase 3: Implementação de Visualizações de Itens Salvos (Prioridade Média-Alta)
- ~~Implementar estrutura de Abas (`Tabs`) na `SavedItemsView`.~~ (CONCLUÍDO em 2025-04-05)
- Implementar a **Visualização em Tabela** (`SavedItemsTableView`) com `DataTable`. (Estimar 3-4 dias)
- ~~Refatorar a **Visualização em Cartões** (`SavedItemsCardView`).~~ (CONCLUÍDO em 2025-04-05)
- Implementar a **Visualização em Kanban** (`SavedItemsKanbanView`). (Ver estimativa NI#2, ~5-7 dias)
- Implementar a **Visualização em Fluxo** (`SavedItemsFlowView`) com `@xyflow/svelte`. (Estimar ~4-5 dias)
- *Substitui parcialmente NI#2 (Kanban) e adiciona Tabela/Fluxo a esta fase.*

### Fase 4: Melhorias de Visualização e Organização (Prioridade Média-Baixa)
- Implementar melhorias 6-7 (visualização embarcada, diálogos de conteúdo)
- Implementar melhorias 8-13 (filtros, identificação, ferramentas, debug, títulos e edição em dialog)
- ~~Implementar melhoria 14 (Refinamento Indicador "Ler Mais Tarde")~~ (CONCLUÍDO em 2025-04-06)
- Implementar melhorias 15-19 (Layout Itens Salvos: título, abas, scroll fixo, truncamento, scroll pills)
- *Reorganizada para focar em melhorias gerais após as visualizações principais.*
- Estimar ~~10-15 dias~~ 13-19 dias para estas implementações (adicionado ~3-4 dias para MU#15-19)

### Fase 5: Novas Features e Refinamentos (Prioridade Variável)
- Implementar verificação de duplicatas (Prioridade Alta) - 2 dias
- ~~Implementar correções de sincronização de armazenamento (Prioridade Alta) - 3 dias~~ (CONCLUÍDO em 2025-04-04)
- Implementar sidebar para painel de opções (Prioridade Média) - 3 dias
- Implementar seletor de tema aprimorado (Prioridade Média) - 1 dia
- Implementar dashboard de atividades (Prioridade Baixa) - 7-10 dias
- Implementar recursos avançados (anotações de texto, vídeo, TipTap) - 15-20 dias

## Considerações Finais

Este plano é flexível e pode ser ajustado conforme necessidades emergentes ou descobertas durante o desenvolvimento. A priorização foi feita considerando o impacto na experiência do usuário e a complexidade de implementação.

As correções de performance foram abordadas com sucesso, melhorando significativamente a experiência do usuário. A implementação de componentes modernos do shadcn-svelte e do sistema de tags aprimorado também representa um avanço importante para a usabilidade da extensão.

As correções na página de opções e a migração para a sintaxe moderna do Svelte 5 resolveram problemas críticos que impediam a navegação e visualização correta de conteúdo. O uso de toast notifications e a padronização dos componentes visuais contribuíram para uma experiência mais coesa e agradável.

Avanços significativos foram alcançados na interface de visualização de itens salvos, com um redesign completo dos cards que agora exibem melhor as informações, permitem interações mais intuitivas e oferecem uma experiência visual mais rica. A correção dos problemas de sincronização entre o storage e os componentes garante uma resposta imediata às ações do usuário, eliminando a frustração causada pela falta de feedback visual após operações.

Os próximos passos se concentrarão em implementar as novas visualizações (Tabela, Kanban, Fluxo) dentro de uma estrutura de abas na página de Itens Salvos, oferecendo maior flexibilidade ao usuário. Após isso, o foco será em melhorias adicionais de usabilidade e na implementação de novas funcionalidades como dashboards e anotações avançadas. 