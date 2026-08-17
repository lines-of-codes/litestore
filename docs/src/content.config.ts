import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const apiDocs = defineCollection({
	loader: glob({ pattern: "**/*.(md|mdx)", base: "./src/collections/api/" }),
	schema: z.object({
		title: z.string(),
		method: z.string().optional(),
		summary: z.string(),
		description: z.string(),
	}),
});

const docs = defineCollection({
	loader: glob({ pattern: "**/*.(md|mdx)", base: "./src/collections/docs/" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
	}),
});

export const collections = { apiDocs, docs };
