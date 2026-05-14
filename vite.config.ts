import { defineConfig, type PluginOption } from 'vite' // Added PluginOption
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  // We cast the plugins to 'any' or 'PluginOption[]' to bypass the version mismatch error
  plugins: [
    tanstackStart({
      server: { entry: 'src/server.ts' }
    }),
    viteReact(),
    tailwindcss(),
    tsConfigPaths(),
  ] as any[], 
})