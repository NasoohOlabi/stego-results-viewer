"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DashboardAdminContent } from "./dashboard-admin-content";
import { RecentUpdatesPanel } from "./recent-updates-panel";

type AdminApiTab = "console" | "recent-updates";

export function AdminApiTabsShell() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const currentTab =
		searchParams.get("tab") === "recent-updates"
			? "recent-updates"
			: "console";

	const setTab = (tab: AdminApiTab) => {
		const params = new URLSearchParams(searchParams.toString());
		if (tab === "console") {
			params.delete("tab");
		} else {
			params.set("tab", tab);
		}
		const qs = params.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname);
	};

	if (currentTab === "console") {
		return (
			<div className="h-screen">
				<div className="fixed top-3 right-6 z-20">
					<div className="rounded-lg border border-white/10 bg-black/60 p-1 text-xs text-white backdrop-blur">
						<button
							className="rounded bg-white/10 px-2 py-1"
							onClick={() => setTab("console")}
							type="button"
						>
							Console
						</button>
						<button
							className="rounded px-2 py-1 hover:bg-white/10"
							onClick={() => setTab("recent-updates")}
							type="button"
						>
							Recent Updates
						</button>
					</div>
				</div>
				<DashboardAdminContent />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black px-6 py-6 text-white">
			<div className="mx-auto max-w-7xl space-y-4">
				<div className="rounded-lg border border-white/10 bg-white/5 p-1 text-xs">
					<button
						className="rounded px-2 py-1 hover:bg-white/10"
						onClick={() => setTab("console")}
						type="button"
					>
						Console
					</button>
					<button
						className="rounded bg-white/10 px-2 py-1"
						onClick={() => setTab("recent-updates")}
						type="button"
					>
						Recent Updates
					</button>
				</div>
				<RecentUpdatesPanel />
			</div>
		</div>
	);
}
