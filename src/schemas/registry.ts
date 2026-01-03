import type { ComponentType } from "react";
import type { z } from "zod";

export interface SchemaRenderer<T extends z.ZodType = z.ZodType> {
	schema: T;
	component: ComponentType<{ data: z.infer<T> }>;
	name: string;
}

const renderers: SchemaRenderer<any>[] = [];

/**
 * Register a schema and its corresponding renderer component.
 * Schemas are checked in registration order - first match wins.
 */
export function registerRenderer<T extends z.ZodType>(renderer: SchemaRenderer<T>) {
	renderers.push(renderer);
}

/**
 * Find the first renderer whose schema matches the given data.
 * Returns null if no match is found.
 */
export function findMatchingRenderer(data: unknown): SchemaRenderer<any> | null {
	for (const renderer of renderers) {
		const result = renderer.schema.safeParse(data);
		if (result.success) {
			return renderer;
		}
		console.log(`Schema "${renderer.name}" failed to match:`, result.error.format());
	}
	return null;
}

/**
 * Get all registered renderers.
 */
export function getRegisteredRenderers(): readonly SchemaRenderer<any>[] {
	return renderers;
}

// Register schemas and their renderers
import { StegoResultRenderer } from "~/app/_components/renderers/stego-result-renderer";
import { stegoResultSchema } from "./stego-result";
import { StegoTextOnlyRenderer } from "~/app/_components/renderers/stego-result-old-renderer";
import { stegoComplexResultSchema } from "./stego-result-old";

registerRenderer({
	schema: stegoResultSchema,
	component: StegoResultRenderer,
	name: "Stego Results",
});

registerRenderer({
	schema: stegoComplexResultSchema,
	component: StegoTextOnlyRenderer,
	name: "Stego Texts (Old)",
});


// registerRenderer({
// 	schema: tableDataSchema,
// 	component: TableDataRenderer,
// 	name: "Table Data",
// });
