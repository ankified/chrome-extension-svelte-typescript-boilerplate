<script lang="ts">
	import { annotations } from '../../storage';
	// Importar componentes de UI necessários 
	// Importar TipTap quando for implementar

	// Lógica para adicionar, editar, deletar annotations

</script>

<div class="p-4">
	<h2 class="text-xl font-semibold mb-4">Anotações</h2>
	
	{#if $annotations && $annotations.length > 0}
		<div class="space-y-4">
			{#each $annotations as note (note.id)}
				<div class="border p-4 rounded shadow">
					{#if note.title}<h3 class="font-medium mb-2">{note.title}</h3>{/if}
					<!-- {* Renderizar note.content ou o editor TipTap aqui *} -->
					<p class="text-sm text-muted-foreground">{note.content}</p> 
					<div class="text-xs text-muted-foreground mt-2">
						Criado: {new Date(note.dateCreated).toLocaleDateString()}
					</div>
					<!-- {* Adicionar botões de ação (editar, deletar) aqui *} -->
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-muted-foreground">Nenhuma anotação encontrada.</p>
	{/if}

	<!-- {* Adicionar botão para criar nova anotação *} -->
</div> 