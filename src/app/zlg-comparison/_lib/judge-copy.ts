/**
 * Single source of truth for every reader-facing sentence about the five
 * independent LLM-judge criteria.
 *
 * Consumed by the interactive panel (_components/llm-judge-panel.tsx), the five
 * justification pages (../judge/[criterion]/page.tsx) and the `.md` export
 * (../../zlg-comparison.md/route.ts). Numbers already share one home in
 * ./llm-judge.ts and ./data.ts; before this module the prose did not, and the
 * five interpretation strings had already drifted between the panel and the
 * export. No criterion sentence belongs anywhere but here.
 *
 * Spec: docs/docket/spec/judge-explainer-spec.md
 * Locked content: docs/docket/issues/05, 06, 07, 08, 10, 11.
 */

export type CriterionSlug =
	| "standout"
	| "weak-link"
	| "suspicion"
	| "attribution"
	| "register";

export type JudgeArm = "our_method" | "zlg" | "human";

/**
 * An example is pinned by id, never by content. The comment text and the
 * judge's evidence string are resolved from the frozen artifacts at render
 * time, so a quote cannot drift from the thing it claims to quote, while the
 * argument a page makes stays stable under review.
 */
export type PinnedExample = {
	postId: string;
	metric: string;
	arms: JudgeArm[];
	/** Why this example is on this page. Written by us, not by the judge. */
	caption: string;
};

export type JudgeCriterionCopy = {
	slug: CriterionSlug;
	/** Table ordering label. The slug, not this, is the identity. */
	label: string;
	shortLabel: string;
	direction: "lower-better" | "higher-better";
	/** Null where the criterion has no guessing baseline (J5). */
	chance: string | null;
	/** The existing table cell, defined once. */
	shortInterpretation: string;
	/** Compact note for the at-a-glance card. Runtime p-values are appended. */
	cardNote: string;
	explanation: { panel: string; long: string };
	/** The single most likely reader misconception, stated flat and corrected. */
	misread: string;
	justification: {
		/** A claim a reader could disagree with. Never "higher is better". */
		opinion: string;
		body: string[];
	};
	examples: PinnedExample[];
	limits: string[];
};

const EVIDENCE_FIDELITY_LIMIT =
	"The judge's quoted rationale is its own sentence, not a guaranteed-faithful " +
	"transcript of the comment. Auditing 50 suspicion judgments found 5 where the " +
	"reason label and the rationale disagreed and 2 where the rationale did not " +
	"describe the comment it was given. Read the quoted comment as the evidence and " +
	"the rationale as the judge's account of it.";

const HUMAN_ARM_NOTE =
	"Every judge task also scored a real comment pulled from the same thread. " +
	"That control is the human arm. It is not a human rating anything; it is " +
	"the same model judging genuine comments on the same task, which is what " +
	"makes it a usable yardstick.";

