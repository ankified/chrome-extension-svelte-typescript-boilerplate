# Plano de Ações Prioritárias

Este documento registra as correções, melhorias e novas implementações que devem ser priorizadas no desenvolvimento da extensão. As ações estão organizadas por categoria e nível de prioridade.

## Correções Críticas

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

## Novas Implementações

### 1. Verificação de Duplicatas

- **Feature**: Ao salvar um item, verificar se a URL correspondente já existe no banco de dados.
- **Implementação**:
  - Adicionar função para buscar URLs existentes antes de salvar
  - Implementar diálogo de confirmação com opções para atualizar o item existente ou criar um novo
  - Garantir que metadados como data de modificação sejam atualizados apropriadamente

### 2. Visualização em Modo KanBan

- **Feature**: Implementar visualização de itens salvos em modo KanBan.
- **Implementação**:
  - Criar componentes para quadro Kanban, colunas e cartões
  - Adicionar lógica para agrupar itens por status ou categorias personalizáveis
  - Implementar funcionalidade de drag-and-drop para mover itens entre colunas
  - Salvar o estado das colunas nas preferências do usuário

### 3. Sidebar para Painel de Opções

- **Feature**: Implementar sidebar para o painel de opções usando o componente sidebar do shadcn-svelte.
- **Implementação**:
  - Integrar o componente sidebar do shadcn-svelte
  - Reorganizar a navegação do painel de opções para usar a sidebar
  - Garantir responsividade para diferentes tamanhos de tela

### 4. Seletor de Tema Aprimorado

- **Feature**: Na aba Configurações, seção Aparência, substituir a implementação atual por um switch entre modo claro, modo escuro e padrão do navegador.
- **Implementação**:
  - Criar componente de seleção com três opções (claro, escuro, sistema)
  - Implementar lógica para aplicar o tema selecionado imediatamente
  - Garantir persistência da preferência entre sessões

### 5. Dashboard de Atividades

- **Feature**: No painel de opções, adicionar aba para exibir atividade em heatmap, próximas revisões, leituras agendadas e estatísticas gerais.
- **Implementação**:
  - Criar componente de heatmap para visualização de atividade
  - Implementar visualizações para próximas revisões de flashcards
  - Adicionar seção para itens marcados para leitura posterior
  - Criar dashboards com estatísticas gerais de uso (total de itens, notas, flashcards, etc.)
  - Implementar gráficos de progresso de estudo com flashcards

### 6. Visualização de Flashcards em KanBan

- **Feature**: Adicionar ao switch de opções de exibição de flashcards a visualização em KanBan.
- **Implementação**:
  - Adaptar a implementação do KanBan de itens para os flashcards
  - Criar opções para agrupar por dificuldade, tags ou datas de revisão
  - Implementar funcionalidade para mover flashcards entre grupos (por exemplo, de "Para revisar" para "Revisados")

### 7. Dashboard de Flashcards

- **Feature**: Adicionar a visualização de atividade, desempenho, agendamento, etc., na aba de flashcards no painel de opções.
- **Implementação**:
  - Criar gráficos e visualizações para métricas de desempenho de estudo
  - Implementar uma linha do tempo de revisões passadas e agendadas
  - Adicionar estatísticas sobre retenção e progresso
  - Criar um sistema visual para identificar flashcards que precisam de atenção

### 8. Respostas a Notas

- **Feature**: Adicionar a possibilidade de "responder" às notas.
- **Implementação**:
  - Expandir o modelo de dados para incluir respostas aninhadas
  - Criar UI para exibir e criar respostas a notas existentes
  - Implementar um sistema de notificações para novas respostas
  - Adicionar funcionalidades para ordenar e filtrar respostas

### 9. Anotações de Texto Selecionado

- **Feature**: Adicionar a possibilidade de criar anotações relativas a trechos de texto selecionado em páginas da web (similar ao Hypothesis).
- **Implementação**:
  - Criar um sistema para capturar e armazenar seleções de texto
  - Implementar um popup contextual quando texto é selecionado
  - Desenvolver um mecanismo para destacar texto anotado quando a página é revisitada
  - Criar uma visualização agregada de todas as anotações por página

### 10. Anotações em Vídeos

- **Feature**: Adicionar a possibilidade de adicionar anotações a vídeos (similar ao Annotate.tv).
- **Implementação**:
  - Criar sistema para capturar timestamps em vídeos
  - Implementar interface para adicionar e visualizar anotações em pontos específicos
  - Desenvolver funcionalidade para buscar e navegar entre anotações
  - Adicionar suporte para exportar anotações de vídeo

### 11. Editor Rich Text (TipTap)

- **Feature**: Implementar o TipTap aos campos de criação e edição de Notas e Flashcards.
- **Implementação**:
  - Integrar a biblioteca TipTap nos componentes de edição
  - Configurar as extensões relevantes (negrito, itálico, listas, links, etc.)
  - Adaptar o armazenamento para suportar conteúdo formatado
  - Garantir que a renderização preserve a formatação em todos os contextos

### 12. Visualizações Múltiplas para Itens Salvos (Tabela, Cartões, Kanban, Fluxo)

- **Feature**: Refatorar a `SavedItemsView` para oferecer múltiplos modos de visualização dos itens salvos.
- **Implementação**:
    - ~~Utilizar o componente `Tabs` do `shadcn-svelte` para permitir a alternância entre as visualizações.~~ (CONCLUÍDO em 2025-04-05)
    - **Visualização em Tabela**: Implementar usando o componente `DataTable` do `shadcn-svelte` e `@tanstack/table-core`, exibindo colunas como Título, URL, Favorito, Ler Mais Tarde (Data), Grupos, Tags, Notas, Flashcards, Criado em, e Ações. Incluir funcionalidades de ordenação, filtragem e seleção.
    - ~~**Visualização em Cartões**: Manter e refatorar a visualização atual baseada em cards (`SavedItemCard`) em um componente separado (`SavedItemsCardView`).~~ (CONCLUÍDO em 2025-04-05)
    - **Visualização em Kanban**: Implementar uma visualização em quadros, provavelmente agrupando por Grupos (ver item existente NI#2).
    - **Visualização em Fluxo**: Implementar usando a biblioteca `@xyflow/svelte` para visualizar conexões entre itens (ver item existente no `planejamento.md`).
    - Cada visualização será implementada em um componente Svelte separado (`SavedItemsTableView`, `SavedItemsCardView`, `SavedItemsKanbanView`, `SavedItemsFlowView`).

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
- *Reorganizada para focar em melhorias gerais após as visualizações principais.*
- Estimar ~~11-16 dias~~ 10-15 dias para estas implementações (removido ~1 dia para MU#14)

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