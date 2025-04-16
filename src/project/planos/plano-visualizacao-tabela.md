# Planejamento: Visualização em Tabela dos Itens Salvos

## Objetivo

Implementar uma visualização em tabela para os itens salvos na página de opções, permitindo ao usuário visualizar, filtrar, ordenar e interagir com os dados de forma eficiente e moderna.

## Tecnologias e Componentes
- Svelte 5
- shadcn-svelte (DataTable)
- @tanstack/table-core
- TailwindCSS
- Integração com stores reativos existentes

## UX Esperada
- Tabela responsiva, com rolagem horizontal em telas pequenas
- Cabeçalho fixo ao rolar
- Colunas ordenáveis e redimensionáveis
- Filtros rápidos por texto, tags, grupos, datas
- Seleção de múltiplas linhas para ações em lote (ex: excluir, mover)
- Ações contextuais por linha (menu de ações: editar, excluir, abrir, etc.)
- Tooltips para campos truncados (título, URL)
- Feedback visual para linhas selecionadas
- Suporte a tema claro/escuro

## Colunas Previstas
- Título
- URL
- Favorito (ícone)
- Ler Mais Tarde (data)
- Grupos (pills)
- Tags (pills)
- Notas (contador/atalho)
- Flashcards (contador/atalho)
- Criado em (data)
- Ações (menu dropdown)

## Recursos Funcionais
- Ordenação por qualquer coluna
- Filtros por texto, tags, grupos, datas
- Paginação ou virtualização para grandes volumes
- Seleção de múltiplas linhas
- Ações em lote (excluir, mover para grupo, adicionar tag)
- Exportação dos dados filtrados/selecionados
- Integração com o sistema de toast para feedback

## Integração com DataTable (shadcn-svelte)
- Utilizar o componente DataTable do shadcn-svelte como base
- Gerenciar estado de seleção, ordenação e filtros via stores Svelte
- Customizar células para exibir ícones, pills, tooltips e menus
- Integrar com @tanstack/table-core para lógica de tabela avançada

## Etapas de Implementação
1. Criar componente SavedItemsTableView.svelte
2. Integrar DataTable do shadcn-svelte e configurar colunas básicas
3. Implementar ordenação e filtros por coluna
4. Adicionar seleção de linhas e ações em lote
5. Customizar células para exibir ícones, pills, tooltips e menus
6. Integrar com stores de itens salvos, grupos, tags, notas e flashcards
7. Testar responsividade e acessibilidade
8. Refinar UX, tooltips, feedback visual e integração com tema
9. Documentar uso e limitações

## Considerações Finais
- Priorizar performance e usabilidade para grandes volumes de dados
- Garantir consistência visual com as demais visualizações (cards, kanban)
- Testar integração com filtros e ordenação já existentes
- Validar acessibilidade e navegação por teclado 