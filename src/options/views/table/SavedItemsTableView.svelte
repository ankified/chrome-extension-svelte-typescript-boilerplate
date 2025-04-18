<script lang="ts">
  import { columns } from './columns';
  import type { SavedItem } from '../../../types';
  import DataTable from './DataTable.svelte';

  let { data = [] } = $props();

  // Mock temporário para fallback
  const mockData: SavedItem[] = [
    {
      id: '1',
      url: 'https://exemplo.com',
      title: 'Exemplo de Página',
      favicon: '',
      dateAdded: Date.now(),
      comments: '',
      tags: ['exemplo', 'teste'],
      groupIds: ['g1'],
      readLater: true,
      scheduledDate: undefined,
      position: undefined,
      previewImage: undefined,
      noteIds: ['n1', 'n2'],
      flashcardIds: ['f1'],
    },
    {
      id: '2',
      url: 'https://svelte.dev',
      title: 'Svelte',
      favicon: '',
      dateAdded: Date.now(),
      comments: '',
      tags: ['svelte', 'web'],
      groupIds: ['g2'],
      readLater: false,
      scheduledDate: undefined,
      position: undefined,
      previewImage: undefined,
      noteIds: [],
      flashcardIds: [],
    },
  ];
</script>

<DataTable {columns} data={data && data.length > 0 ? data : mockData} /> 