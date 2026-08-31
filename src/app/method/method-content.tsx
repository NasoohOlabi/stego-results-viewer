import {
	ArrowRight,
	Binary,
	FileText,
	Flame,
	FlaskConical,
	Gauge,
	KeyRound,
	LayoutDashboard,
	MessagesSquare,
	RadioTower,
	Scale,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
	BarbExplainer,
	LucidExplainer,
	MethodMap,
} from "~/app/_components/research-explainers";

/**
 * Static explainer for the zero-shot generative linguistic steganography
 * method implemented in stego-side-wing, and how each viewer page maps onto
 * it. Content mirrors docs/development/stego-sender-receiver-pipeline.md.
 */
export function MethodContent() {
	return (
		<div className="min-h-screen w-full overflow-y-auto text-white">
			<div className="mx-auto max-w-4xl px-6 py-10">
				<Hero />
				<CoreIdea />
				<PipelineStages />
				<Section icon={Scale} id="map" title="LUCID, BARB, and ZLG">
					<MethodMap />
				</Section>
				<LucidTrack />
				<BarbFlavor />
				<ArtifactAnatomy />
				<WhereToLook />
				<Glossary />
			</div>
		</div>
	);
}

function Hero() {
	return (
		<header className="mb-12">
			<p className="font-medium text-[11px] text-emerald-300/80 uppercase tracking-[0.18em]">
				How it works
			</p>
			<h1 className="mt-2 font-bold text-3xl text-white sm:text-4xl">
				Zero-shot generative linguistic steganography
			</h1>
			<p className="mt-4 max-w-2xl text-white/70 leading-7">
				This project hides a secret payload inside ordinary LLM-generated
				Reddit-style comments. The payload is <em>not</em> stored in invisible
				characters — the visible comment looks completely normal. Instead, the
				secret is carried by <strong>which</strong> comment and{" "}
				<strong>which</strong> conversational angle the sender chose to reply
				to. The receiver, sharing the same post and settings, reconstructs those
				choices and recovers the payload.
			</p>
			<div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-emerald-100/80 text-sm">
				<span className="font-semibold text-emerald-200">
					The whole method in one line:
				</span>{" "}
				<code className="text-emerald-100">
					payload → protected → compressed bits → (comment choice + angle
					choice) → a visible comment written to decode back to that angle
				</code>
			</div>
		</header>
	);
}

function CoreIdea() {
	return (
		<Section
			icon={KeyRound}
			id="core-idea"
			title="The core trick: a selection channel"
		>
			<p>
				A steganographic system needs somewhere to put bits. The naive approach
				— zero-width characters, homoglyphs, whitespace tricks — is{" "}
				<strong>forbidden here</strong>: the generated text must be ordinary,
				visible, renderable prose. So the bits live somewhere the text itself
				never reveals:
			</p>
			<ul className="mt-3 space-y-2">
				<LiPoint>
					Every prepared post has a fixed, deterministic list of{" "}
					<strong>comments</strong> and a fixed list of generated{" "}
					<strong>angles</strong> (conversational tangents to reply along).
				</LiPoint>
				<LiPoint>
					Choosing <em>which</em> comment to reply to encodes a few bits.
					Choosing <em>which</em> angle to take encodes a few more. This is the{" "}
					<strong>selection channel</strong>.
				</LiPoint>
				<LiPoint>
					An LLM then writes a natural comment that provably decodes back to the
					chosen angle. The reader sees only a plausible reply; the bits are in
					the <em>choice</em>, not the letters.
				</LiPoint>
			</ul>
			<p className="mt-3">
				Because the post, comment list, and angle list are reproducible, a
				receiver who knows the post and the shared settings can rebuild the
				exact same options, read back the sender's choices, and invert them into
				the original bitstream — then the original payload.
			</p>
		</Section>
	);
}

