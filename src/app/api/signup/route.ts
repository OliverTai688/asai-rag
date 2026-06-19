import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { provisionPersonalWorkspace } from "@/lib/auth/provisioning";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
});

export async function POST(req: Request) {
  const parsedBody = signupSchema.safeParse(await req.json().catch(() => null));

  if (!parsedBody.success) {
    return Response.json(
      {
        error: "INVALID_SIGNUP_INPUT",
        issues: parsedBody.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const input = parsedBody.data;
  const email = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (existingUser?.passwordHash) {
    return Response.json({ error: "SIGNUP_EMAIL_ALREADY_REGISTERED" }, { status: 409 });
  }

  const user = await provisionPersonalWorkspace({
    email,
    name: input.name,
    passwordHash: await hashPassword(input.password),
  });

  return Response.json(
    {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      nextStep: {
        route: "/login",
        provider: "password",
      },
    },
    { status: existingUser ? 200 : 201 },
  );
}
