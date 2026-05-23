export type MessageRole = "user" | "assistant";

export interface ChatMessage {
	id: string;
	role: MessageRole;
	content: string;
	timestamp: number;
	toolCalls?: ToolCall[];
}

export interface ToolCall {
	name: string;
	input: unknown;
	output?: unknown;
	error?: string;
}
