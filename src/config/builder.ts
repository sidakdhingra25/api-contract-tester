/**
 * Builder for contract-validator.config.ts
 * defineContractConfig((builder) => { builder.get('/api/users').response(UserSchema); ... })
 */

import type { ContractDefinition, ContractValidatorConfig, JsonSchema } from "./types";

function pushContract(
  contracts: ContractDefinition[],
  current: Partial<ContractDefinition>
) {
  if (current.method != null && current.path != null) {
    contracts.push({
      method: current.method,
      path: current.path,
      requestSchema: current.requestSchema,
      requestQuerySchema: current.requestQuerySchema,
      requestHeadersSchema: current.requestHeadersSchema,
      requestCookiesSchema: current.requestCookiesSchema,
      responseSchema: current.responseSchema,
      allowedResponseStatusCodes: current.allowedResponseStatusCodes,
      responseHeadersSchema: current.responseHeadersSchema,
      responseCookiesSchema: current.responseCookiesSchema,
      label: current.label,
    });
  }
}

/**
 * Fluent chain for a single contract (method + path, then optional body/response/label).
 */
export interface ContractChain {
  /** Frontend port to listen for (e.g. 3000 for Next, 4200 for Angular). */
  port(portNumber: number): ContractChain;
  /** Request body schema. */
  body(schema: JsonSchema): ContractChain;
  /** Alias for body(). */
  request(schema: JsonSchema): ContractChain;
  /** Request query params schema (validates urlParts.queryParams). */
  query(schema: JsonSchema): ContractChain;
  /** Request headers schema. */
  requestHeaders(schema: JsonSchema): ContractChain;
  /** Request cookies schema. */
  requestCookies(schema: JsonSchema): ContractChain;
  /** Response body schema. */
  response(schema: JsonSchema): ContractChain;
  /** Allowed response status codes (e.g. [200, 201]). */
  responseStatusCodes(codes: number[]): ContractChain;
  /** Response headers schema. */
  responseHeaders(schema: JsonSchema): ContractChain;
  /** Response cookies schema. */
  responseCookies(schema: JsonSchema): ContractChain;
  label(name: string): ContractChain;
  get(path: string): ContractChain;
  post(path: string): ContractChain;
  put(path: string): ContractChain;
  patch(path: string): ContractChain;
  delete(path: string): ContractChain;
}

/**
 * Defines the contract validator config. Use in contract-validator.config.ts:
 *
 * @example
 * // contract-validator.config.ts
 * import { defineContractConfig } from 'your-package';
 * import { UserSchema, CreateUserSchema } from './schemas';
 *
 * export default defineContractConfig((builder) => {
 *   builder.get('/api/users').response(UserSchema);
 *   builder.get('/api/users/:id').response(UserSchema);
 *   builder.post('/api/users').body(CreateUserSchema).response(UserSchema);
 *   builder.put('/api/users/:id').body(UpdateUserSchema).response(UserSchema);
 * });
 */
export function defineContractConfig(
  fn: (builder: ContractChain) => void
): ContractValidatorConfig {
  const contracts: ContractDefinition[] = [];
  const state: {
    current: Partial<ContractDefinition>;
    port?: number;
  } = { current: {} };

  function start(method: string, path: string) {
    pushContract(contracts, state.current);
    state.current = { method: method.toUpperCase(), path };
  }

  const builder: ContractChain = {
    port(portNumber: number) {
      state.port = portNumber;
      return builder;
    },
    body(schema: JsonSchema) {
      state.current.requestSchema = schema;
      return builder;
    },
    request(schema: JsonSchema) {
      state.current.requestSchema = schema;
      return builder;
    },
    query(schema: JsonSchema) {
      state.current.requestQuerySchema = schema;
      return builder;
    },
    requestHeaders(schema: JsonSchema) {
      state.current.requestHeadersSchema = schema;
      return builder;
    },
    requestCookies(schema: JsonSchema) {
      state.current.requestCookiesSchema = schema;
      return builder;
    },
    response(schema: JsonSchema) {
      state.current.responseSchema = schema;
      return builder;
    },
    responseStatusCodes(codes: number[]) {
      state.current.allowedResponseStatusCodes = codes;
      return builder;
    },
    responseHeaders(schema: JsonSchema) {
      state.current.responseHeadersSchema = schema;
      return builder;
    },
    responseCookies(schema: JsonSchema) {
      state.current.responseCookiesSchema = schema;
      return builder;
    },
    label(name: string) {
      state.current.label = name;
      return builder;
    },
    get(path: string) {
      start("GET", path);
      return builder;
    },
    post(path: string) {
      start("POST", path);
      return builder;
    },
    put(path: string) {
      start("PUT", path);
      return builder;
    },
    patch(path: string) {
      start("PATCH", path);
      return builder;
    },
    delete(path: string) {
      start("DELETE", path);
      return builder;
    },
  };

  fn(builder);

  pushContract(contracts, state.current);

  return { port: state.port, contracts };
}
