# Extensor de Navegador

Uma extensão para Chrome que permite salvar páginas, fazer anotações e criar flashcards para revisão espaçada de conteúdos.

## Funcionalidades

### Salvar Páginas
- Salve páginas da web para acesso posterior
- Adicione tags e comentários para organizar suas páginas salvas
- Opção "Ler mais tarde" com agendamento
- Organização por grupos personalizados

### Notas
- Crie notas rápidas associadas às páginas salvas
- Personalize com cores e tags
- Visualize em lista ou modo fluxo
- Busque e filtre suas notas

### Flashcards
- Crie flashcards associados às páginas salvas
- Sistema de repetição espaçada para revisão eficiente
- Estude seus flashcards organizados por tópicos
- Acompanhe seu progresso de aprendizado

## Requisitos para Desenvolvimento

- [Node.js](https://nodejs.org/) (v16 ou superior)
- [npm](https://www.npmjs.com/) ou [pnpm](https://pnpm.io/) (recomendado)

## Instalação para Desenvolvimento

1. Clone este repositório
```bash
git clone https://github.com/seu-username/extensor-de-navegador.git
cd extensor-de-navegador
```

2. Instale as dependências
```bash
npm install
# ou
pnpm install
```

3. Execute o servidor de desenvolvimento
```bash
npm run dev
# ou
pnpm dev
```

4. Carregue a extensão no Chrome
   - Abra o Chrome e navegue para `chrome://extensions/`
   - Ative o "Modo do desenvolvedor"
   - Clique em "Carregar sem compactação" e selecione a pasta `dist` do projeto

## Tecnologias Utilizadas

- [Svelte](https://svelte.dev/) - Framework de UI
- [TypeScript](https://www.typescriptlang.org/) - Tipagem estática
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/) - APIs da extensão

## Estrutura de Arquivos

```
src/
├── assets/           # Ícones e imagens da extensão
├── background/       # Script de background
├── components/       # Componentes compartilhados
├── content/          # Scripts de conteúdo
├── lib/              # Componentes de biblioteca
│   └── components/   # Componentes reutilizáveis
├── options/          # Página de opções da extensão
│   └── views/        # Vistas para a página de opções
├── popup/            # Popup da extensão
├── sidepanel/        # Painel lateral
├── storage.ts        # Gerenciamento de armazenamento
└── types.ts          # Definições de tipos
```

## Licença

MIT
