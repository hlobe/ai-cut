import { SPIKE_BASE_URL } from "@/spike/client";
import type { ChatMessage } from "./types";

export async function sendMessage({
	messages,
	userMessage,
	onChunk,
}: {
	apiKey?: string;
	messages: ChatMessage[];
	userMessage: string;
	onChunk: (text: string) => void;
}): Promise<{
	text: string;
	toolCalls: Array<{ name: string; input: unknown; output: unknown }>;
}> {
	// Build a simple context string from history
	const history = messages
		.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
		.join("\n");
	const fullMessage = history
		? `${history}\nUser: ${userMessage}`
		: userMessage;

	const response = await fetch(`${SPIKE_BASE_URL}/api/aicut/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ message: fullMessage }),
	});

	if (!response.ok) {
		const error = await response.text().catch(() => response.statusText);
		throw new Error(
			response.status === 503
				? "Claude Code не запущен на этом компьютере"
				: `Chat error: ${response.status} ${error}`,
		);
	}

	const data = (await response.json()) as { text: string };
	onChunk(data.text);
	return { text: data.text, toolCalls: [] };
}
