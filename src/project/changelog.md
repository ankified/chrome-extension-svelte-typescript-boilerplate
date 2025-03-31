# Changelog do Projeto

Este arquivo mantém um registro cronológico das alterações, melhorias e correções implementadas na extensão.

## 2025-03-31 (Atualizado às 17:39)

### Correções e melhorias nos Flashcards
- ✅ Corrigido problema de exibição dos flashcards na página de opções
- ✅ Corrigido problema de exibição das cores nos flashcards
- ✅ Substituídas cores muito claras por cores mais vibrantes para melhor visibilidade
- ✅ Adicionada cor teal como padrão para flashcards novos

### Interface de edição de Flashcards
- ✅ Migrado formulário de edição de flashcards para Dialog do shadcn-svelte
- ✅ Implementado sistema visual de seleção de cores com feedback ao passar o mouse
- ✅ Adicionados efeitos visuais para melhorar a experiência do usuário
- ✅ Estilização consistente para temas claro e escuro

### Sistema de Tags
- ✅ Implementado sistema visual de tags (chips) para substituir entrada de texto
- ✅ Adicionado suporte para sugestão de tags existentes na base de dados
- ✅ Implementada busca e filtragem de tags durante digitação
- ✅ Adicionada funcionalidade para remover tags com um clique

### Funcionalidade de Item Vinculado
- ✅ Adicionada visualização do item vinculado nos flashcards
- ✅ Implementado componente que exibe favicon e título do item original
- ✅ Adicionado botão para abrir o item vinculado em nova aba
- ✅ Implementada visualização na frente, verso e no dialog de edição

### Melhorias gerais e correções de bugs
- ✅ Corrigidos erros de lint em vários componentes
- ✅ Otimizada tipagem e interfaces para o TypeScript
- ✅ Melhorado o tratamento de erros com logs detalhados
- ✅ Corrigido tipo na interface do Flashcard para incluir a propriedade color

## 2025-03-30

### Correções na página de opções
- ✅ Corrigido problema de exibição das notas na página de opções
- ✅ Implementada função fixReferences para corrigir referências entre itens e notas
- ✅ Aprimorada lógica de agrupamento de notas e flashcards
- ✅ Adicionada visualização alternativa quando não há grupos nem itens desvinculados

### Documentação e planejamento
- ✅ Atualizado documento de estado atual da implementação
- ✅ Atualizado plano de ações prioritárias
- ✅ Documentado fluxo de dados entre componentes

## 2025-03-29

### Organização do código
- ✅ Migração dos componentes para Svelte 5 ($state, $props, $derived)
- ✅ Padronização dos nomes de componentes e variáveis
- ✅ Melhorada estrutura de armazenamento de dados
- ✅ Implementada consistência de tipos em todos os componentes

### Interface do usuário
- ✅ Implementadas melhorias na navegação entre abas
- ✅ Adicionado suporte completo a tema claro e escuro
- ✅ Aprimorada experiência visual nos componentes principais
- ✅ Corrigidos problemas de responsividade 