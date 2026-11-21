import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/manager.tsx',
    './src/preset.ts',
    './src/preview.ts',
    './src/blocks.tsx',
  ],
  root: 'src',
  dts: true,
  sourcemap: true,
  exports: true,
  deps: {
    neverBundle: [
      /^virtual:/,
    ],
  },
})
