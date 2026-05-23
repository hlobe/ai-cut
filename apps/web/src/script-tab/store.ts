import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScriptEntry, ScriptEntryKind } from "./types";

interface ScriptTabStore {
	entries: ScriptEntry[];
	addEntry: (kind: ScriptEntryKind, name: string) => void;
	removeEntry: (id: string) => void;
	updateEntry: (
		id: string,
		patch: Partial<Omit<ScriptEntry, "id" | "kind">>,
	) => void;
}

export const useScriptTabStore = create<ScriptTabStore>()(
	persist(
		(set) => ({
			entries: [],
			addEntry: (kind, name) =>
				set((state) => ({
					entries: [
						...state.entries,
						{
							id: crypto.randomUUID(),
							kind,
							name,
							description: "",
						},
					],
				})),
			removeEntry: (id) =>
				set((state) => ({
					entries: state.entries.filter((entry) => entry.id !== id),
				})),
			updateEntry: (id, patch) =>
				set((state) => ({
					entries: state.entries.map((entry) =>
						entry.id === id ? { ...entry, ...patch } : entry,
					),
				})),
		}),
		{ name: "script-tab" },
	),
);
