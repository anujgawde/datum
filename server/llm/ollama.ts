import type { ChatMessage, ChatOptions, LLMProvider } from "./types.js";

interface OllamaConfig {
  baseUrl: string;
  chatModel: string;
  embedModel: string;
}

export class OllamaProvider implements LLMProvider {
  readonly chatModel: string;
  readonly embedModel: string;
  private readonly baseUrl: string;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.chatModel = config.chatModel;
    this.embedModel = config.embedModel;
  }

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.chatModel,
        messages,
        stream: false,
        format: opts?.format,
        options: { temperature: opts?.temperature ?? 0 },
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama chat failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content;
    if (typeof content !== "string") {
      throw new Error("Ollama chat returned no message content.");
    }
    return content;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.embedModel, input: texts }),
    });

    if (!res.ok) {
      throw new Error(`Ollama embed failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { embeddings?: number[][] };
    if (!Array.isArray(data.embeddings) || data.embeddings.length !== texts.length) {
      throw new Error("Ollama embed returned an unexpected number of vectors.");
    }
    return data.embeddings;
  }
}
