# Planejamento da Extensão de Gerenciamento de Favoritos e Links

## Visão Geral

Uma extensão para Chrome que permite aos usuários salvar, organizar e gerenciar páginas web como favoritos ou itens para leitura posterior, com recursos avançados de categorização, visualização e gerenciamento.

## Funcionalidades Principais

- Salvar páginas web como favoritos
- Marcar páginas para acesso posterior
- Adicionar comentários e etiquetas a cada página salva
- Criar grupos para organizar itens salvos
- Vincular itens usando visualização SvelteFlow
- Gerenciar grupos e itens usando visualização KanBan
- Notificar sobre links agendados para leitura posterior
- Exportar/importar dados para arquivo JSON
- Visualizar prévia das páginas em popover diretamente na extensão

## Estrutura da Extensão

### Modelo de Dados

```typescript
// Tipos de dados principais
interface SavedItem {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  dateAdded: number;
  comments: string;
  tags: string[];
  groupIds: string[];
  readLater: boolean;
  scheduledDate?: number;
  position?: { x: number, y: number }; // Para SvelteFlow
  previewImage?: string; // URL da captura de tela para exibição no popover
}

interface Group {
  id: string;
  name: string;
  color?: string;
  description?: string;
  itemIds: string[];
}

interface ItemLink {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}
```

### Componentes da Interface do Usuário

#### 1. Popup
- **Propósito**: Salvar a página atual como favorito ou para leitura posterior
- **Componentes**:
  - Formulário para capturar detalhes da página
  - Campo para título (pré-preenchido)
  - Campo para comentários
  - Campo para tags (com sugestões de tags existentes)
  - Seletor de grupos
  - Opção para "ler mais tarde" com agendamento de data/hora
  - Botões de salvar/cancelar

#### 2. Sidebar
- **Propósito**: Acesso rápido aos favoritos salvos
- **Componentes**:
  - Lista de itens salvos recentemente
  - Filtros rápidos (todos, ler mais tarde, por tag)
  - Pesquisa
  - Visualização compacta de itens com título e URL
  - Acesso rápido à página de opções para gerenciamento completo

#### 3. Página de Opções
- **Propósito**: Gerenciamento completo dos favoritos e grupos
- **Views**:
  - **Tabs Container**: Utilizar o componente `Tabs` do `shadcn-svelte` para organizar as diferentes visualizações e seções.
  - **Itens Salvos**: 
    - **Tabela**: Nova visualização tabular de todos os itens usando `DataTable` do `shadcn-svelte` com ordenação, filtros avançados e seleção.
    - **Cartões**: Visualização padrão atual com cards individuais.
    - **KanBan**: Visualização em quadros dos grupos e seus itens (drag-and-drop para reorganizar).
    - **Fluxo (SvelteFlow)**: Visualização de conexões entre itens para mapeamento de relações.
  - **Agendamentos**: Visualização de calendário/linha do tempo dos itens marcados para ler mais tarde
  - **Configurações**: Preferências da extensão, importação/exportação

#### 4. Componentes Comuns
- **Popover de Visualização**: Componente presente em todas as views que permite visualizar uma prévia da página sem sair da extensão

## Plano de Implementação

### Fase 1: Estrutura Básica e Armazenamento

1. Configurar o modelo de dados
2. Implementar armazenamento persistente usando Chrome Storage API
3. Criar funções auxiliares para manipulação de dados
4. Implementar funcionalidades de exportação/importação de dados

### Fase 2: Interface de Usuário Básica

1. Desenvolver popup para salvamento de páginas
2. Criar sidebar para visualização rápida de itens salvos
3. Implementar página de opções com visualização em lista

### Fase 3: Funcionalidades Avançadas

1. Implementar visualização KanBan para grupos
2. Integrar SvelteFlow para conexões entre itens
3. Adicionar sistema de notificações para itens agendados
4. Implementar funcionalidades de filtro e pesquisa avançadas
5. Implementar visualização de agendamentos em calendário/linha do tempo
6. Adicionar popover para visualização prévia de páginas

### Fase 4: Refinamento e Testes

