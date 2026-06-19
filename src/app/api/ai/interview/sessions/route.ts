import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createInterviewSessionInputSchema,
  createPersistentInterviewSession,
} from "@/lib/interview/interview-persistence-repository";

export async function POST(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsedBody = createInterviewSessionInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_INTERVIEW_SESSION_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const interviewSession = await createPersistentInterviewSession(session, parsedBody.data);

    if (!interviewSession) {
      return Response.json({ error: "CLIENT_NOT_FOUND_OR_NOT_OWNED" }, { status: 404 });
    }

    return Response.json({ session: interviewSession }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
