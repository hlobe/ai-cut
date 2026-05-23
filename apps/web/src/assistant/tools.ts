import { EditorCore } from "@/core";
import type { AIFrameParams } from "@/ai-frame/types";
import { findTrackInSceneTracks } from "@/timeline";

export const ASSISTANT_TOOLS = [
	{
		name: "read_timeline",
		description: "Read the current timeline state — all tracks and elements",
		input_schema: { type: "object" as const, properties: {}, required: [] },
	},
	{
		name: "update_element",
		description: "Update an element's aiParams on the timeline",
		input_schema: {
			type: "object" as const,
			properties: {
				elementId: { type: "string" },
				trackId: { type: "string" },
				patch: {
					type: "object",
					description: "Partial AIFrameParams to merge",
				},
			},
			required: ["elementId", "trackId", "patch"],
		},
	},
	{
		name: "trigger_generation",
		description: "Trigger AI generation for an AIFrame element",
		input_schema: {
			type: "object" as const,
			properties: {
				elementId: { type: "string" },
				trackId: { type: "string" },
				stage: { type: "string", enum: ["image", "video"] },
			},
			required: ["elementId", "trackId", "stage"],
		},
	},
	{
		name: "trim_clip",
		description: "Trim a clip to new start/end times",
		input_schema: {
			type: "object" as const,
			properties: {
				elementId: { type: "string" },
				trackId: { type: "string" },
				trimStart: {
					type: "number",
					description: "New trimStart in seconds",
				},
				trimEnd: { type: "number", description: "New trimEnd in seconds" },
			},
			required: ["elementId", "trackId"],
		},
	},
] as const;

export type ToolName = (typeof ASSISTANT_TOOLS)[number]["name"];

export function executeToolCall(
	name: ToolName,
	input: Record<string, unknown>,
): unknown {
	const editor = EditorCore.getInstance();
	const scene = editor.scenes.getActiveSceneOrNull();

	switch (name) {
		case "read_timeline": {
			if (!scene) return { error: "No active scene" };
			return {
				tracks: scene.tracks,
				duration: editor.timeline.getTotalDuration(),
			};
		}
		case "update_element": {
			const { elementId, trackId, patch } = input as {
				elementId: string;
				trackId: string;
				patch: Partial<AIFrameParams>;
			};

			if (!scene) return { error: "No active scene" };

			const track = findTrackInSceneTracks({
				tracks: scene.tracks,
				trackId,
			});
			const element = track?.elements.find((item) => item.id === elementId);
			if (!element) return { error: "Element not found" };
			if (element.type !== "ai-frame") {
				return { error: "update_element only supports AI frame elements" };
			}

			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId,
						patch: { aiParams: { ...element.aiParams, ...patch } },
					},
				],
			});
			return { success: true };
		}
		case "trigger_generation": {
			// TODO T8: wire to useAIFrame.generate() — needs React context
			return {
				success: false,
				note: "trigger_generation requires React context (T8)",
			};
		}
		case "trim_clip": {
			const { elementId, trackId, trimStart, trimEnd } = input as {
				elementId: string;
				trackId: string;
				trimStart?: number;
				trimEnd?: number;
			};
			const patch: Record<string, unknown> = {};
			if (trimStart !== undefined) patch.trimStart = trimStart;
			if (trimEnd !== undefined) patch.trimEnd = trimEnd;
			editor.timeline.updateElements({
				updates: [{ trackId, elementId, patch }],
			});
			return { success: true };
		}
		default:
			return { error: `Unknown tool: ${name as string}` };
	}
}
