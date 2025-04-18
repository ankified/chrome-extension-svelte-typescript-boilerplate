<script lang="ts">
  let { row } = $props();
</script>

<button type="button" aria-label="Expandir detalhes" class="flex items-center justify-center w-7 h-7 rounded hover:bg-accent transition" onclick={() => row.toggleExpanded()}>
  <svg class="w-4 h-4 transition-transform" style:transform={row.getIsExpanded() ? 'rotate(90deg)' : 'rotate(0deg)'} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
  </svg>
</button> 