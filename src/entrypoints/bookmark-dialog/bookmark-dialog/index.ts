import { defineUnlistedScript } from '#imports';
import { mount, unmount } from 'svelte';
import BookmarkDialog from './components/index.svelte';
import css from './components/styles.css?raw';

defineUnlistedScript(mountDialog);

function mountDialog() {
  const container = document.createElement('div');
  // Evitar múltiplas injeções
  if (document.getElementById(container.id)) return;
  container.id = 'bookmark-dialog-container';

  const shadow = container.attachShadow({ mode: 'open' });
  const appRoot = document.createElement('div');
  const style = document.createElement('style');
  style.textContent = css;

  shadow.appendChild(style);
  shadow.appendChild(appRoot);
  document.body.appendChild(container);

  const app = mount(BookmarkDialog, {
    target: appRoot,
    props: {
      open: true,
      onClose: () => {
        unmount(app);
        container.remove();
      },
    },
  });
} 