1. Refinar interface do usuário com Tailwind e componentes sadcn-svelte
2. Otimizar performance e uso de armazenamento
3. Testes abrangentes em diferentes cenários de uso
4. Preparar para lançamento

## Detalhes de Implementação

### 1. Armazenamento de Dados

```typescript
// Extensão do persistentStore atual para suportar arrays e objetos complexos
function createItemsStore() {
  return persistentStore<SavedItem[]>("savedItems", []);
}

function createGroupsStore() {
  return persistentStore<Group[]>("groups", []);
}

function createLinksStore() {
  return persistentStore<ItemLink[]>("itemLinks", []);
}

export const savedItems = createItemsStore();
export const groups = createGroupsStore();
export const itemLinks = createLinksStore();
```

### 2. Popup (Formulário de Salvamento)

```svelte
<!-- SaveItemForm.svelte -->
<script lang="ts">
  import { savedItems, groups } from "../storage";
  
  // Obter URL e título da página atual
  let currentUrl = "";
  let currentTitle = "";
  let comments = "";
  let tags = "";
  let selectedGroups = [];
  let readLater = false;
  let scheduledDate = null;
  
  // Preencher dados da página atual
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    currentUrl = tabs[0].url;
    currentTitle = tabs[0].title;
  });
  
  function handleSave() {
    const newItem = {
      id: crypto.randomUUID(),
      url: currentUrl,
      title: currentTitle,
      dateAdded: Date.now(),
      comments,
      tags: tags.split(',').map(tag => tag.trim()),
      groupIds: selectedGroups,
      readLater,
      scheduledDate: readLater && scheduledDate ? new Date(scheduledDate).getTime() : undefined
    };
    
    savedItems.update(items => [...items, newItem]);
    
    // Atualizar grupos selecionados para incluir o novo item
    if (selectedGroups.length > 0) {
      groups.update(existingGroups => {
        return existingGroups.map(group => {
          if (selectedGroups.includes(group.id)) {
            return {
              ...group,
              itemIds: [...group.itemIds, newItem.id]
            };
          }
          return group;
        });
      });
    }
  }
</script>
```

### 3. SvelteFlow para Conexões

```svelte
<!-- ItemsFlow.svelte -->
<script lang="ts">
  import { writable } from 'svelte/store';
  import { SvelteFlow, Controls, Background, BackgroundVariant, MiniMap } from '@xyflow/svelte';
  import { savedItems, itemLinks } from "../storage";
  import ItemNode from './ItemNode.svelte';
  import Sidebar from './FlowSidebar.svelte';
  
  // Converter itens salvos para nós do SvelteFlow
  $: nodes = $savedItems.map(item => ({
    id: item.id,
    type: 'savedItem',
    data: { item },
    position: item.position || { x: Math.random() * 500, y: Math.random() * 500 }
  }));
  
  // Converter links para edges do SvelteFlow
  $: edges = $itemLinks.map(link => ({
    id: link.id,
    source: link.sourceId,
    target: link.targetId,
    label: link.label
  }));
  
  // Registrar tipos de nós customizados
  const nodeTypes = {
    savedItem: ItemNode
  };
  
  const { screenToFlowPosition } = useSvelteFlow();
  
  const onConnect = (connection) => {
    const newLink = {
      id: crypto.randomUUID(),
      sourceId: connection.source,
      targetId: connection.target,
      label: ''
    };
    
    itemLinks.update(links => [...links, newLink]);
  };
  
  const onNodeDragStop = (event, node) => {
    savedItems.update(items => 
      items.map(item => 
        item.id === node.id 
          ? { ...item, position: node.position }
          : item
      )
    );
  };
  
  // Para drag-and-drop de itens da sidebar
  const onDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  
  const onDrop = (event) => {
    const itemId = event.dataTransfer.getData('application/reactflow');
    
    if (!itemId) return;
    
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    });
    
    savedItems.update(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, position }
          : item
      )
    );
  };
</script>

<div class="flow-container">
  <SvelteFlow 
    {nodes} 
    {edges} 
    {nodeTypes}
    fitView
    on:connect={onConnect}
    on:nodedragstop={onNodeDragStop}
    on:dragover={onDragOver}
    on:drop={onDrop}
  >
    <Controls />
    <Background variant={BackgroundVariant.Dots} />
    <MiniMap />
  </SvelteFlow>
  <Sidebar items={$savedItems} />
</div>
```

