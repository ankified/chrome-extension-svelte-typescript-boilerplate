<script lang="ts">
	import * as DropdownMenu from "../components/ui/dropdown-menu/index.js";
	import * as Sidebar from "../components/ui/sidebar/index.js";
	import { useSidebar } from "../components/ui/sidebar/context.svelte.js";
	import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
	import PlusCircle from "@lucide/svelte/icons/plus-circle";
	import { CircleEllipsis, Check } from '@lucide/svelte';
	// ItemIndicator deve ser exportado pelo index.js do dropdown-menu. Se não, precisaria de importação direta.
	// Para fins de correção, assumimos que está em DropdownMenu. Se o erro persistir, o index.js do dropdown precisa ser verificado.

	interface Project {
		id: string;
		emoji?: string;
		icon?: any; 
		name: string;
		description: string;
		dateCreated: number;
	}

	let {
		projects: initialProjects = [] as Project[], // Renomear prop para evitar conflito com estado local
		activeProjectId: initialActiveProjectId = "",
		onProjectChange = (projectId: string) => { console.log('Project changed to:', projectId); },
		onAddProject = () => { console.log('Add new project'); }
	}: {
		projects?: Project[];
		activeProjectId?: string;
		onProjectChange?: (projectId: string) => void;
		onAddProject?: () => void;
	} = $props();

	const sidebar = useSidebar();

	const exampleProjects: Project[] = [
		{ id: "proj1", emoji: "🚀", name: "Meu Projeto Principal", description: "Extensão do Chrome", dateCreated: new Date().getTime() - 100000000 },
		{ id: "proj2", icon: CircleEllipsis as any, name: "Outro Projeto", description: "Estudos de IA", dateCreated: new Date().getTime() - 50000000 },
		{ id: "proj3", emoji: "📚", name: "Aprendizado Svelte", description: "Boilerplate & Shadcn", dateCreated: new Date().getTime() },
	];

	// Initialize with simple values to avoid "state_referenced_locally" warnings.
	// $effects will handle the full logic.
	let currentProjects = $state([...exampleProjects]); // Start with example or an empty array: $state([] as Project[])
	let currentActiveProjectId = $state(initialActiveProjectId || ""); // Start with prop value or empty string

	// Sincronizar com props externas quando elas mudarem
	$effect(() => {
		// If initialProjects is provided and has items, use it. Otherwise, use/keep exampleProjects.
		currentProjects = (initialProjects && initialProjects.length > 0) ? initialProjects : [...exampleProjects];
	});

	$effect(() => {
		// Prioritize initialActiveProjectId. If not available, and projects exist, use the first project's ID.
		currentActiveProjectId = initialActiveProjectId || (currentProjects.length > 0 ? currentProjects[0].id : "");
	});

	let activeProject = $derived(currentProjects.find(p => p.id === currentActiveProjectId));

	function handleProjectSelect(projectId: string) {
		currentActiveProjectId = projectId;
		onProjectChange(projectId);
	}

	function formatDate(timestamp: number): string {
		const date = new Date(timestamp);
		return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
	}

</script>

<Sidebar.Menu class="mb-2 border-b pb-2">
	<Sidebar.MenuItem class="px-2">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class="w-full">
				{#snippet child({ props }: { props: Record<string, any> })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground justify-start"
						aria-label="Selecionar projeto"
					>
						{#if activeProject}
							<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
								{#if activeProject.icon}
									<activeProject.icon class="size-4" />
								{:else if activeProject.emoji}
									<span class="text-lg">{activeProject.emoji}</span>
								{:else}
									<CircleEllipsis class="size-4" />
								{/if}
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">
									{activeProject.name}
								</span>
								<span class="truncate text-xs text-muted-foreground">{activeProject.description}</span>
							</div>
						{:else}
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">Nenhum projeto selecionado</span>
							</div>
						{/if}
						<ChevronsUpDown class="ml-auto size-4 shrink-0 text-muted-foreground" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-[var(--radix-dropdown-menu-trigger-width)] min-w-64 rounded-lg shadow-lg"
				align="start"
				side={sidebar.isMobile ? "bottom" : "right"}
				sideOffset={sidebar.isMobile ? 8 : 4}
			>
				<DropdownMenu.Label class="text-muted-foreground">Projetos</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{#each currentProjects as project (project.id)}
					<DropdownMenu.Item
						onSelect={() => handleProjectSelect(project.id)}
						class="gap-2 p-2 cursor-pointer data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground flex items-center justify-between"
					>
						<div class="flex items-center gap-2">
							<div class="flex size-6 shrink-0 items-center justify-center rounded-sm border">
								{#if project.icon}
									<project.icon class="size-4 shrink-0" />
								{:else if project.emoji}
									<span class="text-sm">{project.emoji}</span>
								{:else}
									<CircleEllipsis class="size-4 shrink-0" />
								{/if}
							</div>
							<div class="flex flex-col">
								<span>{project.name}</span>
								<span class="text-xs text-muted-foreground">Criado em: {formatDate(project.dateCreated)}</span>
							</div>
						</div>
						{#if project.id === currentActiveProjectId}
							<Check class="size-4 text-accent-foreground" /> 
						{/if}
					</DropdownMenu.Item>
				{/each}
				<DropdownMenu.Separator />
				<DropdownMenu.Item onSelect={onAddProject} class="gap-2 p-2 cursor-pointer data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground">
					<div class="flex size-6 items-center justify-center rounded-md border">
						<PlusCircle class="size-4 shrink-0" />
					</div>
					<div class="font-medium">Adicionar Projeto</div>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu> 