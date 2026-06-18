import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import {
  createClientForMember,
  createClientInputSchema,
  listClientsForMember,
} from "@/lib/clients/client-repository";

export async function GET() {
  try {
    const session = await requireCurrentMember();
    const clients = await listClientsForMember(session);

    return Response.json({ clients });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireCurrentMember();
    const parsedBody = createClientInputSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_CLIENT_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const client = await createClientForMember(session, parsedBody.data);

    return Response.json({ client }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
