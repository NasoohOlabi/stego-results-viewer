import {
	BookOpen,
	Flame,
	FlaskConical,
	Gauge,
	Layers,
	type LucideIcon,
	RadioTower,
	Scale,
} from "lucide-react";

export interface NavRoute {
	href: string;
	label: string;
	description: string;
	icon: LucideIcon;
}

export interface NavGroup {
	id: string;
	title: string;
	/** Short helper shown under the group title in the hub flyout. */
	blurb?: string;
	routes: NavRoute[];
}

/**
 * Single source of truth for top-level navigation.
 *
 * Scoped to the two lines of work under active research — the ZLG baseline
 * comparison and the LLM-judge evaluations — plus the supporting method and
 * artifact views. Benchmarks are CLIs in `stego-side-wing/scripts/`, not pages;
 * API and prompt logs are agent-facing endpoints under `/api/agent/`.
 *
 * The results explorer is the persistent left sidebar, so it has no nav entry.
 */
export const NAV_GROUPS: NavGroup[] = [
	{
		id: "compare",
		title: "Comparisons",
		blurb: "The two evaluations under active research",
		routes: [
			{
				href: "/zlg-comparison",
				label: "ZLG comparison",
				description:
					"Our method vs the ZLG baseline: paired metrics, reliability, and independent LLM-judge results.",
				icon: Scale,
			},
			{
				href: "/barb-comparison",
				label: "BARB comparison",
				description:
					"BARB vs balanced encode flavor: stance, specificity, anti-platitude.",
				icon: Flame,
			},
		],
	},
	{
		id: "explore",
		title: "Results",
		blurb: "Browse artifacts and pipeline state",
		routes: [
			{
				href: "/stego-process",
				label: "Stego process",
				description: "Step-by-step visualization of a saved stego result.",
				icon: RadioTower,
			},
			{
				href: "/lucid",
				label: "LUCID results",
				description:
					"Clean-dataset counts, validation, workers, and generated samples for Project LUCID.",
				icon: FlaskConical,
			},
			{
				href: "/overnight-findings",
				label: "Metrics dashboard",
				description:
					"Latest-run metrics across e2e, model-ablation, naturalness-gate, feedback and angle-scan lanes.",
				icon: Gauge,
			},
		],
	},
	{
		id: "reference",
		title: "Reference",
		blurb: "How the method works, and what is running now",
		routes: [
			{
				href: "/method",
				label: "How it works",
				description:
					"Plain-language walkthrough of the steganography method, the artifact fields, and which page shows what.",
				icon: BookOpen,
			},
			{
				href: "/workflows-runs",
				label: "Workflow runs",
				description:
					"Live workflow runs currently executing in the side-wing API process.",
				icon: Layers,
			},
			{
				href: "/workflow-llm-prompts",
				label: "Workflow LLM prompts",
				description: "View the workflow LLM prompt templates.",
				icon: FlaskConical,
			},
		],
	},
];

/** Flat list of every route, for active-state lookups. */
export const ALL_ROUTES: NavRoute[] = NAV_GROUPS.flatMap((g) => g.routes);

/** Compact set pinned to the always-visible rail (most-used surfaces). */
export const PINNED_HREFS = [
	"/zlg-comparison",
	"/barb-comparison",
	"/lucid",
	"/overnight-findings",
	"/method",
] as const;

export const PINNED_ROUTES: NavRoute[] = PINNED_HREFS.map((href) =>
	ALL_ROUTES.find((r) => r.href === href),
).filter((r): r is NavRoute => Boolean(r));
