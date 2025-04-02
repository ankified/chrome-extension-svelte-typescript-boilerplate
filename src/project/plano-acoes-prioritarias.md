# Plano de Ações Prioritárias

Este documento registra as correções, melhorias e novas implementações que devem ser priorizadas no desenvolvimento da extensão. As ações estão organizadas por categoria e nível de prioridade.

## Correções Críticas

### ~~1. Problemas de Exibição na Página de Opções~~ (RESOLVIDO)

- ~~**Problema**: Notas não estão sendo exibidas na aba "Notas" da página de opções, enquanto são exibidas corretamente no popup.~~
- ~~**Ação**: Investigar a diferença de implementação entre o popup e a página de opções para entender por que as notas são exibidas em um contexto mas não no outro.~~
- ~~**Hipóteses a verificar**:~~
  - ~~Diferenças na forma como os dados são carregados~~
  - ~~Possíveis erros na lógica de filtro ou agrupamento~~
  - ~~Problemas de timing na inicialização dos componentes~~
  - ~~Verificar se há diferenças na estrutura dos stores utilizados~~

### ~~2. Flashcards Ausentes na Página de Opções~~ (RESOLVIDO)

- ~~**Problema**: Flashcards são exibidos corretamente no popup quando a opção "Visualizar" está selecionada, mas não aparecem na aba Flashcards da página de opções.~~
- ~~**Ação**: Similar ao problema das notas, investigar as diferenças de implementação entre os contextos.~~
- ~~**Hipóteses a verificar**:~~
  - ~~Comparar o código de carregamento de flashcards entre popup e página de opções~~
  - ~~Verificar se existem condicionais que possam estar impedindo a exibição~~
  - ~~Examinar os logs para possíveis erros silenciosos~~

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

## Melhorias de Experiência do Usuário

### 1. Feedback de Salvamento

- **Melhoria**: Eliminar a janela de diálogo do navegador ao salvar uma nota.
- **Implementação**: Substituir o alerta padrão do navegador por um toast ou snackbar personalizado usando o componente do shadcn-svelte.

### ~~2. Aprimoramento de Interface de Seleção~~ (RESOLVIDO - 2025-04-01)

- ~~**Melhoria**: Usar um dropdown do shadcn-svelte no seletor de grupos na aba de salvar item no popup.~~
- ~~**Implementação**: Substituir o elemento select atual pelo componente Select do shadcn-svelte, mantendo a mesma funcionalidade mas com uma aparência mais moderna e consistente.~~

**Detalhes da Resolução:**
- **Data**: 2025-04-01
- **Solução implementada**: Implementado o componente DropdownMenu do shadcn-svelte para selecionar grupos, com suporte a seleção múltipla usando CheckboxItems.
- **Resultado**: Interface mais moderna, consistente e acessível para seleção de grupos.

### ~~3. Visualização Melhorada de URL e Título~~ (RESOLVIDO - 2025-04-01)

- ~~**Melhoria**: Tornar a exibição dos campos de título e URL da aba Salvar semelhantes a cards de social media, incluindo favicon.~~
- ~~**Implementação**:~~ 
  - ~~Criar um componente de card que exiba o título, URL e favicon da página~~
  - ~~Implementar um modo de edição que seja ativado apenas quando o usuário clicar no card~~
  - ~~Adicionar lógica para extrair e exibir o favicon da URL~~

**Detalhes da Resolução:**
- **Data**: 2025-04-01
- **Solução implementada**: Criado o componente PagePreviewCard para exibição de URLs e títulos no estilo de card, com suporte a exibição de favicon usando o serviço do Google, edição de título via popover usando o componente Popover do shadcn-svelte, e limitação de altura com truncamento de texto para consistência visual.
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

## Plano de Execução

### ~~Fase 1: Correções Críticas (Prioridade Alta)~~ (CONCLUÍDA em 2025-04-01)
- ~~Focar na resolução dos problemas de performance do popup~~
- ~~Estimar 3 dias para investigação e otimização~~

### Fase 2: Melhorias de UI/UX (Prioridade Média)
- ~~Implementar melhorias 2 (dropdowns) e 4 (sistema de tags)~~ (CONCLUÍDA em 2025-04-01)
- ~~Implementar melhoria 3 (cards de URL/título)~~ (CONCLUÍDA em 2025-04-01)
- Implementar melhoria 1 (feedback de salvamento)
- Estimar 5-7 dias para estas implementações

### Fase 3: Melhorias de Visualização (Prioridade Média-Baixa)
- ~~Implementar melhoria 5 (dimensões do popup)~~ (CONCLUÍDA em 2025-04-01)
- Implementar melhorias 6-7 (visualização embarcada, diálogos de conteúdo)
- Estimar 4-6 dias para estas implementações

### Fase 4: Melhorias de Organização e Usabilidade (Prioridade Média)
- Implementar melhorias 8-13 (filtros, identificação, ferramentas, debug, títulos e edição em dialog)
- Estimar 7-10 dias para estas implementações

### Fase 5: Novas Features (Prioridade Variável)
- Implementar verificação de duplicatas (Prioridade Alta) - 2 dias
- Implementar sidebar para painel de opções (Prioridade Média) - 3 dias
- Implementar seletor de tema aprimorado (Prioridade Média) - 1 dia
- Implementar visualização em Kanban (Prioridade Baixa) - 5-7 dias
- Implementar dashboard de atividades (Prioridade Baixa) - 7-10 dias
- Implementar recursos avançados (anotações de texto, vídeo, TipTap) - 15-20 dias

## Considerações Finais

Este plano é flexível e pode ser ajustado conforme necessidades emergentes ou descobertas durante o desenvolvimento. A priorização foi feita considerando o impacto na experiência do usuário e a complexidade de implementação.

As correções de performance foram abordadas com sucesso, melhorando significativamente a experiência do usuário. A implementação de componentes modernos do shadcn-svelte e do sistema de tags aprimorado também representa um avanço importante para a usabilidade da extensão.

As próximas melhorias planejadas focam em melhorar ainda mais a experiência do usuário com feedback visual, organização aprimorada e recursos avançados como visualização em Kanban e editor rich text. 