### 4. View KanBan

```svelte
<!-- KanbanView.svelte -->
<script lang="ts">
  import { savedItems, groups } from "../storage";
  import { DndContext, DragOverlay } from '@dnd-kit/core';
  
  // Group items by their groups
  $: groupedItems = $groups.map(group => ({
    ...group,
    items: $savedItems.filter(item => item.groupIds.includes(group.id))
  }));
  
  let activeId = null;
  
  const onDragStart = (event) => {
    activeId = event.active.id;
  };
  
  const onDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Moveu item para outro grupo
      const itemId = active.id;
      const sourceGroupId = active.data.current.groupId;
      const targetGroupId = over.id;
      
      // Atualizar grupos
      groups.update(existingGroups => {
        return existingGroups.map(group => {
          if (group.id === sourceGroupId) {
            return {
              ...group,
              itemIds: group.itemIds.filter(id => id !== itemId)
            };
          }
          if (group.id === targetGroupId) {
            return {
              ...group,
              itemIds: [...group.itemIds, itemId]
            };
          }
          return group;
        });
      });
      
      // Atualizar item
      savedItems.update(items => {
        return items.map(item => {
          if (item.id === itemId) {
            return {
              ...item,
              groupIds: item.groupIds.filter(id => id !== sourceGroupId).concat(targetGroupId)
            };
          }
          return item;
        });
      });
    }
    
    activeId = null;
  };
</script>

<DndContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
  <div class="kanban-container">
    {#each groupedItems as group}
      <div class="kanban-column" id={group.id}>
        <h3 style={`color: ${group.color || '#333'}`}>{group.name}</h3>
        <div class="kanban-items">
          {#each group.items as item}
            <div class="kanban-item" id={item.id} data-group-id={group.id}>
              <h4>{item.title}</h4>
              {#if item.comments}
                <p>{item.comments}</p>
              {/if}
              <div class="tags">
                {#each item.tags as tag}
                  <span class="tag">{tag}</span>
                {/each}
              </div>
              <a href={item.url} target="_blank" class="item-link">Visitar</a>
            </div>
          {/each}
        </div>
        <button class="add-item-btn">+ Adicionar Item</button>
      </div>
    {/each}
    <button class="add-group-btn">+ Novo Grupo</button>
  </div>
  
  <DragOverlay>
    {#if activeId}
      <!-- Renderizar overlay do item sendo arrastado -->
    {/if}
  </DragOverlay>
</DndContext>
```

### 5. View de Agendamentos

