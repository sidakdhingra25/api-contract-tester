/**
 * Single HTTP interceptor entry point.
 * Intercepts fetch() only (library-agnostic). Use createInterceptor() then install().
 */

import { FetchInterceptor } from "./interceptors/fetch-interceptor";
import type { FetchInterceptorOptions } from "./interceptors/fetch-interceptor";

// Re-export types and event names for one-stop imports
export type {
  CapturedRequest,
  CapturedResponse,
  ParsedUrl,
  BodyKind,
  InterceptorEventName,
  InterceptorRequestPayload,
  InterceptorResponsePayload,
  InterceptorErrorPayload,
  InterceptorEventPayload,
} from "./types";
export {
  INTERCEPTOR_REQUEST,
  INTERCEPTOR_RESPONSE,
  INTERCEPTOR_ERROR,
} from "./types";

/**
 * Creates the single HTTP interceptor. Call install() to start capturing fetch() calls.
 * @example
 * const interceptor = createInterceptor();
 * interceptor.install();
 * interceptor.on(INTERCEPTOR_RESPONSE, (p) => console.log(p.response));
 */
export function createInterceptor(options?: FetchInterceptorOptions): FetchInterceptor {
  return new FetchInterceptor(options);
}

/** Single interceptor (fetch-based). Use createInterceptor() or construct directly. */
export { FetchInterceptor as HttpInterceptor } from "./interceptors/fetch-interceptor";
