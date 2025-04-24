---
title: Range Calendar
description: A calendar component that allows users to select a range of dates.
component: true
links:
  source: https://github.com/huntabyte/shadcn-svelte/tree/main/sites/docs/src/lib/registry/default/ui/range-calendar
  doc: https://next.bits-ui.com/docs/components/range-calendar
  api: https://next.bits-ui.com/docs/components/range-calendar#api-reference
---

<script>
    import { ComponentPreview, PMAddComp, PMInstall, Step, Steps, InstallTabs } from '$lib/components/docs';
</script>

## ComponentPreview

```svelte
<script lang="ts">
 import { getLocalTimeZone, today } from "@internationalized/date";
 import { RangeCalendar } from "$lib/components/ui/range-calendar/index.js";
 
 const start = today(getLocalTimeZone());
 const end = start.add({ days: 7 });
 
 let value = $state({
  start,
  end
 });
</script>
 
<RangeCalendar bind:value class="rounded-md border" />
```



## About

The `<RangeCalendar />` component is built on top of the [Bits Range Calendar](https://www.bits-ui.com/docs/components/range-calendar) component, which uses the [@internationalized/date](https://react-spectrum.adobe.com/internationalized/date/index.html) package to handle dates.