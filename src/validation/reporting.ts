/**
 * Reporting: format and log/send contract violations.
 */

import type {
  ContractValidationResult,
  ContractValidationErrorItem,
} from "./types";

/** Returns the type of the value for display (e.g. "string", "number", "array"). */
function formatReceivedType(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function formatExpected(e: ContractValidationErrorItem): string {
  const schema = e.expectedSchema ?? e.params;
  if (schema && typeof schema === "object") {
    const type = (schema as Record<string, unknown>).type;
    if (type != null) return String(type);
  }
  return "per schema";
}

/**
 * Formats a single validation error with received vs expected.
 * E.g. "id: expected integer, received string"
 */
function formatErrorLine(e: ContractValidationErrorItem): string {
  const path = e.path;
  const loc = path ? (path.startsWith("/") ? path.slice(1) : path) : "body";
  const field = loc.replace(/^\//, "").replace(/\//g, ".") || "body";
  const expected = formatExpected(e);
  const receivedType =
    e.received !== undefined ? formatReceivedType(e.received) : null;
  if (receivedType !== null) {
    return `${field}: expected ${expected}, received ${receivedType}`;
  }
  return `${field}: ${e.message}`;
}

/** Human-readable label for each validation kind. */
function kindLabel(kind: ContractValidationResult["kind"]): string {
  if (!kind) return "response";
  return kind.replace(/-/g, " ");
}

/**
 * Builds a one-line summary for a violation: "METHOD path <kind>: ..."
 */
export function formatViolationSummary(result: ContractValidationResult): string {
  const { request, contract, kind } = result;
  const path = contract.label ?? contract.path;
  const part = kindLabel(kind);
  return `${request.method} ${path} ${part}`;
}

/**
 * Formats a full violation report as a single string (one line per error).
 * E.g. "GET /api/todos response: 0.id: expected integer, received string"
 * or "POST /api/todos request: body: required property 'title' missing"
 */
export function formatViolationMessage(result: ContractValidationResult): string {
  const prefix = formatViolationSummary(result);
  const errors = result.errors ?? [];
  if (errors.length === 0) return `${prefix}: validation failed`;
  const lines = errors.map((e) => formatErrorLine(e));
  return `${prefix}: ${lines.join("; ")}`;
}

/**
 * Logs a contract violation to the console. Uses formatViolationMessage for a clear one-liner.
 */
export function logViolation(result: ContractValidationResult): void {
  const message = formatViolationMessage(result);
  console.warn(`[contract-validator] ${message}`);
  if (result.errors && result.errors.length > 1) {
    result.errors.forEach((e) => {
      console.warn(`  - ${formatErrorLine(e)}`);
    });
  }
}
