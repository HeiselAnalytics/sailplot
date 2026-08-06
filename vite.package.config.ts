import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: 'public',
  build: {
    outDir: 'dist-package',
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, 'src/package-entry.ts'),
      formats: ['es'],
      fileName: () => 'sailplot.js',
      cssFileName: 'sailplot',
    },
    rollupOptions: {
      external: (id) => /^(react|react-dom)(\/|$)/u.test(id),
    },
  },
})
