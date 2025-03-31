# [<svelte:component> is no longer necessary](https://svelte.dev/docs/svelte/v5-migration-guide#svelte:component-is-no-longer-necessary)

## `<svelte:component>` is no longer necessary

In Svelte 4, components are _static_ — if you render `<Thing>`, and the value of `Thing` changes, [nothing happens](/playground/7f1fa24f0ab44c1089dcbb03568f8dfa?version=4.2.18). To make it dynamic you had to use `<svelte:component>`.

This is no longer true in Svelte 5:

```svelte
<script>
	import A from './A.svelte';
	import B from './B.svelte';

	let Thing = $state();
</script>

<select bind:value={Thing}>
	<option value={A}>A</option>
	<option value={B}>B</option>
</select>

<!-- these are equivalent -->
<Thing />
<svelte:component this={Thing} />
```
While migrating, keep in mind that your component's name should be capitalized (`Thing`) to distinguish it from elements, unless using dot notation.

## Dot notation indicates a component

In Svelte 4, `<foo.bar>` would create an element with a tag name of `"foo.bar"`. In Svelte 5, `foo.bar` is treated as a component instead. This is particularly useful inside `each` blocks:

```svelte
{#each items as item}
	<item.component {...item.props} />
{/each}
```