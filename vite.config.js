import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build`          -> static site for experiences.yondo.global (GitHub Pages)
// `npm run build:artifact` -> one self-contained HTML file for the claude.ai preview
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact'
  return {
    base: artifact ? './' : '/',
    plugins: [react(), ...(artifact ? [viteSingleFile()] : [])],
    define: { __ARTIFACT__: JSON.stringify(artifact) },
    build: {
      assetsInlineLimit: artifact ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 2000,
      cssCodeSplit: !artifact,
    },
  }
})
