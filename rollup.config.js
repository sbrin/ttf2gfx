import typescript from 'rollup-plugin-typescript2';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';

export default {
    input: 'src/index.ts',
    output: {
        file: 'dist/truetype2gfx.min.js',
        format: 'esm',
        // name: 'truetype2gfx',
        sourcemap: true,
        // exports: 'named',
    },
    plugins: [resolve(), typescript({useTsconfigDeclarationDir: true}), json(), terser()],
};
