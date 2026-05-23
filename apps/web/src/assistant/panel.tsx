"use client";

import { useState } from "react";
import { Delete02Icon, MailSend01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/ui";
import { sendMessage } from "./api";
import { useAssistantStore } from "./store";

export function AssistantPanel() {
	const {
		messages,
		isLoading,
		apiKey,
		addMessage,
		clearMessages,
		setIsLoading,
	} = useAssistantStore();
	const [input, setInput] = useState("");
	const [streamingText, setStreamingText] = useState("");

	const handleSend = async () => {
		const text = input.trim();
		if (!text || isLoading) return;

		if (!apiKey) {
			addMessage({
				role: "assistant",
				content: "API key not set. Go to Settings tab, AI Assistant.",
			});
			return;
		}

		setInput("");
		addMessage({ role: "user", content: text });
		setIsLoading(true);
		setStreamingText("");

		try {
			const result = await sendMessage({
				apiKey,
				messages,
				userMessage: text,
				onChunk: (chunk) => setStreamingText((prev) => prev + chunk),
			});
			addMessage({
				role: "assistant",
				content: result.text,
				toolCalls: result.toolCalls,
			});
		} catch (error) {
			addMessage({
				role: "assistant",
				content: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setIsLoading(false);
			setStreamingText("");
		}
	};

	return (
		<div className="panel bg-background flex h-full min-w-0 flex-col overflow-hidden rounded-sm border">
			<div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
				<span className="text-sm font-medium">AI Assistant</span>
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={clearMessages}
					aria-label="Clear assistant chat"
				>
					<HugeiconsIcon icon={Delete02Icon} size={13} />
				</Button>
			</div>

			<ScrollArea className="min-h-0 flex-1">
				<div className="flex flex-col gap-3 p-3">
					{messages.length === 0 && (
						<p className="text-muted-foreground px-2 py-4 text-center text-xs leading-relaxed">
							Ask me to edit your timeline, generate frames, or compose scenes.
						</p>
					)}

					{messages.map((message) => (
						<div
							key={message.id}
							className={cn(
								"max-w-[88%] rounded-md px-3 py-2 text-xs leading-relaxed",
								message.role === "user"
									? "bg-primary text-primary-foreground self-end"
									: "bg-muted text-muted-foreground self-start",
							)}
						>
							<p className="whitespace-pre-wrap break-words">
								{message.content}
							</p>
							{message.toolCalls && message.toolCalls.length > 0 && (
								<div className="mt-2 border-t border-current/15 pt-1 text-[0.65rem] opacity-70">
									{message.toolCalls.map((toolCall, index) => (
										<span key={`${toolCall.name}-${index}`}>
											{toolCall.name}
											{index < message.toolCalls!.length - 1 ? ", " : ""}
										</span>
									))}
								</div>
							)}
						</div>
					))}

					{isLoading && streamingText && (
						<div className="bg-muted text-muted-foreground max-w-[88%] self-start rounded-md px-3 py-2 text-xs leading-relaxed">
							<p className="whitespace-pre-wrap break-words">{streamingText}</p>
						</div>
					)}

					{isLoading && !streamingText && (
						<div className="bg-muted text-muted-foreground max-w-[88%] self-start rounded-md px-3 py-2 text-xs">
							<span className="animate-pulse">Thinking...</span>
						</div>
					)}
				</div>
			</ScrollArea>

			<div className="shrink-0 border-t p-2">
				<div className="flex gap-1.5">
					<Textarea
						className="min-h-[52px] resize-none text-xs"
						placeholder="Ask the AI assistant..."
						value={input}
						disabled={isLoading}
						onChange={(event) => setInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								void handleSend();
							}
						}}
					/>
					<Button
						size="icon"
						className="size-8 shrink-0 self-end"
						disabled={!input.trim() || isLoading}
						onClick={() => void handleSend()}
						aria-label="Send assistant message"
					>
						<HugeiconsIcon icon={MailSend01Icon} size={14} />
					</Button>
				</div>
			</div>
		</div>
	);
}
