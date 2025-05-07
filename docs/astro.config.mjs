// @ts-check
import { defineConfig } from "astro/config";

import alpinejs from "@astrojs/alpinejs";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
    site: "https://lines-of-codes.github.io",
    base: "litestore",

    vite: {
        resolve: {
            alias: {
                "@": "/src/",
            },
        },
    },

    integrations: [alpinejs(), mdx()],
});