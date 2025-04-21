## Registro de Modificações no Diário

Use este prompt *após cada modificação significativa* implementada no projeto:

```
Registre a modificação recém-implementada no diário do projeto. Para isso:

1. Execute os comandos do PowerShell para obter a data e hora atuais:
   ```powershell
   Get-Date -Format "yyyy-MM-dd"
   Get-Date -Format "HH:mm:ss"
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

5. Prepare também uma mensagem de commit com um resumo conciso das mudanças acumuladas desde o último commit para uso no GitHub.
``` 