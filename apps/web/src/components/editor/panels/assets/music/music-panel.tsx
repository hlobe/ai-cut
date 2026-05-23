"use client";

import { useState, useEffect, useRef } from "react";
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

export function MusicPanel() {
  const [prompt, setPrompt] = useState("");
  const [tags, setTags] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasPending = tracks.some((t) => t.status === "pending");

  // Fetch tracks on mount and while any are pending
  const fetchTracks = async () => {
    try {
      const r = await fetch(`${SPIKE_BASE_URL}/api/suno/tracks`);
      if (r.ok) setTracks(await r.json());
    } catch {}
  };

  useEffect(() => {
    fetchTracks();
  }, []);

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
  }, [hasPending]);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch(`${SPIKE_BASE_URL}/api/suno/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, tags: tags || undefined, make_instrumental: instrumental }),
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

  return (
    <div className="flex flex-col gap-3 p-3">
      <Textarea
        placeholder="Describe the music... (e.g. upbeat lo-fi hip hop with piano)"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="min-h-[72px] resize-none text-xs"
        disabled={generating}
      />
      <Input
        placeholder="Tags: lo-fi chill ambient pop..."
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="h-8 text-xs"
        disabled={generating}
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={instrumental}
          onChange={(e) => setInstrumental(e.target.checked)}
          className="rounded"
          disabled={generating}
        />
        Instrumental
      </label>

      <Button
        size="sm"
        className="w-full"
        disabled={!prompt.trim() || generating}
        onClick={handleGenerate}
      >
        {generating ? "Submitting..." : "Generate"}
      </Button>

      {error && (
        <p className="text-destructive text-xs px-1">{error}</p>
      )}

      {tracks.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">Generated tracks</p>
          {tracks.map((track) => (
            <div key={track.id} className="rounded-md border bg-muted/30 p-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium truncate">
                  {track.title || track.id.slice(0, 8)}
                </span>
                <span className={cn(
                  "text-[0.6rem] shrink-0 rounded-full px-1.5 py-0.5",
                  track.status === "complete" ? "bg-green-500/20 text-green-400" :
                  track.status === "error" ? "bg-red-500/20 text-red-400" :
                  "bg-yellow-500/20 text-yellow-400 animate-pulse"
                )}>
                  {track.status === "pending" ? "generating..." : track.status}
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
