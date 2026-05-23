import { ASSISTANT_TOOLS, executeToolCall, type ToolName } from "./tools";
import type { ChatMessage } from "./types";

const SYSTEM_PROMPT = `You are an AI video editing assistant inside ai-cut editor.
You help users edit their timeline, generate AI frames, and compose videos.
When asked to make changes, use the available tools.
Keep responses concise and action-oriented.

TODO: MCP integration is intentionally not wired in the browser MVP; use the built-in tools only.`;

interface AnthropicMessage {
	role: "user" | "assistant";
	content: string | AnthropicContent[];
}

type AnthropicContent =
	| { type: "text"; text: string }
	| { type: "tool_use"; id: string; name: string; input: unknown }
	| { type: "tool_result"; tool_use_id: string; content: string };

export async function sendMessage({
	apiKey,
	messages,
	userMessage,
	onChunk,
}: {
	apiKey: string;
	messages: ChatMessage[];
	userMessage: string;
	onChunk: (text: string) => void;
}): Promise<{
	text: string;
	toolCalls: Array<{ name: string; input: unknown; output: unknown }>;
}> {
	const history: AnthropicMessage[] = messages.map((message) => ({
		role: message.role,
		content: message.content,
	}));
	history.push({ role: "user", content: userMessage });

	const toolCalls: Array<{ name: string; input: unknown; output: unknown }> =
		[];
	let assistantText = "";

	for (let i = 0; i < 5; i++) {
		const response = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: "claude-haiku-4-5",
				max_tokens: 1024,
				system: SYSTEM_PROMPT,
				tools: ASSISTANT_TOOLS,
				messages: history,
			}),
		});

		if (!response.ok) {
			const error = await response.text().catch(() => response.statusText);
			throw new Error(`Anthropic API error: ${response.status} ${error}`);
		}

		const data = (await response.json()) as {
			stop_reason: string;
			content: AnthropicContent[];
		};

		for (const block of data.content) {
			if (block.type === "text") {
				assistantText += block.text;
				onChunk(block.text);
			}
		}

		if (data.stop_reason !== "tool_use") break;

		const toolResultBlocks: AnthropicContent[] = [];
		for (const block of data.content) {
			if (block.type !== "tool_use") continue;

			const output = executeToolCall(
				block.name as ToolName,
				block.input as Record<string, unknown>,
			);
			toolCalls.push({ name: block.name, input: block.input, output });
			toolResultBlocks.push({
				type: "tool_result",
				tool_use_id: block.id,
				content: JSON.stringify(output),
			});
		}

		history.push({ role: "assistant", content: data.content });
		history.push({ role: "user", content: toolResultBlocks });
	}

	return { text: assistantText, toolCalls };
}
