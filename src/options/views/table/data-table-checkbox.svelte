<script lang="ts">
  import { Checkbox } from '../../../lib/components/ui/checkbox/index';
  export let checked = false;
  export let indeterminate = false;
  export let onCheckedChange = (v: boolean) => {};
</script>

<Checkbox bind:checked onCheckedChange={onCheckedChange} indeterminate={indeterminate} /> 