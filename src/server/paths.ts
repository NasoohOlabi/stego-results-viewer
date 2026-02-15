import { join, isAbsolute, resolve } from "path";

const SIDE_WING_PATH = join(process.cwd(), "..", "stego-side-wing", "output-results");
const LOCAL_PATH = join(process.cwd(), "output-results");

const BUILT_IN_MAP: Record<string, string> = {
	"side-wing": SIDE_WING_PATH,
	local: LOCAL_PATH,
} as const;

export function getResolvedPath(idOrPath: string): string {
	const builtIn = BUILT_IN_MAP[idOrPath];
	if (builtIn) return builtIn;

	if (!isAbsolute(idOrPath)) {
		throw new Error(`Path must be absolute: ${idOrPath}`);
	}
	return resolve(idOrPath);
}
