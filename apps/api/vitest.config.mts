import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@kal-flow/database': fileURLToPath(new URL('../../packages/database/src/index.ts', import.meta.url)),
    },
  },
});
