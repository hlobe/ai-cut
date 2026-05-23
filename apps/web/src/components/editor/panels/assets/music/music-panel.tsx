"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SPIKE_BASE_URL } from "@/spike/client";
import { cn } from "@/utils/ui";

interface Track {
	id: string;
	title: string;
	tags: string;
	audio_url: string | null;
	image_url: string | null;
	status: "pending" | "complete" | "error";
	created_at: string;
}

interface AuthStatus {
	logged_in: boolean;
	status: "idle" | "waiting" | "ok" | "error";
	error: string;
}

export function MusicPanel() {
	const [auth, setAuth] = useState<AuthStatus | null>(null);
	const [loginLoading, setLoginLoading] = useState(false);
	const [prompt, setPrompt] = useState("");
	const [tags, setTags] = useState("");
	const [instrumental, setInstrumental] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [tracks, setTracks] = useState<Track[]>([]);
	const [error, setError] = useState<string | null>(null);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const authPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const hasPending = tracks.some((t) => t.status === "pending");

	const fetchAuth = useCallback(async (showError = false) => {
		try {
			const r = await fetch(`${SPIKE_BASE_URL}/api/suno/auth/status`);
			if (r.ok) {
				const data: AuthStatus = await r.json();
				setAuth(data);
				return data;
			}
		} catch {
			// Wrapper not running — show login screen silently
			setAuth({ logged_in: false, status: "idle", error: "" });
			if (showError) setError("Could not reach suno wrapper");
		}
		return null;
	}, []);

	const fetchTracks = useCallback(async () => {
		try {
			const r = await fetch(`${SPIKE_BASE_URL}/api/suno/tracks`);
			if (r.ok) setTracks(await r.json());
		} catch {}
	}, []);

	// Initial load — silent, no error if wrapper is down
	useEffect(() => {
		fetchAuth(false).then((a) => {
			if (a?.logged_in) fetchTracks();
		});
	}, [fetchAuth, fetchTracks]);

	// Poll auth status while login browser is open
	useEffect(() => {
		if (auth?.status === "waiting") {
			authPollRef.current = setInterval(async () => {
				const a = await fetchAuth();
				if (a && a.status !== "waiting") {
					clearInterval(authPollRef.current!);
					authPollRef.current = null;
					setLoginLoading(false);
					if (a.logged_in) fetchTracks();
				}
			}, 2000);
		}
		return () => {
			if (authPollRef.current) clearInterval(authPollRef.current);
		};
	}, [auth?.status, fetchAuth, fetchTracks]);

	// Poll tracks while any are pending
	useEffect(() => {
		if (hasPending) {
			if (!pollRef.current) {
				pollRef.current = setInterval(fetchTracks, 3000);
			}
		} else {
			if (pollRef.current) {
				clearInterval(pollRef.current);
				pollRef.current = null;
			}
		}
		return () => {
			if (pollRef.current) clearInterval(pollRef.current);
		};
	}, [hasPending, fetchTracks]);

	const handleLogin = async () => {
		setLoginLoading(true);
		setError(null);
		try {
			const r = await fetch(`${SPIKE_BASE_URL}/api/suno/auth/login`, { method: "POST" });
			if (!r.ok) throw new Error(await r.text());
			await fetchAuth(true);
		} catch (e) {
			setError("Suno wrapper недоступен. Запусти: uvicorn app.main:app --port 8400");
			setLoginLoading(false);
		}
	};

	const handleLogout = async () => {
		await fetch(`${SPIKE_BASE_URL}/api/suno/auth/logout`, { method: "POST" });
		setTracks([]);
		await fetchAuth();
	};

	const handleGenerate = async () => {
		if (!prompt.trim() || generating) return;
		setGenerating(true);
		setError(null);
		try {
			const r = await fetch(`${SPIKE_BASE_URL}/api/suno/generate`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt,
					tags: tags || undefined,
					make_instrumental: instrumental,
				}),
			});
			if (!r.ok) throw new Error(await r.text());
			const newTracks: Track[] = await r.json();
			setTracks((prev) => [...newTracks, ...prev]);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Generation failed");
		} finally {
			setGenerating(false);
		}
	};

	// ── Not logged in ─────────────────────────────────────────────────
	if (!auth?.logged_in) {
		return (
			<div className="flex flex-col items-center gap-4 p-6 text-center">
				<div className="flex flex-col gap-1">
					<p className="text-sm font-medium">Connect Suno</p>
					<p className="text-xs text-muted-foreground">
						Requires Suno account and Claude Code running locally
					</p>
				</div>

				{auth?.status === "waiting" ? (
					<div className="flex flex-col items-center gap-2">
						<span className="text-xs text-muted-foreground animate-pulse">
							Browser открыт — войдите в Suno...
						</span>
						<div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
							<div className="h-full w-full bg-violet-500 animate-pulse rounded-full" />
						</div>
					</div>
				) : (
					<Button
						size="sm"
						className="gap-2"
						disabled={loginLoading}
						onClick={handleLogin}
					>
						{loginLoading ? "Открываем браузер..." : "Войти в Suno"}
					</Button>
				)}

				{auth?.status === "error" && auth.error && (
					<p className="text-destructive text-xs">{auth.error}</p>
				)}
				{error && <p className="text-destructive text-xs">{error}</p>}
			</div>
		);
	}

	// ── Logged in ─────────────────────────────────────────────────────
	return (
		<div className="flex flex-col gap-3 p-3">
			<div className="flex items-center justify-between">
				<span className="text-[0.65rem] text-green-400">● Connected to Suno</span>
				<button
					onClick={handleLogout}
					className="text-[0.65rem] text-muted-foreground hover:text-foreground"
				>
					Выйти
				</button>
			</div>

			<Textarea
				placeholder="Опиши музыку... (напр. lo-fi хип-хоп с пианино)"
				value={prompt}
				onChange={(e) => setPrompt(e.target.value)}
				className="min-h-[72px] resize-none text-xs"
				disabled={generating}
			/>
			<Input
				placeholder="Теги: lo-fi chill ambient pop..."
				value={tags}
				onChange={(e) => setTags(e.target.value)}
				className="h-8 text-xs"
				disabled={generating}
			/>
			<label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
				<input
					type="checkbox"
					checked={instrumental}
					onChange={(e) => setInstrumental(e.target.checked)}
					className="rounded"
					disabled={generating}
				/>
				Без вокала (instrumental)
			</label>

			<Button
				size="sm"
				className="w-full"
				disabled={!prompt.trim() || generating}
				onClick={handleGenerate}
			>
				{generating ? "Отправляем..." : "Генерировать"}
			</Button>

			{error && <p className="text-destructive text-xs px-1">{error}</p>}

			{tracks.length > 0 && (
				<div className="flex flex-col gap-2 mt-1">
					<p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
						Треки
					</p>
					{tracks.map((track) => (
						<div
							key={track.id}
							className="rounded-md border bg-muted/30 p-2 flex flex-col gap-1.5"
						>
							<div className="flex items-center justify-between gap-2">
								<span className="text-xs font-medium truncate">
									{track.title || track.id.slice(0, 8)}
								</span>
								<span
									className={cn(
										"text-[0.6rem] shrink-0 rounded-full px-1.5 py-0.5",
										track.status === "complete"
											? "bg-green-500/20 text-green-400"
											: track.status === "error"
												? "bg-red-500/20 text-red-400"
												: "bg-yellow-500/20 text-yellow-400 animate-pulse",
									)}
								>
									{track.status === "pending" ? "генерируется..." : track.status}
								</span>
							</div>
							{track.tags && (
								<p className="text-[0.65rem] text-muted-foreground">{track.tags}</p>
							)}
							{track.audio_url && track.status === "complete" && (
								<audio controls className="w-full h-8" src={track.audio_url} />
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
