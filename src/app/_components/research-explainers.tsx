import Link from "next/link";

/**
 * On-page diagrams for LUCID and BARB. Shared by /method, /lucid, and
 * /barb-comparison so the three surfaces tell the same story.
 */

function ArrowDown() {
	return (
		<div aria-hidden className="flex justify-center py-1 text-white/30">
			↓
		</div>
	);
}

function Box({
	title,
	body,
	tone = "neutral",
}: {
	title: string;
	body: string;
	tone?: "neutral" | "lucid" | "sampler" | "barb" | "balanced" | "codec";
}) {
	const tones = {
		neutral: "border-white/15 bg-white/[0.04] text-white",
		lucid: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
		sampler: "border-amber-400/40 bg-amber-400/10 text-amber-100",
		barb: "border-cyan-400/40 bg-cyan-400/10 text-cyan-100",
		balanced: "border-slate-400/30 bg-slate-400/10 text-slate-200",
		codec: "border-sky-400/35 bg-sky-400/10 text-sky-100",
	} as const;
	return (
		<div className={`rounded-xl border px-4 py-3 ${tones[tone]}`}>
			<p className="font-semibold text-sm">{title}</p>
			<p className="mt-1 text-xs leading-5 opacity-80">{body}</p>
		</div>
	);
}

export function MethodMap() {
	return (
		<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
			<p className="font-medium text-[11px] text-white/45 uppercase tracking-[0.18em]">
				Where the pieces sit
			</p>
			<p className="mt-2 max-w-2xl text-sm text-white/65 leading-6">
				One codec. LUCID feeds the angle list that codec picks from. BARB only
				changes how the visible comment is written. ZLG is a different method.
			</p>
			<div className="mt-5 grid gap-3 lg:grid-cols-3">
				<div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4">
					<p className="font-semibold text-emerald-200 text-sm">LUCID</p>
					<p className="mt-1 text-white/50 text-xs uppercase tracking-wide">
						Before encoding
					</p>
					<p className="mt-2 text-sm text-white/70 leading-6">
						Builds thread-grounded angles (TangentsDB). The selection channel
						still spends bits on which angle is chosen.
					</p>
					<Link
						className="mt-3 inline-block text-emerald-300 text-xs underline"
						href="/lucid"
					>
						Open LUCID results
					</Link>
				</div>
				<div className="rounded-xl border border-cyan-400/25 bg-cyan-400/5 p-4">
					<p className="font-semibold text-cyan-200 text-sm">BARB</p>
					<p className="mt-1 text-white/50 text-xs uppercase tracking-wide">
						At generation time
					</p>
					<p className="mt-2 text-sm text-white/70 leading-6">
						Same post, same angles, same bits. The generator is told to write a
						pointed, thread-specific bite instead of a balanced reply.
					</p>
					<Link
						className="mt-3 inline-block text-cyan-300 text-xs underline"
						href="/barb-comparison"
					>
						Open BARB comparison
					</Link>
				</div>
				<div className="rounded-xl border border-orange-400/25 bg-orange-400/5 p-4">
					<p className="font-semibold text-orange-200 text-sm">ZLG</p>
					<p className="mt-1 text-white/50 text-xs uppercase tracking-wide">
						A different method
					</p>
					<p className="mt-2 text-sm text-white/70 leading-6">
						The NAACL&apos;24 baseline. Compared against our selection channel
						on /zlg-comparison — not against LUCID or BARB.
					</p>
					<Link
						className="mt-3 inline-block text-orange-300 text-xs underline"
						href="/zlg-comparison"
					>
						Open ZLG comparison
					</Link>
				</div>
			</div>
		</div>
	);
}

export function LucidExplainer({
	here = "method",
}: {
	here?: "method" | "lucid";
}) {
	return (
		<div className="space-y-5">
			<p className="text-white/70 leading-7">
				<strong className="text-white">LUCID is not a second codec.</strong> Our
				method hides bits by choosing a comment and an angle. LUCID is the
				research that tries to make those angles actually about the thread,
				instead of generic LLM filler.
			</p>

			<div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
				<p className="mb-3 font-medium text-[11px] text-white/45 uppercase tracking-[0.18em]">
					Where LUCID sits in the pipeline
				</p>
				<Box
					body="Title, selftext, comment tree. This is the shared context both sender and receiver rebuild."
					title="1 · Reddit thread"
					tone="neutral"
				/>
				<ArrowDown />
				<Box
					body="Web pages fetched for this post. If this cache is dirty, every later angle is poisoned."
					title="2 · Research"
					tone="neutral"
				/>
				<ArrowDown />
				<div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
					<Box
						body="Older baseline. Samples cached research with context_weighted_v2. Not the LUCID codebook."
						title="Sampler (baseline)"
						tone="sampler"
					/>
					<div className="hidden items-center justify-center text-white/30 sm:flex">
						vs
					</div>
					<Box
						body="LUCID codebook. Compact intents: subject, relation, thread cue, source quote. Admit or reject honestly."
						title="TangentsDB (LUCID)"
						tone="lucid"
					/>
				</div>
				<ArrowDown />
				<Box
					body="Fixed list of conversational tangents. Choosing one of these is how bits get into the comment."
					title="3 · Angle list (usually 32)"
					tone="codec"
				/>
				<ArrowDown />
				<Box
					body="Unchanged. Spend bits on comment index + angle index, then write a visible reply that decodes back to that angle."
					title="4 · Selection channel → visible comment"
					tone="codec"
				/>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100 text-sm leading-6">
					<p className="font-semibold">Frozen</p>
					<p className="mt-1 text-amber-100/80">
						The first TangentsDB-v1 500-run reused a contaminated{" "}
						<code className="text-amber-50">news_researched</code> cache. Smoke
						test only. Do not retune admission or prompts from it. Do not pair
						it with ZLG.
					</p>
				</div>
				<div className="rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-4 text-sm text-white/70 leading-6">
					<p className="font-semibold text-emerald-200">Live surface</p>
					<p className="mt-1">
						{here === "lucid" ? (
							<>
								Clean prep (fetch → research → angles) and the historical
								sampler 500-run are on this page. Clean samples have to exist
								before TangentsDB changes are allowed again.
							</>
						) : (
							<>
								Clean prep (fetch → research → angles) and the historical
								sampler 500-run are on{" "}
								<Link className="text-emerald-300 underline" href="/lucid">
									/lucid
								</Link>
								. Clean samples have to exist before TangentsDB changes are
								allowed again.
							</>
						)}
					</p>
				</div>
			</div>
		</div>
	);
}

