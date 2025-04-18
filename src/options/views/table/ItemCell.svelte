<script lang="ts">
  import type { SavedItem } from '../../../types';
  let { item } = $props();

  const faviconUrl = $derived(() => item.favicon || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.url)}&sz=64`);
</script>

<div class="flex items-center gap-3 min-w-0">
  <img src={faviconUrl()} alt="Favicon" class="w-10 h-10 rounded bg-inherit object-contain flex-shrink-0" />
  <div class="flex flex-col min-w-0">
    <span class="font-semibold text-base truncate" title={item.title}>{item.title}</span>
    <a href={item.url} target="_blank" rel="noopener noreferrer" class="text-sm text-muted-foreground underline italic truncate" title={item.url}>{item.url}</a>
  </div>
</div> 