<script lang="ts">
  import type { SavedItem } from '../../types';
  import * as Dialog from '../../lib/components/ui/dialog/index.js';
  import { Button } from '../../lib/components/ui/button/index.js';
  import { Checkbox } from '../../lib/components/ui/checkbox/index.js';
  import { ScrollArea } from '../../lib/components/ui/scroll-area/index.js';
  import { Badge } from '../../lib/components/ui/badge/index.js';
  import { Input } from '../../lib/components/ui/input/index.js';
  import { Root as ToggleGroupRoot, Item as ToggleGroupItem } from '../../lib/components/ui/toggle-group/index.js';
  import FilterX from '@lucide/svelte/icons/filter-x';
  import * as Tooltip from '../../lib/components/ui/tooltip/index.js';
  import { cn } from '../../lib/utils.js';

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
  let domainsWithCounts = $state<DomainCount[]>([]);
  let domainSearchQuery = $state('');
  let alphaFilter = $state<string | null>(null);

  // Constante para os caracteres do ToggleGroup
  const alphaChars = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

  // Lógica para extrair e filtrar domínios
  function calculateDomains(items: SavedItem[], alpha: string | null, searchQuery: string): DomainCount[] {
    const domainMap = new Map<string, number>();
    const lowerSearchQuery = searchQuery.toLowerCase().trim();

    for (const item of items) {
      try {
        const url = item.url;
        if (!url) continue;
        const parsedUrl = new URL(url);
        let domain = parsedUrl.hostname.replace(/^www\./, '');
        if (!domain) continue;

        // 1. Aplicar filtro alfanumérico
        if (alpha) {
          const firstChar = domain.charAt(0).toUpperCase();
          if (alpha === '#') {
            // Se filtro é '#', verifica se NÃO começa com letra A-Z
            if (firstChar >= 'A' && firstChar <= 'Z') {
              continue;
            }
          } else {
            // Se filtro é letra, verifica se começa com essa letra
            if (firstChar !== alpha) {
              continue;
            }
          }
        }

        // 2. Aplicar filtro de busca
        if (lowerSearchQuery && !domain.toLowerCase().includes(lowerSearchQuery)) {
          continue; 
        }
        
        domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
      } catch (e) {
        // Ignora URLs inválidas
      }
    }
    return Array.from(domainMap.entries())
      .map(([domain, count]): DomainCount => ({ domain, count }))
      .sort((a, b) => a.domain.localeCompare(b.domain));
  }

  // Efeito para calcular domínios quando filtros ou itens mudarem
  $effect(() => {
    console.log("[DomainFilterDialog] Recalculating domains based on filters/items change.");
    domainsWithCounts = calculateDomains(allItems, alphaFilter, domainSearchQuery);
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

  // NOVO: Função para limpar filtros
  function clearFilters() {
    alphaFilter = null;
    domainSearchQuery = '';
    console.log("[DomainFilterDialog] Filters cleared.");
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
  <Dialog.Content class="sm:max-w-xl">
    <Dialog.Header>
      <Dialog.Title>Filtrar por Domínio</Dialog.Title>
      <Dialog.Description>
        Selecione os domínios que deseja exibir na tabela.
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid gap-4 py-4">
      <!-- Filtro Alfanumérico com Tooltips -->
      <Tooltip.Provider>
        <div class="flex flex-wrap gap-1 justify-center">
          <ToggleGroupRoot 
            type="single" 
            variant="outline" 
            size="sm"
            bind:value={alphaFilter} 
            aria-label="Filtro Alfanumérico"
            class="flex-wrap justify-center"
          >
            {#each alphaChars as char (char)}
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <ToggleGroupItem value={char} aria-label={`Filtrar por ${char === '#' ? 'números e símbolos' : char}`}>{char}</ToggleGroupItem>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>{char === '#' ? 'Filtrar por números e símbolos' : `Filtrar domínios começando com ${char}`}</p>
                </Tooltip.Content>
              </Tooltip.Root>
            {/each}
          </ToggleGroupRoot>
        </div>
      </Tooltip.Provider>

      <!-- Campo de Busca com Feedback Visual e Botão Limpar -->
      <div class="flex items-center gap-2">
        <Input 
          type="search" 
          placeholder="Buscar domínio..."
          bind:value={domainSearchQuery} 
          class={cn(
            "flex-grow",
            domainSearchQuery && "ring-1 ring-primary focus-visible:ring-primary"
          )}
        />
        <Button 
          variant="ghost" 
          size="icon"
          onclick={clearFilters}
          disabled={!alphaFilter && !domainSearchQuery}
          aria-label="Limpar filtros"
          title="Limpar filtros"
        >
          <FilterX class="h-4 w-4" />
        </Button>
      </div>
      
      {#if domainsWithCounts.length > 0}
        <ScrollArea class="h-[260px] w-full rounded-md border p-4">
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
        <p class="text-sm text-muted-foreground text-center">
          Nenhum domínio encontrado
          {#if alphaFilter || domainSearchQuery}
            com os filtros aplicados.
          {:else}
            nos itens salvos.
          {/if}
        </p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={handleCancel}>Cancelar</Button>
      <Button onclick={handleApply}>Aplicar Filtro</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root> 