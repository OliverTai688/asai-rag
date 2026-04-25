export interface RagSource {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

export interface RagResponse {
  answer: string;
  sources: RagSource[];
}
