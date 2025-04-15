# Planejamento: Melhoria UX #10 - Ferramentas na Sidebar

**Data:** 2025-04-10 (ou data atual)

**Responsável:** (Seu Nome/AI)

**Status:** Planejado

---

## Objetivo

Reorganizar a barra lateral da página de opções (`OptionsPage`) para torná-la mais limpa e intuitiva, agrupando ações de utilidade/diagnóstico menos frequentes ("Corrigir Referências", "Mostrar Debug") em uma seção dedicada e recolhível ("Ferramentas") utilizando o componente `Accordion` do Shadcn-Svelte.

---

## Modificações Planejadas

*   **Arquivo Principal:** `src/options/OptionsSidebar.svelte` (ou o componente que renderiza a sidebar da página de opções).
*   **Remoções na UI:**
    *   Botão "Corrigir Referências" da lista principal de navegação.
    *   Botão "Mostrar Debug" da lista principal de navegação.
*   **Adições na UI:**
    *   Componente `Accordion` do Shadcn-Svelte na parte inferior da navegação principal.
    *   `AccordionItem` com título "Ferramentas" e ícone `<Wrench>` ou `<Settings2>`.
    *   `AccordionContent` contendo os botões "Corrigir Referências" e "Mostrar Debug".
    *   `Tooltip`s para o gatilho "Ferramentas" e para os botões internos, explicando suas funções.
    *   (Opcional) Ícones para os botões internos (`<Link2Off>`, `<Bug>`).

---

## Impacto na Funcionalidade

*   **Nenhuma funcionalidade existente será removida ou alterada.** As ações dos botões permanecem as mesmas.
*   **A única nova funcionalidade é a interação de UI** para expandir/recolher a seção "Ferramentas".
*   Trata-se exclusivamente de uma **reorganização de design e layout**.

---

## Vantagens

*   **Interface Mais Limpa:** Despolui a navegação principal.
*   **Melhor Organização:** Agrupa logicamente ações menos frequentes.
*   **Foco no Essencial:** Facilita encontrar as seções principais.
*   **Escalabilidade:** Cria um local dedicado para futuras ferramentas.
*   **Consistência Visual:** Usa componentes modernos do Shadcn-Svelte.

---

## Plano de Ação Detalhado

1.  **Identificar Componente:** Localizar o arquivo Svelte exato da barra lateral da página de opções.
2.  **Importar Dependências:** Adicionar imports para `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`, `Button`, `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` e ícones Lucide necessários (`Wrench`, `ChevronDown`, `Link2Off`, `Bug`, etc.) no componente da sidebar.
3.  **Localizar Botões Atuais:** Identificar os elementos `<button>` ou `<a>` para "Corrigir Referências" e "Mostrar Debug" no código.
4.  **Implementar Estrutura do Accordion:**
    *   Adicionar a estrutura básica do `Accordion` abaixo dos links de navegação principais.
    *   Configurar o `AccordionTrigger` com o título "Ferramentas", ícone, e um `Tooltip`.
    *   Configurar o `AccordionContent` como um container flexível (`flex flex-col`).
5.  **Mover e Adaptar Botões:**
    *   Recortar os botões de sua localização original.
    *   Colar os botões dentro do `<AccordionContent>`.
    *   Ajustar o estilo dos botões (`variant="ghost"`, `justify-start`, `w-full`).
    *   Adicionar ícones aos botões, se desejado (`<Bug>`, `<Link2Off>`).
    *   Envolver cada botão com a estrutura `TooltipProvider`/`Tooltip`/`TooltipTrigger`/`TooltipContent` para adicionar dicas de ferramenta.
6.  **Testar:**
    *   Verificar renderização correta da sidebar.
    *   Testar a funcionalidade de expandir/recolher o Accordion.
    *   Confirmar que os botões internos funcionam como esperado.
    *   Verificar a exibição dos Tooltips.
    *   Testar nos temas claro e escuro.

---

## Considerações Adicionais

*   Garantir que a ordem dos elementos na sidebar permaneça lógica (Navegação Principal -> Ferramentas).
*   Verificar se a altura da sidebar se ajusta corretamente com o Accordion expandido/recolhido.
