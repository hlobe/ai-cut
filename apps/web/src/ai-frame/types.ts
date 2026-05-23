import type { ParamValues } from "@/params";
import type { MediaTime } from "@/wasm";
import type { ElementAnimations } from "@/animation/types";

export type AIFrameStage = "image" | "video";

export type AIFrameStatus =
	| "empty"
	| "generating_image"
	| "image_ready"
	| "generating_video"
	| "video_ready"
	| "error";

export interface AIFrameParams {
	stage: AIFrameStage;
	status: AIFrameStatus;
	imagePrompt: string;
	editMode: boolean;
	imageModel: string;
	aspectRatio: string;
	/** Up to 4 generated image URLs; null = empty slot */
	imageSlots: (string | null)[];
	/** Which slot is active (0-based) */
	selectedImageIdx: number;
	/** How many images to generate per run (1–4) */
	imageCount: number;
	imageJobId?: string;
	videoPrompt: string;
	videoModel: string;
	videoDuration: number;
	videoUrl?: string;
	videoJobId?: string;
	errorMessage?: string;
	progress?: number; // 0–100, set during generation
}

export const DEFAULT_AI_FRAME_PARAMS: AIFrameParams = {
	stage: "image",
	status: "empty",
	imagePrompt: "",
	editMode: false,
	imageModel: "grok",
	aspectRatio: "16:9",
	imageSlots: [null, null, null, null],
	selectedImageIdx: 0,
	imageCount: 1,
	videoPrompt: "",
	videoModel: "grok",
	videoDuration: 6,
};

export interface AIFrameElement {
	id: string;
	type: "ai-frame";
	name: string;
	startTime: MediaTime;
	duration: MediaTime;
	trimStart: MediaTime;
	trimEnd: MediaTime;
	sourceDuration?: MediaTime;
	animations?: ElementAnimations;
	params: ParamValues;
	aiParams: AIFrameParams;
}
