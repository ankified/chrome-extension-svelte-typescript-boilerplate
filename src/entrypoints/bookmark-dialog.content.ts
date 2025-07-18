import { defineContentScript, createIframeUi } from '#imports';

export default defineContentScript({
  matches: ['<all_urls>'],

  main(ctx) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'openBookmarkDialog' && message.data) {
        const ui = createIframeUi(ctx, {
          page: '/dialog-iframe.html',
          onMount: (wrapper, iframe) => {
            // Aplica estilos ao wrapper para torná-lo um overlay de tela cheia
            Object.assign(wrapper.style, {
              position: 'fixed',
              top: '0',
              left: '0',
              width: '100vw',
              height: '100vh',
              zIndex: '2147483647',
            });
            // Garante que o iframe preencha o wrapper e seja transparente
            Object.assign(iframe.style, {
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'transparent',
            });
          },
        });

        ui.mount();

        ui.iframe.onload = () => {
          ui.iframe.contentWindow?.postMessage(
            {
              type: 'init-dialog',
              data: {
                ...message.data,
                theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
              }
            },
            '*'
          );
        };

        const closeListener = (event: MessageEvent) => {
          if (event.source === ui.iframe?.contentWindow && event.data?.type === 'close-dialog') {
            ui.remove();
            window.removeEventListener('message', closeListener);
          }
        };
        window.addEventListener('message', closeListener);
      }
    });
  },
}); 