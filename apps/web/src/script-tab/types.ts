export type ScriptEntryKind = "character" | "location" | "item";

export interface ScriptEntry {
	id: string;
	kind: ScriptEntryKind;
	name: string;
	description: string;
	imageUrl?: string;
}
