import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import json        from '@rollup/plugin-json';
import ts          from 'rollup-plugin-ts';
import { terser }  from 'rollup-plugin-terser';

const isProduction = !process.env.ROLLUP_WATCH;

const sharedPlugins = [
    nodeResolve({ browser: true }),

    json(),

    ts(),

    commonjs({ extensions: ['.js', '.ts'] }),

    // minify if we're building for production
    // (aka. npm run build instead of npm run dev)
    isProduction && terser({
        output: {
            comments: false,
        },
    }),
];

export default [
    // es6 bundle (PocketBase default export + helper named exports)
    {
        input: 'src/index.ts',
        output: [
            {
                file: 'dist/pocketbase.es.js',
                format: 'es',
                sourcemap: true,
            },
        ],
        plugins: sharedPlugins,
        watch: {
            clearScreen: false
        },
    },
    // umd bundle (only the PocketBase default export)
    {
        input: 'src/Client.ts',
        output: [
            {
                name: 'PocketBase',
                file: 'dist/pocketbase.umd.js',
                format: 'umd',
            }
        ],
        plugins: sharedPlugins,
        watch: {
            clearScreen: false
        },
    },
];
