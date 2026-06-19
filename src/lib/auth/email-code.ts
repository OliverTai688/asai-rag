import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email/send-email";

const EMAIL_CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function hashCode(email: string, code: string) {
  return createHash("sha256")
    .update(`${email.toLowerCase()}:${code}:${process.env.AUTH_SECRET ?? "local"}`)
    .digest("hex");
}

export function createEmailCode() {
  return randomInt(100000, 1_000_000).toString();
}

export async function requestEmailLoginCode(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") {
    return { requested: true, sent: false, reason: "USER_NOT_FOUND_OR_INACTIVE" } as const;
  }

  const code = createEmailCode();
  await prisma.authEmailCode.create({
    data: {
      email: normalizedEmail,
      userId: user.id,
      purpose: "APP_LOGIN",
      codeHash: hashCode(normalizedEmail, code),
      expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000),
    },
  });

  const delivery = await sendTransactionalEmail({
    to: normalizedEmail,
    subject: "誠問 AI 登入驗證碼",
    text: `你的誠問 AI 登入驗證碼是 ${code}。${EMAIL_CODE_TTL_MINUTES} 分鐘內有效。若不是你本人操作，請忽略此信。`,
    html: `<p>你的誠問 AI 登入驗證碼是 <strong>${code}</strong>。</p><p>${EMAIL_CODE_TTL_MINUTES} 分鐘內有效。若不是你本人操作，請忽略此信。</p>`,
  });

  return { requested: true, ...delivery } as const;
}

export async function validateEmailLoginCode(email: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const now = new Date();
  const record = await prisma.authEmailCode.findFirst({
    where: {
      email: normalizedEmail,
      purpose: "APP_LOGIN",
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.attempts >= MAX_ATTEMPTS) return null;

  const isValid = record.codeHash === hashCode(normalizedEmail, code.trim());

  if (!isValid) {
    await prisma.authEmailCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true, avatarUrl: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") return null;

  await prisma.authEmailCode.update({
    where: { id: record.id },
    data: { consumedAt: now },
  });

  return user;
}
