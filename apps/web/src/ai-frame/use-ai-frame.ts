"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor } from "@/editor/use-editor";
import { spikeClient, type JobStatus } from "@/spike/client";
import type { AIFrameElement, AIFrameParams, AIFrameStage } from "./types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000; // 2 min

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
		(jobId: string, onSuccess: (url: string) => void) => {
			stopPoll();
			startedAtRef.current = Date.now();

			pollRef.current = setInterval(async () => {
				try {
					if (
						startedAtRef.current !== null &&
						Date.now() - startedAtRef.current > POLL_TIMEOUT_MS
					) {
						stopPoll();
						patchAIParams({ status: "error", errorMessage: "Generation timed out" });
						return;
					}

					const job = await spikeClient.getJob(jobId);
					const terminalStatuses: JobStatus[] = ["succeeded", "failed"];

					if (!terminalStatuses.includes(job.status)) return;

					stopPoll();

					if (job.status === "failed") {
						patchAIParams({
							status: "error",
							errorMessage: job.error ?? "Generation failed",
						});
						return;
					}

					// succeeded — pick first artifact URL
					const artifact = job.artifacts[0];
					const url = artifact?.url ?? artifact?.path ?? "";
					onSuccess(url);
				} catch (err) {
					stopPoll();
					patchAIParams({
						status: "error",
						errorMessage: err instanceof Error ? err.message : "Unknown error",
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

	const generate = useCallback(async () => {
		const { aiParams } = element;
		const p = aiParams;

		try {
			if (p.stage === "image") {
				patchAIParams({ status: "generating_image", errorMessage: undefined });

				let job;
				if (p.editMode && p.imageUrl) {
					// img2img
					const res = await fetch(p.imageUrl);
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
					});
				}

				patchAIParams({ imageJobId: job.id });
				startPoll(job.id, (url) => {
					patchAIParams({ status: "image_ready", imageUrl: url });
				});
			} else {
				// video stage
				patchAIParams({ status: "generating_video", errorMessage: undefined });

				let startFrameB64: string | undefined;
				if (p.imageUrl) {
					const res = await fetch(p.imageUrl);
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
				startPoll(job.id, (url) => {
					patchAIParams({ status: "video_ready", videoUrl: url });
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
