import sveltePreprocess from 'svelte-preprocess';

export default {
    preprocess: sveltePreprocess({
        scss: {
            // additional options can be configured here if needed
        }

    }),
    compilerOptions: {
        customElement: true, // Ensure this is true to compile as custom elements
    },
};