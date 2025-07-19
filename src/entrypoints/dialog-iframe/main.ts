import { mount } from 'svelte';
import BookmarkDialog from '../../components/BookmarkDialog/index.svelte';
import '~/app.css';

window.addEventListener('message', (event) => {
  // Garante que a mensagem é do tipo esperado e da janela pai
  if (event.source === window.parent && event.data?.type === 'init-dialog') {
    const { data } = event.data;
    const target = document.getElementById('app');

    // Aplica o tema ao body do IFrame
    if (data.theme === 'dark') {
      document.body.classList.add('dark');
    }

    if (target) {
      mount(BookmarkDialog, {
        target,
        props: {
          open: true,
          onClose: () => window.parent.postMessage({ type: 'close-dialog' }, '*'),
          initialTitle: data.title || '',
          initialUrl: data.url || '',
          initialFavicon: data.favicon || null,
        },
      });
    }
  }
}); 