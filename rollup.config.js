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
    plugins: [
        resolve(),
        // `include` is set explicitly because rpt2's default patterns use the
        // `+(|x)` extglob, which picomatch >=2.3.2 no longer matches. Without
        // this every .ts file is skipped and rollup fails parsing raw TypeScript.
        typescript({useTsconfigDeclarationDir: true, include: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts']}),
        json(),
        terser(),
    ],
};
