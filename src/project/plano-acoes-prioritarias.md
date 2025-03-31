# Plano de Ações Prioritárias

Este documento registra as correções, melhorias e novas implementações que devem ser priorizadas no desenvolvimento da extensão. As ações estão organizadas por categoria e nível de prioridade.

## Correções Críticas

### 1. Problemas de Exibição na Página de Opções

- **Problema**: Notas não estão sendo exibidas na aba "Notas" da página de opções, enquanto são exibidas corretamente no popup.
- **Ação**: Investigar a diferença de implementação entre o popup e a página de opções para entender por que as notas são exibidas em um contexto mas não no outro.
- **Hipóteses a verificar**:
  - Diferenças na forma como os dados são carregados
  - Possíveis erros na lógica de filtro ou agrupamento
  - Problemas de timing na inicialização dos componentes
  - Verificar se há diferenças na estrutura dos stores utilizados

### 2. Flashcards Ausentes na Página de Opções

- **Problema**: Flashcards são exibidos corretamente no popup quando a opção "Visualizar" está selecionada, mas não aparecem na aba Flashcards da página de opções.
- **Ação**: Similar ao problema das notas, investigar as diferenças de implementação entre os contextos.
- **Hipóteses a verificar**:
  - Comparar o código de carregamento de flashcards entre popup e página de opções
  - Verificar se existem condicionais que possam estar impedindo a exibição
  - Examinar os logs para possíveis erros silenciosos

## Melhorias de Experiência do Usuário

### 1. Feedback de Salvamento

- **Melhoria**: Eliminar a janela de diálogo do navegador ao salvar uma nota.
- **Implementação**: Substituir o alerta padrão do navegador por um toast ou snackbar personalizado usando o componente do shadcn-svelte.

### 2. Aprimoramento de Interface de Seleção

- **Melhoria**: Usar um dropdown do shadcn-svelte no seletor de grupos na aba de salvar item no popup.
- **Implementação**: Substituir o elemento select atual pelo componente Select do shadcn-svelte, mantendo a mesma funcionalidade mas com uma aparência mais moderna e consistente.

### 3. Visualização Melhorada de URL e Título

- **Melhoria**: Tornar a exibição dos campos de título e URL da aba Salvar semelhantes a cards de social media, incluindo favicon.
- **Implementação**: 
  - Criar um componente de card que exiba o título, URL e favicon da página
  - Implementar um modo de edição que seja ativado apenas quando o usuário clicar no card
  - Adicionar lógica para extrair e exibir o favicon da URL

### 4. Sistema de Tags Aprimorado

- **Melhoria**: Permitir selecionar tags existentes nas abas Salvar, Notas e Flashcards do Popup, exibindo-as como tags visuais.
- **Implementação**:
  - Criar um componente de seleção de múltiplas tags que busque as tags existentes
  - Implementar visualização de tags como elementos visuais distintos (chips/badges)
  - Adicionar funcionalidade de autocompletar baseada nas tags já cadastradas

### 5. Dimensões Consistentes do Popup

- **Melhoria**: Padronizar o tamanho do popup para que não varie dependendo da aba ativa.
- **Implementação**: Definir dimensões mínimas fixas para o popup e garantir que o conteúdo se adapte a essas dimensões sem causar redimensionamento da janela.

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

## Plano de Execução

### Fase 1: Correções Críticas (Prioridade Alta)
- Focar na resolução dos problemas de exibição de notas e flashcards na página de opções
- Estimar 3-5 dias para investigação e correção

### Fase 2: Melhorias de UI/UX (Prioridade Média)
- Implementar melhorias 1-4 (feedback de salvamento, dropdowns, cards de URL/título, sistema de tags)
- Estimar 5-7 dias para estas implementações

### Fase 3: Melhorias de Visualização (Prioridade Média-Baixa)
- Implementar melhorias 5-7 (dimensões do popup, visualização embarcada, diálogos de conteúdo)
- Estimar 4-6 dias para estas implementações

### Fase 4: Novas Features (Prioridade Variável)
- Implementar verificação de duplicatas (Prioridade Alta) - 2 dias
- Implementar sidebar para painel de opções (Prioridade Média) - 3 dias
- Implementar seletor de tema aprimorado (Prioridade Média) - 1 dia
- Implementar visualização em Kanban (Prioridade Baixa) - 5-7 dias
- Implementar dashboard de atividades (Prioridade Baixa) - 7-10 dias

## Considerações Finais

Este plano é flexível e pode ser ajustado conforme necessidades emergentes ou descobertas durante o desenvolvimento. A priorização foi feita considerando o impacto na experiência do usuário e a complexidade de implementação.

As correções críticas devem ser abordadas primeiro, pois afetam diretamente a funcionalidade central da extensão. As melhorias de UI/UX vêm em seguida, pois melhoram significativamente a experiência do usuário sem exigir grandes refatorações de código. 