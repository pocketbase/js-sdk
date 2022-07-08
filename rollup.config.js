import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs    from '@rollup/plugin-commonjs';
import json        from '@rollup/plugin-json';
import ts          from 'rollup-plugin-ts';
import { terser }  from 'rollup-plugin-terser';

const isProduction = !process.env.ROLLUP_WATCH;

function getPlugins(browser = false) {
    return [
        nodeResolve({ browser: browser }),

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
    ]
};

export default [
    // CommonJS bundle (only the PocketBase default export)
    {
        input: 'src/Client.ts',
        output: [
            {
                name:    'PocketBase',
                file:    'dist/pocketbase.cjs.js',
                format:  'cjs',
                exports: 'default',
            }
        ],
        plugins: getPlugins(false),
        watch: {
            clearScreen: false
        },
    },

    // Browser-friendly iife bundle (only the PocketBase default export)
    {
        input: 'src/Client.ts',
        output: [
            {
                name:   'PocketBase',
                file:   'dist/pocketbase.iife.js',
                format: 'iife',
            },
        ],
        plugins: getPlugins(true),
        watch: {
            clearScreen: false
        },
    },

    // Browser-friendly es bundle (the PocketBase default export + additional helper classes)
    {
        input: 'src/index.ts',
        output: [
            {
                file:      'dist/pocketbase.es.js',
                format:    'es',
                sourcemap: true,
            },
        ],
        plugins: getPlugins(true),
        watch: {
            clearScreen: false
        },
    },
];