const STAGES: {
	n: number;
	side: "Sender" | "Carrier" | "Receiver";
	title: string;
	body: ReactNode;
}[] = [
	{
		n: 1,
		side: "Sender",
		title: "Prepare the post",
		body: (
			<>
				Load a Reddit post, enrich it with web <em>search results</em>, and
				generate a list of <em>angles</em>. This fixes the deterministic context
				both sides will share (<code>data-load → research → gen-angles</code>).
			</>
		),
	},
	{
		n: 2,
		side: "Sender",
		title: "Protect the payload",
		body: (
			<>
				Transform the secret with the configured scheme (<code>plain</code>,{" "}
				<code>hmac_xor_v1</code>, or <code>secure_compact_v2</code>) so it is
				authenticated/obfuscated before encoding.
			</>
		),
	},
	{
		n: 3,
		side: "Sender",
		title: "Compress to a bitstream",
		body: (
			<>
				Build a deterministic dictionary from the post text and compress the
				protected payload into a compact <em>bitstream</em>. Dictionary mode is
				used only when it is actually shorter than raw bytes.
			</>
		),
	},
	{
		n: 4,
		side: "Sender",
		title: "Spend bits on comment selection",
		body: (
			<>
				Consume the front of the bitstream to pick a comment index. Index{" "}
				<code>0</code> targets the post itself; higher indices pick a specific
				comment and its parent chain.
			</>
		),
	},
	{
		n: 5,
		side: "Sender",
		title: "Spend bits on angle selection",
		body: (
			<>
				Consume more bits to pick which angle (tangent) the reply will take. The
				selected angle is placed first; the rest become decode candidates.
			</>
		),
	},
	{
		n: 6,
		side: "Carrier",
		title: "Generate the visible comment",
		body: (
			<>
				An LLM writes a natural comment anchored to the selected angle — the
				only thing the public sees. An optional <em>naturalness gate</em>{" "}
				rejects angles with no topical overlap so the reply stays plausible.
			</>
		),
	},
	{
		n: 7,
		side: "Receiver",
		title: "Rebuild the context",
		body: (
			<>
				Given the post and the agreed sender id, the receiver reconstructs the
				same dictionary, comment list, and angle list — the same options the
				sender chose from.
			</>
		),
	},
	{
		n: 8,
		side: "Receiver",
		title: "Decode back to bits, then payload",
		body: (
			<>
				Map the visible comment back to its angle index, reverse the comment and
				angle selections into the original bit prefix, decompress, and undo the
				payload transform. The secret is recovered.
			</>
		),
	},
];

const SIDE_STYLES: Record<string, string> = {
	Sender: "border-sky-400/30 bg-sky-400/10 text-sky-200",
	Carrier: "border-amber-400/30 bg-amber-400/10 text-amber-200",
	Receiver: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
};

