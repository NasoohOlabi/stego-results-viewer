# Whether J1 detection tracks length and slate composition

Type: research
Status: resolved

## Question

The team's current reading of J1 is "generic LLM polish plus missing thread grit." A competing
explanation surfaced on 2026-08-29 and has not been tested: J1 detection is driven by **length and
slate composition**, not content quality.

The claim, in the collaborator's words: if the nine human distractors are short ("yes", "I agree",
a swear word, a fragment), our method's longer and more uniform comment stands out mechanically,
whatever it says. A sharper second form: our comments are written against a thread and often a
**parent comment**, but J1 flattens the slate into ten siblings, so a reply-shaped comment ends up
agreeing with nobody. It fits the thread; it does not fit a flat comment list.

Two facts already in the frozen data motivate this:

- Candidate word counts are our method 23.4 (sd **5.0**), ZLG 15.3 (sd 6.1), human 28.3 (sd **28.0**).
  Humans are longer on average but wildly variable; our method is metronomic. The tell may be
  "suspiciously average," not "too long."
- Several caught comments open with stranded discourse deixis: "Exactly, it feels like...",
  "I really appreciate you pointing out that misconception about the Windrush generation...".

Resolve with three parallel AFK agents, findings under `docs/docket/research/`:

- Quantitative length and slate composition, including the decisive test: detection rate at
  matched relative length (does our method still beat ZLG and chance when its comment is
  mid-length for its slate?). -> `research/j1-length-and-slate-composition.md`
- Reply-shape / stranded-antecedent test, whose deciding control is the **human distractor
  baseline** (Redditors reply to each other constantly; if humans carry the same markers, the
  hypothesis is dead). -> `research/j1-reply-shape-hypothesis.md`
- An adversarial independent read of 20 sampled slates that forms its own competing explanation
  and hunts counterexamples in both directions. -> `research/j1-adversarial-sample-read.md`

Do not decide the viewer narrative here; that is ticket 05. This ticket only establishes whether
the length / slate-composition / stranded-reply account survives contact with the data.

## Answer

**Refuted, both forms.** Neither length/slate composition nor stranded reply-shape explains the
J1 gap. All three planned agents have now delivered; the adversarial read was re-run 2026-08-30
after a session rate limit killed the first attempt.

**Length (`research/j1-length-and-slate-composition.md`).** The decisive test holds relative length
constant: among slates where the insert ranks 4-7 of 10 on length, so it does not stand out,
detection is our method 87/178 (48.9%) and ZLG 46/135 (34.1%). The roughly 15-point gap survives
intact; ZLG's rate actually rises. Length-gap correlations with detection are real but weak
everywhere (point-biserial r 0.14-0.22, Spearman 0.19-0.26). Two sub-findings cut actively against
the hypothesis: judge evidence citing length or brevity is *more* common among misses than hits for
both methods, and detection is *higher* in low-variance distractor slates, the opposite of the
"stands out amid chaotic humans" mechanism.

The collaborator's literal scenario cannot occur by construction. Zero of 244 posts had a majority
of distractors under five words, because `_valid` in `judge_slate_service.py:63-68` drops any
comment shorter than 15 characters before a slate is built. "yes", "I agree", and a bare swear word
are filtered out of the distractor pool. Verified in source, not inferred.

**Reply shape (`research/j1-reply-shape-hypothesis.md`).** The human baseline kills the strong form:
34.2% (1502/4392) of human distractors carry a reply-shape marker, against 38.5% (94/244) for our
method. A property humans share at nearly the same rate cannot be what singles our comment out.
ZLG runs the wrong way outright, detected 23.2% when reply-shaped versus 29.8% when not. Evidence
corroboration is the weakest link: only 5/126 (4.0%) of our method's hit evidence strings use
fit-or-coherence language, and only 2/126 (1.6%) do so without also citing the known
generic/polished tell. The sharpest sub-claim, a bare demonstrative with no antecedent anywhere in
the slate, shows a large effect (100% vs 76.9%) on n=2 vs n=13 and is indistinguishable from noise.

**What survives, and it is worth more than the hypothesis was.** Our method opens with an
agreement/uptake token ("Exactly,", "Honestly,", "Agreed,") on 24.6% (60/244) of comments, against
a human rate of 7.2% (318/4392) and ZLG's 3.3% (8/244) — roughly 3.4x the human rate. Detection is
63.3% when that opener is present versus 47.8% when it is absent. This is not the dominant cause of
the J1 gap and must not be sold as one, but it is a concrete, single-feature, generation-side
artifact rather than a diffuse "polish" complaint. It is the most actionable finding of this ticket.

### Adversarial read (completed 2026-08-30)

`research/j1-adversarial-sample-read.md`. 20 slates, seed 20260830, reviewer's blind pick recorded
before revealing the key (their own hit rate: 16/20).

- **It downgraded our own surviving finding.** The agreement opener is mostly a proxy for the
  generic/polish cluster, not an independent tell. Conditioned on an existing generic/polish tag the
  gap collapses to 73.7% vs 70.8%. Shipped copy corrected.
- **It found something we had not named, and it is unflattering.** The *decoy-sink* effect: on 57 of
  118 misses the judge's wrong pick still cites generic/polished writing, aimed at a real human. The
  headline 51.6% therefore likely understates detectability.
- **It sharpened the cause** from "generic polish" to a hedge-then-thesis sentence architecture,
  present in 12 of 12 detected hits sampled.
- **ZLG's steelman is weaker than its number.** 6 of 8 detections read closely are mechanical
  failures; its genuine evasions are short blunt plain sentences. Less ambitious, not stealthier.

Ticket 05 may therefore not tell a length story or a stranded-reply story. The ticket-02 account
(generic polish plus missing thread grit) stands, now with two named rivals tested and rejected on
the record, which is a stronger position than never having tested them.
