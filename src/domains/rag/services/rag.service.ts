import { RagResponse } from "../types";

export class RagService {
  async query(question: string): Promise<RagResponse> {
    // Placeholder for RAG logic (e.g. vector search + LLM)
    return {
      answer: `This is a placeholder answer for: ${question}`,
      sources: [
        {
          id: "1",
          name: "Documentation",
          url: "https://example.com/doc",
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }
}

export const ragService = new RagService();
