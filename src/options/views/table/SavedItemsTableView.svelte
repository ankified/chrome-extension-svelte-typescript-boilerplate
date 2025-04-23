<script lang="ts">
  import { getColumns } from './columns';
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

  // Reatividade Svelte 5 para alternar colunas
  let typeFilter = $state('all');
  const showReadLaterColumns = $derived(() => typeFilter === 'readlater');
  const dynamicColumns = $derived(() => getColumns(showReadLaterColumns()));

  const filteredData = $derived(() => {
    if (typeFilter === 'all') return data && data.length > 0 ? data : mockData;
    if (typeFilter === 'readlater') return (data && data.length > 0 ? data : mockData).filter(item => item.readLater);
    if (typeFilter === 'bookmark') return (data && data.length > 0 ? data : mockData).filter(item => !item.readLater);
    return data && data.length > 0 ? data : mockData;
  });
</script>

<DataTable columns={dynamicColumns()} data={filteredData()} /> 