const BARB_MOVES = [
	{
		title: "Thread specificity",
		body: "Name one entity, event, number, or policy that is actually in the thread.",
	},
	{
		title: "Felt opinion",
		body: "Sarcasm, frustration, enthusiasm, skepticism — not bland neutrality.",
	},
	{
		title: "Pointed argument",
		body: "One-beat implication. No soft hedge, no conciliatory shrug.",
	},
	{
		title: "Anti-platitude",
		body: "No “we could all just…”, no affectless agreement.",
	},
] as const;

export function BarbExplainer({
	here = "method",
}: {
	here?: "method" | "barb";
}) {
	return (
		<div className="space-y-5">
			<p className="text-white/70 leading-7">
				<strong className="text-white">
					BARB is an encode flavor of our method
				</strong>
				, not a baseline and not LUCID. Same post. Same angles. Same payload
				bits. The generator is told to write a different kind of comment.
			</p>
			<p className="font-medium text-white/45 text-xs uppercase tracking-[0.16em]">
				Bit-bearing Argumentative Reddit Bite
			</p>

			<div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
				<p className="mb-3 font-medium text-[11px] text-white/45 uppercase tracking-[0.18em]">
					What is held constant
				</p>
				<div className="grid gap-2 sm:grid-cols-3">
					<Box
						body="One Reddit thread, including nested replies."
						title="Same post"
						tone="codec"
					/>
					<Box
						body="The same 32 angles. Bits still pick an index."
						title="Same angles"
						tone="codec"
					/>
					<Box
						body="Same secret. Only the prose instruction changes."
						title="Same payload"
						tone="codec"
					/>
				</div>
				<ArrowDown />
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="rounded-xl border border-slate-400/25 bg-slate-400/5 p-4">
						<p className="font-semibold text-slate-200 text-sm">Balanced</p>
						<p className="mt-1 text-slate-400 text-xs">Control flavor</p>
						<blockquote className="mt-3 border-white/10 border-l-2 pl-3 text-slate-300 text-sm leading-6">
							“Budget tradeoffs are always hard. Lighting matters, but so does
							the rest of the parks plan.”
						</blockquote>
						<p className="mt-3 text-slate-500 text-xs">
							Plausible, even-keeled, easy to skim past.
						</p>
					</div>
					<div className="rounded-xl border border-cyan-400/35 bg-cyan-400/10 p-4">
						<p className="font-semibold text-cyan-200 text-sm">BARB</p>
						<p className="mt-1 text-cyan-200/70 text-xs">Treatment flavor</p>
						<blockquote className="mt-3 border-cyan-300/30 border-l-2 pl-3 text-cyan-50 text-sm leading-6">
							“They cut the east-path lights and called it fiscal discipline.
							That’s the cosmetic-first vote.”
						</blockquote>
						<p className="mt-3 text-cyan-200/70 text-xs">
							Names a thing in the thread, takes a side, refuses the platitude.
						</p>
					</div>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{BARB_MOVES.map((item) => (
					<div
						className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4"
						key={item.title}
					>
						<p className="font-medium text-cyan-200 text-sm">{item.title}</p>
						<p className="mt-1 text-slate-400 text-xs leading-relaxed">
							{item.body}
						</p>
					</div>
				))}
			</div>

			<p className="text-sm text-white/55 leading-6">
				{here === "barb" ? (
					<>
						This page compares BARB vs balanced on the same{" "}
						<code className="text-white/80">(post_id, sample_index)</code>{" "}
						pairs: ITT success, receiver match, length, and those lean-in
						attributes.
					</>
				) : (
					<>
						<Link className="text-cyan-300 underline" href="/barb-comparison">
							/barb-comparison
						</Link>{" "}
						compares BARB vs balanced on the same{" "}
						<code className="text-white/80">(post_id, sample_index)</code>{" "}
						pairs: ITT success, receiver match, length, and those lean-in
						attributes.
					</>
				)}{" "}
				ZLG is a different comparison —{" "}
				<Link className="text-cyan-300 underline" href="/zlg-comparison">
					/zlg-comparison
				</Link>
				.
			</p>
		</div>
	);
}
