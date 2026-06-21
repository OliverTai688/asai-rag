import "server-only";

import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { PublicLeadStatus } from "@/generated/prisma/enums";
import type { PublicLeadPlanInterest, PublicLeadSource } from "@/domains/public/types";
import { prisma } from "@/lib/prisma";

const EMAIL_LIMIT_PER_HOUR = 2;
const IP_LIMIT_PER_HOUR = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_HASH_SALT = "asai-public-lead-dev-salt";

export interface PublicLeadInput {
  email: string;
  name?: string;
  company?: string;
  roleTitle?: string;
  phone?: string;
  message?: string;
  planInterest?: PublicLeadPlanInterest;
  source: PublicLeadSource;
  consentVersion: string;
  consentAccepted: true;
  privacyAccepted: true;
  website?: string;
}

export type PublicLeadCaptureResult =
  | {
      status: "created";
      lead: {
        id: string;
        status: PublicLeadStatus;
        createdAt: Date;
      };
    }
  | {
      status: "spam_accepted";
    }
  | {
      status: "rate_limited";
      retryAfterSeconds: number;
    };

export async function createPublicLeadCapture(input: PublicLeadInput, requestMeta: { ip?: string | null; userAgent?: string | null }) {
  if (input.website?.trim()) {
    return { status: "spam_accepted" } satisfies PublicLeadCaptureResult;
  }

  const email = input.email.trim().toLowerCase();
  const emailHash = hashPublicLeadValue(email);
  const ipHash = requestMeta.ip ? hashPublicLeadValue(requestMeta.ip) : null;
  const userAgentHash = requestMeta.userAgent ? hashPublicLeadValue(requestMeta.userAgent) : null;
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const [emailCount, ipCount] = await Promise.all([
    prisma.publicLead.count({
      where: {
        emailHash,
        createdAt: { gte: since },
      },
    }),
    ipHash
      ? prisma.publicLead.count({
          where: {
            ipHash,
            createdAt: { gte: since },
          },
        })
      : Promise.resolve(0),
  ]);

  if (emailCount >= EMAIL_LIMIT_PER_HOUR || ipCount >= IP_LIMIT_PER_HOUR) {
    return {
      status: "rate_limited",
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    } satisfies PublicLeadCaptureResult;
  }

  const lead = await prisma.publicLead.create({
    data: {
      email,
      emailHash,
      name: normalizeOptionalString(input.name),
      company: normalizeOptionalString(input.company),
      roleTitle: normalizeOptionalString(input.roleTitle),
      phone: normalizeOptionalString(input.phone),
      message: normalizeOptionalString(input.message),
      planInterest: input.planInterest ?? null,
      source: input.source,
      consentVersion: input.consentVersion,
      consentAccepted: input.consentAccepted,
      privacyAccepted: input.privacyAccepted,
      ipHash,
      userAgentHash,
      metadata: buildPublicLeadMetadata(input),
      status: PublicLeadStatus.NEW,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  });

  return {
    status: "created",
    lead,
  } satisfies PublicLeadCaptureResult;
}

export function extractClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return headers.get("x-real-ip")?.trim() || null;
}

export function hashPublicLeadValue(value: string): string {
  const salt = process.env.PUBLIC_LEAD_HASH_SALT ?? process.env.AUTH_SECRET ?? DEFAULT_HASH_SALT;
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function normalizeOptionalString(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function buildPublicLeadMetadata(input: PublicLeadInput): Prisma.InputJsonObject {
  return {
    capture: "public_beta_lead",
    source: input.source,
    consentVersion: input.consentVersion,
    planInterest: input.planInterest ?? "UNSURE",
    persistence: "public_leads",
    emailHashOnlyInProof: true,
  };
}
