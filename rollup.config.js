import ts         from 'rollup-plugin-ts';
import { terser } from 'rollup-plugin-terser';

const isProduction = !process.env.ROLLUP_WATCH;

function basePlugins() {
    return [
        ts({
            hook: {
                outputPath: (path, kind) => {
                    if (kind === 'declaration') {
                        // replace .es.d.ts with .es.d.mts (see #92)
                        //
                        // this usually is already done in rollup-plugin-ts v3
                        // and could be removed after upgrading
                        return path.replace('.es.d.ts', '.es.d.mts');
                    }

                    return path;
                }
            }
        }),

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

    // UMD bundle (only the PocketBase client as default export).
    {
        input: 'src/Client.ts',
        output: [
            {
                name:      'PocketBase',
                file:      'dist/pocketbase.umd.js',
                format:    'umd',
                exports:   'default',
                sourcemap: isProduction,
            },
        ],
        plugins: basePlugins(),
        watch: { clearScreen: false },
    },

    // CommonJS bundle (only the PocketBase client as default export).
    {
        input: 'src/Client.ts',
        output: [
            {
                name:      'PocketBase',
                file:      'dist/pocketbase.cjs.js',
                format:    'cjs',
                exports:   'default',
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
    // Browser-friendly iife bundle (only the PocketBase client as default export).
    {
        input: 'src/Client.ts',
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