```svelte
<!-- ScheduleView.svelte -->
<script lang="ts">
  import { savedItems } from "../storage";
  import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate, parseISO, isSameDay } from 'date-fns';
  import { ptBR } from 'date-fns/locale';
  
  // Estado para controle do mês/ano atual
  let currentDate = new Date();
  
  // Filtrar itens para leitura posterior com data agendada
  $: scheduledItems = $savedItems.filter(item => item.readLater && item.scheduledDate);
  
  // Ordenar os itens por data agendada
  $: sortedItems = [...scheduledItems].sort((a, b) => a.scheduledDate - b.scheduledDate);
  
  // Agrupar por mês
  $: itemsByMonth = {};
  $: {
    sortedItems.forEach(item => {
      const date = new Date(item.scheduledDate);
      const monthYear = format(date, 'MMMM yyyy', { locale: ptBR });
      
      if (!itemsByMonth[monthYear]) {
        itemsByMonth[monthYear] = [];
      }
      
      itemsByMonth[monthYear].push(item);
    });
  }
  
  // Gerar dias do mês atual para visualização de calendário
  $: daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });
  
  // Verificar se um dia tem itens agendados
  function getItemsForDay(day) {
    return scheduledItems.filter(item => {
      const itemDate = new Date(item.scheduledDate);
      return isSameDay(itemDate, day);
    });
  }
  
  // Navegar para o mês anterior
  function previousMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  }
  
  // Navegar para o próximo mês
  function nextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }
</script>

<div class="schedule-container">
  <div class="tabs">
    <button class="tab-btn active">Calendário</button>
    <button class="tab-btn">Linha do Tempo</button>
  </div>

  <div class="calendar-view">
    <div class="month-navigation">
      <button on:click={previousMonth}>&lt;</button>
      <h2>{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h2>
      <button on:click={nextMonth}>&gt;</button>
    </div>
    
    <div class="calendar-grid">
      <div class="weekday">Dom</div>
      <div class="weekday">Seg</div>
      <div class="weekday">Ter</div>
      <div class="weekday">Qua</div>
      <div class="weekday">Qui</div>
      <div class="weekday">Sex</div>
      <div class="weekday">Sáb</div>
      
      {#each daysInMonth as day}
        {@const items = getItemsForDay(day)}
        <div class="day-cell" class:has-items={items.length > 0}>
          <span class="day-number">{getDate(day)}</span>
          {#if items.length > 0}
            <div class="day-items">
              {#each items as item, index}
                {#if index < 2}
                  <div class="day-item-dot" title={item.title}></div>
                {:else if index === 2}
                  <div class="day-item-more">+{items.length - 2}</div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  
  <div class="timeline-view" style="display: none;">
    {#each Object.entries(itemsByMonth) as [monthYear, items]}
      <div class="timeline-month">
        <h3>{monthYear}</h3>
        <div class="timeline-items">
          {#each items as item}
            <div class="timeline-item">
              <div class="timeline-date">
                {format(new Date(item.scheduledDate), 'dd/MM/yyyy HH:mm')}
              </div>
              <div class="timeline-content">
                <h4>{item.title}</h4>
                {#if item.comments}
                  <p>{item.comments}</p>
                {/if}
                <div class="tags">
                  {#each item.tags as tag}
                    <span class="tag">{tag}</span>
                  {/each}
                </div>
                <a href={item.url} target="_blank" class="item-link">Visitar</a>
                <button class="reschedule-btn">Reagendar</button>
                <button class="mark-done-btn">Marcar como lido</button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
    
    {#if Object.keys(itemsByMonth).length === 0}
      <div class="empty-state">
        <p>Não há itens agendados para leitura posterior.</p>
      </div>
    {/if}
  </div>
</div>
```

### 6. Sistema de Notificações

```typescript
// notifications.ts
export function setupNotifications() {
  // Verificar itens agendados periodicamente
  chrome.alarms.create("checkScheduledItems", { periodInMinutes: 60 });
  
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "checkScheduledItems") {
      const { savedItems } = await chrome.storage.sync.get("savedItems");
      const now = Date.now();
      
      // Filtrar itens que estão agendados para agora
      const dueItems = savedItems.filter(item => 
        item.readLater && 
        item.scheduledDate && 
        item.scheduledDate <= now
      );
      
      for (const item of dueItems) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: item.favicon || "/src/assets/icons/icon-48.png",
          title: "Lembrete: Link para ler",
          message: `Você agendou "${item.title}" para ler mais tarde.`,
          buttons: [
            { title: "Abrir agora" },
            { title: "Lembrar depois" }
          ]
        });
      }
    }
  });
  
  // Lidar com cliques nas notificações
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    // Implementar lógica para abrir ou adiar
  });
}
```

### 7. Popover de Visualização Prévia

