# Why J1 flags our method more than ZLG

Type: research
Status: resolved

## Answer

J1 is 126/244 vs 69/244 with high confidence on hits *and* misses; runner-up is the true insert on 28% of our misses vs 15% of ZLG’s. Same-post cells: 84 our-only, 42 both, 91 neither, 27 ZLG-only. Our-method hit evidence is mostly generic/polished/lacking specificity (not “too on-topic”); J4-correct comments are not the ones J1 catches more (50% vs 65% when J4 is wrong). Findings: [why-j1-flags-our-method-more.md](../research/why-j1-flags-our-method-more.md).

## Question

J1 standout is 51.6% for our method vs 28.3% for ZLG (lower is better; chance 10%). The table makes ZLG look much stealthier. What do the actual slates and evidence strings show?

From the independent judge run’s `standout` JSONL and paired stego texts, recover:

- How often each method is correctly named as the inserted comment, already reported, plus confidence / runner-up if present.
- At least six concrete examples, quoted: (a) our method caught, ZLG missed on the same post; (b) both caught; (c) neither caught. Include the judge’s `evidence` sentence and a short characterization of the two comments (generic vs thread-specific, register, named entities).
- Whether the tell looks like “too on-topic / too constructed” versus “wrong register” versus “generic LLM polish”.
- Whether this pattern is consistent with J4 (our method 89.3% thread attribution vs ZLG 75.0%): specificity making the comment easier to pick out of a 10-way human slate.

Do not decide the narrative stance. Write findings to `docs/docket/research/why-j1-flags-our-method-more.md` and put the answer on this ticket.
