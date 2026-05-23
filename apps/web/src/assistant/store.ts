import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage } from "./types";

interface AssistantStore {
	messages: ChatMessage[];
	isOpen: boolean;
	isLoading: boolean;
	apiKey: string;
	addMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
	clearMessages: () => void;
	setIsOpen: (open: boolean) => void;
	setIsLoading: (loading: boolean) => void;
	setApiKey: (key: string) => void;
}

export const useAssistantStore = create<AssistantStore>()(
	persist(
		(set) => ({
			messages: [],
			isOpen: true,
			isLoading: false,
			apiKey: "",
			addMessage: (msg) =>
				set((s) => ({
					messages: [
						...s.messages,
						{ ...msg, id: crypto.randomUUID(), timestamp: Date.now() },
					],
				})),
			clearMessages: () => set({ messages: [] }),
			setIsOpen: (isOpen) => set({ isOpen }),
			setIsLoading: (isLoading) => set({ isLoading }),
			setApiKey: (apiKey) => set({ apiKey }),
		}),
		{ name: "ai-assistant", partialize: (s) => ({ apiKey: s.apiKey }) },
	),
);
