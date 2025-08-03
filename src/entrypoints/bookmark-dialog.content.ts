import '../app.css';
import { defineContentScript, createShadowRootUi } from '#imports';
import { mount, unmount } from 'svelte';
import BookmarkDialog from '~/components/BookmarkDialog/index.svelte';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    chrome.runtime.onMessage.addListener(async (message) => {
      if (message.action === 'openBookmarkDialog' && message.data) {
        // This variable will hold the Svelte component instance.
        let app: ReturnType<typeof mount>;

        const ui = await createShadowRootUi(ctx, {
          name: 'bookmark-dialog-ui',
          position: 'inline',
          anchor: 'body',
          append: 'first',
          onMount: (container) => {
            // Mount the component and assign the instance to our `app` variable.
            app = mount(BookmarkDialog, {
              target: container,
              props: {
                ...message.data,
                onClose: () => {
                  ui.remove();
                },
              },
            });
            // We no longer need to return the app instance here.
          },
          onRemove: () => {
            // Use the `app` instance from the outer scope to unmount the component.
            if (app) {
              unmount(app);
            }
          },
        });

        ui.mount();
      }
    });
  },
}); 