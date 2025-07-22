import { defineConfig } from 'wxt';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-svelte'],
  srcDir: 'src',
  alias: {
    $lib: path.resolve(__dirname, './src/lib'),
  },
  vite: (configEnv) => ({
    // The resolve alias is now handled by the top-level `alias` option
    css: {
      postcss: {
        plugins: [
          require('@tailwindcss/postcss')(),
        ],
      },
    },
  }),
  webExt: {
    disabled: true,
  },
  manifest: {
    name: 'Svelte TypeScript Extension',
    description: 'A boilerplate for building a Chrome extension with Svelte and TypeScript',
    permissions: ['sidePanel', 'storage', 'tabs', 'identity', 'notifications', 'alarms', 'history', 'unlimitedStorage'],
    commands: {
      'open-bookmark-dialog': {
        suggested_key: { default: 'Ctrl+Shift+K' },
        description: 'Abrir dialog para novo bookmark'
      }
    },
    host_permissions: ['<all_urls>'],
    key: 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0NCk1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBbUFRdW8yME9TT0ZLZ0dyQ3dVZHANCjZ5NENiY0tyNmZ1emxabjhQWGRwMlljWEFVaTVRRlJBYzY4OEV2d2FGWXJiM0NINVRwMVZBVlNNcThRVnlRYisNCmNMMDg2MnE3RkorL0Ywd3VnV2I1VGZBc2drc0ZUM3JLbTBxNzRyRWIwZHg3ZjVqQWdLQU9HSHJaN0NZL1RuaDANCnBBdW9jTTV3TkNrRW5SNk5Lckx5a3NwRk1oenZXMzYvcmRtOGlGVnlaVStnMzBlMVBjOEE5ZGxqMFNNZW14M1gNCkdhVDAyNUxtaEVBbFlkQU9HUUhvdUlkRDVGWXpla29uNStWbHFnbTFQS09vcHV1cThZM0tYdUtIUFRQK2tubFoNCnZ4eEhObG9pbUFBMitac0JHanh3Q0hSVkRmbDhUUmYyVW1vQ1pSVytwWnFNc3dGTjZwMmxiUFNjL1N1dnZFeEYNClZRSURBUUFCDQotLS0tLUVORCBQVUJMSUMgS0VZLS0tLS0NCg==',
    action: {
      default_icon: {
        '16': 'icon-16.png',
        '32': 'icon-32.png',
        '48': 'icon-48.png',
        '128': 'icon-128.png'
      }
    },
    web_accessible_resources: [
      {
        resources: ['/dialog-iframe.html'],
        matches: ['<all_urls>'],
      },
    ],
    oauth2: {
      client_id: '399897809633-9se6bq4s3n2sa8snc50f8fa5523v1c2u.apps.googleusercontent.com',
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
    },
    icons: {
      '16': 'icon-16.png',
      '32': 'icon-32.png',
      '48': 'icon-48.png',
      '128': 'icon-128.png'
      }
  },
}); 