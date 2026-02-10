/**
 * Shared types for the HTTP interceptor module.
 * Consumed by interceptors, serializer, and Core Engine (validator, storage, dashboard).
 * @see DEVELOPMENT_PLAN.md (Module 6: Event System, Flow 1: Request/Response Capture)
 * @see types.md for full list of payload/response aspects we capture.
 */

// ---------------------------------------------------------------------------
// Body kind (categorizes request/response body for types.md coverage)
// ---------------------------------------------------------------------------

export type BodyKind =
  | "empty"
  | "text"
  | "json"
  | "xml"
  | "yaml"
  | "csv"
  | "html"
  | "markdown"
  | "form"
  | "multipart"
  | "binary"
  | "stream"
  | "graphql"
  | "unknown";

// ---------------------------------------------------------------------------
// Parsed URL components (protocol, host, port, path, query, fragment)
// ---------------------------------------------------------------------------

export interface ParsedUrl {
  /** Protocol/scheme (e.g. "http:", "https:"). */
  protocol: string;
  /** Hostname. */
  host: string;
  /** Port as string (e.g. "443"); empty if default. */
  port: string;
  /** Pathname (no query or hash). */
  pathname: string;
  /** Query string including "?" or "". */
  search: string;
  /** Parsed query parameters. */
  queryParams: Record<string, string | string[]>;
  /** Fragment including "#" or "". */
  fragment: string;
}

// ---------------------------------------------------------------------------
// Captured request/response (interceptor output)
// ---------------------------------------------------------------------------

/**
 * Normalized snapshot of an HTTP request as captured by the interceptor.
 * Captures all payload aspects from types.md: method, URL parts, headers, cookies, body, body kind.
 */
export interface CapturedRequest {
  /** HTTP method (e.g. GET, POST). */
  method: string;
  /** Full request URL. */
  url: string;
  /** Parsed URL: protocol (scheme), host, port, pathname, query params, fragment. */
  urlParts: ParsedUrl;
  /** Request headers as a plain object. */
  headers: Record<string, string>;
  /** Parsed cookies from Cookie header. */
  cookies: Record<string, string>;
  /** Request body: parsed JSON, serialized FormData, text, or opaque. */
  body: unknown;
  /** Categorized body type (json, text, form, multipart, binary, stream, etc.). */
  bodyKind: BodyKind;
  /** Capture time (e.g. Date.now()). */
  timestamp: number;
  /** Optional id for pairing with CapturedResponse. */
  requestId?: string;
}

/**
 * Normalized snapshot of an HTTP response as captured by the interceptor.
 * Captures all response aspects from types.md: status, headers, cookies, body, derived headers.
 */
export interface CapturedResponse {
  /** HTTP status code. */
  status: number;
  /** Status message (reason phrase). */
  statusText: string;
  /** Response headers as a plain object. */
  headers: Record<string, string>;
  /** Parsed cookies from Set-Cookie (last value per name for simple capture). */
  cookies: Record<string, string>;
  /** Response body: parsed or text or binary descriptor. */
  body: unknown;
  /** Categorized body type. */
  bodyKind: BodyKind;
  /** Capture time (e.g. Date.now()). */
  timestamp: number;
  /** Optional duration in milliseconds. */
  durationMs?: number;
  /** Optional id for pairing with CapturedRequest. */
  requestId?: string;
  /** Content-Type header value (convenience). */
  contentType?: string;
  /** Content-Length header value (convenience). */
  contentLength?: string;
  /** Content-Encoding header (encoding/compression). */
  contentEncoding?: string;
  /** Cache-Control header (cache directives). */
  cacheControl?: string;
  /** CORS-related headers (Access-Control-*). */
  corsHeaders?: Record<string, string>;
  /** Location header (redirect location). */
  redirectLocation?: string;
  /** HTTP protocol version when available (e.g. "HTTP/1.1"). */
  protocolVersion?: string;
}

// ---------------------------------------------------------------------------
// Event names (single source of truth for interceptor events)
// ---------------------------------------------------------------------------

export const INTERCEPTOR_REQUEST = "interceptor:request" as const;
export const INTERCEPTOR_RESPONSE = "interceptor:response" as const;
export const INTERCEPTOR_ERROR = "interceptor:error" as const;

export type InterceptorEventName =
  | typeof INTERCEPTOR_REQUEST
  | typeof INTERCEPTOR_RESPONSE
  | typeof INTERCEPTOR_ERROR;

// ---------------------------------------------------------------------------
// Event payload types (what the interceptor emits; what Core Engine subscribes to)
// ---------------------------------------------------------------------------

export interface InterceptorRequestPayload {
  request: CapturedRequest;
  timestamp: number;
}

export interface InterceptorResponsePayload {
  response: CapturedResponse;
  request?: CapturedRequest;
  timestamp: number;
}

export interface InterceptorErrorPayload {
  error: unknown;
  request?: CapturedRequest;
  timestamp: number;
}

/** Union of all interceptor event payloads for type-narrowing in subscribers. */
export type InterceptorEventPayload =
  | InterceptorRequestPayload
  | InterceptorResponsePayload
  | InterceptorErrorPayload;
