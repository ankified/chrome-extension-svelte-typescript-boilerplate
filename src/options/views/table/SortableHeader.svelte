<script lang="ts">
  export let label: string;
  export let sorted: 'asc' | 'desc' | false = false;
  export let onclick: () => void;
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
</script>

<button
  type="button"
  class="flex items-center gap-1 select-none cursor-pointer group text-left w-full font-medium text-sm"
  onclick={onclick}
  aria-label="Ordenar coluna"
>
  {label}
  {#if sorted === 'asc'}
    <ChevronUp class="w-4 h-4 text-primary group-hover:text-primary transition-colors" />
  {:else if sorted === 'desc'}
    <ChevronDown class="w-4 h-4 text-primary group-hover:text-primary transition-colors" />
  {:else}
    <ArrowUpDown class="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
  {/if}
</button> 