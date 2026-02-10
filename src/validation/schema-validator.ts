/**
 * JSON Schema validation using Ajv. Validates response/request body against contract schema.
 */

import Ajv from "ajv";
import type { JsonSchema } from "../config/types";

export interface ValidationErrorItem {
  path?: string;
  message: string;
  /** Value received (from Ajv error.data). */
  received?: unknown;
  /** Schema expected at this path (e.g. { type: "integer" }). */
  expectedSchema?: Record<string, unknown>;
  /** Params from Ajv (e.g. { type: "integer" } for type errors). */
  params?: Record<string, unknown>;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors?: ValidationErrorItem[];
}

const ajv = new Ajv({
  allErrors: true,
  strictTypes: true,
  coerceTypes: false,
});

/** Get value at JSON Pointer path (e.g. "/0/id" -> data[0].id). */
function getValueAtPath(root: unknown, instancePath: string): unknown {
  if (!instancePath || instancePath === "/") return root;
  const segments = instancePath.split("/").filter(Boolean);
  let current: unknown = root;
  for (const seg of segments) {
    if (current == null || typeof current !== "object") return undefined;
    const key = /^\d+$/.test(seg) ? Number(seg) : seg;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

/**
 * Validates data against a JSON Schema. Returns valid flag and optional errors.
 */
export function validateWithSchema(
  data: unknown,
  schema: JsonSchema
): SchemaValidationResult {
  try {
    const validate = ajv.compile(schema as object);
    const valid = validate(data);
    if (valid) return { valid: true };
    const errors: ValidationErrorItem[] = (validate.errors ?? []).map((e) => {
      const path = e.instancePath || undefined;
      const received =
        e.data !== undefined ? e.data : getValueAtPath(data, e.instancePath || "");
      return {
        path,
        message: e.message ?? String(e),
        received,
        expectedSchema: e.schema as Record<string, unknown> | undefined,
        params: e.params as Record<string, unknown> | undefined,
      };
    });
    return { valid: false, errors };
  } catch (err) {
    return {
      valid: false,
      errors: [{ message: err instanceof Error ? err.message : String(err) }],
    };
  }
}

/**
 * Validates that status code is in the allowed list. Returns result compatible with schema validation.
 */
export function validateStatusCode(
  status: number,
  allowed: number[]
): SchemaValidationResult {
  if (allowed.length === 0 || allowed.includes(status)) return { valid: true };
  return {
    valid: false,
    errors: [
      {
        message: `status must be one of [${allowed.join(", ")}], received ${status}`,
        received: status,
        params: { allowed },
      },
    ],
  };
}
