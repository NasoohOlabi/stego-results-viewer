import type { ComponentType } from "react";
import type { ZodTypeAny, z } from "zod";
import { DivergenceMetricsRenderer } from "~/app/_components/renderers/divergence-metrics-renderer";
import { StegoResultCompressionView } from "~/app/_components/renderers/stego-result-compression-view";
import { StegoTextOnlyRenderer as StegoTextOnlyOldRenderer } from "~/app/_components/renderers/stego-result-old-renderer";
import { StegoResultRenderer } from "~/app/_components/renderers/stego-result-renderer";
import { StegoTextOnlyRenderer } from "~/app/_components/renderers/stego-text-only-renderer";
import { divergenceMetricsSchema } from "./divergence-metrics";
import { stegoResultSchema } from "./stego-result";
import { stegoComplexResultSchema } from "./stego-result-old";
import { stegoTextOnlySchema } from "./stego-text-only";

export type RendererExtraView<T = unknown> = {
	id: string;
	label: string;
	component: ComponentType<{ data: T; filename?: string | null }>;
};

export interface SchemaRenderer<T extends z.ZodType = z.ZodType> {
	schema: T;
	component: ComponentType<{ data: z.infer<T>; filename?: string | null }>;
	name: string;
	/** Shown as the first tab when `extraViews` is non-empty (default: "Result"). */
	primaryViewLabel?: string;
	/** Optional alternate parsed views (e.g. compression) — header tabs in `ParsedView`. */
	extraViews?: readonly RendererExtraView<z.infer<T>>[];
}

/** Heterogeneous list of registered renderers (each has its own schema inference). */
type AnySchemaRenderer = SchemaRenderer<ZodTypeAny>;

const renderers: AnySchemaRenderer[] = [];

/**
 * Register a schema and its corresponding renderer component.
 * Schemas are checked in registration order - first match wins.
 */
export function registerRenderer<T extends z.ZodType>(
	renderer: SchemaRenderer<T>,
) {
	renderers.push(renderer as unknown as AnySchemaRenderer);
}

/**
 * Find the first renderer whose schema matches the given data.
 * Returns null if no match is found.
 */
export function findMatchingRenderer(data: unknown): AnySchemaRenderer | null {
	for (const renderer of renderers) {
		const result = renderer.schema.safeParse(data);
		if (result.success) {
			return renderer;
		}
		console.log(
			`Schema "${renderer.name}" failed to match:`,
			result.error.format(),
		);
	}
	return null;
}

/**
 * Get all registered renderers.
 */
export function getRegisteredRenderers(): readonly AnySchemaRenderer[] {
	return renderers;
}

registerRenderer({
	schema: stegoResultSchema,
	component: StegoResultRenderer,
	name: "Stego Results",
	primaryViewLabel: "Result",
	extraViews: [
		{
			id: "compression",
			label: "Compression",
			component: StegoResultCompressionView,
		},
	],
});

registerRenderer({
	schema: divergenceMetricsSchema,
	component: DivergenceMetricsRenderer,
	name: "Divergence Metrics",
});

registerRenderer({
	schema: stegoTextOnlySchema,
	component: StegoTextOnlyRenderer,
	name: "Stego Results (Text Only)",
});

registerRenderer({
	schema: stegoComplexResultSchema,
	component: StegoTextOnlyOldRenderer,
	name: "Stego Texts (Old)",
});

// registerRenderer({
// 	schema: tableDataSchema,
// 	component: TableDataRenderer,
// 	name: "Table Data",
// });
