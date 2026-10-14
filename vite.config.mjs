import {defineConfig} from 'vite';
// Unambiguous content digests let hosting cache all generated build assets.
export default defineConfig({build:{rollupOptions:{output:{hashCharacters:'hex',entryFileNames:'assets/[name]-[hash:16].js',chunkFileNames:'assets/[name]-[hash:16].js',assetFileNames:'assets/[name]-[hash:16][extname]'}}}});
