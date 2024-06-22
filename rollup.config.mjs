import terser from '@rollup/plugin-terser';
import ts     from 'rollup-plugin-ts';

const isProduction = !process.env.ROLLUP_WATCH;

function basePlugins() {
    return [
        ts(),

        // @todo before v1, test if feasible and consider removing the minification for the npm builds
        // (https://github.com/pocketbase/js-sdk/issues/261)
        //
        // minify if we're building for production
        // (aka. npm run build instead of npm run dev)
        isProduction && terser({
            keep_classnames: true,
            keep_fnames: true,
            output: {
                comments: false,
            },
        }),
    ]
}

export default [
    // ES bundle (the PocketBase client as default export + additional helper classes).
    {
        input: 'src/index.ts',
        output: [
            {
                file:      'dist/pocketbase.es.mjs',
                format:    'es',
                sourcemap: isProduction,
            },
        ],
        plugins: basePlugins(),
        watch: { clearScreen: false },
    },

    // ES bundle but with .js extension.
    //
    // This is needed mainly because of React Native not recognizing the mjs
    // extension by default (see https://github.com/pocketbase/js-sdk/issues/47).
    {
        input: 'src/index.ts',
        output: [
            {
                file:      'dist/pocketbase.es.js',
                format:    'es',
                sourcemap: isProduction,
            },
        ],
        plugins: basePlugins(),
        watch: { clearScreen: false },
    },

    // UMD bundle (the PocketBase client as default export + additional helper classes).
    {
        input: 'src/index.ts',
        output: [
            {
                name:      'PocketBase',
                file:      'dist/pocketbase.umd.js',
                format:    'umd',
                sourcemap: isProduction,
            },
        ],
        plugins: basePlugins(),
        watch: { clearScreen: false },
    },

    // CommonJS bundle (the PocketBase client as default export + additional helper classes).
    {
        input: 'src/index.ts',
        output: [
            {
                name:      'PocketBase',
                file:      'dist/pocketbase.cjs.js',
                format:    'cjs',
                sourcemap: isProduction,
            }
        ],
        plugins: basePlugins(),
        watch: { clearScreen: false },
    },

    // !!!
    // @deprecated - kept only for backwards compatibility and will be removed in v1.0.0
    // !!!
    //
    // Browser-friendly iife bundle (the PocketBase client as default export + additional helper classes).
    {
        input: 'src/index.ts',
        output: [
            {
                name:      'PocketBase',
                file:      'dist/pocketbase.iife.js',
                format:    'iife',
                sourcemap: isProduction,
            },
        ],
        plugins: basePlugins(),
        watch: { clearScreen: false },
    },
];
