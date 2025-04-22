# Acompanhamento de Progresso - Visualização da Tabela

Este documento registra o progresso das melhorias planejadas para a visualização da tabela de itens salvos.

## Correções prioritárias

- [✅] O botão de expandir/colapsar só está funcionando para expandir mas não para colapsar.
- [✅] As colunas "Agendado para" e "Status" não estão sendo exibidas e a página de erros mostra mensagens dizendo que essas colunas não existem.
- [✅] O input de pesquisa exibe dois botões de excluir.
- [✅] A busca está sendo feita apenas nos títulos, independente do escopo selecionado.
- [✅] A filtragem por grupos não está funcionando.
- [✅] A filtragem por tags não está funcionando.
- [ ] A filtragem por data não está funcionando.
- [✅] A ordenação não está funcionando.

## Checklist de Funcionalidades

- [✅] **Coluna "Tipo" com Toggle Group e Ícones**
  - [✅] Renomear a coluna "Ler Mais Tarde" para "Tipo".
  - [✅] Exibir a coluna "Tipo" apenas quando a opção "Todos" estiver selecionada no ToggleGroup.
  - [✅] Implementar um ToggleGroup de exibição (Bookmarks, Ler Mais Tarde, Todos) acima da tabela, em vez de dentro da coluna Tipo.
  - [✅] Exibir ícone de bookmark ou clock na célula, conforme o tipo do item.

- [✅] **Botão de Ordenação em Cada Coluna**
  - [✅] Adicionar um botão de ordenação (ícone de seta dupla) ao lado do título de cada coluna ordenável.
  - [✅] Permitir alternar entre ascendente, descendente e sem ordenação.
  - [✅] Corrigida a integração do estado de sorting com o TanStack Table e a renderização dos dados. Agora a tabela é reordenada corretamente ao clicar nos botões de ordenação em todas as colunas ordenáveis (Item, Tipo, Grupos, Tags, Notas, Flashcards, Criado em).
  - [✅] Corrigidos erros de linter e ajustada a tipagem do sortingFn para cada coluna.
  - [✅] Removido botão duplicado de ordenação do template.

- [✅] **Expansão de Linha com Detalhes**
  - [✅] Ao expandir uma linha, exibir detalhes do item: comentário, tags, grupos, etc.
  - [✅] Layout limpo e visualmente separado.

- [✅] **Botão para Expandir/Recolher Todos**
  - [✅] Adicionado botão no header da coluna de expansão para expandir ou recolher todas as linhas de uma vez, centralizando o controle global de expansão na tabela.

- [ ] **Ações em Lote**
  - [ ] Exibir barra de ações quando um ou mais itens estiverem selecionados.
  - [ ] Implementar ação de exclusão em lote.
  - [ ] Implementar ação de alteração de grupo em lote.
  - [ ] Implementar ação de alteração de tags em lote.
  - [ ] Outras ações relevantes para múltiplos itens.

- [✅] **Melhorias de Interface e Usabilidade**
  - [✅] Adicionado botão de opções gerais (DropdownMenu) no header da coluna de ações, com menu placeholder e ícone de três pontos vertical, pronto para receber opções futuras.
  - [✅] Acrescentado campo de pesquisa acima da tabela, seguindo o padrão visual e funcional do campo de busca dos cards, com botão de limpar e badge de busca ativa.
  - [✅] Quando "Ler Mais Tarde" estiver selecionado, exibir também as colunas "Agendado para" e "Status" (com pills coloridas para pendente, concluído ou atrasado).
  - [ ] Substituir os inputs das colunas "Notas" e "Flashcards" por botões com ícones de visualizar. Quando clicado, deve abrir um Dialog mostrando os conteúdos dessas colunas.

- [ ] **Funcionalidade de Paginação**
  - [ ] Implementar paginação na tabela de itens salvos.
  - [ ] Permitir navegação entre páginas e seleção de quantidade de itens por página.
  - [ ] Exibir controles de paginação fixos no rodapé da tabela.
  - [ ] Indicar visualmente a página atual e desabilitar botões quando não aplicável (ex: início/fim).
  - [ ] Garantir responsividade dos controles de paginação em telas menores.
  - [ ] Exibir total de itens e intervalo atual (ex: "21-40 de 120").
  - [ ] Manter seleção de itens ao navegar entre páginas (se aplicável).

## Observações e Datas de Conclusão

- Utilize este espaço para registrar decisões, dificuldades, datas de início/conclusão de cada etapa e links para commits relevantes.

### [19/04/2025]
- Removido o botão global antigo acima da tabela; agora o controle está no header da coluna de expansão, garantindo alinhamento visual e melhor usabilidade.
- Adicionado botão de opções gerais no header da coluna de ações, usando DropdownMenu do Shadcn-Svelte.
- Padronizado o campo de busca da tabela para UX igual aos cards, incluindo botão de limpar e badge de busca ativa.

---

*Última atualização: 2025-04-18* 