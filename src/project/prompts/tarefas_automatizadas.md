# Prompts para Tarefas Automatizadas

## Análise Inicial do Projeto

Use este prompt quando iniciar uma nova conversa ou sessão com o projeto:

```
Analise o projeto para entender sua estrutura, propósito e tecnologias utilizadas. Especificamente:

1. Examine os arquivos principais do projeto para identificar:
   - Estrutura de diretórios
   - Bibliotecas e frameworks utilizados (Svelte, TypeScript, TailwindCSS, etc.)
   - Componentes principais e sua organização
   - Padrões de codificação adotados

2. Leia detalhadamente os arquivos:
   - src/project/estado-atual-implementacao.md
   - src/project/plano-acoes-prioritarias.md

3. Com base nessa análise:
   - Apresente um resumo do estado atual do projeto
   - Identifique as próximas tarefas prioritárias conforme o plano
   - Sugira qual funcionalidade ou correção deveria ser implementada em seguida

4. Esteja preparado para:
   - Implementar as melhorias descritas no plano de ações prioritárias
   - Corrigir problemas identificados
   - Propor soluções técnicas específicas para os próximos passos
```

## Registro de Modificações no Diário

Use este prompt quando implementar mudanças no projeto:

```
Registre as modificações recém-implementadas no diário do projeto. Para isso:

1. Execute o comando do PowerShell para obter a data atual:
   ```powershell
   Get-Date -Format "yyyy-MM-dd"
   ```

2. Verifique se já existe um arquivo de diário para a data atual em src/project/diario/

3. Se não existir, crie um novo arquivo no formato src/project/diario/YYYY-MM-DD.md

4. No arquivo de diário, registre:
   - Um título com a data (# Diário de Desenvolvimento - YYYY-MM-DD)
   - Um resumo das alterações implementadas
   - Lista detalhada das modificações feitas, organizada por componentes ou funcionalidades
   - Problemas encontrados e como foram resolvidos
   - Arquivos modificados e adicionados
   - Próximos passos planejados

5. Se for conveniente, prepare também uma mensagem de commit com um resumo conciso das mudanças para uso no GitHub.
``` 