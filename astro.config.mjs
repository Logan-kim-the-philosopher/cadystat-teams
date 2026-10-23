import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Teams mutations are checked by src/middleware.ts. Agent APIs use bearer
  // credentials and must also accept non-browser clients without Origin.
  security: { checkOrigin: false },
  vite: {
    plugins: [tailwindcss()]
  }
});
