import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import { validateEmailLoginCode } from "@/lib/auth/email-code";
import { verifyPassword } from "@/lib/auth/password";
import { provisionPersonalWorkspace } from "@/lib/auth/provisioning";
import { isDemoPasswordLoginEnabled, validateDemoLoginPassword } from "@/lib/demo-login";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
const emailCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

const productionCredentialsProvider = Credentials({
  id: "password",
  name: "Email and password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const parsed = credentialsSchema.safeParse(credentials);
    if (!parsed.success) return null;

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });

    if (!user || user.status !== "ACTIVE") return null;
    if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return null;

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.avatarUrl,
    };
  },
});

const emailCodeProvider = Credentials({
  id: "email-code",
  name: "Email verification code",
  credentials: {
    email: { label: "Email", type: "email" },
    code: { label: "Code", type: "text" },
  },
  async authorize(credentials) {
    const parsed = emailCodeSchema.safeParse(credentials);
    if (!parsed.success) return null;

    const user = await validateEmailLoginCode(parsed.data.email, parsed.data.code);
    if (!user) return null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.avatarUrl,
    };
  },
});

const demoCredentialsProvider =
  isDemoPasswordLoginEnabled
    ? [
        Credentials({
          id: "demo-credentials",
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

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    productionCredentialsProvider,
    emailCodeProvider,
    ...googleProvider,
    ...demoCredentialsProvider,
  ],
  session: { strategy: "jwt" },
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV !== "production" ? "asai-local-development-auth-secret" : undefined),
  trustHost: true,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        const dbUser = await provisionPersonalWorkspace({
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
          emailVerifiedAt: new Date(),
        });
        user.id = dbUser.id;
      }

      return true;
    },
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
