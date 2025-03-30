# Drag and Drop
This example shows how to implement a sidebar with a drag and drop functionality using the native [drag and drop events](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) .

>App.svelte
```svelte
<script>
  import { SvelteFlowProvider } from '@xyflow/svelte';
 
  import Flow from './Flow.svelte';
  import DnDProvider from './DnDProvider.svelte';
</script>
 
<SvelteFlowProvider>
  <DnDProvider>
    <Flow />
  </DnDProvider>
</SvelteFlowProvider>
```

>DnDProvider.svelte
```svelte
<script lang="ts">
  import { onDestroy, setContext } from 'svelte';
  import { writable } from 'svelte/store';
 
  const dndType = writable(null);
 
  setContext('dnd', dndType);
 
  onDestroy(() => {
    dndType.set(null);
  });
</script>
 
<slot />
```

>Flow.svelte
```svelte
<script lang="ts">
  import { writable } from 'svelte/store';
  import {
    SvelteFlow,
    Controls,
    Background,
    BackgroundVariant,
    MiniMap,
    useSvelteFlow,
    type Node
  } from '@xyflow/svelte';
  import Sidebar from './Sidebar.svelte';
 
  import '@xyflow/svelte/dist/style.css';
  import { useDnD } from './utils';
 
  const nodes = writable([
    {
      id: '1',
      type: 'input',
      data: { label: 'Input Node' },
      position: { x: 150, y: 5 }
    },
    {
      id: '2',
      type: 'default',
      data: { label: 'Default Node' },
      position: { x: 0, y: 150 }
    },
    {
      id: '3',
      type: 'output',
      data: { label: 'Output Node' },
      position: { x: 300, y: 150 }
    }
  ]);
 
  const edges = writable([
    {
      id: '1-2',
      type: 'default',
      source: '1',
      target: '2'
    },
    {
      id: '1-3',
      type: 'smoothstep',
      source: '1',
      target: '3'
    }
  ]);
 
  const { screenToFlowPosition } = useSvelteFlow();
 
  const type = useDnD();
 
  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
 
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  };
 
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
 
    if (!$type) {
      return;
    }
 
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    });
 
    const newNode = {
      id: `${Math.random()}`,
      type: $type,
      position,
      data: { label: `${$type} node` },
      origin: [0.5, 0.0]
    } satisfies Node;
 
    $nodes.push(newNode);
    $nodes = $nodes;
  };
</script>
 
<main>
  <SvelteFlow {nodes} {edges} fitView on:dragover={onDragOver} on:drop={onDrop}>
    <Controls />
    <Background variant={BackgroundVariant.Dots} />
    <MiniMap />
  </SvelteFlow>
  <Sidebar />
</main>
 
<style>
  main {
    height: 100vh;
    display: flex;
    flex-direction: column-reverse;
  }
</style>
```

>Sidebar.svelte
```svelte
<script lang="ts">
  import { useDnD } from './utils';
 
  const type = useDnD();
 
  const onDragStart = (event: DragEvent, nodeType: string) => {
    if (!event.dataTransfer) {
      return null;
    }
 
    type.set(nodeType);
 
    event.dataTransfer.effectAllowed = 'move';
  };
</script>
 
<aside>
  <div class="label">You can drag these nodes to the pane below.</div>
  <div class="nodes-container">
    <div
      class="input-node node"
      on:dragstart={(event) => onDragStart(event, 'input')}
      draggable={true}
    >
      Input Node
    </div>
    <div
      class="default-node node"
      on:dragstart={(event) => onDragStart(event, 'default')}
      draggable={true}
    >
      Default Node
    </div>
    <div
      class="output-node node"
      on:dragstart={(event) => onDragStart(event, 'output')}
      draggable={true}
    >
      Output Node
    </div>
  </div>
</aside>
 
<style>
  aside {
    width: 100%;
    background: #f4f4f4;
    font-size: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
 
  .label {
    margin: 1rem 0;
    font-size: 0.9rem;
  }
 
  .nodes-container {
    display: flex;
    align-items: center;
    justify-content: center;
  }
 
  .node {
    margin: 0.5rem;
    border: 1px solid #111;
    padding: 0.5rem 1rem;
    font-weight: 700;
    border-radius: 3px;
    cursor: grab;
    width: 50px;
  }
</style>
```

>index.ts
```ts
import App from './App.svelte';
 
import './styles.css';
 
const app = new App({
  target: document.querySelector('#app'),
});
```

>styles.css
```css
html,
body {
  margin: 0;
  font-family: sans-serif;
}
 
#app {
  width: 100vw;
  height: 100vh;
}
 
```

>utils.ts
```ts
import { getContext } from 'svelte';
import type { Writable } from 'svelte/store';
 
export const useDnD = () => {
  return getContext('dnd') as Writable<string | null>;
};
```
