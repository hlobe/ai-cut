/**
 * spike_api client — thin HTTP wrapper for AI Cut endpoints.
 * Base URL from NEXT_PUBLIC_SPIKE_API_URL (default: http://localhost:8000)
 */

export const SPIKE_BASE_URL =
	typeof process !== "undefined"
		? (process.env.NEXT_PUBLIC_SPIKE_API_URL ?? "http://localhost:8000")
		: "http://localhost:8000";

const BASE_URL = SPIKE_BASE_URL;

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface SpikeJob {
	id: string;
	status: JobStatus;
	prompt: string;
	provider: string;
	created_at: string;
	updated_at: string;
	error: string | null;
	artifacts: Array<{ kind: "image" | "video"; path: string; url?: string }>;
}

export interface GenerateImageRequest {
	prompt: string;
	aspect_ratio?: "16:9" | "9:16" | "1:1";
	model?: string;
	count?: number;
}

export interface GenerateVideoRequest {
	prompt: string;
	start_frame_b64?: string;
	duration?: number;
	model?: string;
	aspect_ratio?: "16:9" | "9:16" | "1:1";
}

export interface EditImageRequest {
	prompt: string;
	reference_b64: string;
	model?: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => res.statusText);
		throw new Error(`spike_api ${path}: ${res.status} ${text}`);
	}
	return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
	const res = await fetch(`${BASE_URL}${path}`);
	if (!res.ok) {
		const text = await res.text().catch(() => res.statusText);
		throw new Error(`spike_api ${path}: ${res.status} ${text}`);
	}
	return res.json() as Promise<T>;
}

export const spikeClient = {
	generateImage: (req: GenerateImageRequest) =>
		post<SpikeJob>("/api/aicut/generate-image", req),

	generateVideo: (req: GenerateVideoRequest) =>
		post<SpikeJob>("/api/aicut/generate-video", req),

	editImage: (req: EditImageRequest) =>
		post<SpikeJob>("/api/aicut/edit-image", req),

	getJob: (jobId: string) =>
		get<SpikeJob>(`/api/aicut/jobs/${jobId}`),
};