function PipelineStages() {
	return (
		<Section icon={Binary} id="pipeline" title="The pipeline, stage by stage">
			<p className="mb-5">
				Sender produces X, receiver must recover X. Each stage below is an exact
				step in <code>stego-side-wing</code>; the colored tag says which side
				owns it.
			</p>
			<ol className="space-y-3">
				{STAGES.map((stage) => (
					<li
						className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
						key={stage.n}
					>
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-semibold text-sm text-white/80">
							{stage.n}
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<h3 className="font-semibold text-white">{stage.title}</h3>
								<span
									className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${SIDE_STYLES[stage.side]}`}
								>
									{stage.side}
								</span>
							</div>
							<p className="mt-1 text-sm text-white/65 leading-6">
								{stage.body}
							</p>
						</div>
					</li>
				))}
			</ol>
		</Section>
	);
}

function LucidTrack() {
	return (
		<Section icon={FlaskConical} id="lucid" title="What LUCID is">
			<LucidExplainer />
		</Section>
	);
}

function BarbFlavor() {
	return (
		<Section icon={Flame} id="barb" title="What BARB is">
			<BarbExplainer />
		</Section>
	);
}

function ArtifactAnatomy() {
	return (
		<Section icon={FileText} id="artifact" title="What's inside a result file">
			<p className="mb-4">
				Each sample is one JSON file (an array with a single entry) under a
				run's <code>output-results/</code>. The key fields:
			</p>
			<div className="space-y-2.5">
				<FieldRow
					desc="The visible, publishable comment. This is the only part a reader ever sees."
					field="stegoText"
				/>
				<FieldRow
					desc="How the payload was compressed: method, compressed bitstring, ratio, and dictionary references."
					field="embedding.compression"
				/>
				<FieldRow
					desc="The comment-selection channel: bits used, the picked comment chain, and post context."
					field="embedding.commentEmbedding"
				/>
				<FieldRow
					desc="The angle-selection channel: bits used, the selected angle, and remaining candidate angles."
					field="embedding.angleEmbedding"
				/>
				<FieldRow
					desc="Total bits carried by the selection channel for this sample."
					field="embedding.totalBitsEmbedded"
				/>
				<FieldRow
					desc="Sender audit nested on the embedding: dictionary hashes, selected angle index, payload transform, compressed bits. The receiver uses this to detect context drift."
					field="embedding.senderAudit"
				/>
				<FieldRow
					desc="The full source post: title, selftext, comment tree, search results, and generated angles."
					field="post"
				/>
			</div>
		</Section>
	);
}

const PAGE_MAP: {
	href: string;
	icon: typeof RadioTower;
	label: string;
	desc: string;
}[] = [
	{
		href: "/zlg-comparison",
		icon: Scale,
		label: "ZLG comparison",
		desc: "Our method vs the NAACL'24 ZLG baseline, plus the independent LLM-judge panel.",
	},
	{
		href: "/barb-comparison",
		icon: Flame,
		label: "BARB comparison",
		desc: "BARB encode flavor vs the balanced control on the same posts.",
	},
	{
		href: "/lucid",
		icon: FlaskConical,
		label: "LUCID results",
		desc: "Clean-dataset prep, workers, and the historical 500-attempt evaluation.",
	},
	{
		href: "/overnight-findings",
		icon: Gauge,
		label: "Metrics dashboard",
		desc: "Latest-run e2e / ablation / gate / feedback / angle-scan totals. Same page as overnight findings.",
	},
	{
		href: "/stego-process",
		icon: RadioTower,
		label: "Stego process",
		desc: "Walk one sample through the sender → carrier → receiver stages above, visually.",
	},
	{
		href: "/workflows-runs",
		icon: LayoutDashboard,
		label: "Workflow runs",
		desc: "Live pipelines plus per-run sample generation progress (done / failed / attempted).",
	},
];

function WhereToLook() {
	return (
		<Section
			icon={MessagesSquare}
			id="pages"
			title="Where to see each part in this viewer"
		>
			<div className="grid gap-3 sm:grid-cols-2">
				{PAGE_MAP.map((page) => {
					const Icon = page.icon;
					return (
						<Link
							className="group flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
							href={page.href}
							key={page.href}
						>
							<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70">
								<Icon className="h-4 w-4" />
							</span>
							<span className="min-w-0">
								<span className="flex items-center gap-1 font-semibold text-sm text-white">
									{page.label}
									<ArrowRight className="h-3.5 w-3.5 text-white/40 transition-transform group-hover:translate-x-0.5" />
								</span>
								<span className="mt-0.5 block text-white/55 text-xs leading-5">
									{page.desc}
								</span>
							</span>
						</Link>
					);
				})}
			</div>
		</Section>
	);
}

const TERMS: { term: string; def: string }[] = [
	{
		term: "Payload",
		def: "The secret message the sender wants to hide and the receiver wants to recover.",
	},
	{
		term: "Angle",
		def: "A generated conversational tangent for a post (category, source quote, tangent). Selecting one carries bits.",
	},
	{
		term: "Selection channel",
		def: "The carrier for the payload: the combination of the chosen comment and chosen angle, not any invisible characters.",
	},
	{
		term: "Dictionary",
		def: "A deterministic token table built from the post text, used to compress the payload so more of it fits in the available bits.",
	},
	{
		term: "Naturalness gate",
		def: "An optional filter that rejects angles with no topical overlap so the visible comment stays plausible.",
	},
	{
		term: "Sender audit",
		def: "Recorded hashes, the exact compressed bitstring, and settings nested at embedding.senderAudit so the receiver can detect context drift and recover.",
	},
	{
		term: "LUCID",
		def: "The tangent-generation track: thread-grounded intents (TangentsDB) feeding the angle sampler. Not a second codec. Dashboard: /lucid.",
	},
	{
		term: "BARB",
		def: "Bit-bearing Argumentative Reddit Bite — an encode flavor of our method (pointed, thread-specific replies) compared against the balanced control. Not ZLG.",
	},
];

function Glossary() {
	return (
		<Section icon={KeyRound} id="glossary" title="Glossary">
			<dl className="grid gap-3 sm:grid-cols-2">
				{TERMS.map((t) => (
					<div
						className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
						key={t.term}
					>
						<dt className="font-semibold text-sm text-white">{t.term}</dt>
						<dd className="mt-1 text-white/60 text-xs leading-5">{t.def}</dd>
					</div>
				))}
			</dl>
		</Section>
	);
}

function Section({
	icon: Icon,
	title,
	id,
	children,
}: {
	icon: typeof KeyRound;
	title: string;
	id: string;
	children: ReactNode;
}) {
	return (
		<section className="mb-12 scroll-mt-6" id={id}>
			<div className="mb-4 flex items-center gap-3">
				<span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-emerald-300">
					<Icon className="h-4 w-4" />
				</span>
				<h2 className="font-semibold text-white text-xl">{title}</h2>
			</div>
			<div className="text-white/70 leading-7">{children}</div>
		</section>
	);
}

function LiPoint({ children }: { children: ReactNode }) {
	return (
		<li className="flex gap-2.5">
			<span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/70" />
			<span className="text-white/70">{children}</span>
		</li>
	);
}

function FieldRow({ field, desc }: { field: string; desc: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-baseline sm:gap-4">
			<code className="shrink-0 text-emerald-200 text-xs sm:w-64">{field}</code>
			<span className="text-sm text-white/60 leading-6">{desc}</span>
		</div>
	);
}
