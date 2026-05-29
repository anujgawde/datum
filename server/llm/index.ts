import { OllamaProvider } from "./ollama.js";
import type { LLMProvider } from "./types.js";

export type { ChatMessage, ChatOptions, LLMProvider } from "./types.js";

let provider: LLMProvider | undefined;

export function getProvider(): LLMProvider {
  if (provider) return provider;

  const baseUrl = process.env.LLM_BASE_URL ?? "http://localhost:11434";
  const chatModel = process.env.LLM_MODEL;
  const embedModel = process.env.EMBED_MODEL;

  if (!chatModel) throw new Error("LLM_MODEL is not set.");
  if (!embedModel) throw new Error("EMBED_MODEL is not set.");

  provider = new OllamaProvider({ baseUrl, chatModel, embedModel });
  return provider;
}
