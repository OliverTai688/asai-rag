import type { z } from "zod";
import { apiErrors } from "./errors";
import { apiErrorResponse } from "./response";

export type ParsedJsonBody<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      response: Response;
    };

type ParseJsonBodyOptions = {
  error: string;
  message?: string;
  fallbackBody?: unknown;
};

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  options: ParseJsonBodyOptions,
): Promise<ParsedJsonBody<T>> {
  const rawBody = await request.json().catch(() => options.fallbackBody ?? null);
  const parsed = schema.safeParse(rawBody);

  if (!parsed.success) {
    return {
      success: false,
      response: apiErrorResponse(
        apiErrors.validation(options.error, flattenZodIssues(parsed.error), options.message),
      ),
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

export function flattenZodIssues(error: z.ZodError): Record<string, string[] | undefined> {
  return error.flatten().fieldErrors;
}
