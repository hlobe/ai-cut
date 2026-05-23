"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor } from "@/editor/use-editor";
import { spikeClient, SPIKE_BASE_URL, type JobStatus } from "@/spike/client";
import type { AIFrameElement, AIFrameParams, AIFrameStage } from "./types";
import { TICKS_PER_SECOND } from "@/wasm";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000; // 2 min

// Estimated generation durations for progress calculation (ms)
const ESTIMATED_MS: Record<string, number> = {
	generating_image: 10_000,  // grok image ~10s
	generating_video: 60_000,  // grok video ~60s
};

interface UseAIFrameOptions {
	element: AIFrameElement;
	trackId: string;
}

export function useAIFrame({ element, trackId }: UseAIFrameOptions) {
	const editor = useEditor();
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const startedAtRef = useRef<number | null>(null);

	// Patch aiParams only — leaves params (ParamValues) untouched
	const patchAIParams = useCallback(
		(patch: Partial<AIFrameParams>) => {
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: { aiParams: { ...element.aiParams, ...patch } },
					},
				],
			});
		},
		[editor, trackId, element],
	);

	// Stop any running poll
	const stopPoll = useCallback(() => {
		if (pollRef.current !== null) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
		startedAtRef.current = null;
	}, []);

	// Poll a job until succeeded/failed or timeout
	const startPoll = useCallback(
		(
			jobId: string,
			generatingStatus: string,
			onSuccess: (urls: string[]) => void,
		) => {
			stopPoll();
			startedAtRef.current = Date.now();
			const estimated = ESTIMATED_MS[generatingStatus] ?? 30_000;

			pollRef.current = setInterval(async () => {
				try {
					const elapsed = Date.now() - (startedAtRef.current ?? Date.now());

					if (elapsed > POLL_TIMEOUT_MS) {
						stopPoll();
						patchAIParams({ status: "error", errorMessage: "Generation timed out", progress: undefined });
						return;
					}

					// Update progress (cap at 95% until done)
					const progress = Math.min(95, Math.round((elapsed / estimated) * 100));
					patchAIParams({ progress });

					const job = await spikeClient.getJob(jobId);
					const terminalStatuses: JobStatus[] = ["succeeded", "failed"];

					if (!terminalStatuses.includes(job.status)) return;

					stopPoll();

					if (job.status === "failed") {
						patchAIParams({
							status: "error",
							errorMessage: job.error ?? "Generation failed",
							progress: undefined,
						});
						return;
					}

					// succeeded — collect all artifact URLs, resolve relative paths
					const urls = job.artifacts.map((artifact) => {
						const raw = artifact.url ?? artifact.path ?? "";
						return raw.startsWith("http") ? raw : `${SPIKE_BASE_URL}${raw}`;
					});
					patchAIParams({ progress: 100 });
					onSuccess(urls);
				} catch (err) {
					stopPoll();
					patchAIParams({
						status: "error",
						errorMessage: err instanceof Error ? err.message : "Unknown error",
						progress: undefined,
					});
				}
			}, POLL_INTERVAL_MS);
		},
		[stopPoll, patchAIParams],
	);

	// Clean up on unmount
	useEffect(() => () => stopPoll(), [stopPoll]);

	// ── Public actions ────────────────────────────────────────────────

	const setStage = useCallback(
		(stage: AIFrameStage) => patchAIParams({ stage }),
		[patchAIParams],
	);

	const setImagePrompt = useCallback(
		(imagePrompt: string) => patchAIParams({ imagePrompt }),
		[patchAIParams],
	);

	const setVideoPrompt = useCallback(
		(videoPrompt: string) => patchAIParams({ videoPrompt }),
		[patchAIParams],
	);

	const setEditMode = useCallback(
		(editMode: boolean) => patchAIParams({ editMode }),
		[patchAIParams],
	);

	const setAspectRatio = useCallback(
		(aspectRatio: string) => patchAIParams({ aspectRatio }),
		[patchAIParams],
	);

	const setImageModel = useCallback(
		(imageModel: string) => patchAIParams({ imageModel }),
		[patchAIParams],
	);

	const setVideoModel = useCallback(
		(videoModel: string) => patchAIParams({ videoModel }),
		[patchAIParams],
	);

	const setVideoDuration = useCallback(
		(videoDuration: number) => patchAIParams({ videoDuration }),
		[patchAIParams],
	);

	const setImageCount = useCallback(
		(imageCount: number) => patchAIParams({ imageCount }),
		[patchAIParams],
	);

	const setSelectedImage = useCallback(
		(selectedImageIdx: number) => patchAIParams({ selectedImageIdx }),
		[patchAIParams],
	);

	const clearImageSlot = useCallback(
		(idx: number) => {
			const slots = [...(element.aiParams.imageSlots ?? [null, null, null, null])];
			slots[idx] = null;
			const filledCount = slots.filter(Boolean).length;
			const patch: Partial<typeof element.aiParams> = { imageSlots: slots };
			if (filledCount === 0) patch.status = "empty";
			// if selected slot was cleared, pick first filled slot (or keep 0)
			if (element.aiParams.selectedImageIdx === idx) {
				const firstFilled = slots.findIndex((s) => s !== null);
				patch.selectedImageIdx = firstFilled >= 0 ? firstFilled : 0;
			}
			patchAIParams(patch);
		},
		[element, patchAIParams],
	);

	const generate = useCallback(async () => {
		const { aiParams } = element;
		const p = aiParams;
		const imageSlots = p.imageSlots ?? [null, null, null, null];
		const selectedImageUrl = imageSlots[p.selectedImageIdx ?? 0] ?? undefined;

		try {
			if (p.stage === "image") {
				patchAIParams({ status: "generating_image", errorMessage: undefined });

				let job;
				if (p.editMode && selectedImageUrl) {
					// img2img — use currently selected image as reference
					const res = await fetch(selectedImageUrl);
					const blob = await res.blob();
					const b64 = await blobToBase64(blob);
					job = await spikeClient.editImage({
						prompt: p.imagePrompt,
						reference_b64: b64,
						model: p.imageModel,
					});
				} else {
					job = await spikeClient.generateImage({
						prompt: p.imagePrompt,
						aspect_ratio: p.aspectRatio as "16:9" | "9:16" | "1:1",
						model: p.imageModel,
						count: p.imageCount ?? 1,
					});
				}

				patchAIParams({ imageJobId: job.id });
				startPoll(job.id, "generating_image", (urls) => {
					// Fill slots 0..urls.length-1, clear the rest
					const slots: (string | null)[] = [null, null, null, null];
					urls.forEach((url, i) => { if (i < 4) slots[i] = url; });
					patchAIParams({
						status: "image_ready",
						imageSlots: slots,
						selectedImageIdx: 0,
						progress: undefined,
					});
				});
			} else {
				// video stage — use selected image as start frame
				patchAIParams({ status: "generating_video", errorMessage: undefined });

				let startFrameB64: string | undefined;
				if (selectedImageUrl) {
					const res = await fetch(selectedImageUrl);
					const blob = await res.blob();
					startFrameB64 = await blobToBase64(blob);
				}

				const job = await spikeClient.generateVideo({
					prompt: p.videoPrompt,
					start_frame_b64: startFrameB64,
					duration: p.videoDuration,
					model: p.videoModel,
					aspect_ratio: p.aspectRatio as "16:9" | "9:16" | "1:1",
				});

				patchAIParams({ videoJobId: job.id });
				startPoll(job.id, "generating_video", (urls) => {
					// Resize the timeline element to match the actual video duration
					const newDuration = p.videoDuration * TICKS_PER_SECOND;
					editor.timeline.updateElements({
						updates: [
							{
								trackId,
								elementId: element.id,
								patch: {
									duration: newDuration,
									trimEnd: newDuration,
									aiParams: {
										...element.aiParams,
										status: "video_ready",
										videoUrl: urls[0],
										progress: undefined,
									},
								},
							},
						],
					});
				});
			}
		} catch (err) {
			patchAIParams({
				status: "error",
				errorMessage: err instanceof Error ? err.message : "Request failed",
			});
		}
	}, [element, patchAIParams, startPoll]);

	const resetError = useCallback(
		() => patchAIParams({ status: "empty", errorMessage: undefined }),
		[patchAIParams],
	);

	return {
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
	};
}

// ── helpers ────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			// strip "data:...;base64," prefix
			resolve(result.split(",")[1] ?? result);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
