<script lang="ts">
	import { shortNotes } from '../../storage';
	// Importar componentes de UI necessários (ex: card, button, etc.)

	// Lógica para adicionar, editar, deletar short notes pode ser adicionada aqui

</script>

<div class="p-4">
	<h2 class="text-xl font-semibold mb-4">Notas Curtas</h2>
	
	{#if $shortNotes && $shortNotes.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each $shortNotes as note (note.id)}
				<div class="border p-4 rounded shadow" style={`background-color: ${note.color ?? 'transparent'}`}>
					<p>{note.content}</p>
					<div class="text-xs text-muted-foreground mt-2">
						Criado: {new Date(note.dateCreated).toLocaleDateString()}
					</div>
					<!-- {* Adicionar botões de ação (editar, deletar) aqui *} -->
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-muted-foreground">Nenhuma nota curta encontrada.</p>
	{/if}

	<!-- {* Adicionar botão para criar nova nota curta *} -->
</div> 