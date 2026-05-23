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
	imageUrl?: string;
	imageJobId?: string;
	videoPrompt: string;
	videoModel: string;
	videoDuration: number;
	videoUrl?: string;
	videoJobId?: string;
	errorMessage?: string;
	progress?: number; // 0–100, set during generation
}

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
