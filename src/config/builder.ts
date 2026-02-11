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
      request: current.request,
      response: current.response,
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
 *   builder.post('/api/users').request(CreateUserSchema).response(UserSchema);
 *   builder.put('/api/users/:id').request(UpdateUserSchema).response(UserSchema);
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
    state.current = {
      method: method.toUpperCase(),
      path,
      request: {},
      response: {},
    };
  }

  const builder: ContractChain = {
    port(portNumber: number) {
      state.port = portNumber;
      return builder;
    },
    request(schema: JsonSchema) {
      if (!state.current.request) state.current.request = {};
      state.current.request.body = schema;
      return builder;
    },
    query(schema: JsonSchema) {
      if (!state.current.request) state.current.request = {};
      state.current.request.query = schema;
      return builder;
    },
    requestHeaders(schema: JsonSchema) {
      if (!state.current.request) state.current.request = {};
      state.current.request.headers = schema;
      return builder;
    },
    requestCookies(schema: JsonSchema) {
      if (!state.current.request) state.current.request = {};
      state.current.request.cookies = schema;
      return builder;
    },
    response(schema: JsonSchema) {
      if (!state.current.response) state.current.response = {};
      state.current.response.body = schema;
      return builder;
    },
    responseStatusCodes(codes: number[]) {
      if (!state.current.response) state.current.response = {};
      state.current.response.statusCodes = codes;
      return builder;
    },
    responseHeaders(schema: JsonSchema) {
      if (!state.current.response) state.current.response = {};
      state.current.response.headers = schema;
      return builder;
    },
    responseCookies(schema: JsonSchema) {
      if (!state.current.response) state.current.response = {};
      state.current.response.cookies = schema;
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
