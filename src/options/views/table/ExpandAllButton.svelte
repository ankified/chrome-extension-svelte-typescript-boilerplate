<script lang="ts">
  let { table } = $props();
  // O estado global de expansão está em table.options.state.expanded
  let expanded = table.options.state.expanded;
  function toggleAll() {
    const allExpanded = Object.values(expanded).some(Boolean);
    if (allExpanded) {
      table.options.onExpandedChange?.({});
    } else {
      const all = Object.fromEntries(table.getRowModel().rows.map(row => [row.id, true]));
      table.options.onExpandedChange?.(all);
    }
  }
</script>

<button type="button" aria-label="Expandir/Recolher todos" class="flex items-center justify-center w-7 h-7 rounded hover:bg-accent transition" onclick={toggleAll}>
  <svg class="w-4 h-4 transition-transform" style:transform={Object.values(expanded).some(Boolean) ? 'rotate(90deg)' : 'rotate(0deg)'} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
  </svg>
</button> 