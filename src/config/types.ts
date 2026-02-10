/**
 * Types for contract-validator.config.ts
 * User defines API contracts (method, path, request/response schemas) via the builder.
 */

/**
 * JSON Schema (subset). Use for request body and response body validation.
 * @see https://json-schema.org/
 */
export type JsonSchema = Record<string, unknown>;

/**
 * Single contract: one API endpoint with optional schemas for payload and response aspects.
 * Covers types.md: body, query, headers, cookies, status.
 */
export interface ContractDefinition {
  /** HTTP method (GET, POST, PUT, PATCH, DELETE, etc.). */
  method: string;
  /**
   * Path pattern. Use :param for path params, e.g. "/api/users/:id".
   * Used to match captured request URL path.
   */
  path: string;
  /** Optional JSON Schema for request body. */
  requestSchema?: JsonSchema;
  /** Optional JSON Schema for request query params (urlParts.queryParams). */
  requestQuerySchema?: JsonSchema;
  /** Optional JSON Schema for request headers. */
  requestHeadersSchema?: JsonSchema;
  /** Optional JSON Schema for request cookies. */
  requestCookiesSchema?: JsonSchema;
  /** Optional JSON Schema for response body. */
  responseSchema?: JsonSchema;
  /** Allowed response status codes; if set, response.status must be in this array. */
  allowedResponseStatusCodes?: number[];
  /** Optional JSON Schema for response headers. */
  responseHeadersSchema?: JsonSchema;
  /** Optional JSON Schema for response cookies. */
  responseCookiesSchema?: JsonSchema;
  /** Optional human-readable label for this contract. */
  label?: string;
}

/**
 * Result of defineContractConfig(): array of contracts the package uses for validation.
 */
export interface ContractValidatorConfig {
  /** Frontend dev server port (e.g. 3000, 4200). Used to know which origin to listen for. */
  port?: number;
  contracts: ContractDefinition[];
}
