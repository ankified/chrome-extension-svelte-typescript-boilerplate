<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import * as Popover from "../../lib/components/ui/popover/index.js";

  // Props do componente
  let { 
    url = "", 
    title = "", 
    editable = true,
    showFavicon = true
  } = $props<{ 
    url: string, 
    title: string, 
    editable?: boolean,
    showFavicon?: boolean 
  }>();

  // Estado de edição
  let isPopoverOpen = $state(false);
  let editableTitle = $state(title);
  let faviconUrl = $state("");

  // Eventos
  const dispatch = createEventDispatcher<{
    titleChange: string;
  }>();

  // Efeito para atualizar o título editável quando o title prop mudar
  $effect(() => {
    editableTitle = title;
  });

  // Efeito para extrair o favicon da URL
  $effect(() => {
    if (url && showFavicon) {
      try {
        const urlObj = new URL(url);
        // Usar o serviço de favicon do Google para maior confiabilidade
        faviconUrl = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
      } catch (e) {
        faviconUrl = "";
        console.error("URL inválida para extração de favicon:", e);
      }
    }
  });

  // Função para salvar a edição do título
  function saveTitle() {
    isPopoverOpen = false;
    dispatch('titleChange', editableTitle);
  }

  // Função para formatar a URL para exibição
  function formatUrlForDisplay(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== "/" ? urlObj.pathname : "");
    } catch (e) {
      return url;
    }
  }
  
  // Função para lidar com o evento keydown
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    }
  }
  
  // Função para lidar com mudanças no estado do popover
  function handlePopoverOpenChange(open: boolean) {
    isPopoverOpen = open;
    // Se o popover for fechado, resetar o título editável para o valor original
    if (!open && editableTitle !== title) {
      editableTitle = title;
    }
  }
  
  // Função para lidar com erros de carregamento de imagem
  function handleImageError(e: Event) {
    const target = e.currentTarget as HTMLImageElement;
    // Se o favicon não carregar, usar um ícone genérico
    target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'%3E%3C/path%3E%3Cpath fill='none' stroke='currentColor' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M3.6 9h16.8M3.6 15h16.8'%3E%3C/path%3E%3C/svg%3E";
  }
</script>

<div class="page-preview-card bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700 transition-all hover:shadow-lg">
  <div class="px-4 pt-4 pb-5 max-h-28 overflow-hidden">
    <!-- Título com popover para edição -->
    <div class="flex justify-between items-start">
      <h2 class="text-md font-semibold text-gray-900 dark:text-white line-clamp-2">{title}</h2>
      
      {#if editable}
        <Popover.Root open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
          <Popover.Trigger>
            <button 
              class="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </Popover.Trigger>
          
          <Popover.Content class="w-72 p-4 bg-white dark:bg-gray-800 rounded-md shadow-md border border-gray-200 dark:border-gray-700">
            <div class="mb-3">
              <label for="edit-title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Editar título
              </label>
              <input 
                id="edit-title"
                type="text" 
                bind:value={editableTitle} 
                class="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onkeydown={handleKeyDown}
                autofocus
              />
            </div>
            
            <div class="flex justify-end space-x-2">
              <Popover.Close>
                <button 
                  class="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded text-sm"
                >
                  Cancelar
                </button>
              </Popover.Close>
              
              <button 
                class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                onclick={saveTitle}
              >
                Salvar
              </button>
            </div>
          </Popover.Content>
        </Popover.Root>
      {/if}
    </div>
    
    <!-- URL com favicon -->
    <div class="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-3 truncate">
      {#if faviconUrl && showFavicon}
        <img 
          src={faviconUrl} 
          class="w-4 h-4 mr-2 flex-shrink-0" 
          alt="Site favicon" 
          onerror={handleImageError}
        />
      {/if}
      <span class="truncate">{formatUrlForDisplay(url)}</span>
    </div>
  </div>
</div> 