import {
	BookOpen,
	FlaskConical,
	Gauge,
	GitCompare,
	Home,
	Layers,
	LayoutDashboard,
	Logs,
	type LucideIcon,
	PlayCircle,
	RadioTower,
	Rocket,
	Scale,
	ScrollText,
	Shield,
	Sparkles,
} from "lucide-react";

export interface NavRoute {
	href: string;
	label: string;
	description: string;
	icon: LucideIcon;
	/** Live end-to-end run with SSE progress feedback. */
	e2e?: boolean;
}

export interface NavGroup {
	id: string;
	title: string;
	/** Short helper shown under the group title in the hub flyout. */
	blurb?: string;
	routes: NavRoute[];
}

/**
 * Single source of truth for top-level navigation. Grouped so the frontend
 * reflects how the stego-side-wing pipeline is actually used: generate
 * end-to-end samples, explore results, then monitor runs and logs.
 */
export const NAV_GROUPS: NavGroup[] = [
	{
		id: "learn",
		title: "Start here",
		blurb: "Understand the method before diving into results",
		routes: [
			{
				href: "/method",
				label: "How it works",
				description:
					"Plain-language walkthrough of the steganography method, the artifact fields, and which page shows what.",
				icon: BookOpen,
			},
		],
	},
	{
		id: "generate",
		title: "Run end-to-end",
		blurb: "Generate stego samples with live progress",
		routes: [
			{
				href: "/double-process-new-post",
				label: "Double-process a post",
				description:
					"Pick a new post, run data-load → research → gen-angles twice, compare hashes. Live SSE progress.",
				icon: PlayCircle,
				e2e: true,
			},
			{
				href: "/prep-until-google-quota-then-stego",
				label: "Prep → Stego",
				description:
					"Prep posts until the Google quota, then run stego. Streams progress as it goes.",
				icon: Rocket,
				e2e: true,
			},
			{
				href: "/admin-api",
				label: "API console",
				description:
					"Full side-wing API explorer: stego, full pipeline, stego-receiver-live and decode — all with SSE.",
				icon: Shield,
				e2e: true,
			},
		],
	},
	{
		id: "explore",
		title: "Explore results",
		blurb: "Browse and visualize saved artifacts",
		routes: [
			{
				href: "/",
				label: "Results explorer",
				description:
					"Browse and render pipeline result JSON by post or artifact id.",
				icon: Home,
			},
			{
				href: "/stego-process",
				label: "Stego process",
				description: "Step-by-step visualization of a saved stego result.",
				icon: RadioTower,
			},
			{
				href: "/dashboard",
				label: "Metrics dashboard",
				description: "Charts and distributions over synced stats.",
				icon: LayoutDashboard,
			},
			{
				href: "/overnight-findings",
				label: "Overnight findings",
				description: "Latest overnight metrics summary.",
				icon: Gauge,
			},
			{
				href: "/zlg-comparison",
				label: "ZLG comparison",
				description: "Compare samples against the ZLG baseline.",
				icon: Scale,
			},
			{
				href: "/showcase",
				label: "Showcase",
				description: "Curated highlight view of selected results.",
				icon: Sparkles,
			},
		],
	},
	{
		id: "monitor",
		title: "Runs & logs",
		blurb: "Watch live runs and inspect logs",
		routes: [
			{
				href: "/workflows-runs",
				label: "Workflow runs",
				description:
					"Live workflow runs currently executing in the API process.",
				icon: Layers,
			},
			{
				href: "/single-post-twice-no-cache",
				label: "Single post twice",
				description:
					"Determinism check: run one post twice with caches disabled.",
				icon: GitCompare,
			},
			{
				href: "/workflow-llm-prompts",
				label: "Workflow LLM prompts",
				description: "View and edit the workflow LLM prompt templates.",
				icon: FlaskConical,
			},
			{
				href: "/api-logs",
				label: "API logs",
				description: "Live stream of the side-wing API JSONL log.",
				icon: Logs,
			},
			{
				href: "/prompt-logs",
				label: "Prompt logs",
				description: "Browse recorded prompt logs.",
				icon: ScrollText,
			},
		],
	},
];

/** Flat list of every route, for active-state lookups. */
export const ALL_ROUTES: NavRoute[] = NAV_GROUPS.flatMap((g) => g.routes);

/** Compact set pinned to the always-visible rail (most-used surfaces). */
export const PINNED_HREFS = [
	"/method",
	"/",
	"/stego-process",
	"/workflows-runs",
	"/dashboard",
] as const;

export const PINNED_ROUTES: NavRoute[] = PINNED_HREFS.map((href) =>
	ALL_ROUTES.find((r) => r.href === href),
).filter((r): r is NavRoute => Boolean(r));
