import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const apiDocs = defineCollection({
	loader: glob({ pattern: "**/*.(md|mdx)", base: "./src/collections/api/" }),
	schema: z.object({
		title: z.string(),
		method: z.string().optional(),
		summary: z.string(),
		description: z.string(),
	}),
});

export const collections = { apiDocs };
