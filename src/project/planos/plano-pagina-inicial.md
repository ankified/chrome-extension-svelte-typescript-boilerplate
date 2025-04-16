# Planejamento: Página Inicial / Dashboard da Extensão

## Objetivo

Implementar uma página inicial (dashboard) para a extensão, oferecendo ao usuário uma visão geral de sua atividade, progresso e itens importantes, com foco em usabilidade, visual moderno e informações relevantes.

## Tecnologias e Componentes
- Svelte 5
- shadcn-svelte (Cards, DataTable, Heatmap, etc.)
- TailwindCSS
- Integração com stores reativos existentes (itens, notas, flashcards, grupos, tags)
- Bibliotecas de gráficos (ex: chart.js, apexcharts, ou outra compatível com Svelte)

## UX Esperada
- Layout responsivo, adaptado para desktop e telas menores
- Cards informativos com estatísticas rápidas (total de itens, notas, flashcards, grupos, tags)
- Heatmap de atividade (ex: dias com mais interações, salvamentos, revisões)
- Listas de itens mais acessados/recentes
- Principais anotações (notas mais editadas, recentes ou marcadas como importantes)
- Próximos flashcards a serem revisados (com datas e dificuldade)
- Acesso rápido para ações comuns (criar novo item, nota, flashcard)
- Visualização clara de progresso e pendências
- Suporte a tema claro/escuro

## Blocos/Seções Previstas
- **Resumo Rápido**: Cards com totais (itens salvos, notas, flashcards, grupos, tags)
- **Heatmap de Atividade**: Visualização de dias/horas com mais interações (salvamentos, revisões, anotações)
- **Itens Mais Acessados**: Lista dos itens salvos mais visualizados/acessados recentemente
- **Principais Anotações**: Destaque para notas mais importantes, recentes ou editadas
- **Próximos Flashcards a Revisar**: Lista dos flashcards agendados para revisão em breve, com indicação de dificuldade
- **Atalhos Rápidos**: Botões para criar novo item, nota, flashcard, acessar configurações, etc.

## Recursos Funcionais
- Cálculo dinâmico de estatísticas a partir dos stores
- Heatmap interativo (hover para detalhes, filtro por tipo de atividade)
- Listas ordenáveis e filtráveis (itens, notas, flashcards)
- Ações rápidas diretamente dos cards/listas
- Integração com sistema de toast para feedback
- Atualização em tempo real ao modificar dados

## Integração Visual e Técnica
- Utilizar Cards e componentes visuais do shadcn-svelte para consistência
- Integrar bibliotecas de gráficos para heatmap e estatísticas visuais
- Garantir performance mesmo com grandes volumes de dados
- Layout flexível, com grid responsivo e adaptação para diferentes tamanhos de tela

## Etapas de Implementação
1. Criar componente HomeView.svelte (ou DashboardView.svelte)
2. Implementar cards de resumo rápido com estatísticas
3. Integrar e configurar componente de heatmap de atividade
4. Implementar listas de itens mais acessados e principais anotações
5. Implementar lista de próximos flashcards a revisar
6. Adicionar atalhos rápidos para ações comuns
7. Integrar com stores e garantir atualização reativa
8. Testar responsividade, performance e acessibilidade
9. Refinar UX, tooltips, feedback visual e integração com tema
10. Documentar uso e limitações

## Considerações Finais
- Priorizar informações mais relevantes para o usuário
- Garantir visual limpo, moderno e consistente com o restante da extensão
- Testar integração com diferentes volumes de dados e cenários de uso
- Validar acessibilidade e navegação por teclado 