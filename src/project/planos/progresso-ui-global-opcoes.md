# Acompanhamento de Progresso - UI Global da Página de Opções

## Ações Prioritárias

- [x] Quando o sidebar estiver recolhido, os botões correspondentes a cada seção devem ser mostrados.
- [ ] Na seção "Itens salvos", exibir as opções: Visão geral, Itens e Fluxo (em vez das opções de visualização).
- [x] A escolha do tipo de visualização (Cartões, Tabela ou KanBan) será feita em um ToggleGroup na página de itens.
- [x] A visualização em fluxo será selecionada como uma opção da seção "Itens salvos", não mais no ToggleGroup.
- [x] Adicionar uma seção para o usuário alternar entre diferentes projetos. Cada projeto terá seu próprio conjunto de itens salvos, flashcards, anotações, etc.
- [x] Exibir o título do projeto no header do sidebar, junto aos botões de alternar/criar projeto (ambos em Dialogs).
- [x] No footer do sidebar, adicionar botão de configurações e botão de informações (Popover com dados do projeto: nome, descrição, data de criação, quantidade de itens salvos, bookmarks, ler mais tarde, notas, flashcards).
- [ ] No header da página de opções, adicionar botão de notificações alinhado à direita. O ícone muda de cor se houver notificações para o dia atual. Ao clicar, exibir Dialog com itens agendados para hoje e próximas notificações.
- [ ] Em Configurações > Aparência, permitir escolha entre diferentes temas e modo padrão (claro, escuro, sistema).
- [ ] Melhorar a aparência da visualização de configurações.
- [ ] Adicionar botão de alternar entre modo claro/escuro ao header do sidebar.

## Checklist de Funcionalidades

- [ ] **Layout Responsivo e Estrutura Principal**
  - [ ] Garantir responsividade em todas as resoluções (desktop, tablet, mobile).
  - [x] Sidebar fixa e colapsável.
  - [ ] Header com título, logo e ações rápidas.
  - [ ] Área principal adaptável para diferentes módulos (tabela, cards, configurações, etc).

- [x] **Navegação e Usabilidade**
  - [x] Menu lateral com navegação clara entre seções (Itens Salvos, Grupos, Tags, Preferências, etc).
  - [x] Destaque visual para a seção ativa.
  - [x] Breadcrumbs ou indicação de contexto quando aplicável.

- [ ] **Temas e Acessibilidade**
  - [ ] Suporte a tema claro/escuro.
  - [ ] Botão de alternância de tema visível e acessível.
  - [ ] Garantir contraste adequado e acessibilidade de navegação por teclado.

- [ ] **Feedback e Notificações**
  - [ ] Exibir toasts/avisos para ações importantes (salvar, excluir, erro, etc).
  - [ ] Mensagens de erro e sucesso claras e consistentes.

- [ ] **Performance e UX**
  - [ ] Carregamento rápido e feedback visual durante operações assíncronas.
  - [ ] Skeletons ou spinners para carregamento de dados.
  - [ ] Evitar bloqueios de interface em operações longas.

- [ ] **Documentação e Ajuda**
  - [ ] Links para documentação, tutoriais ou FAQ acessíveis na interface.
  - [ ] Tooltips explicativos em ícones e botões importantes.

## Critérios de UX

- Navegação intuitiva e consistente em toda a página.
- Elementos interativos com feedback visual claro (hover, foco, ativo).
- Layout adaptável e sem sobreposição de elementos em qualquer resolução.
- Mensagens e feedbacks sempre visíveis e não intrusivos.
- Acessibilidade: navegação por teclado, contraste, labels e tooltips.

## Observações e Datas de Conclusão

- Utilize este espaço para registrar decisões, dificuldades, datas de início/conclusão de cada etapa e links para commits relevantes.

---

*Última atualização: 2025-04-18* 