import { type NextRequest, NextResponse } from "next/server";

const SHARE_MODE = process.env.STEGO_PUBLIC_SHARE === "1";
const ALLOWED_PATHS = new Set([
	"/zlg-comparison",
	"/zlg-comparison.md",
	"/share-health",
	"/icon.svg",
]);

export function middleware(request: NextRequest) {
	if (!SHARE_MODE) return NextResponse.next();

	const { pathname } = request.nextUrl;
	const isReadMethod = request.method === "GET" || request.method === "HEAD";
	const isStaticAsset = pathname.startsWith("/_next/static/");

	if (isReadMethod && (ALLOWED_PATHS.has(pathname) || isStaticAsset)) {
		return NextResponse.next();
	}

	return new NextResponse("Not found", { status: 404 });
}

export const config = {
	matcher: "/:path*",
};
