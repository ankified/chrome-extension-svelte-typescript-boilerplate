<script lang="ts">
  import type { SavedItem } from '../../types';
  import * as Dialog from '../../lib/components/ui/dialog/index.js';
  import { Button } from '../../lib/components/ui/button/index.js';
  import { Checkbox } from '../../lib/components/ui/checkbox/index.js';
  import { ScrollArea } from '../../lib/components/ui/scroll-area/index.js';
  import { Badge } from '../../lib/components/ui/badge/index.js';

  // Tipo para o item do domínio com contagem
  type DomainCount = { domain: string; count: number };

  // Props
  let { 
    open = $bindable(),
    allItems = [], 
    initialSelectedDomains = [], 
    onApply = (selectedDomains: string[]) => {},
    onClose = () => {}
  } = $props<{ 
    open: boolean;
    allItems: SavedItem[];
    initialSelectedDomains: string[];
    onApply: (selectedDomains: string[]) => void;
    onClose: () => void;
  }>();

  // Estados internos
  let selectedDomainsState = $state<string[]>([...initialSelectedDomains]);
  // Mudar de $derived para $state e atualizar com $effect
  let domainsWithCounts = $state<DomainCount[]>([]);

  // Lógica para extrair domínios (agora em função separada)
  function calculateDomains(items: SavedItem[]): DomainCount[] {
    const domainMap = new Map<string, number>();
    for (const item of items) {
      try {
        const url = item.url;
        if (!url) continue;
        const parsedUrl = new URL(url);
        const domain = parsedUrl.hostname.replace(/^www\./, '');
        domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
      } catch (e) {
        // Ignora URLs inválidas silenciosamente no cálculo
      }
    }
    return Array.from(domainMap.entries())
      .map(([domain, count]): DomainCount => ({ domain, count }))
      .sort((a, b) => a.domain.localeCompare(b.domain));
  }

  // Efeito para calcular domínios quando allItems mudar
  $effect(() => {
    console.log("[DomainFilterDialog] Recalculating domains based on allItems change.");
    domainsWithCounts = calculateDomains(allItems);
  });

  // Funções de manipulação da seleção interna (REFINADA)
  function toggleDomain(domain: string, isChecked: boolean) {
    const currentSelection = selectedDomainsState;
    let newSelection: string[];

    if (isChecked) {
      // Adiciona se não estiver presente
      if (!currentSelection.includes(domain)) {
        newSelection = [...currentSelection, domain];
      } else {
        // Se já estiver presente (não deveria acontecer com lógica correta, mas para segurança)
        newSelection = [...currentSelection]; 
      }
    } else {
      // Remove
      newSelection = currentSelection.filter(d => d !== domain);
    }

    // Verifica se a seleção realmente mudou para evitar atualizações desnecessárias
    // Ordenar para garantir comparação consistente
    if (JSON.stringify(newSelection.sort()) !== JSON.stringify(currentSelection.sort())) {
        console.log(`[DomainFilterDialog] Toggling domain: ${domain}, Checked: ${isChecked}. New selection:`, newSelection);
        selectedDomainsState = newSelection; // Reatribui o novo array
    }
  }

  // Funções de ação do diálogo
  function handleApply() {
    onApply(selectedDomainsState);
  }

  function handleCancel() {
    // selectedDomainsState = [...initialSelectedDomains]; // Opcional: resetar ao cancelar
    onClose();
  }

  // Efeito para sincronizar estado interno APENAS quando a prop mudar
  $effect(() => {
    // Esta linha lê a prop, tornando-a uma dependência do efeito.
    const propValue = initialSelectedDomains; 
    console.log(`[DomainFilterDialog] Prop 'initialSelectedDomains' changed. Resetting internal state to:`, propValue);
    // Reseta o estado interno para corresponder à prop.
    selectedDomainsState = [...propValue];
  });

</script>

<Dialog.Root bind:open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}> 
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>Filtrar por Domínio</Dialog.Title>
      <Dialog.Description>
        Selecione os domínios que deseja exibir na tabela.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      {#if domainsWithCounts.length > 0}
        <ScrollArea class="h-[300px] w-full rounded-md border p-4">
          <div class="space-y-2">
             {#each domainsWithCounts as { domain, count } (domain)}
              <div class="flex items-center justify-between space-x-2">
                 <label for={domain} class="flex items-center space-x-2 cursor-pointer text-sm font-medium leading-none">
                    <Checkbox 
                      id={domain} 
                      checked={selectedDomainsState.includes(domain)}
                      onCheckedChange={(checkedStatus) => toggleDomain(domain, checkedStatus)}
                    />
                    <span>{domain}</span>
                 </label>
                 <Badge variant="secondary">{count}</Badge>
              </div>
            {/each}
          </div>
        </ScrollArea>
      {:else}
        <p class="text-sm text-muted-foreground text-center">Nenhum domínio encontrado nos itens salvos.</p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={handleCancel}>Cancelar</Button>
      <Button onclick={handleApply} disabled={domainsWithCounts.length === 0}>Aplicar Filtro</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root> 