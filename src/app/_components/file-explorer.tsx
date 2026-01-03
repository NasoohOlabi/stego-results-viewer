"use client";

interface FileExplorerProps {
	files: string[];
	selectedFile: string | null;
	onFileSelect: (filename: string) => void;
}

export function FileExplorer({ files, selectedFile, onFileSelect }: FileExplorerProps) {
	return (
		<div className="flex h-screen w-64 flex-col overflow-hidden border-r border-white/10 bg-zinc-950/80 backdrop-blur-md">
			<div className="shrink-0 p-4">
				<h2 className="mb-4 font-semibold text-lg">Files</h2>
			</div>
			<div className="flex-1 overflow-y-auto px-4 pb-4">
				<ul className="space-y-1">
					{files.map((file) => (
						<li key={file}>
							<button
								type="button"
								onClick={() => onFileSelect(file)}
								className={`w-full rounded px-3 py-2 text-left text-sm transition-colors ${
									selectedFile === file
										? "bg-white/20 text-white"
										: "text-white/70 hover:bg-white/10 hover:text-white"
								}`}
							>
								{file}
							</button>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
