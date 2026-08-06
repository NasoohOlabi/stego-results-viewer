"use client";

import { Command, Compass, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
	ALL_ROUTES,
	NAV_GROUPS,
	type NavRoute,
	PINNED_ROUTES,
} from "~/app/_components/nav/routes";

/** Exact-match active check ("/" must not match every route). */
function isActive(pathname: string, href: string): boolean {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [open, setOpen] = useState(false);

	// Preserve the currently selected results folder across navigation, matching
	// the behavior the file explorer relied on before nav was centralized.
	const folder = searchParams.get("folder");
	const withFolder = useCallback(
		(href: string) => (folder ? `${href}?folder=${folder}` : href),
		[folder],
	);

	// Close on route change.
	// biome-ignore lint/correctness/useExhaustiveDependencies: close when path changes
	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	// Keyboard: Cmd/Ctrl+K toggles the hub, Esc closes it.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setOpen((v) => !v);
			} else if (e.key === "Escape") {
				setOpen(false);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<>
			{/* Always-visible rail */}
			<nav
				aria-label="Primary"
				className="fixed inset-y-0 left-0 z-40 flex w-14 flex-col items-center gap-1 border-white/10 border-r bg-zinc-950/85 py-3 backdrop-blur-md"
			>
				<button
					aria-expanded={open}
					aria-label="Open navigation menu (Ctrl/Cmd+K)"
					className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
						open
							? "bg-white/15 text-white"
							: "text-white/60 hover:bg-white/10 hover:text-white"
					}`}
					onClick={() => setOpen((v) => !v)}
					title="Menu (Ctrl/Cmd+K)"
					type="button"
				>
					<Compass className="h-5 w-5" />
				</button>

				<div className="my-1 h-px w-6 bg-white/10" />

				<div className="flex flex-col items-center gap-1">
					{PINNED_ROUTES.map((route) => {
						const Icon = route.icon;
						const active = isActive(pathname, route.href);
						return (
							<Link
								aria-current={active ? "page" : undefined}
								className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
									active
										? "bg-white/15 text-white"
										: "text-white/55 hover:bg-white/10 hover:text-white"
								}`}
								href={withFolder(route.href)}
								key={route.href}
								title={route.label}
							>
								<Icon className="h-5 w-5" />
								{route.e2e ? (
									<span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-violet-400" />
								) : null}
								{active ? (
									<span className="absolute left-0 h-6 w-0.5 rounded-r bg-white" />
								) : null}
							</Link>
						);
					})}
				</div>

				<div className="mt-auto text-[9px] text-white/25">⌘K</div>
			</nav>

			{/* Hub flyout */}
			{open ? (
				<>
					<button
						aria-label="Close navigation menu"
						className="fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm"
						onClick={() => setOpen(false)}
						type="button"
					/>
					<div className="fixed inset-y-0 left-14 z-50 flex w-[min(22rem,calc(100vw-3.5rem))] flex-col border-white/10 border-r bg-zinc-950/95 shadow-2xl">
						<div className="flex items-center justify-between border-white/10 border-b px-4 py-3">
							<div>
								<p className="font-medium text-[11px] text-emerald-300/80 uppercase tracking-[0.18em]">
									Stego Results Viewer
								</p>
								<h2 className="mt-0.5 font-semibold text-sm text-white">
									Where do you want to go?
								</h2>
							</div>
							<button
								aria-label="Close"
								className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
								onClick={() => setOpen(false)}
								type="button"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
							{NAV_GROUPS.map((group) => (
								<section key={group.id}>
									<div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
										<h3 className="font-semibold text-[11px] text-white/40 uppercase tracking-[0.16em]">
											{group.title}
										</h3>
										{group.id === "generate" ? (
											<span className="flex items-center gap-1 rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] text-violet-300">
												<Command className="h-2.5 w-2.5" /> live
											</span>
										) : null}
									</div>
									{group.blurb ? (
										<p className="mb-2 px-1 text-[11px] text-white/35">
											{group.blurb}
										</p>
									) : null}
									<ul className="space-y-1">
										{group.routes.map((route) => (
											<NavHubItem
												active={isActive(pathname, route.href)}
												href={withFolder(route.href)}
												key={route.href}
												route={route}
											/>
										))}
									</ul>
								</section>
							))}
						</div>

						<div className="border-white/10 border-t px-4 py-2.5 text-[10px] text-white/35">
							{ALL_ROUTES.length} views · press{" "}
							<kbd className="rounded bg-white/10 px-1 py-0.5 text-white/60">
								Esc
							</kbd>{" "}
							to close
						</div>
					</div>
				</>
			) : null}
		</>
	);
}

function NavHubItem({
	route,
	href,
	active,
}: {
	route: NavRoute;
	href: string;
	active: boolean;
}) {
	const Icon = route.icon;
	return (
		<li>
			<Link
				aria-current={active ? "page" : undefined}
				className={`group flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors ${
					active ? "bg-white/10" : "hover:bg-white/5"
				}`}
				href={href}
			>
				<span
					className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${
						route.e2e
							? "border-violet-500/40 bg-violet-500/10 text-violet-200"
							: active
								? "border-white/20 bg-white/10 text-white"
								: "border-white/10 bg-white/5 text-white/60 group-hover:text-white"
					}`}
				>
					<Icon className="h-4 w-4" />
				</span>
				<span className="min-w-0 flex-1">
					<span className="flex items-center gap-2">
						<span
							className={`font-medium text-sm ${active ? "text-white" : "text-white/85"}`}
						>
							{route.label}
						</span>
						{route.e2e ? (
							<span className="rounded bg-violet-500/15 px-1 py-0.5 text-[9px] text-violet-300 uppercase tracking-wide">
								e2e
							</span>
						) : null}
					</span>
					<span className="mt-0.5 block text-[11px] text-white/45 leading-snug">
						{route.description}
					</span>
				</span>
			</Link>
		</li>
	);
}
