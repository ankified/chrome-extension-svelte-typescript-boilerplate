---
title: Dropdown Menu
description: Displays a menu to the user — such as a set of actions or functions — triggered by a button.
component: true
links:
  source: https://github.com/huntabyte/shadcn-svelte/tree/main/sites/docs/src/lib/registry/default/ui/dropdown-menu
  doc: https://next.bits-ui.com/docs/components/dropdown-menu
  api: https://next.bits-ui.com/docs/components/dropdown-menu#api-reference
---

## Usage

```svelte
<script lang="ts">
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>Open</DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Group>
      <DropdownMenu.GroupHeading>My Account</DropdownMenu.GroupHeading>
      <DropdownMenu.Separator />
      <DropdownMenu.Item>Profile</DropdownMenu.Item>
      <DropdownMenu.Item>Billing</DropdownMenu.Item>
      <DropdownMenu.Item>Team</DropdownMenu.Item>
      <DropdownMenu.Item>Subscription</DropdownMenu.Item>
    </DropdownMenu.Group>
  </DropdownMenu.Content>
</DropdownMenu.Root>
```

## Examples

### Checkboxes

```svelte
<script lang="ts">
 import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
 import { buttonVariants } from "$lib/components/ui/button/index.js";
 
 let showStatusBar = $state(true);
 let showActivityBar = $state(false);
 let showPanel = $state(false);
</script>
 
<DropdownMenu.Root>
 <DropdownMenu.Trigger class={buttonVariants({ variant: "outline" })}
  >Open</DropdownMenu.Trigger
 >
 <DropdownMenu.Content class="w-56">
  <DropdownMenu.Group>
   <DropdownMenu.GroupHeading>Appearance</DropdownMenu.GroupHeading>
   <DropdownMenu.Separator />
   <DropdownMenu.CheckboxItem bind:checked={showStatusBar}>
    Status Bar
   </DropdownMenu.CheckboxItem>
   <DropdownMenu.CheckboxItem bind:checked={showActivityBar} disabled>
    Activity Bar
   </DropdownMenu.CheckboxItem>
   <DropdownMenu.CheckboxItem bind:checked={showPanel}
    >Panel</DropdownMenu.CheckboxItem
   >
  </DropdownMenu.Group>
 </DropdownMenu.Content>
</DropdownMenu.Root>
```

### Radio Group

```svelte
<script lang="ts">
 import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
 import { buttonVariants } from "$lib/components/ui/button/index.js";
 
 let position = $state("bottom");
</script>
 
<DropdownMenu.Root>
 <DropdownMenu.Trigger class={buttonVariants({ variant: "outline" })}
  >Open</DropdownMenu.Trigger
 >
 <DropdownMenu.Content class="w-56">
  <DropdownMenu.Group>
   <DropdownMenu.GroupHeading>Panel Position</DropdownMenu.GroupHeading>
   <DropdownMenu.Separator />
   <DropdownMenu.RadioGroup bind:value={position}>
    <DropdownMenu.RadioItem value="top">Top</DropdownMenu.RadioItem>
    <DropdownMenu.RadioItem value="bottom">Bottom</DropdownMenu.RadioItem>
    <DropdownMenu.RadioItem value="right">Right</DropdownMenu.RadioItem>
   </DropdownMenu.RadioGroup>
  </DropdownMenu.Group>
 </DropdownMenu.Content>
</DropdownMenu.Root>
```

## Changelog

### 2024-10-30 Classes for DropdownMenu.SubTrigger

- Added `gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0` to the `<DropdownMenu.SubTrigger>` to automatically style icon inside the dropdown menu sub trigger.
- Removed `size-4` from the icon inside the `<DropdownMenu.SubTrigger>` since it is now handled by the parent `<DropdownMenu.SubTrigger>`.
