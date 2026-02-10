/**
 * API contract monitoring – core package.
 * Single interceptor (fetch-based). Captures all fetch() calls (including axios when it uses fetch).
 *
 * Minimal setup: create contract-validator.config.ts with defineContractConfig + register(config),
 * then import that file once in your app entry (e.g. layout or _app). Use unregister() in cleanup if needed.
 */

export {
  createInterceptor,
  HttpInterceptor,
  INTERCEPTOR_REQUEST,
  INTERCEPTOR_RESPONSE,
  INTERCEPTOR_ERROR,
  type CapturedRequest,
  type CapturedResponse,
  type ParsedUrl,
  type BodyKind,
  type InterceptorEventName,
  type InterceptorRequestPayload,
  type InterceptorResponsePayload,
  type InterceptorErrorPayload,
  type InterceptorEventPayload,
} from "./interceptor";

export { register, unregister, type RegisterCleanup } from "./register";

export {
  CONTRACT_VALIDATOR_CONFIG_FILENAME,
  defineContractConfig,
  type ContractChain,
  type ContractDefinition,
  type ContractValidatorConfig,
  type JsonSchema,
} from "./config";

export {
  createContractValidator,
  pathnameFromUrl,
  matchPathPattern,
  findContract,
  validateWithSchema,
  formatViolationSummary,
  formatViolationMessage,
  logViolation,
  type CreateContractValidatorOptions,
  type ContractValidationResult,
  type ContractValidationKind,
  type SchemaValidationResult,
  type ValidationErrorItem,
} from "./validation";
