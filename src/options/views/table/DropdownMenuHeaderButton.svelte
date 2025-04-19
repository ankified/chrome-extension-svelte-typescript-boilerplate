<script lang="ts">
  import * as DropdownMenu from '../../../lib/components/ui/dropdown-menu/index.js';
  let open = $state(false);
</script>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger>
    <button type="button" aria-label="Opções gerais" class="flex items-center justify-center w-7 h-7 rounded hover:bg-accent transition">
      <!-- Ícone de três pontos vertical (SVG inline) -->
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="12" cy="19" r="1.5" />
      </svg>
    </button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Label>Opções Gerais</DropdownMenu.Label>
    <DropdownMenu.Separator />
    <DropdownMenu.Item disabled>Em breve...</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root> 