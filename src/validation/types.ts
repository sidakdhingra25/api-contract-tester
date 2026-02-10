/**
 * Validation layer types.
 */

import { ContractDefinition } from "../config/types";
import { CapturedRequest, CapturedResponse } from "../interceptor";




export interface ContractValidationErrorItem {
  path?: string;
  message: string;
  received?: unknown;
  expectedSchema?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

/** Which part of the contract failed (payload or response aspect). */
export type ContractValidationKind =
  | "request-body"
  | "request-query"
  | "request-headers"
  | "request-cookies"
  | "response-body"
  | "response-status"
  | "response-headers"
  | "response-cookies";

export interface ContractValidationResult {
  valid: boolean;
  contract: ContractDefinition;
  request: CapturedRequest;
  response: CapturedResponse;
  errors?: ContractValidationErrorItem[];
  /** Which part failed (body, query, headers, cookies, status). */
  kind?: ContractValidationKind;
}
