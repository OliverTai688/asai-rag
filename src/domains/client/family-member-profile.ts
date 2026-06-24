import { z } from "zod";

export const FAMILY_MEMBER_PROFILE_SCHEMA_VERSION = "2026-06-24.family-member-profile.v1";

export type FamilyMemberProfileFactStatus = "FACT" | "INFERENCE" | "UNKNOWN";

export interface FamilyMemberProfileField {
  value: string;
  factStatus: FamilyMemberProfileFactStatus;
  sourceReferenceIds: string[];
  rationale?: string;
}

export interface FamilyMemberProfileSourceReference {
  id: string;
  type: "advisor_note" | "relationship_graph" | "ai_signal";
  label: string;
  summary: string;
  factStatus: FamilyMemberProfileFactStatus;
}

export interface FamilyMemberProfile {
  schemaVersion: typeof FAMILY_MEMBER_PROFILE_SCHEMA_VERSION;
  jobTitle?: FamilyMemberProfileField;
  annualIncomeOrDependency?: FamilyMemberProfileField;
  personStatus?: FamilyMemberProfileField;
  decisionRole?: FamilyMemberProfileField;
  relationshipContext?: FamilyMemberProfileField;
  sourceReferences: FamilyMemberProfileSourceReference[];
}

const factStatusSchema = z.enum(["FACT", "INFERENCE", "UNKNOWN"]);

const familyMemberProfileFieldSchema = z
  .object({
    value: z.string().trim().min(1).max(160),
    factStatus: factStatusSchema.default("UNKNOWN"),
    sourceReferenceIds: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
    rationale: z.string().trim().max(240).optional().or(z.literal("")),
  })
  .strict();

const familyMemberProfileSourceReferenceSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    type: z.enum(["advisor_note", "relationship_graph", "ai_signal"]).default("relationship_graph"),
    label: z.string().trim().min(1).max(80),
    summary: z.string().trim().min(1).max(240),
    factStatus: factStatusSchema.default("FACT"),
  })
  .strict();

const familyMemberProfileFieldsSchema = z
  .object({
    jobTitle: familyMemberProfileFieldSchema.optional(),
    annualIncomeOrDependency: familyMemberProfileFieldSchema.optional(),
    personStatus: familyMemberProfileFieldSchema.optional(),
    decisionRole: familyMemberProfileFieldSchema.optional(),
    relationshipContext: familyMemberProfileFieldSchema.optional(),
    sourceReferences: z.array(familyMemberProfileSourceReferenceSchema).max(12).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    const unsafePaths = findUnsafeProfilePaths(value);
    for (const path of unsafePaths) {
      ctx.addIssue({
        code: "custom",
        message: `Family member profile cannot store raw private data at ${path}.`,
        path: path.split("."),
      });
    }
  });

export const familyMemberProfileInputSchema = familyMemberProfileFieldsSchema.transform((value): FamilyMemberProfile => ({
  schemaVersion: FAMILY_MEMBER_PROFILE_SCHEMA_VERSION,
  ...normalizeProfileFields(value),
}));

const familyMemberProfileStoredSchema = familyMemberProfileFieldsSchema
  .extend({
    schemaVersion: z.literal(FAMILY_MEMBER_PROFILE_SCHEMA_VERSION),
  })
  .strict()
  .transform((value): FamilyMemberProfile => ({
    schemaVersion: FAMILY_MEMBER_PROFILE_SCHEMA_VERSION,
    ...normalizeProfileFields(value),
  }));

export function extractFamilyMemberProfile(metadata: unknown): FamilyMemberProfile | undefined {
  if (!isRecord(metadata)) return undefined;
  const parsed = familyMemberProfileStoredSchema.safeParse(metadata.profile);
  return parsed.success ? parsed.data : undefined;
}

export function mergeFamilyMemberProfileIntoMetadata(
  metadata: unknown,
  profile: FamilyMemberProfile | null | undefined,
): Record<string, unknown> | null | undefined {
  if (profile === undefined) return undefined;

  const nextMetadata: Record<string, unknown> = isRecord(metadata) ? { ...metadata } : {};

  if (profile === null) {
    delete nextMetadata.profile;
    return Object.keys(nextMetadata).length > 0 ? nextMetadata : null;
  }

  nextMetadata.profile = profile;
  return nextMetadata;
}

export function isFamilyMemberProfileFieldKnown(field: FamilyMemberProfileField | undefined): field is FamilyMemberProfileField {
  return Boolean(field?.value && field.factStatus !== "UNKNOWN");
}

function normalizeProfileFields(value: z.infer<typeof familyMemberProfileFieldsSchema>): Omit<FamilyMemberProfile, "schemaVersion"> {
  return {
    ...(value.jobTitle ? { jobTitle: normalizeProfileField(value.jobTitle) } : {}),
    ...(value.annualIncomeOrDependency
      ? { annualIncomeOrDependency: normalizeProfileField(value.annualIncomeOrDependency) }
      : {}),
    ...(value.personStatus ? { personStatus: normalizeProfileField(value.personStatus) } : {}),
    ...(value.decisionRole ? { decisionRole: normalizeProfileField(value.decisionRole) } : {}),
    ...(value.relationshipContext ? { relationshipContext: normalizeProfileField(value.relationshipContext) } : {}),
    sourceReferences: dedupeSourceReferences(value.sourceReferences ?? []),
  };
}

function normalizeProfileField(field: z.infer<typeof familyMemberProfileFieldSchema>): FamilyMemberProfileField {
  return {
    value: field.value,
    factStatus: field.factStatus,
    sourceReferenceIds: [...new Set(field.sourceReferenceIds ?? [])],
    ...(field.rationale ? { rationale: field.rationale } : {}),
  };
}

function dedupeSourceReferences(
  sourceReferences: FamilyMemberProfileSourceReference[],
): FamilyMemberProfileSourceReference[] {
  const seen = new Set<string>();
  const deduped: FamilyMemberProfileSourceReference[] = [];

  for (const reference of sourceReferences) {
    if (seen.has(reference.id)) continue;
    seen.add(reference.id);
    deduped.push(reference);
  }

  return deduped;
}

function findUnsafeProfilePaths(value: unknown, path = "profile"): string[] {
  if (typeof value === "string") {
    return hasUnsafePrivateData(value) ? [path] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findUnsafeProfilePaths(item, `${path}.${index}`));
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, item]) => findUnsafeProfilePaths(item, `${path}.${key}`));
  }

  return [];
}

function hasUnsafePrivateData(value: string): boolean {
  return [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\b09\d{2}[-\s]?\d{3}[-\s]?\d{3}\b/,
    /\b(rawTranscript|rawPayload|providerPayload|authorization|cookie|secret|token|otp|payment|policyNumber)\b/i,
    /保單號/,
    /BEGIN (?:RSA |OPENSSH |PRIVATE )?KEY/i,
  ].some((pattern) => pattern.test(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
