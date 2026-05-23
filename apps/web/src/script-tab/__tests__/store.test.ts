import { describe, expect, test } from "bun:test";

const storage = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
	value: {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => storage.set(key, value),
		removeItem: (key: string) => storage.delete(key),
	},
	configurable: true,
});
Object.defineProperty(globalThis, "window", {
	value: { localStorage: globalThis.localStorage },
	configurable: true,
});

const { useScriptTabStore } = await import("../store");

describe("script tab store", () => {
	test("adds, updates, and removes script entries", () => {
		useScriptTabStore.setState({ entries: [] });

		useScriptTabStore.getState().addEntry("character", "Mira");
		const [entry] = useScriptTabStore.getState().entries;

		expect(entry).toMatchObject({
			kind: "character",
			name: "Mira",
			description: "",
		});

		useScriptTabStore.getState().updateEntry(entry.id, {
			description: "Lead editor",
			imageUrl: "https://example.com/mira.png",
		});

		expect(useScriptTabStore.getState().entries[0]).toMatchObject({
			description: "Lead editor",
			imageUrl: "https://example.com/mira.png",
		});

		useScriptTabStore.getState().removeEntry(entry.id);

		expect(useScriptTabStore.getState().entries).toEqual([]);
	});
});
