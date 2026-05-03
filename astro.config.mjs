// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://theoolesen.com',
  image: {
    // Use Astro's built-in Sharp image optimization
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
});