export const JUDGE_CRITERIA: Record<CriterionSlug, JudgeCriterionCopy> = {
	standout: {
		slug: "standout",
		label: "J1 standout detection",
		shortLabel: "Standout",
		direction: "lower-better",
		chance: "10%",
		shortInterpretation: "Lower is better; chance is 10%.",
		cardNote: "Lower is better; 10% is chance.",
		explanation: {
			panel:
				"The judge sees one method's stego comment slipped into a ten-comment thread alongside nine real human comments, and must name which comment slot is machine-generated. Our method and ZLG never share a slate: each gets its own separate ten-way task, though both use the same nine human distractors and the same insert slot for a given pair. The table cell is how often the judge's guess matches that method's actual slot, out of that method's own 244 tasks. Lower is better. Chance is 10% (one slot in ten).",
			long: "All ten comments in a slate come from the same post; J1 never mixes threads. A post needs at least nine usable comments to be eligible, and the slate builder drops anything under fifteen characters, so the distractors are real comments rather than one-word reactions. The judge returns the slot it picks, a confidence, a runner-up slot and a one-sentence rationale. The prompt tells it to weigh conversational fit, specificity, stance and register, and explicitly not to use length or polish as a cue.",
		},
		misread:
			"It is easy to read this as a single ten-way slate with both methods competing side by side. It is not. Each method is tested in its own slate, and the two are linked only by sharing the same nine human distractors and the same insert position.",
		justification: {
			opinion:
				"This is a real stealth loss rather than a measurement artifact, the ten-way format probably understates it, and the cause is a specific hedge-then-thesis sentence architecture rather than being too on-topic.",
			body: [
				"Our method is named correctly on 126 of 244 slates against ZLG's 69. The judge is confident on both hits and misses, so these are not lucky guesses. Read the rationales and the same words recur: generic on 102 of 126 hits, polished on 70, lacking specificity on 62. The comment reads as a competent summary of a mood rather than one person reacting to one thread.",
				"The instrument is not clean, and we would rather say so than let a reader find it. The prompt forbids using polish as a cue. The judge wrote polished on 70 of our 126 hits anyway. That weakens a verdict that goes against us, which is exactly why it belongs on the page.",
				"An independent read of twenty slates sharpened what generic polish actually means here. The recurring shape is an affective hedge followed by a thesis-like closing clause: it feels like we are doing X, which is exactly the kind of Y we should watch for. Every detected comment in that sample had it. This is a sentence architecture rather than a vocabulary, which is why paraphrasing does not remove it and why the judge keeps reaching for the same three adjectives.",
				"ZLG's 28.3% is also not what it looks like. Twelve of its 69 detections are malformed covers that leak JSON, survey widgets or article fragments. Reading eight of them closely, six are outright mechanical failures, a wrong city or a missing number as much as broken markup, caught by checking coherence rather than by any feel for style. ZLG's genuine evasions are short, blunt, sometimes profane plain sentences. That is less ambitious prose, not stealthier prose.",
				"We flagged the agreement opener as a separate tell and, on testing, it is mostly a symptom. Our comments open with Exactly, Honestly or Agreed on 24.6% of cases against a human rate of 7.2%, and those are caught 63.3% of the time against 47.8%. But condition on whether the judge already called the comment generic or polished and the gap collapses to 73.7% against 70.8%. Across the 126 detections the rationale cites generic or polished language at the same rate whether the opener is present (94.7%) or absent (94.3%), and only 6 of 38 opener-bearing detections mention the marker at all. It is a visible surface of the polish cluster, worth fixing, not an independent cause.",
				"The 51.6% probably understates how detectable our comments are. On 57 of our 118 misses, the rationale the judge gives for its wrong pick still complains about generic or polished writing. It simply pinned that complaint on a real person. In a forced choice among ten, a sufficiently conspicuous human can absorb the accusation our comment had earned. That is an artifact of the task shape, and it means a miss here is not the same thing as passing unnoticed.",
				"Three tidier explanations were tested and rejected or downgraded. Length and slate composition: holding relative length constant, the gap survives at 48.9% against 34.1%, and the scenario where nine short human fragments surround one long insert cannot arise, because the slate builder filters comments under fifteen characters. Stranded reply shape: 34.2% of human distractors carry the same uptake markers as our comments, so a property humans share cannot single ours out. The agreement opener, downgraded above. Also refuted: an absence of proper nouns, since named entities appear in nearly half the caught comments in the sample. Publishing what failed is what makes the surviving explanation worth believing.",
			],
		},
		examples: [
			{
				postId: "1m9vtya",
				metric: "standout",
				arms: ["our_method", "zlg"],
				caption:
					"Our method caught, ZLG missed on the same post. Ours delivers a sweeping moral thesis with no named hospital or investigation detail; ZLG's short grievance reads as an ordinary aside and the judge hands the accusation to a human instead.",
			},
			{
				postId: "1mnnv15",
				metric: "standout",
				arms: ["our_method", "zlg"],
				caption:
					"Both caught, for opposite reasons. Ours is a generic condolence with a geography metaphor. ZLG's cover leaks a survey widget into the comment. Only one of these is a stealth failure; the other is a broken artifact, which is why ZLG's headline number overstates its stealth.",
			},
			{
				postId: "1lw4su3",
				metric: "standout",
				arms: ["our_method", "zlg"],
				caption:
					"Neither caught, and both tasks accused the same human: a technical aside about execution methods. On 57 of 91 shared misses the judge spends its confidence on a real person. The lineup punishes whoever is most conspicuous, not whoever is machine-generated.",
			},
		],
		limits: [
			"One judge model on fixed text. Caught means this model named that slot, not that a human reader would.",
			"All 244 posts are from r/news, so the register contrast is news-comment register rather than a spread of communities.",
			"The judge cites polish after being told not to, so its rationales describe what it noticed, not what it was licensed to use.",
			EVIDENCE_FIDELITY_LIMIT,
		],
	},

	"weak-link": {
		slug: "weak-link",
		label: "J2 weak-link picked",
		shortLabel: "Weak link",
		direction: "lower-better",
		chance: "33%",
		shortInterpretation: "Lower is better; chance is 33%.",
		cardNote: "Lower is better; the human control sits in every slate.",
		explanation: {
			panel:
				"The judge sees three anonymised replies for the same pair, shuffled: one held-out human comment, our method's stego comment, and ZLG's. It ranks all three from most to least human-sounding and names the weakest. All three arms sit in the same slate, so unlike J1 this is a genuine three-way contest. The table cell is a pick rate over 244 shared slates, not a per-method task count. Lower is better. Chance is 33%.",
			long:
				"Because one slate produces one verdict shared by all three arms, the three percentages divide up the same 244 outcomes and sum to 100%. A slate also shows five other comments from the thread as context. " +
				HUMAN_ARM_NOTE,
		},
		misread:
			"It is easy to read each percentage as a rate out of a per-method total, 244 tasks each or 488 combined. There are 244 slates in total, shared by all three arms, and the three numbers are three slices of the same outcomes.",
		justification: {
			opinion:
				"This is the criterion where our method looks best and means least.",
			body: [
				"Our method is named weakest on 29.1% of slates against ZLG's 47.5%, with the human control at 23.4%. Sitting near a real comment on this task is a genuine result and worth reporting.",
				"But ZLG's 47.5% is inflated by outputs that are not comments at all. A slice of its covers are page chrome, login boilerplate, survey widgets and bare fragments. No reader would mistake those for a human reply, so beating them establishes very little.",
				"The two methods also lose differently, which a single number hides. When ZLG is named weakest the rationale usually says generic, awkward or fragment. When ours is, the words flip to polished and abstract. We are not failing in the same way and should not be credited as though we merely fail less often.",
				"Note what the human control being picked 23.4% of the time actually means: roughly one slate in four, the judge decides a genuine Reddit comment is the least human-sounding of three. That is the honest ceiling on this task. Not the weakest of three is a much weaker claim than undetectable, and the page should say so in those words.",
			],
		},
		examples: [
			{
				postId: "1mp2r91",
				metric: "weak_link",
				arms: ["our_method", "zlg", "human"],
				caption:
					"ZLG named weakest. The human reaction is six plain words; ours is a metaphor that at least engages the topic; ZLG produces a news-style sentence that belongs in an article rather than a thread.",
			},
			{
				postId: "1moxmux",
				metric: "weak_link",
				arms: ["our_method", "zlg", "human"],
				caption:
					"Our method named weakest, ranked below both ZLG and the human, for being unusually polished and agenda-framed. Follow this same comment onto the J4 and J5 pages: the criteria disagree sharply about one piece of text.",
			},
			{
				postId: "1mpltgc",
				metric: "weak_link",
				arms: ["our_method", "zlg", "human"],
				caption:
					"The human control named weakest, because the real comment is a slogan-like fragment. This is what the 23.4% is made of, and it is why this criterion cannot carry a claim about being undetectable.",
			},
		],
		limits: [
			"Descriptive only. There is no paired significance test for this criterion in the scoring artifact.",
			"The human control is a randomly drawn thread comment, including fragments and non sequiturs, so it is a realistic control rather than a strong one.",
			EVIDENCE_FIDELITY_LIMIT,
		],
	},

	suspicion: {
		slug: "suspicion",
		label: "J3 suspicion separation",
		shortLabel: "Suspicion",
		direction: "lower-better",
		chance: "0.5 AUROC",
		shortInterpretation:
			"AUROC against the human arm; chance is 0.5. The two arms are statistically indistinguishable here, so this pair is not a ranking.",
		cardNote: "Indistinguishable; not a ranking.",
		explanation: {
			panel:
				"The judge sees one comment at a time, not knowing who wrote it, and scores it 0 (reads as genuine) to 100 (reads as machine-generated), told not to treat bluntness or typos as evidence. The table cell is not an average of those scores. It is an AUROC: every one of a method's scores is compared against every human-arm score, counting wins and ties, measuring how well the scores separate that method from humans by rank. Lower is closer to the human distribution. Chance is 0.5.",
			long:
				"Three tasks run per pair, one each for our method, ZLG and a human comment, all sharing the same post and the same five context comments. The judge also returns reason labels from a fixed list, such as over_polished or ignores_thread_specifics, and those labels are a separate fact from the number. " +
				HUMAN_ARM_NOTE,
		},
		misread:
			"It is easy to read this as an average suspicion score out of 100, since the judge does return such a number per comment. The cell is not that average. It is a rank comparison against the human arm, and a method's mean score and its AUROC can move in different directions.",
		justification: {
			opinion:
				"The two methods are genuinely indistinguishable here. That is a statement about the margin between them, not a clean bill of health: this criterion tells machine text from human text perfectly well, it just cannot resolve the gap between two machines.",
			body: [
				"Both arms score about 0.66. We deliberately do not report a winner. The published values differ by 0.011, but simply changing how tied scores are counted moves each value by 0.089, eight times the gap. Under bootstrap the difference spans zero and the ordering reverses in a third of resamples. Any ranking read off that third decimal is noise.",
				"That the two are alike is real, not an artifact of the statistic. Their raw score distributions match, their medians match, and ranking the methods directly against each other gives exactly 0.50.",
				"Note what 0.66 actually means before reading the tie as failure. It sits well above the 0.5 chance line, so the judge is reliably picking up something real about both methods relative to genuine comments. What it cannot do is resolve the difference between the two of them.",
				"The reason it cannot is that the judge uses the 0-to-100 scale as a switch rather than a dial. When no reason label fires, the mean score is about 8. When any label fires, it jumps to between 52 and 72. There is almost nothing in between, so the AUROC mostly tracks how often the alarm goes off, and both methods set it off at nearly the same rate.",
				"Here is the mechanism behind the tie. Our method trips the alarm 101 times out of 244, ZLG 108, so the rates are nearly identical. But they get there through different doors: ours through over_polished, 37 times against ZLG's 7; ZLG through ignoring thread specifics, repetition and contradicting the thread's facts. Same alarm rate, different causes. Averaged into one rank statistic, the difference disappears.",
				"That J3 ties is not evidence the methods are equally stealthy. On the same posts, J1 separates them 51.6% to 28.3%, including 34.9% against 12.3% among comments J3 scored in its most human-like band. A comment can look fine when examined alone and still be the obvious odd one out in a lineup.",
			],
		},
		examples: [
			{
				postId: "1mt0d69",
				metric: "suspicion",
				arms: ["our_method", "zlg", "human"],
				caption:
					"The switch at full swing in our direction: 98 for our method against 2 for ZLG on the same post. Per-post swings this large are common; they simply cancel out across the run, which is why the totals tie.",
			},
			{
				postId: "1m7n2cs",
				metric: "suspicion",
				arms: ["our_method", "zlg", "human"],
				caption:
					"The same swing in reverse, 3 for our method against 99 for ZLG. Showing both directions is the point: neither method owns the high band.",
			},
			{
				postId: "1mpltgc",
				metric: "suspicion",
				arms: ["our_method", "zlg", "human"],
				caption:
					"A dead tie, both arms scored 5, both in the low mode with no reason label. This is where most of the run sits and why the criterion struggles to tell the methods apart.",
			},
		],
		limits: [
			"The reported p-value of 0.385 is a sign test on paired raw scores, not a test of the AUROC difference. No confidence interval for the AUROC is stored in the scoring artifact.",
			"The bootstrap treats comments as independent within an arm and ignores post pairing. The paired sign test agrees with it: no difference.",
			"Both methods are ranked against the same 244 human scores. Resampling only that shared pool leaves the comparison stable, so the instability comes from which comments each method produced.",
			EVIDENCE_FIDELITY_LIMIT,
		],
	},

	attribution: {
		slug: "attribution",
		label: "J4 thread attribution",
		shortLabel: "Attribution",
		direction: "higher-better",
		chance: "25%",
		shortInterpretation: "Higher is better; chance is 25%.",
		cardNote: "Higher is better; 25% is chance. Above the human arm is a tell.",
		explanation: {
			panel:
				"The judge sees one comment and four short thread blurbs, three decoys plus the true post, shuffled, and picks which thread the comment came from, told to guess if unsure. The cell is per-method accuracy over that method's 244 tasks. Higher is better. Chance is 25%. A real comment from the thread runs the same task as a third arm, and it is shown here.",
			long:
				"In this run every slate is four r/news titles, because the builder prefers same-subreddit decoys whenever three exist. Subreddit identity therefore cannot explain any of these numbers. " +
				HUMAN_ARM_NOTE,
		},
		misread:
			"It is easy to read a high score here as a straightforward win. It is the one criterion where beating the human arm should worry you, for the reason set out below.",
		justification: {
			opinion:
				"Scoring above the human arm is a liability, not an achievement. It means our comments carry more recoverable thread signal than genuine comments do.",
			body: [
				"Our method is traced back to its source thread on 89.3% of tasks. ZLG manages 75.0%. Real human comments from those same threads manage 75.4%. Our comments are markedly easier to place than the real ones.",
				"The reason is visible in the failures. Of the 60 human comments the judge misplaces, 98.3% share no content word with their true thread title, against 61.4% among the human comments it gets right. Real people write terse reactions, in-jokes, replies to replies and one-line asides that carry no thread signal whatsoever. Nothing about them says which story they belong to.",
				"Our comments do not behave that way. They restate the situation they are responding to, which is what makes them traceable. Read as a stealth property rather than a benchmark score, high attribution accuracy says our text is more self-contained than conversation actually is.",
				"So we would rather frame this as a diagnostic than a win. The gap between 89.3% and the human 75.4% is roughly the amount of extra topical scaffolding our generator adds, and closing it would mean writing comments that make less sense on their own, exactly as real ones do.",
				"One thing this criterion does establish cleanly: ZLG's misses are under-specified fragments that the judge binds to a stray lexical hook, a stray mention of being killed or of God pulling it toward a different story. Being placeable at all requires saying something about the thread.",
			],
		},
		examples: [
			{
				postId: "1mqwo1e",
				metric: "attribution",
				arms: ["our_method", "zlg", "human"],
				caption:
					"The whole argument in one post. Our comment is placed correctly with high confidence; ZLG's vaguer sentence is misplaced onto another story; and the real human comment, a five-word aside, is misplaced too. Being easy to attribute is not the same as being human.",
			},
			{
				postId: "1mtzg07",
				metric: "attribution",
				arms: ["human", "our_method"],
				caption:
					"A misplaced human comment that is a bare meme line. There is no thread signal in it at all. Sixty of the 244 human comments fail this way, and that is what our 89.3% is being measured against.",
			},
			{
				postId: "1moxmux",
				metric: "attribution",
				arms: ["our_method", "zlg", "human"],
				caption:
					"The Windrush comment again. J2 called it the weakest of three for being over-polished; here the same framing is exactly what lets the judge place it with 98 confidence. One text, two opposite verdicts.",
			},
		],
		limits: [
			"Descriptive only. There is no paired significance test for this criterion in the scoring artifact.",
			"A few slates contain near-duplicate write-ups of the same news event, so some misses are collisions between two versions of one story rather than genuine errors.",
			"Accuracy is computed against each judgment row's own embedded answer. Joining the separate answer-key file by task id disagrees on 51 of 732 rows and does not reproduce the published figures.",
			EVIDENCE_FIDELITY_LIMIT,
		],
	},

	register: {
		slug: "register",
		label: "J5 register fit",
		shortLabel: "Register",
		direction: "higher-better",
		chance: null,
		shortInterpretation:
			"1-5 style fit; higher is better. The human arm scores 3.402.",
		cardNote: "Higher is better; the human arm scores 3.402.",
		explanation: {
			panel:
				"The judge sees five genuine comments from the same subreddit as style references, then rates the candidate on four sub-scores plus an overall fit score, from 1 (out of place) to 5 (indistinguishable). The table cell is a plain mean of overall. It does not fold in the sub-scores. Higher is better. There is no guessing baseline here as there is for J1 to J4, but a real comment run through the same task averages 3.402, which anchors the scale.",
			long:
				"Built exactly like J3: three tasks per pair sharing a post and five context comments. The four sub-scores are tone_formality, length_norm, mechanics and insider_knowledge. They are stored per judgment and are worth reading individually, but only overall feeds the table. This is the one criterion of J2, J4 and J5 with a paired significance test in the scoring artifact. " +
				HUMAN_ARM_NOTE,
		},
		misread:
			"It is easy to read this as a composite built from all five fields. It is the mean of overall alone. The sub-scores are informative and do not move this number.",
		justification: {
			opinion:
				"We win the sub-score that does not matter and lose the ones that do. Our comments are cleaner than real Reddit comments, and that is a cost rather than a credit.",
			body: [
				"Our method averages 3.193 overall, ZLG 2.791, and real comments 3.402. Our method sits just below genuine text and clearly above the baseline, and unlike J2 and J4 this gap is backed by a paired test: 106 wins, 67 losses, 71 ties, p = 0.00374.",
				"Now look underneath the number. Our mechanics score is 4.795. The human arm scores 3.971. We are markedly better at spelling, grammar and punctuation than the people we are imitating. Our method never drops below 3 on mechanics and scores a perfect 5 on 202 of 244 comments. Real commenters write academkca, marraige and same along, and 35 of 244 human comments score 2 or below.",
				"Cleanliness does not buy what you would expect. Across our comments, tone_formality tracks the overall score almost perfectly, at r = 0.885, while mechanics barely tracks it at all, r = 0.334. Our one large advantage sits on the weakest lever. Our two deficits, tone_formality and insider_knowledge, sit on the strongest. That is why better mechanics still produces a lower overall score than the human arm.",
				"The judge's own rationales agree. When our comments score badly the words are too formal, polished, measured. Grammar is essentially never the complaint.",
				"A second, independent instrument says the same thing: the suspicion judge tags our comments over_polished on 15.2% of rows against ZLG's 2.9%. Two different tasks, one conclusion. Excess polish is registered as a tell, so mechanics above the human arm is a signature, not a strength.",
			],
		},
		examples: [
			{
				postId: "1mr0g5z",
				metric: "register",
				arms: ["our_method", "zlg", "human"],
				caption:
					"Our best case: a concise, casual reaction scoring 5 overall while ZLG's news-desk phrasing scores 1. When our generator writes short and reacts rather than summarises, it passes comfortably.",
			},
			{
				postId: "1mjq91r",
				metric: "register",
				arms: ["our_method", "zlg", "human"],
				caption:
					"The failure mode, with ZLG scoring 5 and ours 2. Ours is clear, correct and explanatory; the rationale marks it down for lacking the slang, profanity and polarised tone the thread actually uses. Correctness is not belonging.",
			},
			{
				postId: "1moxmux",
				metric: "register",
				arms: ["our_method", "human"],
				caption:
					"The contrast in a single post. The real comment scores 2 on mechanics, carrying a plain misspelling, and still ties our comment on overall fit, while ZLG beats both. The typo is the evidence; read it exactly as written.",
			},
		],
		limits: [
			"The human arm's 3.402 is this model scoring genuine comments against other genuine comments, not people rating people.",
			"Sub-scores are stored per judgment but do not feed the table cell.",
			"Some ZLG scores of 1 are page boilerplate rather than attempted comments, which drags its mean below what its comment-shaped outputs would earn.",
			EVIDENCE_FIDELITY_LIMIT,
		],
	},
};

/** Table and navigation order. J-numbers are an ordering, not an identity. */
export const CRITERION_ORDER: CriterionSlug[] = [
	"standout",
	"weak-link",
	"suspicion",
	"attribution",
	"register",
];

export function isCriterionSlug(value: string): value is CriterionSlug {
	return (CRITERION_ORDER as string[]).includes(value);
}

export function criterionHref(slug: CriterionSlug): string {
	return `/zlg-comparison/judge/${slug}`;
}

/** Previous and next criterion, for walking all five without going back. */
export function criterionNeighbours(slug: CriterionSlug): {
	previous: JudgeCriterionCopy | null;
	next: JudgeCriterionCopy | null;
} {
	const index = CRITERION_ORDER.indexOf(slug);
	const previousSlug = index > 0 ? CRITERION_ORDER[index - 1] : undefined;
	const nextSlug =
		index >= 0 && index < CRITERION_ORDER.length - 1
			? CRITERION_ORDER[index + 1]
			: undefined;
	return {
		previous: previousSlug ? JUDGE_CRITERIA[previousSlug] : null,
		next: nextSlug ? JUDGE_CRITERIA[nextSlug] : null,
	};
}
