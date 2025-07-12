# Plano de Implementação: Extensão de Favoritos com Integração ao Google Drive

Este documento descreve o plano de ação e o progresso da implementação da extensão para salvar sites favoritos.

## Visão Geral do Projeto

O objetivo é construir uma extensão para o Google Chrome que permita aos usuários salvar, organizar e gerenciar sites favoritos. A extensão será construída com Svelte 5 e se integrará ao Google Drive para backup e restauração de dados.

## Requisitos Detalhados

- **UI/UX**:
  - [x] Utilizar `shadcn-svelte` com Tailwind CSS v4.
  - [x] Design responsivo e moderno.
- **Funcionalidades por Item Salvo**:
  - [x] Salvar a página da aba atual ou uma URL colada.
  - [x] Adicionar comentários de texto.
  - [x] Atribuir múltiplas etiquetas (tags).
  - [x] Agendar lembretes com data e hora.
  - [x] Registrar e visualizar o histórico de acessos.
- **Organização e Gerenciamento**:
  - [x] Estrutura de pastas e subpastas.
  - [x] Busca por título, URL ou conteúdo do comentário.
  - [x] Filtros por etiquetas, data de criação e existência de comentários.
  - [ ] Agrupamento da visualização por domínio, data de criação, etc.
- **Integração com Google Drive**:
  - [ ] Autenticação segura via OAuth 2.0.
  - [ ] Backup (upload) e restauração (download) dos dados.

## Plano de Ação

A implementação será dividida nas seguintes tarefas:

1.  **Configuração do Ambiente**
    -   [x] Configurar o projeto para usar `shadcn-svelte` e Tailwind CSS v4.
2.  **Estrutura de Dados e Armazenamento Local**
    -   [x] Definir os modelos de dados para itens, pastas, etiquetas, etc.
    -   [x] Implementar a lógica de armazenamento local (CRUD) usando `chrome.storage`.
3.  **Interface do Usuário (Frontend)**
    -   [x] Desenvolver a UI do Popup para salvar novos itens.
    -   [x] Construir a UI base do Painel Lateral (Side Panel) para listar itens e pastas.
    -   [x] Implementar as funcionalidades de busca, filtros e agrupamento no painel lateral.
    -   [x] Desenvolver a view de detalhes do item (edição, histórico, etc.).
4.  **Funcionalidades de Background**
    -   [x] Implementar o sistema de lembretes (alarmes e notificações).
5.  **Integração com Google Drive**
    -   [ ] Implementar o fluxo de autenticação OAuth 2.0.
    -   [ ] Desenvolver a lógica de backup e restauração.
    -   [ ] Atualizar a página de Opções para gerenciar a conta do Google Drive. 