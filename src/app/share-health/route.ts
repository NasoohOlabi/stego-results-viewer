export const runtime = "nodejs";

export function GET() {
	if (process.env.STEGO_PUBLIC_SHARE !== "1") {
		return new Response("Not found", { status: 404 });
	}

	return Response.json({
		service: "stego-results-viewer-share",
		mode: "read-only",
	});
}
