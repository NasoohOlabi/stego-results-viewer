import Link from "next/link";
import { notFound } from "next/navigation";
import {
	criterionHref,
	criterionNeighbours,
	isCriterionSlug,
	JUDGE_CRITERIA,
} from "../../_lib/judge-copy";
import {
	type ResolvedArm,
	type ResolvedExample,
	resolveExamples,
} from "../../_lib/judge-examples";

// Rendered on demand, like the parent /zlg-comparison page. Deliberately no
// `generateStaticParams`: prerendering these would bake the pinned example
// quotes in at build time, so a page could keep quoting a run it no longer
// describes if ZLG_RUN_DIR is repointed. Reads are cheap because
// artifact-cache keys on file mtime.
export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ criterion: string }>;
}) {
	const { criterion } = await params;
	if (!isCriterionSlug(criterion)) return { title: "Judge criterion" };
	return {
		title: `${JUDGE_CRITERIA[criterion].label} — why the number came out this way`,
	};
}

export default async function JudgeCriterionPage({
	params,
}: {
	params: Promise<{ criterion: string }>;
}) {
	const { criterion } = await params;
	if (!isCriterionSlug(criterion)) notFound();

	const copy = JUDGE_CRITERIA[criterion];
	const { previous, next } = criterionNeighbours(criterion);
	const examples = await resolveExamples(copy.examples);

	return (
		<main className="mx-auto max-w-4xl px-6 py-10 text-slate-200">
			<Link
				className="text-slate-400 text-sm hover:text-violet-200"
				href="/zlg-comparison"
			>
				← Back to the ZLG comparison
			</Link>

			<header className="mt-4">
				<h1 className="font-semibold text-2xl text-violet-100">{copy.label}</h1>
				<p className="mt-2 text-slate-400 text-sm">
					{copy.direction === "lower-better"
						? "Lower is better"
						: "Higher is better"}
					{copy.chance ? ` · chance is ${copy.chance}` : null}
				</p>
			</header>

			<Section title="What was measured">
				<p>{copy.explanation.panel}</p>
				<p className="mt-3 text-slate-400">{copy.explanation.long}</p>
			</Section>

			<Section title="Easy to misread">
				<p className="border-amber-400/40 border-l-2 pl-4 text-amber-100/90">
					{copy.misread}
				</p>
			</Section>

			<Section title="What we think happened">
				<p className="font-medium text-lg text-violet-100">
					{copy.justification.opinion}
				</p>
				{copy.justification.body.map((paragraph) => (
					<p className="mt-3" key={paragraph.slice(0, 48)}>
						{paragraph}
					</p>
				))}
			</Section>

			<Section title="Worked examples">
				<div className="space-y-6">
					{examples.map((example) => (
						<ExampleBlock example={example} key={example.postId} />
					))}
				</div>
			</Section>

			<Section title="What this does not show">
				<ul className="list-disc space-y-2 pl-5 text-slate-400">
					{copy.limits.map((limit) => (
						<li key={limit.slice(0, 48)}>{limit}</li>
					))}
				</ul>
			</Section>

			<nav className="mt-10 flex justify-between border-white/10 border-t pt-4 text-sm">
				{previous ? (
					<Link
						className="text-slate-400 hover:text-violet-200"
						href={criterionHref(previous.slug)}
					>
						← {previous.label}
					</Link>
				) : (
					<span />
				)}
				{next ? (
					<Link
						className="text-slate-400 hover:text-violet-200"
						href={criterionHref(next.slug)}
					>
						{next.label} →
					</Link>
				) : (
					<span />
				)}
			</nav>
		</main>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="mt-8">
			<h2 className="font-semibold text-sm text-violet-200 uppercase tracking-wide">
				{title}
			</h2>
			<div className="mt-3 text-slate-200 text-sm leading-relaxed">
				{children}
			</div>
		</section>
	);
}

function ExampleBlock({ example }: { example: ResolvedExample }) {
	return (
		<figure className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
			<figcaption className="text-slate-300 text-sm">
				{example.title ? (
					<span className="block font-medium text-violet-100">
						{example.title}
					</span>
				) : null}
				<span className="mt-1 block">{example.caption}</span>
			</figcaption>

			{example.unavailable ? (
				<p className="mt-3 text-amber-200/80 text-xs italic">
					{example.unavailable}
				</p>
			) : (
				<div className="mt-4 space-y-4">
					{example.arms.map((arm) => (
						<ArmBlock arm={arm} key={arm.arm} />
					))}
				</div>
			)}

			<p className="mt-4 text-slate-500 text-xs">post {example.postId}</p>
		</figure>
	);
}

function ArmBlock({ arm }: { arm: ResolvedArm }) {
	return (
		<div>
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<span className="font-medium text-violet-200">{arm.label}</span>
				{arm.outcome ? (
					<span className="rounded bg-white/10 px-1.5 py-0.5 text-slate-300">
						{arm.outcome}
					</span>
				) : null}
				{arm.scores.map((score) => (
					<span className="text-slate-400" key={score.label}>
						{score.label} {score.value}
					</span>
				))}
			</div>
			{arm.text ? (
				// Rendered verbatim: in the register examples the misspellings are the
				// evidence, so nothing here may normalise the text.
				<blockquote className="mt-1 border-violet-400/30 border-l-2 pl-3 text-slate-200">
					{arm.text}
				</blockquote>
			) : (
				<p className="mt-1 pl-3 text-slate-500 text-xs italic">
					Comment text not stored for this arm.
				</p>
			)}
			{arm.evidence ? (
				<p className="mt-1 pl-3 text-slate-400 text-xs">
					Judge: “{arm.evidence}”
				</p>
			) : null}
		</div>
	);
}
