"use client";

import { useState } from "react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useScriptTabStore } from "./store";
import type { ScriptEntryKind } from "./types";

const SECTIONS: { kind: ScriptEntryKind; label: string }[] = [
	{ kind: "character", label: "Characters" },
	{ kind: "location", label: "Locations" },
	{ kind: "item", label: "Items" },
];

export function ScriptTabView() {
	const { entries, addEntry, removeEntry } = useScriptTabStore();
	const [newNames, setNewNames] = useState<Record<ScriptEntryKind, string>>({
		character: "",
		location: "",
		item: "",
	});

	const handleAdd = (kind: ScriptEntryKind) => {
		const name = newNames[kind].trim();
		if (!name) return;

		addEntry(kind, name);
		setNewNames((previousNames) => ({ ...previousNames, [kind]: "" }));
	};

	return (
		<ScrollArea className="h-full">
			<div className="flex flex-col gap-4 p-3">
				{SECTIONS.map(({ kind, label }) => {
					const sectionEntries = entries.filter((entry) => entry.kind === kind);

					return (
						<div key={kind} className="flex flex-col gap-2">
							<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
								{label}
							</p>
							{sectionEntries.length === 0 && (
								<p className="text-muted-foreground text-xs italic">
									No {label.toLowerCase()} yet
								</p>
							)}
							{sectionEntries.map((entry) => (
								<div
									key={entry.id}
									className="bg-card flex items-center gap-2 rounded-md border px-2 py-1.5"
								>
									{entry.imageUrl && (
										<img
											src={entry.imageUrl}
											alt={entry.name}
											className="size-8 shrink-0 rounded object-cover"
										/>
									)}
									<span className="flex-1 truncate text-xs">{entry.name}</span>
									<Button
										variant="ghost"
										size="icon"
										className="size-6 shrink-0"
										onClick={() => removeEntry(entry.id)}
									>
										<HugeiconsIcon icon={Delete02Icon} size={12} />
									</Button>
								</div>
							))}
							<div className="flex gap-1.5">
								<Input
									className="h-7 text-xs"
									placeholder={`Add ${label.slice(0, -1).toLowerCase()}...`}
									value={newNames[kind]}
									onChange={(event) =>
										setNewNames((previousNames) => ({
											...previousNames,
											[kind]: event.target.value,
										}))
									}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											handleAdd(kind);
										}
									}}
								/>
								<Button
									size="sm"
									className="h-7 px-2 text-xs"
									onClick={() => handleAdd(kind)}
									disabled={!newNames[kind].trim()}
								>
									Add
								</Button>
							</div>
							<Separator />
						</div>
					);
				})}
			</div>
		</ScrollArea>
	);
}
