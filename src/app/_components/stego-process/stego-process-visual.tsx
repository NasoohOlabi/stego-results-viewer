"use client";

import {
	AlertTriangle,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CircleDot,
	Database,
	FileText,
	KeyRound,
	MessagesSquare,
	Play,
	RadioTower,
	RefreshCw,
	ShieldCheck,
	Square,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import type { StegoResult } from "~/schemas/stego-result";

type StageStatus = "ready" | "active" | "blocked" | "done";

type FailureKey =
	| "missingAngles"
	| "contextDrift"
	| "decodeMismatch"
	| "noAuditBitstream";

type Stage = {
	id: string;
	label: string;
	group: "sender" | "visible" | "receiver";
	icon: typeof FileText;
	body: string;
};

type DemoCase = {
	id: string;
	label: string;
	payload: string;
	protectedPayload: string;
	compressed: string;
	commentBits: string;
	angleBits: string;
	stegoText: string;
	commentTarget: "post" | "comment";
	selectedCommentId: string | null;
	selectedAngleIndex: number;
	comments: Array<{ id: string; author: string; body: string }>;
	angles: Array<{ idx: number; category: string; tangent: string }>;
};

type ProcessModel = DemoCase & {
	sourceLabel: string;
	hasArtifact: boolean;
	receiverPayload: string | null;
	recoveryMode: "full" | "bruteforce" | "unknown";
	rawPayload: string | null;
	rawPayloadAvailable: boolean;
	payloadTransform: string | null;
};

type FlowNode = {
	id: string;
	label: string;
	stageId: string;
	lane: "sender" | "carrier" | "receiver";
	x: number;
	y: number;
	incoming: string;
	outgoing: string;
};

type FlowEdge = {
	id: string;
	from: string;
	to: string;
	label: string;
	route?:
		| "vertical"
		| "posted"
		| "audit"
		| "audit-recover"
		| "angle-audit"
		| "angle-visible"
		| "comment-visible"
		| "protect-compress"
		| "dictionary-compress";
};

interface StegoProcessVisualProps {
	data?: StegoResult;
	filename?: string | null;
	chartOnly?: boolean;
}

const stages: Stage[] = [
	{
		id: "prep",
		label: "Prepare Post",
		group: "sender",
		icon: Database,
		body: "Data-load, research, and gen-angles prepare deterministic post context before stego encoding.",
	},
	{
		id: "select",
		label: "Select Post",
		group: "sender",
		icon: FileText,
		body: "The sender chooses a final-step post, falling back to angles-step when needed.",
	},
	{
		id: "payload",
		label: "Payload",
		group: "sender",
		icon: FileText,
		body: "The sender starts with the message that should survive the trip.",
	},
	{
		id: "protect",
		label: "Apply Transform",
		group: "sender",
		icon: ShieldCheck,
		body: "A reversible payload transform runs here (plain/hmac_xor_v1/secure_compact_v2). Compression happens in the next stage.",
	},
	{
		id: "dictionary",
		label: "Dictionary",
		group: "sender",
		icon: Database,
		body: "The sender builds a deterministic source-aware dictionary and records its audit report.",
	},
	{
		id: "compress",
		label: "Compress",
		group: "sender",
		icon: Database,
		body: "A deterministic dictionary turns the protected payload into a compact bitstream.",
	},
	{
		id: "comment",
		label: "Comment Bits",
		group: "sender",
		icon: MessagesSquare,
		body: "The first bits choose the post or comment context that the visible reply targets.",
	},
	{
		id: "angle",
		label: "Angle Bits",
		group: "sender",
		icon: CircleDot,
		body: "The next bits choose the angle that the visible stego text must decode back to.",
	},
	{
		id: "audit",
		label: "Sender Audit",
		group: "sender",
		icon: ShieldCheck,
		body: "Sender audit records hashes, selection bits, compressed bitstream, and transform metadata.",
	},
	{
		id: "visible",
		label: "Visible Text",
		group: "visible",
		icon: RadioTower,
		body: "The carrier is normal readable text. The hidden data lives in the selections.",
	},
	{
		id: "validate",
		label: "Validate",
		group: "sender",
		icon: CheckCircle2,
		body: "The sender checks that the visible text decodes to the selected angle and stays on context.",
	},
	{
		id: "locate",
		label: "Locate Comment",
		group: "receiver",
		icon: MessagesSquare,
		body: "The receiver finds the sender's visible comment and removes it to rebuild pre-sender context.",
	},
	{
		id: "rebuild",
		label: "Rebuild Context",
		group: "receiver",
		icon: RefreshCw,
		body: "Data-load, research, angles, and dictionary are rebuilt and compared with audit hashes.",
	},
	{
		id: "drift",
		label: "Context Drift",
		group: "receiver",
		icon: AlertTriangle,
		body: "When sender audit exists, the receiver compares dictionary, angle, and selected URL hashes.",
	},
	{
		id: "decode",
		label: "Decode Angle",
		group: "receiver",
		icon: KeyRound,
		body: "Semantic decode maps the visible comment back to the selected angle index.",
	},
	{
		id: "recover",
		label: "Recover Payload",
		group: "receiver",
		icon: CheckCircle2,
		body: "The receiver reconstructs the bit prefix, decompresses, and reverses payload protection.",
	},
];

const demoCases: DemoCase[] = [
	{
		id: "meetup",
		label: "Meetup payload",
		payload: "MEET_AT_9",
		protectedPayload: "swsec2.MEET_AT_9",
		compressed: "001001101010001010100010111101001011",
		commentBits: "00",
		angleBits: "10",
		stegoText:
			"The sidewalk work matters, but the budget choice says more about what the council values.",
		commentTarget: "post",
		selectedCommentId: null,
		selectedAngleIndex: 2,
		comments: [
			{
				id: "post",
				author: "post context",
				body: "City council park funding",
			},
			{
				id: "c1",
				author: "alice",
				body: "Lighting near the east path needs priority.",
			},
			{
				id: "c2",
				author: "bob",
				body: "Sidewalk repairs should come before new banners.",
			},
		],
		angles: [
			{
				idx: 0,
				category: "Public Safety",
				tangent: "Discuss safety concerns around park lighting.",
			},
			{
				idx: 1,
				category: "Infrastructure",
				tangent: "Discuss maintenance tradeoffs for sidewalks.",
			},
			{
				idx: 2,
				category: "Budget",
				tangent: "Discuss cosmetic spending versus core maintenance.",
			},
		],
	},
	{
		id: "status",
		label: "Status payload",
		payload: "STATUS:GREEN",
		protectedPayload: "swsec1.d7a.GREEN",
		compressed: "1011010011110010011010000101111001011100",
		commentBits: "10",
		angleBits: "01",
		stegoText:
			"The maintenance point feels less flashy, but it is the part that keeps the system working.",
		commentTarget: "comment",
		selectedCommentId: "c2",
		selectedAngleIndex: 1,
		comments: [
			{
				id: "post",
				author: "post context",
				body: "Regional transit maintenance backlog",
			},
			{
				id: "c1",
				author: "maya",
				body: "The route redesign keeps getting all the attention.",
			},
			{
				id: "c2",
				author: "tom",
				body: "Deferred maintenance is the quieter problem.",
			},
		],
		angles: [
			{
				idx: 0,
				category: "Planning",
				tangent: "Discuss route redesign tradeoffs.",
			},
			{
				idx: 1,
				category: "Maintenance",
				tangent: "Discuss the risk of deferred maintenance.",
			},
			{
				idx: 2,
				category: "Funding",
				tangent: "Discuss how grants shape priorities.",
			},
		],
	},
];

const failureLabels: Record<FailureKey, string> = {
	missingAngles: "Missing angles",
	contextDrift: "Context drift",
	decodeMismatch: "Decode mismatch",
	noAuditBitstream: "No audit bitstream",
};

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

function asString(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getNested(record: Record<string, unknown>, path: string[]): unknown {
	let current: unknown = record;
	for (const key of path) {
		const next = asRecord(current)[key];
		if (next === undefined) return undefined;
		current = next;
	}
	return current;
}

function pickArtifactModel(
	data: StegoResult | undefined,
	filename: string | null | undefined,
): ProcessModel {
	const fallback = demoCases[0];
	const first = data?.[0];
	if (!first) {
		return {
			...fallback,
			sourceLabel: "Demo pipeline",
			hasArtifact: false,
			receiverPayload: fallback.payload,
			recoveryMode: "full",
			rawPayload: fallback.payload,
			rawPayloadAvailable: true,
			payloadTransform: "plain",
		};
	}

	const item = first as Record<string, unknown>;
	const senderAudit = asRecord(item.sender_audit);
	const embedding = asRecord(item.embedding);
	const compression = asRecord(embedding.compression);
	const commentEmbedding = asRecord(embedding.commentEmbedding);
	const angleEmbedding = asRecord(embedding.angleEmbedding);
	const post = asRecord(item.post);
	const selectedAngle = asRecord(angleEmbedding.selectedAngle);
	const pickedChain = Array.isArray(commentEmbedding.pickedCommentChain)
		? commentEmbedding.pickedCommentChain
		: [];
	const comments = pickedChain.map((comment, index) => {
		const c = asRecord(comment);
		return {
			id: asString(c.id) ?? `picked-${index}`,
			author: asString(c.author) ?? "picked comment",
			body: asString(c.body) ?? JSON.stringify(comment),
		};
	});
	const targetType = asString(commentEmbedding.targetType);
	if (comments.length === 0) {
		comments.unshift({
			id: "post",
			author: "post context",
			body:
				asString(getNested(post, ["title"])) ??
				asString(getNested(commentEmbedding, ["context", "title"])) ??
				fallback.comments[0]?.body ??
				"Post context",
		});
	}

	const totalAngles = Array.isArray(angleEmbedding.totalAnglesSelectedFirst)
		? angleEmbedding.totalAnglesSelectedFirst
		: selectedAngle.idx !== undefined
			? [selectedAngle]
			: [];
	const angles = totalAngles.map((angle, index) => {
		const a = asRecord(angle);
		return {
			idx: asNumber(a.idx) ?? index,
			category: asString(a.category) ?? `Angle ${index + 1}`,
			tangent:
				asString(a.tangent) ??
				asString(a.source_quote) ??
				"No tangent in artifact.",
		};
	});

	const commentBits =
		asString(commentEmbedding.bitsUsed) ?? fallback.commentBits;
	const angleBits = asString(angleEmbedding.bitsUsed) ?? fallback.angleBits;
	const compressed =
		asString(compression.compressed) ??
		asString(embedding.fullEncodedBits) ??
		`${commentBits}${angleBits}${fallback.compressed.slice(commentBits.length + angleBits.length)}`;
	const selectedIndex =
		asNumber(selectedAngle.idx) ??
		asNumber(angleEmbedding.selectedAngleIndex) ??
		fallback.selectedAngleIndex;
	const payloadTransform =
		asString(senderAudit.payload_transform) ??
		asString(getNested(senderAudit, ["encoding", "payload_transform"])) ??
		null;
	const protectedPayload =
		asString(senderAudit.embedded_payload) ??
		asString(compression.payload) ??
		fallback.protectedPayload;
	const rawPayload =
		asString(senderAudit.raw_payload) ??
		asString(senderAudit.rawPayload) ??
		null;

	return {
		...fallback,
		payload: rawPayload ?? protectedPayload,
		protectedPayload,
		compressed,
		commentBits,
		angleBits,
		stegoText: asString(item.stegoText) ?? fallback.stegoText,
		commentTarget: targetType === "comment" ? "comment" : "post",
		selectedCommentId:
			targetType === "comment"
				? (comments.at(-1)?.id ?? fallback.selectedCommentId)
				: null,
		selectedAngleIndex: selectedIndex,
		comments,
		angles: angles.length > 0 ? angles : fallback.angles,
		sourceLabel: filename ?? "Selected artifact",
		hasArtifact: true,
		receiverPayload: null,
		recoveryMode: compressed ? "full" : "unknown",
		rawPayload,
		rawPayloadAvailable: rawPayload !== null,
		payloadTransform,
	};
}

function splitBits(model: ProcessModel) {
	const prefixLength = model.commentBits.length + model.angleBits.length;
	const remaining = model.compressed.slice(prefixLength);
	return [
		{
			id: "comment",
			label: "comment",
			bits: model.commentBits,
			color: "bg-cyan-500/25 text-cyan-100",
		},
		{
			id: "angle",
			label: "angle",
			bits: model.angleBits,
			color: "bg-emerald-500/25 text-emerald-100",
		},
		{
			id: "rest",
			label: "payload",
			bits: remaining,
			color: "bg-white/10 text-white/70",
		},
	];
}

function statusForStage(
	index: number,
	activeIndex: number,
	failures: Record<FailureKey, boolean>,
): StageStatus {
	if (index === activeIndex) return "active";
	if (index < activeIndex) return "done";
	const id = stages[index]?.id;
	if (id === "angle" && failures.missingAngles) return "blocked";
	if (id === "rebuild" && failures.contextDrift) return "blocked";
	if (id === "decode" && failures.decodeMismatch) return "blocked";
	if (id === "recover" && failures.noAuditBitstream) return "blocked";
	return "ready";
}

function groupTone(group: Stage["group"]) {
	if (group === "sender")
		return "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";
	if (group === "visible")
		return "border-amber-400/25 bg-amber-500/10 text-amber-100";
	return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
}

function shortValue(value: string, max = 44) {
	if (value.length <= max) return value;
	return `${value.slice(0, max - 1)}...`;
}

function buildFlowNodes(
	model: ProcessModel,
	failures: Record<FailureKey, boolean>,
): FlowNode[] {
	const commentTarget =
		model.commentTarget === "post"
			? "post context"
			: `comment ${model.selectedCommentId ?? "target"}`;
	const angleLabel = `idx ${model.selectedAngleIndex}`;
	const compressedBits = `${model.compressed.length} compressed bits`;
	const protectIncoming = model.rawPayloadAvailable
		? shortValue(model.payload)
		: "raw payload not present in artifact";
	const protectOutgoing =
		model.payloadTransform === "plain"
			? `${shortValue(model.protectedPayload)} (plain)`
			: `${shortValue(model.protectedPayload)} (${model.payloadTransform ?? "transformed"})`;
	return [
		{
			id: "payload",
			label: "Payload",
			stageId: "payload",
			lane: "sender",
			x: 40,
			y: 168,
			incoming: "user payload",
			outgoing: shortValue(model.payload),
		},
		{
			id: "protect",
			label: "Apply payload transform",
			stageId: "protect",
			lane: "sender",
			x: 205,
			y: 168,
			incoming: protectIncoming,
			outgoing: protectOutgoing,
		},
		{
			id: "prep",
			label: "Prepare post",
			stageId: "prep",
			lane: "sender",
			x: 40,
			y: 38,
			incoming: "post + comments",
			outgoing: "research + angles",
		},
		{
			id: "select",
			label: "Select post",
			stageId: "select",
			lane: "sender",
			x: 205,
			y: 38,
			incoming: "final-step or angles-step",
			outgoing: "selected post",
		},
		{
			id: "dictionary",
			label: "Build dictionary",
			stageId: "dictionary",
			lane: "sender",
			x: 370,
			y: 38,
			incoming: "selected post",
			outgoing: "dictionary + hash",
		},
		{
			id: "compress",
			label: "Compress with dictionary",
			stageId: "compress",
			lane: "sender",
			x: 535,
			y: 38,
			incoming: shortValue(model.protectedPayload),
			outgoing: compressedBits,
		},
		{
			id: "comment",
			label: "Select comment",
			stageId: "comment",
			lane: "sender",
			x: 700,
			y: 38,
			incoming: `${model.commentBits || "missing"} from bitstream`,
			outgoing: commentTarget,
		},
		{
			id: "angle",
			label: "Select angle",
			stageId: "angle",
			lane: "sender",
			x: 865,
			y: 38,
			incoming: failures.missingAngles
				? "no angles available"
				: `${model.angleBits || "missing"} from bitstream`,
			outgoing: failures.missingAngles ? "blocked" : angleLabel,
		},
		{
			id: "audit",
			label: "Sender audit",
			stageId: "audit",
			lane: "sender",
			x: 1020,
			y: 188,
			incoming: "hashes + selected bits",
			outgoing: "receiver hints",
		},
		{
			id: "visible",
			label: "Generate visible text",
			stageId: "visible",
			lane: "carrier",
			x: 700,
			y: 340,
			incoming: `${commentTarget} + ${angleLabel}`,
			outgoing: shortValue(model.stegoText, 58),
		},
		{
			id: "validate",
			label: "Validate candidate",
			stageId: "validate",
			lane: "sender",
			x: 865,
			y: 340,
			incoming: "visible text + selected angle",
			outgoing: failures.decodeMismatch
				? "decode mismatch risk"
				: "strict exact match",
		},
		{
			id: "locate",
			label: "Locate sender comment",
			stageId: "locate",
			lane: "receiver",
			x: 40,
			y: 560,
			incoming: "post with visible sender comment",
			outgoing: "stego text + comment id",
		},
		{
			id: "rebuild",
			label: "Rebuild pre-sender",
			stageId: "rebuild",
			lane: "receiver",
			x: 205,
			y: 560,
			incoming: "pre-sender post",
			outgoing: "sender subtree removed",
		},
		{
			id: "rebuild-data",
			label: "Rebuild data/angles",
			stageId: "rebuild",
			lane: "receiver",
			x: 370,
			y: 560,
			incoming: "pre-sender post",
			outgoing: failures.contextDrift
				? "drift risk"
				: "rebuilt dictionary + angles",
		},
		{
			id: "drift",
			label: "Context drift check",
			stageId: "drift",
			lane: "receiver",
			x: 535,
			y: 560,
			incoming: "sender audit + rebuilt hashes",
			outgoing: failures.contextDrift ? "failed context_drift" : "hashes match",
		},
		{
			id: "decode",
			label: "Decode angle",
			stageId: "decode",
			lane: "receiver",
			x: 700,
			y: 560,
			incoming: "visible text + rebuilt angles",
			outgoing: failures.decodeMismatch ? "wrong index" : angleLabel,
		},
		{
			id: "recover",
			label: "Recover payload",
			stageId: "recover",
			lane: "receiver",
			x: 865,
			y: 560,
			incoming: failures.noAuditBitstream
				? "angle idx + brute-force prefixes"
				: "full compressed bitstream",
			outgoing: shortValue(model.payload),
		},
	];
}

const flowEdges: FlowEdge[] = [
	{ id: "payload-protect", from: "payload", to: "protect", label: "payload" },
	{ id: "prep-select", from: "prep", to: "select", label: "prepared post" },
	{
		id: "select-dictionary",
		from: "select",
		to: "dictionary",
		label: "selected post",
	},
	{
		id: "protect-compress",
		from: "protect",
		to: "compress",
		label: "protected payload",
		route: "protect-compress",
	},
	{
		id: "dictionary-compress",
		from: "dictionary",
		to: "compress",
		label: "dictionary",
	},
	{
		id: "compress-comment",
		from: "compress",
		to: "comment",
		label: "prefix bits",
	},
	{
		id: "comment-angle",
		from: "comment",
		to: "angle",
		label: "remaining bits",
	},
	{
		id: "angle-audit",
		from: "angle",
		to: "audit",
		label: "selection signature",
		route: "angle-audit",
	},
	{
		id: "angle-visible",
		from: "angle",
		to: "visible",
		label: "selected angle",
		route: "angle-visible",
	},
	{
		id: "comment-visible",
		from: "comment",
		to: "visible",
		label: "context",
		route: "comment-visible",
	},
	{
		id: "visible-validate",
		from: "visible",
		to: "validate",
		label: "candidate text",
	},
	{
		id: "validate-locate",
		from: "validate",
		to: "locate",
		label: "posted comment",
		route: "posted",
	},
	{
		id: "locate-rebuild",
		from: "locate",
		to: "rebuild",
		label: "pre-sender post",
	},
	{
		id: "rebuild-rebuild-data",
		from: "rebuild",
		to: "rebuild-data",
		label: "pre-sender post",
	},
	{
		id: "rebuild-data-drift",
		from: "rebuild-data",
		to: "drift",
		label: "hashes",
	},
	{ id: "drift-decode", from: "drift", to: "decode", label: "rebuilt angles" },
	{ id: "decode-recover", from: "decode", to: "recover", label: "angle idx" },
	{
		id: "audit-drift",
		from: "audit",
		to: "drift",
		label: "audit hashes",
		route: "audit",
	},
	{
		id: "audit-recover",
		from: "audit",
		to: "recover",
		label: "compressed bitstream",
		route: "audit-recover",
	},
];

const FLOW_NODE_WIDTH = 148;
const FLOW_NODE_HEIGHT = 78;

function edgePath(from: FlowNode, to: FlowNode, route: FlowEdge["route"]) {
	const fromRight = from.x + FLOW_NODE_WIDTH;
	const fromLeft = from.x;
	const fromMidX = from.x + FLOW_NODE_WIDTH / 2;
	const fromMidY = from.y + FLOW_NODE_HEIGHT / 2;
	const fromBottom = from.y + FLOW_NODE_HEIGHT;
	const toLeft = to.x;
	const toRight = to.x + FLOW_NODE_WIDTH;
	const toMidX = to.x + FLOW_NODE_WIDTH / 2;
	const toMidY = to.y + FLOW_NODE_HEIGHT / 2;
	const toTop = to.y;

	if (route === "vertical") {
		return {
			d: `M ${fromMidX} ${fromBottom} V ${toTop}`,
			labelX: fromMidX + 40,
			labelY: (fromBottom + toTop) / 2,
		};
	}

	if (route === "angle-visible") {
		const turnY = 300;
		return {
			d: `M ${fromMidX} ${fromBottom} V ${turnY} H ${toMidX} V ${toTop}`,
			labelX: (fromMidX + toMidX) / 2,
			labelY: turnY - 10,
		};
	}

	if (route === "comment-visible") {
		return {
			d: `M ${fromMidX} ${fromBottom} V ${toTop}`,
			labelX: fromMidX + 40,
			labelY: (fromBottom + toTop) / 2,
		};
	}

	if (route === "protect-compress") {
		const railX = 455;
		return {
			d: `M ${fromRight} ${fromMidY} H ${railX} V ${toMidY} H ${toLeft}`,
			labelX: railX,
			labelY: fromMidY - 12,
		};
	}

	if (route === "dictionary-compress") {
		return {
			d: `M ${fromRight} ${fromMidY} H ${toMidX} V ${toTop}`,
			labelX: (fromRight + toMidX) / 2,
			labelY: fromMidY - 10,
		};
	}

	if (route === "posted") {
		const railY = toMidY;
		return {
			d: `M ${fromMidX} ${fromBottom} V ${railY} H ${toLeft}`,
			labelX: (fromMidX + toLeft) / 2,
			labelY: railY - 10,
		};
	}

	if (route === "audit") {
		const railY = 506;
		const entryX = toMidX;
		return {
			d: `M ${fromMidX} ${fromBottom} V ${railY} H ${entryX} V ${toTop}`,
			labelX: (fromMidX + entryX) / 2,
			labelY: railY - 10,
		};
	}

	if (route === "audit-recover") {
		const railY = 506;
		return {
			d: `M ${fromMidX} ${fromBottom} V ${railY} H ${toMidX} V ${toTop}`,
			labelX: (fromMidX + toMidX) / 2,
			labelY: railY - 10,
		};
	}

	if (route === "angle-audit") {
		return {
			d: `M ${fromRight} ${fromMidY} H ${toMidX} V ${toTop}`,
			labelX: (fromRight + toMidX) / 2,
			labelY: fromMidY - 10,
		};
	}

	return {
		d: `M ${fromRight} ${fromMidY} H ${toLeft}`,
		labelX: (fromRight + toLeft) / 2,
		labelY: fromMidY - 12,
	};
}

function laneTone(lane: FlowNode["lane"]) {
	if (lane === "sender")
		return "border-cyan-400/30 bg-cyan-500/10 text-cyan-50";
	if (lane === "carrier")
		return "border-amber-400/30 bg-amber-500/10 text-amber-50";
	return "border-emerald-400/30 bg-emerald-500/10 text-emerald-50";
}

export function StegoProcessVisual({
	data,
	filename,
	chartOnly = false,
}: StegoProcessVisualProps) {
	const [demoId, setDemoId] = useState(demoCases[0]?.id ?? "meetup");
	const [activeIndex, setActiveIndex] = useState(0);
	const [hoveredFlowNode, setHoveredFlowNode] = useState<string | null>(null);
	const [failures, setFailures] = useState<Record<FailureKey, boolean>>({
		missingAngles: false,
		contextDrift: false,
		decodeMismatch: false,
		noAuditBitstream: false,
	});

	const artifactModel = useMemo(
		() => pickArtifactModel(data, filename),
		[data, filename],
	);
	const demoModel =
		demoCases.find((item) => item.id === demoId) ?? demoCases[0]!;
	const model: ProcessModel = data
		? artifactModel
		: {
				...demoModel,
				sourceLabel: "Demo pipeline",
				hasArtifact: false,
				receiverPayload: demoModel.payload,
				recoveryMode: "full",
				rawPayload: demoModel.payload,
				rawPayloadAvailable: true,
				payloadTransform: "plain",
			};
	const activeStage = stages[activeIndex] ?? stages[0]!;
	const blockedCount = Object.values(failures).filter(Boolean).length;
	const bitParts = splitBits(model);
	const flowNodes = buildFlowNodes(model, failures);
	const flowNodeById = new Map(flowNodes.map((node) => [node.id, node]));
	const selectedFlowNode =
		flowNodes.find((node) => node.id === hoveredFlowNode) ??
		flowNodes.find((node) => node.stageId === activeStage.id) ??
		flowNodes[0];
	const chartData = [
		{
			name: "Full audit",
			steps: failures.noAuditBitstream ? 0 : 3,
			fill: "#22c55e",
		},
		{
			name: "Brute force",
			steps: failures.noAuditBitstream ? 7 : 5,
			fill: "#38bdf8",
		},
	];

	const selectedAngle =
		model.angles.find((angle) => angle.idx === model.selectedAngleIndex) ??
		model.angles[0];

	const setFailure = (key: FailureKey) => {
		setFailures((current) => ({ ...current, [key]: !current[key] }));
	};

	return (
		<div className="space-y-6 text-white">
			{chartOnly ? null : (
				<header className="flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-5 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="font-semibold text-cyan-200 text-xs uppercase tracking-[0.18em]">
							Stego Process Visual
						</div>
						<h1 className="mt-2 font-semibold text-3xl tracking-tight">
							Selection-channel sender to receiver
						</h1>
						<p className="mt-2 max-w-3xl text-sm text-white/60 leading-6">
							Watch how payload bits choose a comment context and an angle, then
							how ordinary visible text lets the receiver recover the original
							payload.
						</p>
					</div>
					<div className="rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/65">
						<div className="text-white/40 text-xs">Source</div>
						<div className="max-w-xs truncate font-medium text-white">
							{model.sourceLabel}
						</div>
					</div>
				</header>
			)}

			<section
				className={`rounded-lg border border-white/10 bg-white/[0.04] ${chartOnly ? "min-h-[calc(100vh-48px)] p-6" : "p-4"}`}
			>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2
							className={chartOnly ? "font-semibold text-2xl" : "font-semibold"}
						>
							Process flow chart
						</h2>
						<p className="mt-1 text-sm text-white/50">
							Hover or focus a node to see the data entering and leaving that
							process.
						</p>
						{model.hasArtifact ? (
							<p className="mt-1 text-white/40 text-xs">
								Transform: {model.payloadTransform ?? "unknown"}
								{model.rawPayloadAvailable
									? ""
									: " - raw payload value is not stored in this artifact."}
							</p>
						) : null}
					</div>
					<div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em]">
						<span className="rounded border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-cyan-100">
							Sender
						</span>
						<span className="rounded border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-amber-100">
							Visible carrier
						</span>
						<span className="rounded border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-emerald-100">
							Receiver
						</span>
					</div>
				</div>
				<div className="mt-4 overflow-x-auto">
					<div
						className={`relative w-[1190px] rounded-lg border border-white/10 bg-black/25 ${chartOnly ? "h-[720px] xl:mx-auto" : "h-[720px]"}`}
					>
						<svg
							aria-hidden="true"
							className="absolute inset-0 h-full w-full"
							viewBox="0 0 1190 720"
						>
							<defs>
								<marker
									id="flow-arrow"
									markerHeight="8"
									markerWidth="8"
									orient="auto"
									refX="7"
									refY="4"
								>
									<path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
								</marker>
							</defs>
							<rect
								fill="rgba(34, 211, 238, 0.035)"
								height="250"
								rx="10"
								width="1150"
								x="20"
								y="20"
							/>
							<rect
								fill="rgba(245, 158, 11, 0.035)"
								height="170"
								rx="10"
								width="1150"
								x="20"
								y="300"
							/>
							<rect
								fill="rgba(16, 185, 129, 0.035)"
								height="190"
								rx="10"
								width="1150"
								x="20"
								y="510"
							/>
							<text
								fill="rgba(255,255,255,0.28)"
								fontSize="11"
								fontWeight="700"
								letterSpacing="2"
								x="34"
								y="42"
							>
								SENDER
							</text>
							<text
								fill="rgba(255,255,255,0.28)"
								fontSize="11"
								fontWeight="700"
								letterSpacing="2"
								x="34"
								y="322"
							>
								VISIBLE CARRIER
							</text>
							<text
								fill="rgba(255,255,255,0.28)"
								fontSize="11"
								fontWeight="700"
								letterSpacing="2"
								x="34"
								y="532"
							>
								RECEIVER
							</text>
							{flowEdges.map((edge) => {
								const from = flowNodeById.get(edge.from);
								const to = flowNodeById.get(edge.to);
								if (!from || !to) return null;
								const active =
									hoveredFlowNode === edge.from || hoveredFlowNode === edge.to;
								const path = edgePath(from, to, edge.route);
								return (
									<g
										className={active ? "text-cyan-200" : "text-white/20"}
										key={edge.id}
									>
										<path
											d={path.d}
											fill="none"
											markerEnd="url(#flow-arrow)"
											stroke="currentColor"
											strokeDasharray={
												edge.route?.startsWith("audit") ? "6 7" : undefined
											}
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={active ? 2.4 : 1.2}
										/>
									</g>
								);
							})}
						</svg>
						{flowNodes.map((node) => {
							const isActive =
								node.id === hoveredFlowNode || node.stageId === activeStage.id;
							const blocked =
								(node.stageId === "angle" && failures.missingAngles) ||
								(node.stageId === "rebuild" && failures.contextDrift) ||
								(node.stageId === "decode" && failures.decodeMismatch) ||
								(node.stageId === "recover" && failures.noAuditBitstream);
							return (
								<button
									className={`absolute h-[78px] w-[148px] rounded-lg border p-3 text-left text-sm shadow-lg outline-none ${
										blocked
											? "border-red-400/40 bg-red-500/15 text-red-50"
											: isActive
												? laneTone(node.lane)
												: "border-white/10 bg-zinc-950 text-white/65 hover:bg-white/5 focus:bg-white/5"
									}`}
									key={node.id}
									onBlur={() => setHoveredFlowNode(null)}
									onClick={() =>
										setActiveIndex(
											Math.max(
												0,
												stages.findIndex((stage) => stage.id === node.stageId),
											),
										)
									}
									onFocus={() => setHoveredFlowNode(node.id)}
									onMouseEnter={() => setHoveredFlowNode(node.id)}
									onMouseLeave={() => setHoveredFlowNode(null)}
									style={{ left: node.x, top: node.y }}
									type="button"
								>
									<div className="font-semibold">{node.label}</div>
									<div className="mt-1 text-[11px] opacity-65">{node.lane}</div>
								</button>
							);
						})}
					</div>
				</div>
				{selectedFlowNode ? (
					<div className="mt-3 grid gap-3 md:grid-cols-2">
						<Metric
							label={`${selectedFlowNode.label} receives`}
							value={selectedFlowNode.incoming}
						/>
						<Metric
							label={`${selectedFlowNode.label} emits`}
							value={selectedFlowNode.outgoing}
						/>
					</div>
				) : null}
			</section>

			{chartOnly ? null : (
				<>
					<section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
						<div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div className="flex items-center gap-2">
									<button
										className="inline-flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-40"
										disabled={activeIndex === 0}
										onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
										title="Previous stage"
										type="button"
									>
										<ChevronLeft className="size-4" />
									</button>
									<button
										className="inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-500/15 px-3 py-2 font-medium text-cyan-100 text-sm hover:bg-cyan-500/20"
										onClick={() =>
											setActiveIndex((i) => (i + 1) % stages.length)
										}
										type="button"
									>
										<Play className="size-4" />
										Step
									</button>
									<button
										className="inline-flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-40"
										disabled={activeIndex === stages.length - 1}
										onClick={() =>
											setActiveIndex((i) => Math.min(stages.length - 1, i + 1))
										}
										title="Next stage"
										type="button"
									>
										<ChevronRight className="size-4" />
									</button>
								</div>
								{!data ? (
									<div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5 text-xs">
										{demoCases.map((demo) => (
											<button
												className={`rounded-md px-3 py-1.5 transition-colors ${
													demo.id === demoId
														? "bg-white/15 text-white"
														: "text-white/45 hover:text-white/75"
												}`}
												key={demo.id}
												onClick={() => setDemoId(demo.id)}
												type="button"
											>
												{demo.label}
											</button>
										))}
									</div>
								) : null}
							</div>

							<div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
								{stages.map((stage, index) => {
									const Icon = stage.icon;
									const status = statusForStage(index, activeIndex, failures);
									return (
										<button
											className={`rounded-lg border p-3 text-left transition-colors ${
												index === activeIndex
													? groupTone(stage.group)
													: status === "blocked"
														? "border-red-400/35 bg-red-500/10 text-red-100"
														: status === "done"
															? "border-white/10 bg-white/10 text-white"
															: "border-white/10 bg-black/20 text-white/55 hover:bg-white/5"
											}`}
											key={stage.id}
											onClick={() => setActiveIndex(index)}
											type="button"
										>
											<div className="flex items-center gap-2">
												<Icon className="size-4 shrink-0" />
												<span className="font-medium text-sm">
													{stage.label}
												</span>
											</div>
											<div className="mt-2 line-clamp-2 text-xs leading-5 opacity-70">
												{stage.body}
											</div>
										</button>
									);
								})}
							</div>
						</div>

						<div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
							<div className="flex items-center justify-between gap-3">
								<h2 className="font-semibold">Failure modes</h2>
								<span className="text-white/40 text-xs">
									{blockedCount} active
								</span>
							</div>
							<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
								{(Object.keys(failureLabels) as FailureKey[]).map((key) => (
									<button
										className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
											failures[key]
												? "border-red-400/35 bg-red-500/10 text-red-100"
												: "border-white/10 bg-black/25 text-white/60 hover:bg-white/5"
										}`}
										key={key}
										onClick={() => setFailure(key)}
										type="button"
									>
										<span>{failureLabels[key]}</span>
										{failures[key] ? (
											<AlertTriangle className="size-4" />
										) : (
											<Square className="size-4" />
										)}
									</button>
								))}
							</div>
							<div className="mt-4 rounded-md border border-white/10 bg-black/25 p-3">
								<div className="font-medium text-sm">{activeStage.label}</div>
								<p className="mt-1 text-sm text-white/60 leading-6">
									{activeStage.body}
								</p>
							</div>
						</div>
					</section>

					<section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
						<div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
							<h2 className="font-semibold">Bitstream split</h2>
							<div className="mt-3 flex flex-wrap gap-2">
								{bitParts.map((part) => (
									<div
										className={`rounded-md px-3 py-2 font-mono text-xs ${part.color}`}
										key={part.id}
									>
										<div className="mb-1 font-sans text-[10px] uppercase tracking-[0.14em] opacity-70">
											{part.label}
										</div>
										<div className="max-w-full break-all">
											{part.bits || "not present"}
										</div>
									</div>
								))}
							</div>
							<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
								<Metric
									label="Payload input"
									value={
										model.rawPayloadAvailable
											? model.payload
											: "not stored in artifact"
									}
								/>
								<Metric
									label="Transform"
									value={model.payloadTransform ?? "unknown"}
								/>
								<Metric
									label="Protected payload"
									value={model.protectedPayload}
								/>
								<Metric
									label="Compressed bits"
									value={String(model.compressed.length)}
								/>
							</div>
						</div>

						<div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
							<h2 className="font-semibold">Recovery path cost</h2>
							<div className="mt-3 h-56">
								<ResponsiveContainer height="100%" width="100%">
									<BarChart data={chartData}>
										<CartesianGrid stroke="#ffffff18" vertical={false} />
										<XAxis
											dataKey="name"
											stroke="#ffffff70"
											tick={{ fill: "#ffffff90", fontSize: 12 }}
										/>
										<YAxis
											stroke="#ffffff50"
											tick={{ fill: "#ffffff70", fontSize: 12 }}
										/>
										<Tooltip
											contentStyle={{
												backgroundColor: "#18181b",
												border: "1px solid rgba(255,255,255,0.14)",
												borderRadius: "0.5rem",
											}}
										/>
										<Bar dataKey="steps" radius={[4, 4, 0, 0]}>
											{chartData.map((entry) => (
												<Cell fill={entry.fill} key={entry.name} />
											))}
										</Bar>
									</BarChart>
								</ResponsiveContainer>
							</div>
						</div>
					</section>

					<section className="grid gap-4 lg:grid-cols-3">
						<Panel title="Comment target">
							<div className="space-y-2">
								{model.comments.map((comment) => {
									const selected =
										model.commentTarget === "post"
											? comment.id === "post"
											: comment.id === model.selectedCommentId;
									return (
										<div
											className={`rounded-md border p-3 ${
												selected
													? "border-cyan-400/35 bg-cyan-500/10"
													: "border-white/10 bg-black/20"
											}`}
											key={comment.id}
										>
											<div className="text-white/40 text-xs">
												u/{comment.author}
											</div>
											<div className="mt-1 text-sm text-white/80 leading-5">
												{comment.body}
											</div>
										</div>
									);
								})}
							</div>
						</Panel>

						<Panel title="Selected angle">
							<div className="space-y-2">
								{model.angles.map((angle) => {
									const selected = angle.idx === model.selectedAngleIndex;
									return (
										<div
											className={`rounded-md border p-3 ${
												selected
													? "border-emerald-400/35 bg-emerald-500/10"
													: "border-white/10 bg-black/20"
											}`}
											key={`${angle.idx}-${angle.category}`}
										>
											<div className="flex items-center justify-between gap-3">
												<div className="font-medium text-sm">
													{angle.category}
												</div>
												<div className="font-mono text-white/40 text-xs">
													idx {angle.idx}
												</div>
											</div>
											<div className="mt-1 text-sm text-white/65 leading-5">
												{angle.tangent}
											</div>
										</div>
									);
								})}
							</div>
						</Panel>

						<Panel title="Visible carrier">
							<div className="rounded-md border border-amber-400/25 bg-amber-500/10 p-4 text-amber-50/90 text-sm leading-6">
								{model.stegoText}
							</div>
							<div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3 text-sm text-white/60">
								Decodes to{" "}
								<span className="font-mono text-white">
									idx{" "}
									{failures.decodeMismatch ? "mismatch" : selectedAngle?.idx}
								</span>
								{model.hasArtifact && !model.receiverPayload ? (
									<div className="mt-2 text-white/40 text-xs">
										Receiver-only payload recovery is not present in this
										artifact.
									</div>
								) : null}
							</div>
						</Panel>
					</section>
				</>
			)}
		</div>
	);
}

function Metric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-md border border-white/10 bg-black/20 p-3">
			<div className="text-white/40 text-xs uppercase tracking-[0.14em]">
				{label}
			</div>
			<div className="mt-1 break-all font-mono text-sm text-white/80">
				{value}
			</div>
		</div>
	);
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
			<h2 className="mb-3 font-semibold">{title}</h2>
			{children}
		</div>
	);
}
