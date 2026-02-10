/**
 * Types for contract-validator.config.ts
 * User defines API contracts (method, path, request/response schemas) via the builder.
 */

/** JSON Schema type-safe subset (draft-07 style). */
export type JsonSchema =
  | JsonSchemaPrimitive
  | JsonSchemaObject
  | JsonSchemaArray
  | JsonSchemaRef
  | { [key: string]: unknown }; // escape hatch for $ref, allOf, anyOf, oneOf, etc.

export type JsonSchemaPrimitiveType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null";

export interface JsonSchemaPrimitive {
  type?: JsonSchemaPrimitiveType;
  enum?: unknown[];
  const?: unknown;
  format?: string;
  // string
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  // number/integer
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;
  // meta
  title?: string;
  description?: string;
  default?: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;
  [key: string]: unknown;
}

export interface JsonSchemaObject {
  type?: "object";
  properties?: Record<string, JsonSchema>;
  additionalProperties?: boolean | JsonSchema;
  patternProperties?: Record<string, JsonSchema>;
  required?: string[];
  propertyNames?: JsonSchema;
  minProperties?: number;
  maxProperties?: number;
  dependencies?: Record<string, string[] | JsonSchema>;
  dependentRequired?: Record<string, string[]>;
  dependentSchemas?: Record<string, JsonSchema>;
  title?: string;
  description?: string;
  default?: unknown;
  [key: string]: unknown;
}

export interface JsonSchemaArray {
  type?: "array";
  items?: JsonSchema | JsonSchema[];
  additionalItems?: boolean | JsonSchema;
  contains?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  title?: string;
  description?: string;
  default?: unknown;
  [key: string]: unknown;
}

export interface JsonSchemaRef {
  $ref?: string;
  $id?: string;
  $defs?: Record<string, JsonSchema>;
  definitions?: Record<string, JsonSchema>;
  [key: string]: unknown;
}

/** Request schema aspects. Each field uses {@link JsonSchema} (objects, arrays, primitives, $ref). */
export interface RequestSchemas {
  body?: JsonSchema;
  query?: JsonSchema;
  headers?: JsonSchema;
  cookies?: JsonSchema;
}

/** Response schema aspects. Each schema field uses {@link JsonSchema}. */
export interface ResponseSchemas {
  body?: JsonSchema;
  statusCodes?: number[];
  headers?: JsonSchema;
  cookies?: JsonSchema;
}

/**
 * Single contract: one API endpoint with optional schemas for payload and response aspects.
 * Request/response schema fields use the JSON Schema types above ({@link JsonSchema},
 * {@link JsonSchemaObject}, {@link JsonSchemaArray}, {@link JsonSchemaRef}, etc.).
 * Covers body, query, headers, cookies, status.
 */
export interface ContractDefinition {
  method: string;
  path: string;
  label?: string;

  /** Request aspects (all optional). Schemas follow {@link JsonSchema}. */
  request?: RequestSchemas;

  /** Response aspects (all optional). Schemas follow {@link JsonSchema}. */
  response?: ResponseSchemas;
}

/**
 * Result of defineContractConfig(): array of contracts the package uses for validation.
 */
export interface ContractValidatorConfig {
  /** Frontend dev server port (e.g. 3000, 4200). Used to know which origin to listen for. */
  port?: number;
  contracts: ContractDefinition[];
}
