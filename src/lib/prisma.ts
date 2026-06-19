import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const runtimeDatabaseEnvCandidates = [
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["POSTGRES_PRISMA_URL", process.env.POSTGRES_PRISMA_URL],
  ["POSTGRES_URL", process.env.POSTGRES_URL],
  ["DIRECT_URL", process.env.DIRECT_URL],
  ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
] as const;

const runtimeDatabaseEnv = runtimeDatabaseEnvCandidates.find(([, value]) => Boolean(value));

export const prismaRuntimeDatabaseUrl = runtimeDatabaseEnv?.[1];
export const prismaRuntimeDatabaseSource = runtimeDatabaseEnv?.[0] ?? null;

const adapter = new PrismaPg({
  connectionString: prismaRuntimeDatabaseUrl,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
