"use client";

import type { AIFrameElement } from "@/ai-frame/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const IMAGE_MODELS = ["flux-pro", "flux-dev", "dall-e-3"];
const VIDEO_MODELS = ["kling-v3", "kling-v2", "runway-gen3"];
const ASPECT_RATIOS = ["16:9", "9:16", "1:1"];
const VIDEO_DURATIONS = [4, 5, 6, 8, 10];

export function AIFrameInspector({
	element,
	trackId,
}: {
	element: AIFrameElement;
	trackId: string;
}) {
	void trackId;

	const { aiParams } = element;
	const isGenerating =
		aiParams.status === "generating_image" ||
		aiParams.status === "generating_video";
	const isImageStage = aiParams.stage === "image";

	return (
		<div className="flex flex-col gap-4 p-3">
			<div className="flex gap-2">
				<Button
					size="sm"
					variant={isImageStage ? "default" : "outline"}
					className="flex-1"
					onClick={() => {
						// TODO T5: update aiParams.stage to "image"
					}}
				>
					Image
				</Button>
				<Button
					size="sm"
					variant={!isImageStage ? "default" : "outline"}
					className="flex-1"
					disabled={
						aiParams.status === "empty" ||
						aiParams.status === "generating_image"
					}
					onClick={() => {
						// TODO T5: update aiParams.stage to "video"
					}}
				>
					Video
				</Button>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">
					{isImageStage ? "Image Prompt" : "Video Prompt"}
				</Label>
				<Textarea
					className="min-h-[72px] resize-none text-xs"
					placeholder={
						isImageStage ? "Describe the image..." : "Describe the motion..."
					}
					value={isImageStage ? aiParams.imagePrompt : aiParams.videoPrompt}
					readOnly
				/>
			</div>

			{isImageStage && aiParams.status === "image_ready" && (
				<div className="flex items-center gap-2">
					<Checkbox id="edit-mode" checked={aiParams.editMode} />
					<Label htmlFor="edit-mode" className="cursor-pointer text-xs">
						Edit mode (img2img)
					</Label>
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Aspect Ratio</Label>
				<Select value={aiParams.aspectRatio} disabled>
					<SelectTrigger className="h-8 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ASPECT_RATIOS.map((ratio) => (
							<SelectItem key={ratio} value={ratio} className="text-xs">
								{ratio}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Model</Label>
				<Select
					value={isImageStage ? aiParams.imageModel : aiParams.videoModel}
					disabled
				>
					<SelectTrigger className="h-8 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{(isImageStage ? IMAGE_MODELS : VIDEO_MODELS).map((model) => (
							<SelectItem key={model} value={model} className="text-xs">
								{model}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{!isImageStage && (
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs">Duration (seconds)</Label>
					<Select value={String(aiParams.videoDuration)} disabled>
						<SelectTrigger className="h-8 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{VIDEO_DURATIONS.map((duration) => (
								<SelectItem
									key={duration}
									value={String(duration)}
									className="text-xs"
								>
									{duration}s
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			<Button className="w-full" size="sm" disabled={true}>
				{isGenerating ? "Generating..." : "Generate"}
			</Button>

			{aiParams.status === "error" && aiParams.errorMessage && (
				<p className="text-xs text-destructive">{aiParams.errorMessage}</p>
			)}
		</div>
	);
}
