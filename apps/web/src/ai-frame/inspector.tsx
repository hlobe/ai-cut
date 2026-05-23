"use client";

import type { AIFrameElement } from "@/ai-frame/types";
import { useAIFrame } from "@/ai-frame/use-ai-frame";
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
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";

const IMAGE_MODELS = [
	{ value: "grok", label: "Grok (~5s)" },
	{ value: "flow", label: "Flow / Nano Banana 2 (~45s)" },
	{ value: "gpt",  label: "GPT-4o Images (~55s)" },
];
const VIDEO_MODELS = [
	{ value: "grok", label: "Grok / Luma (~60s)" },
	{ value: "flow", label: "Flow / Veo 3.1 (~4 min)" },
];
const ASPECT_RATIOS = ["16:9", "9:16", "1:1"];
const VIDEO_DURATIONS = [4, 5, 6, 8, 10];
const IMAGE_COUNTS = [1, 2, 3, 4];

export function AIFrameInspector({
	element,
	trackId,
}: {
	element: AIFrameElement;
	trackId: string;
}) {
	const {
		setStage,
		setImagePrompt,
		setVideoPrompt,
		setEditMode,
		setAspectRatio,
		setImageModel,
		setVideoModel,
		setVideoDuration,
		setImageCount,
		setSelectedImage,
		clearImageSlot,
		generate,
		resetError,
	} = useAIFrame({ element, trackId });

	const { aiParams } = element;
	const isGenerating =
		aiParams.status === "generating_image" ||
		aiParams.status === "generating_video";
	const isImageStage = aiParams.stage === "image";
	const safeImageSlots = aiParams.imageSlots ?? [null, null, null, null];
	const hasAnyImage = safeImageSlots.some((s) => s !== null);
	const canGenerate = !isGenerating && (
		isImageStage ? aiParams.imagePrompt.trim().length > 0 : aiParams.videoPrompt.trim().length > 0
	);

	return (
		<div className="flex flex-col gap-4 p-3">
			{/* Stage switcher */}
			<div className="flex gap-2">
				<Button
					size="sm"
					variant={isImageStage ? "default" : "outline"}
					className="flex-1"
					disabled={isGenerating}
					onClick={() => setStage("image")}
				>
					Image
				</Button>
				<Button
					size="sm"
					variant={!isImageStage ? "default" : "outline"}
					className="flex-1"
					disabled={
						isGenerating ||
						aiParams.status === "empty"
					}
					onClick={() => setStage("video")}
				>
					Video
				</Button>
			</div>

			{/* Prompt */}
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
					disabled={isGenerating}
					onChange={(e) =>
						isImageStage
							? setImagePrompt(e.target.value)
							: setVideoPrompt(e.target.value)
					}
				/>
			</div>

			{/* Image count (image stage only) */}
			{isImageStage && (
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs">Images to generate</Label>
					<Select
						value={String(aiParams.imageCount ?? 1)}
						disabled={isGenerating}
						onValueChange={(v) => setImageCount(Number(v))}
					>
						<SelectTrigger className="h-8 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{IMAGE_COUNTS.map((n) => (
								<SelectItem key={n} value={String(n)} className="text-xs">
									{n} {n === 1 ? "image" : "images"}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{/* Image slots grid (image stage always shown) */}
			{isImageStage && (
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs">Generated images</Label>
					<div className="grid grid-cols-2 gap-1.5">
						{safeImageSlots.map((url, idx) => (
							<ContextMenu key={idx}>
								<ContextMenuTrigger asChild>
									<button
										type="button"
										className={[
											"relative aspect-video overflow-hidden rounded border-2 bg-muted transition-all",
											url ? "cursor-pointer" : "cursor-default opacity-40",
											(aiParams.selectedImageIdx ?? 0) === idx && url
												? "border-violet-500 ring-1 ring-violet-400"
												: "border-transparent",
										].join(" ")}
										onClick={() => { if (url) setSelectedImage(idx); }}
									>
										{url ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={url}
												alt={`Image ${idx + 1}`}
												className="h-full w-full object-cover"
											/>
										) : (
											<span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
												{idx + 1}
											</span>
										)}
									</button>
								</ContextMenuTrigger>
								{url && (
									<ContextMenuContent>
										<ContextMenuItem
											variant="destructive"
											onClick={() => clearImageSlot(idx)}
										>
											Clear slot
										</ContextMenuItem>
									</ContextMenuContent>
								)}
							</ContextMenu>
						))}
					</div>
				</div>
			)}

			{/* Edit mode */}
			{isImageStage && hasAnyImage && (
				<div className="flex items-center gap-2">
					<Checkbox
						id="edit-mode"
						checked={aiParams.editMode}
						disabled={isGenerating}
						onCheckedChange={(checked) => setEditMode(checked === true)}
					/>
					<Label htmlFor="edit-mode" className="cursor-pointer text-xs">
						Edit mode (img2img)
					</Label>
				</div>
			)}

			{/* Aspect ratio */}
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Aspect Ratio</Label>
				<Select
					value={aiParams.aspectRatio}
					disabled={isGenerating}
					onValueChange={setAspectRatio}
				>
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

			{/* Model */}
			<div className="flex flex-col gap-1.5">
				<Label className="text-xs">Model</Label>
				<Select
					value={isImageStage ? aiParams.imageModel : aiParams.videoModel}
					disabled={isGenerating}
					onValueChange={isImageStage ? setImageModel : setVideoModel}
				>
					<SelectTrigger className="h-8 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{(isImageStage ? IMAGE_MODELS : VIDEO_MODELS).map((model) => (
							<SelectItem key={model.value} value={model.value} className="text-xs">
								{model.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Duration (video only) */}
			{!isImageStage && (
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs">Duration (seconds)</Label>
					<Select
						value={String(aiParams.videoDuration)}
						disabled={isGenerating}
						onValueChange={(v) => setVideoDuration(Number(v))}
					>
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

			{/* Generate */}
			<Button
				className="w-full"
				size="sm"
				disabled={!canGenerate}
				onClick={() => void generate()}
			>
				{isGenerating ? "Generating..." : "Generate"}
			</Button>

			{/* Error */}
			{aiParams.status === "error" && aiParams.errorMessage && (
				<div className="flex items-center justify-between gap-2">
					<p className="text-xs text-destructive">{aiParams.errorMessage}</p>
					<Button variant="ghost" size="sm" className="h-6 text-xs" onClick={resetError}>
						Reset
					</Button>
				</div>
			)}
		</div>
	);
}
