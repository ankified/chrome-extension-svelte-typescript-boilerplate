# Sub Flows
- (source: https://svelteflow.dev/learn/guides/sub-flows)

A sub flow is essentially a flow contained within a node. A sub flow can either function as an independent entity or can be interconnected with nodes outside of its parent node. This feature can be used for grouping nodes. In this section of the documentation, we will implement a flow with sub flows and explain available options for child nodes.

> *Order of Nodes*: It’s important that your parent nodes appear before their children in the nodes array to get processed correctly.

## Defining child nodes
To define a node as a child of another node, you need to use the parentId option (you can find a list of all options in the [node options section](https://svelteflow.dev/api-reference/types/node)). Once we do that, the child node is positioned relative to its parent. A position of { x: 0, y: 0 } is at the top left corner of the parent.

```ts
const nodes = writable([
  // this is a regular node
  {
    id: 'A',
    data: {},
    position: { x: 0, y: 0 },
  },
  // this gets a child node by using the parentId option
  {
    id: 'B',
    data: { label: 'child 1' },
    position: { x: 10, y: 10 },
    // 👇
    parentId: 'A',
  },
]);
```

In the following example, we define a fixed width and height of the parent node by using the style option. Additionally, we configure the child extent to ‘parent’ to restrict the movement of child nodes beyond the boundaries of the parent node.

- Components:
> App.svelte
```svelte
<script lang="ts">
  import { writable } from 'svelte/store';
  import { SvelteFlow, Background, type Node } from '@xyflow/svelte';
 
  import '@xyflow/svelte/dist/style.css';
 
  const nodes = writable<Node[]>([
    {
      id: 'A',
      type: 'group',
      data: {},
      position: { x: 0, y: 0 },
      style: 'width: 170px; height: 140px;'
    },
    {
      id: 'B',
      type: 'input',
      data: { label: 'child 1' },
      position: { x: 10, y: 10 },
      parentId: 'A',
      extent: 'parent'
    },
    {
      id: 'C',
      data: { label: 'child 2' },
      position: { x: 10, y: 90 },
      parentId: 'A',
      extent: 'parent'
    }
  ]);
 
  const edges = writable([]);
</script>
 
<div style="height:100vh;">
  <SvelteFlow {nodes} {edges} fitView autoPanOnNodeDrag={false} attributionPosition="top-right">
    <Background bgColor="rgba(255, 240, 137, 0.25)" />
  </SvelteFlow>
</div>
```

## How child nodes work
When you drag the parent node, you will notice that the child nodes move accordingly. Adding a node to another node with the parentId option positions it relative to its parent. In terms of markup, the child node is not a subordinate. You can drag or position the child outside of its parent (when the extent: 'parent' option is not set). Nevertheless, when you drag the parent, the child moves too.

In the provided example, we use the group type for the parent node. The ‘group’ type is a convenient node type without handles, but you can use any other node type for this.

Let’s continue by adding more nodes and edges. As you can see, we can connect nodes within a group and create connections that go from a sub flow to an outer node:

- Components:
> App.svelte
```svelte
<script lang="ts">
  import { writable } from 'svelte/store';
  import { SvelteFlow, Background, type Node, type Edge } from '@xyflow/svelte';
 
  import '@xyflow/svelte/dist/style.css';
 
  const nodes = writable<Node[]>([
    {
      id: 'A',
      type: 'group',
      data: {},
      position: { x: 0, y: 0 },
      style: 'width: 170px; height: 140px;'
    },
    {
      id: 'A-1',
      type: 'input',
      data: { label: 'child 1' },
      position: { x: 10, y: 10 },
      parentId: 'A',
      extent: 'parent'
    },
    {
      id: 'A-2',
      data: { label: 'child 2' },
      position: { x: 10, y: 90 },
      parentId: 'A',
      extent: 'parent'
    },
    {
      id: 'B',
      type: 'output',
      position: { x: -100, y: 200 },
      data: { label: 'node b' }
    },
    {
      id: 'C',
      type: 'output',
      position: { x: 100, y: 200 },
      data: { label: 'node c' }
    }
  ]);
 
  const edges = writable<Edge[]>([
    { id: 'a1-a2', source: 'A-1', target: 'A-2' },
    { id: 'a2-b', source: 'A-2', target: 'B' },
    { id: 'a2-c', source: 'A-2', target: 'C' }
  ]);
</script>
 
<div style="height:100vh;">
  <SvelteFlow {nodes} {edges} fitView autoPanOnNodeDrag={false} attributionPosition="top-right">
    <Background bgColor="rgba(255, 240, 137, 0.25)" />
  </SvelteFlow>
</div>
```

## Any node can be a parent node
To demonstrate, let’s remove the label from node B and add some child nodes. This example highlights the flexibility of using one of the default node types as a parent. Furthermore, we set the child nodes to have draggable: false, rendering them non-movable.

- Components:
> App.svelte
```svelte
<script lang="ts">
  import { writable } from 'svelte/store';
  import { SvelteFlow, Background, type Node, type Edge } from '@xyflow/svelte';
 
  import '@xyflow/svelte/dist/style.css';
 
  const nodes = writable<Node[]>([
    {
      id: 'A',
      type: 'group',
      data: {},
      position: { x: 0, y: 0 },
      style: 'width: 170px; height: 140px;'
    },
    {
      id: 'A-1',
      type: 'input',
      data: { label: 'child 1' },
      position: { x: 10, y: 10 },
      parentId: 'A',
      extent: 'parent'
    },
    {
      id: 'A-2',
      data: { label: 'child 2' },
      position: { x: 10, y: 90 },
      parentId: 'A',
      extent: 'parent'
    },
    {
      id: 'B',
      type: 'output',
      position: { x: -100, y: 200 },
      data: {},
      style: 'width: 170px; height: 140px;'
    },
    {
      id: 'B-1',
      data: { label: 'child 1' },
      position: { x: 50, y: 10 },
      parentId: 'B',
      extent: 'parent',
      draggable: false,
      style: 'width: 60px;'
    },
    {
      id: 'B-2',
      data: { label: 'child 2' },
      position: { x: 10, y: 90 },
      parentId: 'B',
      extent: 'parent',
      draggable: false,
      style: 'width: 60px;'
    },
    {
      id: 'B-3',
      data: { label: 'child 3' },
      position: { x: 100, y: 90 },
      parentId: 'B',
      extent: 'parent',
      draggable: false,
      style: 'width: 60px;'
    },
    {
      id: 'C',
      type: 'output',
      position: { x: 100, y: 200 },
      data: { label: 'node c' }
    }
  ]);
 
  const edges = writable<Edge[]>([
    { id: 'a1-a2', source: 'A-1', target: 'A-2' },
    { id: 'a2-b', source: 'A-2', target: 'B' },
    { id: 'a2-c', source: 'A-2', target: 'C' }
  ]);
</script>
 
<div style="height:100vh;">
  <SvelteFlow {nodes} {edges} fitView autoPanOnNodeDrag={false} attributionPosition="top-right">
    <Background bgColor="rgba(255, 240, 137, 0.25)" />
  </SvelteFlow>
</div>
```