```svelte
<!-- PagePreviewPopover.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
  import { Spinner } from '$lib/components/ui/spinner';
  import { Button } from '$lib/components/ui/button';
  import type { SavedItem } from '../types';
  
  export let item: SavedItem;
  export let triggerElement: HTMLElement | null = null;
  
  const dispatch = createEventDispatcher();
  
  let loading = false;
  let error = null;
  let iframeContent = null;
  let previewMode: 'iframe' | 'screenshot' = 'iframe';
  
  // Função para capturar screenshot da página
  async function captureScreenshot() {
    try {
      loading = true;
      
      // Usar a API do Chrome para criar uma captura de tela
      const tab = await chrome.tabs.create({ url: item.url, active: false });
      
      // Aguardar o carregamento da página
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Capturar a captura de tela
      const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 70 });
      
      // Fechar a aba
      await chrome.tabs.remove(tab.id);
      
      // Salvar a captura na item
      item.previewImage = screenshot;
      
      loading = false;
      return screenshot;
    } catch (err) {
      error = err.message;
      loading = false;
      return null;
    }
  }
  
  // Função para carregar o conteúdo do iframe
  async function loadIframeContent() {
    try {
      loading = true;
      
      // Usar fetch para obter o conteúdo HTML da página
      const response = await fetch(item.url);
      const html = await response.text();
      
      // Limpar o HTML para evitar scripts e conteúdo inseguro
      const cleanHtml = sanitizeHtml(html);
      
      iframeContent = cleanHtml;
      loading = false;
    } catch (err) {
      error = err.message;
      loading = false;
    }
  }
  
  // Função para sanitizar o HTML
  function sanitizeHtml(html) {
    // Implementar lógica para remover scripts e conteúdo inseguro
    // Pode-se utilizar uma biblioteca como DOMPurify
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  // Carregar o conteúdo quando o popover for aberto
  function handlePopoverOpen() {
    if (previewMode === 'iframe' && !iframeContent) {
      loadIframeContent();
    } else if (previewMode === 'screenshot' && !item.previewImage) {
      captureScreenshot();
    }
  }
  
  // Alternar entre modos de visualização
  function togglePreviewMode() {
    previewMode = previewMode === 'iframe' ? 'screenshot' : 'iframe';
    
    if (previewMode === 'iframe' && !iframeContent) {
      loadIframeContent();
    } else if (previewMode === 'screenshot' && !item.previewImage) {
      captureScreenshot();
    }
  }
  
  // Função para abrir a página em uma nova aba
  function openInNewTab() {
    chrome.tabs.create({ url: item.url });
    dispatch('close');
  }
</script>

<Popover>
  <PopoverTrigger>
    {#if triggerElement}
      <svelte:component this={triggerElement} />
    {:else}
      <Button variant="ghost" size="icon" class="preview-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/></svg>
        <span class="sr-only">Visualizar</span>
      </Button>
    {/if}
  </PopoverTrigger>
  
  <PopoverContent class="preview-popover" on:open={handlePopoverOpen}>
    <div class="preview-header">
      <div class="preview-info">
        <img src={item.favicon || '/icons/default-favicon.png'} alt="" class="favicon" />
        <h3>{item.title}</h3>
      </div>
      
      <div class="preview-actions">
        <Button variant="outline" size="sm" on:click={togglePreviewMode}>
          {previewMode === 'iframe' ? 'Ver captura' : 'Ver conteúdo'}
        </Button>
        
        <Button variant="secondary" size="sm" on:click={openInNewTab}>
          Abrir
        </Button>
      </div>
    </div>
    
    <div class="preview-content">
      {#if loading}
        <div class="loading-state">
          <Spinner />
          <p>Carregando prévia...</p>
        </div>
      {:else if error}
        <div class="error-state">
          <p>Erro ao carregar prévia: {error}</p>
          <Button variant="outline" on:click={previewMode === 'iframe' ? loadIframeContent : captureScreenshot}>
            Tentar novamente
          </Button>
        </div>
      {:else if previewMode === 'iframe' && iframeContent}
        <iframe 
          srcdoc={iframeContent} 
          title={item.title} 
          class="preview-iframe"
          sandbox="allow-same-origin"
        ></iframe>
      {:else if previewMode === 'screenshot' && item.previewImage}
        <img src={item.previewImage} alt={item.title} class="preview-image" />
      {:else}
        <div class="empty-state">
          <p>Nenhuma prévia disponível</p>
          <Button variant="outline" on:click={previewMode === 'iframe' ? loadIframeContent : captureScreenshot}>
            Gerar prévia
          </Button>
        </div>
      {/if}
    </div>
  </PopoverContent>
</Popover>

<style>
  .preview-popover {
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    padding: 0;
  }
  
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
  }
  
  .preview-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .favicon {
    width: 16px;
    height: 16px;
  }
  
  .preview-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .preview-content {
    height: 400px;
    overflow: auto;
    position: relative;
  }
  
  .preview-iframe,
  .preview-image {
    width: 100%;
    height: 100%;
    border: none;
  }
  
  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
    padding: 1rem;
  }
</style>
```

