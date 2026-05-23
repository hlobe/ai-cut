"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { transcriptionService } from "@/services/transcription/service";

type VoiceInputState = "idle" | "recording" | "transcribing" | "error";

interface UseVoiceInputReturn {
	state: VoiceInputState;
	start: () => Promise<void>;
	stop: () => void;
	cancel: () => void;
	error: string | null;
}

type WindowWithWebkitAudioContext = Window &
	typeof globalThis & {
		webkitAudioContext?: typeof AudioContext;
	};

function getErrorMessage(error: unknown, fallback: string): string {
	return error instanceof Error ? error.message : fallback;
}

function createAudioContext(): AudioContext {
	const AudioContextConstructor =
		window.AudioContext ||
		(window as WindowWithWebkitAudioContext).webkitAudioContext;

	if (!AudioContextConstructor) {
		throw new Error("Audio recording is not supported in this browser");
	}

	return new AudioContextConstructor({ sampleRate: 16000 });
}

async function decodeAudioBlob(audioBlob: Blob): Promise<Float32Array> {
	const audioContext = createAudioContext();
	try {
		const arrayBuffer = await audioBlob.arrayBuffer();
		const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
		const samples = new Float32Array(audioBuffer.length);

		for (let index = 0; index < audioBuffer.length; index++) {
			let sum = 0;
			for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
				sum += audioBuffer.getChannelData(channel)[index] ?? 0;
			}
			samples[index] = sum / audioBuffer.numberOfChannels;
		}

		return samples;
	} finally {
		void audioContext.close();
	}
}

export function useVoiceInput(
	onTranscript: (text: string) => void,
): UseVoiceInputReturn {
	const [state, setState] = useState<VoiceInputState>("idle");
	const [error, setError] = useState<string | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const cancelRequestedRef = useRef(false);
	const onTranscriptRef = useRef(onTranscript);

	useEffect(() => {
		onTranscriptRef.current = onTranscript;
	}, [onTranscript]);

	const releaseStream = useCallback(() => {
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
	}, []);

	const resetRecorder = useCallback(() => {
		mediaRecorderRef.current = null;
		chunksRef.current = [];
		releaseStream();
	}, [releaseStream]);

	const handleError = useCallback(
		(recordingError: unknown, fallback: string) => {
			resetRecorder();
			setError(getErrorMessage(recordingError, fallback));
			setState("error");
		},
		[resetRecorder],
	);

	const handleRecordingStop = useCallback(async () => {
		const audioBlob = new Blob(chunksRef.current, {
			type: mediaRecorderRef.current?.mimeType || "audio/webm",
		});
		const wasCancelled = cancelRequestedRef.current;

		resetRecorder();

		if (wasCancelled) {
			cancelRequestedRef.current = false;
			setError(null);
			setState("idle");
			return;
		}

		if (audioBlob.size === 0) {
			handleError(new Error("No audio was recorded"), "No audio was recorded");
			return;
		}

		setState("transcribing");
		setError(null);

		try {
			const audioData = await decodeAudioBlob(audioBlob);
			const result = await transcriptionService.transcribe({ audioData });

			if (!cancelRequestedRef.current) {
				onTranscriptRef.current(result.text);
			}

			cancelRequestedRef.current = false;
			setState("idle");
		} catch (transcriptionError) {
			if (cancelRequestedRef.current) {
				cancelRequestedRef.current = false;
				setError(null);
				setState("idle");
				return;
			}

			handleError(transcriptionError, "Transcription failed");
		}
	}, [handleError, resetRecorder]);

	const start = useCallback(async () => {
		if (mediaRecorderRef.current?.state === "recording") return;

		try {
			setError(null);
			cancelRequestedRef.current = false;

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream);

			streamRef.current = stream;
			mediaRecorderRef.current = mediaRecorder;
			chunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					chunksRef.current.push(event.data);
				}
			};
			mediaRecorder.onerror = (event) => {
				handleError(event.error, "Recording failed");
			};
			mediaRecorder.onstop = () => {
				void handleRecordingStop();
			};

			mediaRecorder.start();
			setState("recording");
		} catch (startError) {
			handleError(startError, "Could not start microphone recording");
		}
	}, [handleError, handleRecordingStop]);

	const stop = useCallback(() => {
		const mediaRecorder = mediaRecorderRef.current;
		if (!mediaRecorder || mediaRecorder.state === "inactive") return;

		mediaRecorder.stop();
	}, []);

	const cancel = useCallback(() => {
		cancelRequestedRef.current = true;
		transcriptionService.cancel();

		const mediaRecorder = mediaRecorderRef.current;
		if (mediaRecorder && mediaRecorder.state !== "inactive") {
			mediaRecorder.stop();
			return;
		}

		resetRecorder();
		setError(null);
		setState("idle");
	}, [resetRecorder]);

	useEffect(() => {
		return () => {
			cancelRequestedRef.current = true;
			resetRecorder();
		};
	}, [resetRecorder]);

	return {
		state,
		start,
		stop,
		cancel,
		error,
	};
}
