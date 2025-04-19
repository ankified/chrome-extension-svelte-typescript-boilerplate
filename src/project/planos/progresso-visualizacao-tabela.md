# Acompanhamento de Progresso - Visualização da Tabela

Este documento registra o progresso das melhorias planejadas para a visualização da tabela de itens salvos.

## Checklist de Funcionalidades

- [ ] **Coluna "Tipo" com Toggle Group e Ícones**
  - [✅] Renomear a coluna "Ler Mais Tarde" para "Tipo".
  - [✅] Exibir a coluna "Tipo" apenas quando a opção "Todos" estiver selecionada no ToggleGroup.
  - [✅] Implementar um ToggleGroup de exibição (Bookmarks, Ler Mais Tarde, Todos) acima da tabela, em vez de dentro da coluna Tipo.
  - [⚠️] Exibir ícone de bookmark ou clock na célula, conforme o tipo do item. (Implementado, mas não está funcionando)

- [ ] **Botão de Ordenação em Cada Coluna**
  - [ ] Adicionar um botão de ordenação (ícone de seta dupla) ao lado do título de cada coluna ordenável.
  - [ ] Permitir alternar entre ascendente, descendente e sem ordenação.

- [ ] **Expansão de Linha com Detalhes**
  - [ ] Ao expandir uma linha, exibir detalhes do item: comentário, tags, grupos, etc.
  - [ ] Layout limpo e visualmente separado.

- [ ] **Botão para Expandir/Recolher Todos**
  - [ ] Adicionar um botão no header para expandir ou recolher todas as linhas de uma vez.

- [ ] **Ações em Lote**
  - [ ] Exibir barra de ações quando um ou mais itens estiverem selecionados.
  - [ ] Implementar ação de exclusão em lote.
  - [ ] Implementar ação de alteração de grupo em lote.
  - [ ] Implementar ação de alteração de tags em lote.
  - [ ] Outras ações relevantes para múltiplos itens.

- [ ] **Melhorias de Interface e Usabilidade**
  - [ ] Adicionar botão de opções gerais no header da coluna de opções por linha.
  - [ ] Acrescentar campo de pesquisa acima da tabela, seguindo o padrão do campo de busca dos cards.
  - [ ] Quando "Ler Mais Tarde" estiver selecionado, exibir também as colunas "Agendado para" e "Status" (com pills coloridas para pendente, concluído ou atrasado).

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

---

*Última atualização: 2025-04-18* 