### 8. Integração do Popover nas Visualizações

```svelte
<!-- Exemplo de integração no componente ItemCard -->
<script lang="ts">
  import { PagePreviewPopover } from '$lib/components/PagePreviewPopover.svelte';
  import type { SavedItem } from '../types';
  
  export let item: SavedItem;
</script>

<div class="item-card">
  <div class="item-header">
    <h4>{item.title}</h4>
    
    <div class="item-actions">
      <PagePreviewPopover {item} />
      <!-- Outros botões de ação -->
    </div>
  </div>
  
  <!-- Resto do conteúdo do card -->
</div>
```

```svelte
<!-- Exemplo de integração na visualização KanBan -->
<div class="kanban-item" id={item.id} data-group-id={group.id}>
  <h4>{item.title}</h4>
  
  <div class="item-actions">
    <PagePreviewPopover {item} />
    <!-- Outros botões de ação -->
  </div>
  
  {#if item.comments}
    <p>{item.comments}</p>
  {/if}
  <div class="tags">
    {#each item.tags as tag}
      <span class="tag">{tag}</span>
    {/each}
  </div>
  <a href={item.url} target="_blank" class="item-link">Visitar</a>
</div>
```

### 9. Exportação/Importação de Dados

```typescript
// storage-utils.ts
export async function exportToJson() {
  const data = {
    savedItems: await chrome.storage.sync.get("savedItems"),
    groups: await chrome.storage.sync.get("groups"),
    itemLinks: await chrome.storage.sync.get("itemLinks")
  };
  
  const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: "web-bookmarks-export.json",
    saveAs: true
  });
}

export async function importFromJson(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = JSON.parse(e.target.result);
    
    // Verificar e validar dados
    if (data.savedItems) await chrome.storage.sync.set({"savedItems": data.savedItems});
    if (data.groups) await chrome.storage.sync.set({"groups": data.groups});
    if (data.itemLinks) await chrome.storage.sync.set({"itemLinks": data.itemLinks});
  };
  reader.readAsText(file);
}
```

## Configuração de Permissões no Manifest

```typescript
export default defineManifest(async () => ({
  manifest_version: 3,
  name: "Web Bookmark Manager",
  description: "Gerenciador avançado de favoritos e páginas para leitura posterior",
  version: `${major}.${minor}.${patch}`,
  version_name: version,
  icons: { /* ... */ },
  action: {
    default_popup: "src/popup/popup.html",
    default_icon: { /* ... */ }
  },
  side_panel: {
    default_path: "src/sidepanel/sidepanel.html"
  },
  options_ui: {
    page: "src/options/options.html",
    open_in_tab: true
  },
  permissions: [
    "storage",
    "sidePanel",
    "tabs",
    "activeTab",
    "bookmarks",
    "alarms",
    "notifications",
    "downloads"
  ] as chrome.runtime.ManifestPermissions[],
  optional_permissions: ["favicon"],
  background: {
    service_worker: "src/background/index.ts",
  }
}));
```

## Cronograma Estimado

1. **Semana 1-2**: Estrutura básica e armazenamento
2. **Semana 3-4**: Interface de usuário básica (popup e sidebar)
3. **Semana 5-6**: Visualizações KanBan e SvelteFlow
4. **Semana 7-8**: Sistema de notificações, view de agendamentos e popover de visualização prévia
5. **Semana 9**: Testes e correções finais
6. **Semana 10**: Preparação para lançamento

## Próximos Passos

1. Configurar o modelo de dados e armazenamento
2. Implementar o popup para salvar páginas
3. Criar a interface da sidebar
4. Desenvolver a página de opções básica
5. Implementar as visualizações avançadas (KanBan, SvelteFlow e Agendamentos)
6. Adicionar popover de visualização prévia para os itens salvos