import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    './src/index.ts',
  ],
  root: 'src',
  dts: true,
  sourcemap: true,
  exports: true,
})
