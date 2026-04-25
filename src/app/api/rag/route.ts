import { NextResponse } from "next/server";
import { ragService } from "@/domains/rag/services/rag.service";
import { z } from "zod";

const querySchema = z.object({
  question: z.string().min(1, "Question cannot be empty"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validation
    const validation = querySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.format() },
        { status: 400 }
      );
    }

    const { question } = validation.data;
    const result = await ragService.query(question);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("RAG API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
