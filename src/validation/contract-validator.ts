/**
 * Validation layer: subscribes to interceptor response events, matches to contract,
 * validates all payload and response aspects (body, query, headers, cookies, status).
 */

import type { HttpInterceptor } from "../interceptor";
import { INTERCEPTOR_RESPONSE } from "../types";
import type { InterceptorResponsePayload } from "../types";
import type { ContractDefinition, ContractValidatorConfig } from "../config/types";
import type { CapturedRequest, CapturedResponse } from "../types";
import { pathnameFromUrl, findContract } from "./path-matcher";
import { validateWithSchema, validateStatusCode } from "./schema-validator";
import { logViolation } from "./reporting";
import type { ContractValidationResult } from "./types";

export interface CreateContractValidatorOptions {
  onViolation?: (result: ContractValidationResult) => void;
}

function emitViolation(
  contract: ContractDefinition,
  request: CapturedRequest,
  response: CapturedResponse,
  kind: NonNullable<ContractValidationResult["kind"]>,
  errors: ContractValidationResult["errors"],
  onViolation: CreateContractValidatorOptions["onViolation"]
): void {
  const result: ContractValidationResult = {
    valid: false,
    contract,
    request,
    response,
    errors,
    kind,
  };
  if (onViolation) onViolation(result);
  logViolation(result);
}

/**
 * Creates a contract validator that validates all configured payload and response aspects.
 * Call attach(interceptor) to subscribe to response events.
 * Validates: request body, query, headers, cookies; response body, status, headers, cookies.
 */
export function createContractValidator(
  config: ContractValidatorConfig,
  options?: CreateContractValidatorOptions
): {
  attach(interceptor: HttpInterceptor): void;
  detach(): void;
} {
  let interceptorRef: HttpInterceptor | null = null;
  let handlerRef: ((payload: InterceptorResponsePayload) => void) | null = null;

  const onViolation = options?.onViolation;

  function handler(payload: InterceptorResponsePayload): void {
    const request = payload.request;
    if (!request) return;

    const pathname = pathnameFromUrl(request.url);
    const contract = findContract(config.contracts, request.method, pathname);
    if (!contract) return;

    const { response } = payload;

    // Request (payload) aspects
    if (contract.requestSchema) {
      const r = validateWithSchema(request.body, contract.requestSchema);
      if (!r.valid) emitViolation(contract, request, response, "request-body", r.errors, onViolation);
    }
    if (contract.requestQuerySchema) {
      const r = validateWithSchema(request.urlParts?.queryParams ?? {}, contract.requestQuerySchema);
      if (!r.valid) emitViolation(contract, request, response, "request-query", r.errors, onViolation);
    }
    if (contract.requestHeadersSchema) {
      const r = validateWithSchema(request.headers ?? {}, contract.requestHeadersSchema);
      if (!r.valid) emitViolation(contract, request, response, "request-headers", r.errors, onViolation);
    }
    if (contract.requestCookiesSchema) {
      const r = validateWithSchema(request.cookies ?? {}, contract.requestCookiesSchema);
      if (!r.valid) emitViolation(contract, request, response, "request-cookies", r.errors, onViolation);
    }

    // Response aspects
    if (contract.responseSchema) {
      const r = validateWithSchema(response.body, contract.responseSchema);
      if (!r.valid) emitViolation(contract, request, response, "response-body", r.errors, onViolation);
    }
    if (contract.allowedResponseStatusCodes != null && contract.allowedResponseStatusCodes.length > 0) {
      const r = validateStatusCode(response.status, contract.allowedResponseStatusCodes);
      if (!r.valid) emitViolation(contract, request, response, "response-status", r.errors, onViolation);
    }
    if (contract.responseHeadersSchema) {
      const r = validateWithSchema(response.headers ?? {}, contract.responseHeadersSchema);
      if (!r.valid) emitViolation(contract, request, response, "response-headers", r.errors, onViolation);
    }
    if (contract.responseCookiesSchema) {
      const r = validateWithSchema(response.cookies ?? {}, contract.responseCookiesSchema);
      if (!r.valid) emitViolation(contract, request, response, "response-cookies", r.errors, onViolation);
    }
  }

  return {
    attach(interceptor: HttpInterceptor) {
      if (interceptorRef != null) return;
      interceptorRef = interceptor;
      handlerRef = handler;
      interceptor.on(INTERCEPTOR_RESPONSE, handlerRef);
    },
    detach() {
      if (interceptorRef != null && handlerRef != null) {
        interceptorRef.off(INTERCEPTOR_RESPONSE, handlerRef);
        interceptorRef = null;
        handlerRef = null;
      }
    },
  };
}
