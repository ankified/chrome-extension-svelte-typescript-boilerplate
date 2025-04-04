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

Use este prompt *após cada modificação significativa* implementada no projeto:

```
Registre a modificação recém-implementada no diário do projeto. Para isso:

1. Execute os comandos do PowerShell para obter a data e hora atuais:
   ```powershell
   $dataAtual = Get-Date -Format "yyyy-MM-dd"
   $horaAtual = Get-Date -Format "HH:mm:ss"
   ```

2. Verifique se já existe um arquivo de diário para a data atual em `src/project/diario/`. O nome do arquivo deve ser `$dataAtual.md` (ex: `2024-07-27.md`).

3. Se não existir, crie o arquivo com o título `# Diário de Desenvolvimento - $dataAtual`.

4. No arquivo de diário correspondente à `$dataAtual`, adicione uma nova entrada para a modificação atual:
   - Use um subtítulo de nível 3 com a hora da modificação (`### $horaAtual`).
   - Descreva a modificação específica realizada.
   - Liste os arquivos modificados ou adicionados *nesta modificação específica*.
   - Se aplicável, mencione problemas encontrados e como foram resolvidos *nesta modificação*.
   - Se a modificação conclui um item do plano de ações, mencione isso.
   - Próximos passos planejados

   Exemplo de entrada:

   ```markdown
   ### 14:35:10
   - Implementado o componente BotaoPrimario em `src/lib/components/ui/button/BotaoPrimario.svelte`.
   - Adicionado estilo inicial usando TailwindCSS.
   - Arquivos modificados: `src/lib/components/ui/button/BotaoPrimario.svelte`, `src/app.css`.
   - Próximos passos planejados: 
      - Implementar o componente BotaoSecundario.
      - Adicionar testes para o componente BotaoPrimario.
      - Adicionar testes para o componente BotaoSecundario.
   ```

5. Se for conveniente, prepare também uma mensagem de commit com um resumo conciso das mudanças acumuladas desde o último commit para uso no GitHub.
``` 