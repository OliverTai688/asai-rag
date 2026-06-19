import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { isDemoPasswordLoginEnabled, validateDemoLoginPassword } from "@/lib/demo-login";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const demoCredentialsProvider =
  isDemoPasswordLoginEnabled
    ? [
        Credentials({
          name: "Demo account",
          credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" },
          },
          async authorize(credentials) {
            const parsed = credentialsSchema.safeParse(credentials);
            if (!parsed.success) return null;
            if (!validateDemoLoginPassword(parsed.data.email, parsed.data.password)) return null;

            const user = await prisma.user.findUnique({
              where: { email: parsed.data.email.toLowerCase() },
            });

            if (!user || user.status !== "ACTIVE" || !user.isDemo) return null;

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.avatarUrl,
            };
          },
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [...demoCredentialsProvider],
  session: { strategy: "jwt" },
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV !== "production" ? "asai-local-development-auth-secret" : undefined),
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },
});
