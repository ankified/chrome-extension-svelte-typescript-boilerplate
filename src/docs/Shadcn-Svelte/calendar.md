---
title: Calendar
description: A calendar component that allows users to select dates.
component: true
links:
  source: https://github.com/huntabyte/shadcn-svelte/tree/main/sites/docs/src/lib/registry/default/ui/calendar
  doc: https://bits-ui.com/docs/components/calendar
  api: https://bits-ui.com/docs/components/calendar#api-reference
---

<script>
    import { ComponentPreview, Callout, PMAddComp, PMInstall, Step, Steps, InstallTabs } from '$lib/components/docs';
</script>

```svelte
<script lang="ts">
 import { getLocalTimeZone, today } from "@internationalized/date";
 import { Calendar } from "$lib/components/ui/calendar/index.js";
 
 let value = today(getLocalTimeZone());
</script>
 
<Calendar type="single" bind:value class="rounded-md border" />
```

## About

The `<Calendar />` component is built on top of the [Bits Calendar](https://www.bits-ui.com/docs/components/calendar) component, which uses the [@internationalized/date](https://react-spectrum.adobe.com/internationalized/date/index.html) package to handle dates.

If you're looking for a range calendar, check out the [Range Calendar](/docs/components/range-calendar) component.

## Installation

<InstallTabs>
{#snippet cli()}
<PMAddComp name="calendar" />
{/snippet}
{#snippet manual()}
<Steps>
<Step>

Install `bits-ui` and `@internationalized/date`:

</Step>
<PMInstall command="bits-ui @internationalized/date -D" />
<Step> Copy and paste the component source files linked at the top of this page into your project. </Step>
</Steps>
{/snippet}
</InstallTabs>

## Date Picker

You can use the `<Calendar />` component to build a date picker. See the [Date Picker](/docs/components/date-picker) page for more information.

## Examples

### Form

```svelte
<script lang="ts">
 import CalendarIcon from "@lucide/svelte/icons/calendar";
 import {
  DateFormatter,
  type DateValue,
  getLocalTimeZone
 } from "@internationalized/date";
 import { cn } from "$lib/utils.js";
 import { buttonVariants } from "$lib/components/ui/button/index.js";
 import { Calendar } from "$lib/components/ui/calendar/index.js";
 import * as Popover from "$lib/components/ui/popover/index.js";
 
 const df = new DateFormatter("en-US", {
  dateStyle: "long"
 });
 
 let value = $state<DateValue | undefined>();
 let contentRef = $state<HTMLElement | null>(null);
</script>
 
<Popover.Root>
 <Popover.Trigger
  class={cn(
   buttonVariants({
    variant: "outline",
    class: "w-[280px] justify-start text-left font-normal"
   }),
   !value && "text-muted-foreground"
  )}
 >
  <CalendarIcon />
  {value ? df.format(value.toDate(getLocalTimeZone())) : "Pick a date"}
 </Popover.Trigger>
 <Popover.Content bind:ref={contentRef} class="w-auto p-0">
  <Calendar type="single" bind:value />
 </Popover.Content>
</Popover.Root>
```

## Advanced Customization

The `<Calendar />` component can be combined with other components to create a more complex calendar.

<Callout>
    By default, we export the combined Calendar component as <code>Calendar</code> as there are quite a few pieces that need to be combined to create it. We're modifying that component in the examples below.
</Callout>

### Month & Year Selects

Here's an example of how you could create a calendar with month and year select dropdowns instead of the previous and next buttons.

```svelte
<script lang="ts">
 import { Calendar as CalendarPrimitive } from "bits-ui";
 import {
  DateFormatter,
  getLocalTimeZone,
  today,
  type DateValue
 } from "@internationalized/date";
 import * as Calendar from "$lib/components/ui/calendar/index.js";
 import * as Select from "$lib/components/ui/select/index.js";
 import { cn } from "$lib/utils.js";
 
 let value = $state<DateValue>();
 let placeholder = $state<DateValue>();
 
 const currentDate = today(getLocalTimeZone());
 
 const monthFmt = new DateFormatter("en-US", {
  month: "long"
 });
 
 const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const month = currentDate.set({ month: i + 1 });
  return {
   value: month.month,
   label: monthFmt.format(month.toDate(getLocalTimeZone()))
  };
 });
 
 const yearOptions = Array.from({ length: 100 }, (_, i) => ({
  label: String(new Date().getFullYear() - i),
  value: new Date().getFullYear() - i
 }));
 
 const defaultYear = $derived(
  placeholder
   ? { value: placeholder.year, label: String(placeholder.year) }
   : undefined
 );
 
 const defaultMonth = $derived(
  placeholder
   ? {
     value: placeholder.month,
     label: monthFmt.format(placeholder.toDate(getLocalTimeZone()))
    }
   : undefined
 );
 
 const monthLabel = $derived(
  monthOptions.find((m) => m.value === defaultMonth?.value)?.label ??
   "Select a month"
 );
</script>
 
<CalendarPrimitive.Root
 type="single"
 weekdayFormat="short"
 class={cn("rounded-md border p-3")}
 bind:value
 bind:placeholder
>
 {#snippet children({ months, weekdays })}
  <Calendar.Header class="flex w-full items-center justify-between gap-2">
   <Select.Root
    type="single"
    value={`${defaultMonth?.value}`}
    onValueChange={(v) => {
     if (!placeholder) return;
     if (v === `${placeholder.month}`) return;
     placeholder = placeholder.set({ month: Number.parseInt(v) });
    }}
   >
    <Select.Trigger aria-label="Select month" class="w-[60%]">
     {monthLabel}
    </Select.Trigger>
    <Select.Content class="max-h-[200px] overflow-y-auto">
     {#each monthOptions as { value, label } (value)}
      <Select.Item value={`${value}`} {label} />
     {/each}
    </Select.Content>
   </Select.Root>
   <Select.Root
    type="single"
    value={`${defaultYear?.value}`}
    onValueChange={(v) => {
     if (!v || !placeholder) return;
     if (v === `${placeholder?.year}`) return;
     placeholder = placeholder.set({ year: Number.parseInt(v) });
    }}
   >
    <Select.Trigger aria-label="Select year" class="w-[40%]">
     {defaultYear?.label ?? "Select year"}
    </Select.Trigger>
    <Select.Content class="max-h-[200px] overflow-y-auto">
     {#each yearOptions as { value, label } (value)}
      <Select.Item value={`${value}`} {label} />
     {/each}
    </Select.Content>
   </Select.Root>
  </Calendar.Header>
  <Calendar.Months>
   {#each months as month (month)}
    <Calendar.Grid>
     <Calendar.GridHead>
      <Calendar.GridRow class="flex">
       {#each weekdays as weekday (weekday)}
        <Calendar.HeadCell>
         {weekday.slice(0, 2)}
        </Calendar.HeadCell>
       {/each}
      </Calendar.GridRow>
     </Calendar.GridHead>
     <Calendar.GridBody>
      {#each month.weeks as weekDates (weekDates)}
       <Calendar.GridRow class="mt-2 w-full">
        {#each weekDates as date (date)}
         <Calendar.Cell class="select-none" {date} month={month.value}>
          <Calendar.Day />
         </Calendar.Cell>
        {/each}
       </Calendar.GridRow>
      {/each}
     </Calendar.GridBody>
    </Calendar.Grid>
   {/each}
  </Calendar.Months>
 {/snippet}
</CalendarPrimitive.Root>
```
