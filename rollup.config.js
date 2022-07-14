import ts         from 'rollup-plugin-ts';
import { terser } from 'rollup-plugin-terser';

const isProduction = !process.env.ROLLUP_WATCH;

function basePlugins() {
    return [
        ts(),

        // minify if we're building for production
        // (aka. npm run build instead of npm run dev)
        isProduction && terser({
            output: {
                comments: false,
            },
        }),
    ]
}

export default [
    // ES bundle (the PocketBase client as default export + additional helper classes)
    {
        input: 'src/index.ts',
        output: [
            {
                file:      'dist/pocketbase.es.mjs',
                format:    'es',
                sourcemap: true,
            },
        ],
        plugins: basePlugins(),
        watch: {
            clearScreen: false,
        },
    },

    // UMD bundle (only the PocketBase client as default export)
    {
        input: 'src/Client.ts',
        output: [
            {
                name:    'PocketBase',
                file:    'dist/pocketbase.umd.js',
                format:  'umd',
                exports: 'default',
            },
        ],
        plugins: basePlugins(),
        watch: {
            clearScreen: false
        },
    },

    // CommonJS bundle (only the PocketBase client as default export)
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
        plugins: basePlugins(),
        watch: {
            clearScreen: false
        },
    },

    // !!!
    // @deprecated - kept only for backwards compatibility and will be removed in v1.0.0
    // !!!
    //
    // Browser-friendly iife bundle (only the PocketBase client as default export)
    {
        input: 'src/Client.ts',
        output: [
            {
                name:   'PocketBase',
                file:   'dist/pocketbase.iife.js',
                format: 'iife',
            },
        ],
        plugins: basePlugins(),
        watch: {
            clearScreen: false
        },
    },
];
