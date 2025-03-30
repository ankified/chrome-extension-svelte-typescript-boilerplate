# Custom Nodes
- (source: https://svelteflow.dev/learn/guides/custom-nodes)

A powerful feature of Svelte Flow is the ability to add custom nodes. You can render everything you want in your custom nodes. You can define multiple source and target handles and render form inputs or even interactive charts. In this guide we will implement two nodes with color input fields that update the background color of the flow.

## Creating a custom node component
A custom node is just a Svelte component. Internally it gets wrapped to provide basic functionality like dragging and selecting. From the wrapper component we are passing props like the position or the data besides [other props](https://svelteflow.dev/api-reference/types/node-props).

Let’s start to implement the ColorPickerNode. We are using the [Handle component](https://svelteflow.dev/api-reference/components/handle) to connect our custom node with other nodes and add an input field with type=“color” to the node:

>ColorPickerNode.svelte
```svelte
<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { Writable } from 'svelte/store';
 
  type $$Props = NodeProps;
 
  export let data: { color: Writable<string> };
 
  const { color } = data;
</script>
 
<div class="colorpicker">
  <Handle type="target" position={Position.Left} />
  <div>
    color: <strong>{$color}</strong>
  </div>
  <input
    class="nodrag"
    type="color"
    on:input={(evt) => data.color.set(evt.target?.value)}
    value={$color}
  />
  <Handle type="source" position={Position.Right} />
</div>
```
 
As you can see we’ve added the class name “nodrag” to the input. This prevents dragging within the input field, which in this case will allow us to select text inside the node.

## Adding a new node type
You can add a new node type to Svelte Flow by adding it to the [nodeTypes prop](https://svelteflow.dev/api-reference/svelte-flow#nodetypes). The nodeTypes prop is an object where the key is the name of the node type and the value is the component that should be rendered for this node type. Let’s add the ColorPickerNode to the nodeTypes prop:

>App.svelte
```svelte
<script>
  import { SvelteFlow } from '@xyflow/svelte';
  import ColorPickerNode from './ColorPickerNode.svelte';
 
 
  const nodeTypes = {
    'color-picker': ColorPickerNode
  };
</script>
 
<SvelteFlow {nodeTypes} />
```

After defining the “colorPicker” node type, you can apply it to a node by setting the type node option:

```ts
const nodes = writable([
  {
    id: 'node-1',
    // this type needs to match the newly defined node type
    type: 'color-picker',
    position: { x: 0, y: 0 },
    // data is used to store the current color value
    data: { color: writable('#ff4000') },
  },
]);
```

The data field of a node can be used to store whatever data you like. In this case we are storing the current color value in a writable store . This makes it easy to update it from within the custom node later. After putting it all together and adding some basic styles, we get a nice looking custom node with a color picker.

>App.svelte
```svelte
<script>
  import { writable } from 'svelte/store';
  import { SvelteFlow } from '@xyflow/svelte';
 
  import ColorPickerNode from './ColorPickerNode.svelte';
 
  import '@xyflow/svelte/dist/style.css';
 
  const nodes = writable([
    {
      id: '1',
      type: 'colorPicker',
      data: { color: writable('#ff4000') },
      position: { x: 0, y: 0 }
    }
  ]);
 
  const edges = writable([]);
 
  const nodeTypes = {
    colorPicker: ColorPickerNode
  };
</script>
 
<div style="height:100vh;">
  <SvelteFlow {nodes} {edges} {nodeTypes} fitView attributionPosition="top-right" />
</div>
```

## Adjust the flow background color
Now that we have a custom node with a color picker, we want to update the background color of the flow. To make this a bit more fun, we add another node and then mix both colors by using the CSS color-mix  notation. For this we add another node to the nodes array and then subscribe to the color stores of both nodes. Whenever one of the colors changes, we update the background color of the flow:

>App.svelte
```svelte
<script>
  import { writable } from 'svelte/store';
  import { SvelteFlow } from '@xyflow/svelte';
 
  import ColorPickerNode from './ColorPickerNode.svelte';
 
  import '@xyflow/svelte/dist/style.css';
 
  const nodes = writable([
    {
      id: '1',
      type: 'colorPicker',
      data: { color: writable('#ff4000') },
      position: { x: 0, y: 0 }
    },
    {
      id: '2',
      type: 'colorPicker',
      data: { color: writable('#ffffff') },
      position: { x: 200, y: 0 }
    }
  ]);
 
  const edges = writable([]);
 
  const nodeTypes = {
    colorPicker: ColorPickerNode
  };
 
  $: colorA = $nodes[0].data.color;
  $: colorB = $nodes[1].data.color;
</script>
 
<div style="height:100vh;">
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    fitView
    style="background-color: color-mix(in srgb, {$colorA}, {$colorB});"
    attributionPosition="top-right"
  />
</div>
```

## Suppress unknown prop warnings
Following this guide you will probably wonder why your browser console is flooded with warnings like this:

```
<CustomNode /> was created with unknown prop 'height'
```

This is due to the wrapper component always passing every prop to the custom node component, regardless whether you have implemented them in your svelte component or not. To suppress them, simply add $$restProps to a line, like this:

>CustomNode.svelte
```svelte
<script>
    // Your svelte flow code...
 
    $$restProps;
</script>
```
