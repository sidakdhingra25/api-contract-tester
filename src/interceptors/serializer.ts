/**
 * Request/response serialization for the HTTP interceptor.
 * Normalizes Request/RequestInit and Response into CapturedRequest/CapturedResponse
 * with non-destructive body handling (clone response before reading).
 * Captures all payload/response aspects from types.md.
 * @see Step 2 plan; DEVELOPMENT_PLAN Stage 1.1
 */

import type {
  CapturedRequest,
  CapturedResponse,
  ParsedUrl,
  BodyKind,
} from "../types";

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

/**
 * Converts Headers or Record to a plain Record<string, string>.
 * If Headers, uses entries(); if already a record, returns a shallow copy.
 */
export function headersToRecord(
  headers: Headers | Record<string, string> | null | undefined
): Record<string, string> {
  if (headers == null) {
    return {};
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return { ...headers };
}

/**
 * Parses the string returned by XMLHttpRequest#getAllResponseHeaders()
 * (e.g. "Key: value\r\nKey2: value2") into Record<string, string>.
 */
export function parseResponseHeadersString(allHeaders: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!allHeaders || typeof allHeaders !== "string") return result;
  const lines = allHeaders.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// URL parsing (protocol, host, port, pathname, query params, fragment)
// ---------------------------------------------------------------------------

/**
 * Parses a URL into components. Uses base for relative URLs.
 */
export function parseUrl(url: string, base?: string): ParsedUrl {
  const empty: ParsedUrl = {
    protocol: "",
    host: "",
    port: "",
    pathname: "/",
    search: "",
    queryParams: {},
    fragment: "",
  };
  if (!url || typeof url !== "string") return empty;
  try {
    const u = new URL(url.trim(), base ?? "http://_");
    const queryParams: Record<string, string | string[]> = {};
    u.searchParams.forEach((value, key) => {
      const existing = queryParams[key];
      if (existing === undefined) {
        queryParams[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        queryParams[key] = [existing, value];
      }
    });
    return {
      protocol: u.protocol || "",
      host: u.hostname || "",
      port: u.port || "",
      pathname: u.pathname || "/",
      search: u.search || "",
      queryParams,
      fragment: u.hash || "",
    };
  } catch {
    const q = url.indexOf("?");
    const h = url.indexOf("#");
    const pathname = q === -1 && h === -1 ? url : url.slice(0, q >= 0 && (h < 0 || q < h) ? q : h);
    const search = q >= 0 ? (h >= 0 && h > q ? url.slice(q, h) : url.slice(q)) : "";
    const fragment = h >= 0 ? url.slice(h) : "";
    return { ...empty, pathname: pathname || "/", search, fragment };
  }
}

// ---------------------------------------------------------------------------
// Cookie parsing
// ---------------------------------------------------------------------------

/** Parses a single Cookie header value into key-value pairs. */
export function parseCookieHeader(cookieHeader: string | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader || typeof cookieHeader !== "string") return result;
  const pairs = cookieHeader.split(";").map((s) => s.trim());
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (key) result[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return result;
}

/** Parses Set-Cookie headers (multiple) into a single record (last value per name). */
export function parseSetCookieHeaders(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const setCookieKeys = Object.keys(headers).filter(
    (k) => k.toLowerCase() === "set-cookie"
  );
  for (const key of setCookieKeys) {
    const value = headers[key];
    if (typeof value !== "string") continue;
    const parts = value.split(/,(?=\s*\w+=)/);
    for (const part of parts) {
      const eq = part.trim().indexOf("=");
      if (eq === -1) continue;
      const name = part.trim().slice(0, eq).trim();
      const val = part.trim().slice(eq + 1).split(";")[0].trim();
      if (name) result[decodeURIComponent(name)] = decodeURIComponent(val);
    }
  }
  return result;
}

/** Gets response cookies when using Headers (getSetCookie if available). */
function getResponseCookiesFromHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  if (typeof headers.getSetCookie === "function") {
    for (const s of headers.getSetCookie()) {
      const eq = s.indexOf("=");
      if (eq === -1) continue;
      const name = s.trim().slice(0, eq).trim();
      const val = s.trim().slice(eq + 1).split(";")[0].trim();
      if (name) result[decodeURIComponent(name)] = decodeURIComponent(val);
    }
  } else {
    const v = headers.get("set-cookie") ?? headers.get("Set-Cookie");
    if (typeof v === "string") {
      const parsed = parseCookieHeader(v);
      Object.assign(result, parsed);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Body kind inference (from Content-Type and body shape)
// ---------------------------------------------------------------------------

function getContentTypeMedia(contentType: string | undefined): string {
  if (!contentType || typeof contentType !== "string") return "";
  return contentType.trim().toLowerCase().split(";")[0];
}

function inferBodyKindFromContentType(contentType: string | undefined): BodyKind {
  const media = getContentTypeMedia(contentType);
  if (!media) return "unknown";
  if (media === "application/json" || media === "application/json; charset=utf-8") return "json";
  if (media === "application/xml" || media === "text/xml") return "xml";
  if (media === "text/yaml" || media === "application/x-yaml" || media === "application/yaml") return "yaml";
  if (media === "text/csv") return "csv";
  if (media === "text/html") return "html";
  if (media === "text/markdown" || media === "text/x-markdown") return "markdown";
  if (media === "application/x-www-form-urlencoded") return "form";
  if (media.startsWith("multipart/")) return "multipart";
  if (media === "application/graphql" || media === "application/x-graphql") return "graphql";
  if (media.startsWith("text/")) return "text";
  if (
    media.startsWith("image/") ||
    media.startsWith("audio/") ||
    media.startsWith("video/") ||
    media === "application/pdf" ||
    media.startsWith("application/octet-stream")
  )
    return "binary";
  return "unknown";
}

/** Infers request body kind from content-type and parsed body / body source. */
export function inferRequestBodyKind(
  contentType: string | undefined,
  bodySource: BodyInit | null | undefined,
  parsedBody: unknown
): BodyKind {
  if (bodySource == null) return "empty";
  if (typeof (bodySource as ReadableStream).getReader === "function") return "stream";
  if (bodySource instanceof FormData) return "multipart";
  if (bodySource instanceof URLSearchParams) return "form";
  if (bodySource instanceof Blob || bodySource instanceof ArrayBuffer || ArrayBuffer.isView(bodySource))
    return "binary";
  const fromContentType = inferBodyKindFromContentType(contentType);
  if (fromContentType !== "unknown") return fromContentType;
  if (parsedBody == null) return "empty";
  if (typeof parsedBody === "string") return "text";
  if (typeof parsedBody === "object" && parsedBody !== null && !Array.isArray(parsedBody)) {
    const o = parsedBody as Record<string, unknown>;
    if (o["[Blob]"] || o["[ArrayBuffer]"] || o["[ArrayBufferView]"]) return "binary";
  }
  return "unknown";
}

/** Infers response body kind from content-type and parsed body. */
export function inferResponseBodyKind(
  contentType: string | undefined,
  parsedBody: unknown
): BodyKind {
  if (parsedBody == null) return "empty";
  const fromContentType = inferBodyKindFromContentType(contentType);
  if (fromContentType !== "unknown") return fromContentType;
  if (typeof parsedBody === "string") return "text";
  if (typeof parsedBody === "object" && parsedBody !== null) {
    const o = parsedBody as Record<string, unknown>;
    if (o["[Blob]"] || o["[Binary]"] || o.byteLength !== undefined) return "binary";
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// Request body parsing (does not consume or mutate the original body)
// ---------------------------------------------------------------------------

function getContentType(headers: Record<string, string>): string | undefined {
  const v = headers["content-type"] ?? headers["Content-Type"];
  return typeof v === "string" ? v : undefined;
}

function isJsonContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return contentType.trim().toLowerCase().startsWith("application/json");
}

/**
 * Parses request body for capture only. Does not consume or mutate the original.
 * - null/undefined → null
 * - JSON (by contentType or heuristic) string → parsed object or string on failure
 * - FormData → safe structure (fields + file descriptors)
 * - URLSearchParams → Record<string, string>
 * - Blob / ArrayBuffer / typed array → small descriptor to avoid large payloads
 * - ReadableStream → opaque (cannot read without consuming)
 */
export function parseBody(
  body: BodyInit | null | undefined,
  contentType?: string
): unknown {
  if (body == null) {
    return null;
  }

  if (typeof body === "string") {
    if (isJsonContentType(contentType)) {
      try {
        return JSON.parse(body) as unknown;
      } catch {
        return body;
      }
    }
    return body;
  }

  if (body instanceof URLSearchParams) {
    return Object.fromEntries(body.entries());
  }

  if (body instanceof FormData) {
    const result: Record<string, string | string[] | Array<{ name: string; type: string; size: number }>> = {};
    for (const [key, value] of body.entries()) {
      if (value instanceof File) {
        if (!Array.isArray(result[key])) result[key] = [];
        (result[key] as Array<{ name: string; type: string; size: number }>).push(
          { name: value.name, type: value.type, size: value.size }
        );
      } else {
        const existing = result[key];
        if (existing === undefined) {
          result[key] = value;
        } else if (Array.isArray(existing)) {
          (existing as string[]).push(value);
        } else {
          result[key] = [existing as string, value];
        }
      }
    }
    return result;
  }

  if (body instanceof Blob) {
    return { "[Blob]": true, type: body.type, size: body.size };
  }

  if (body instanceof ArrayBuffer) {
    return { "[ArrayBuffer]": true, byteLength: body.byteLength };
  }

  if (ArrayBuffer.isView(body)) {
    return { "[ArrayBufferView]": true, byteLength: body.byteLength };
  }

  if (typeof (body as ReadableStream).getReader === "function") {
    return "[ReadableStream]";
  }

  return "[unknown]";
}

// ---------------------------------------------------------------------------
// Request serialization
// ---------------------------------------------------------------------------

/**
 * Normalizes fetch-style input into CapturedRequest.
 * When the fetch interceptor calls this, it passes (input, init) before fetch;
 * init is the source of truth when available. For a Request instance, body is
 * one-shot readable—caller should pass body/headers from the point of capture.
 */
export function serializeRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): CapturedRequest {
  const isRequest = input instanceof Request;
  const url = isRequest ? input.url : String(input);
  const method = (isRequest ? input.method : init?.method) ?? "GET";
  const headersSource = isRequest ? input.headers : init?.headers;
  const headers = headersToRecord(
    headersSource as Headers | Record<string, string> | undefined
  );
  const contentType = getContentType(headers);
  const bodySource = isRequest ? input.body : init?.body;
  const body = parseBody(
    bodySource as BodyInit | null | undefined,
    contentType
  );
  const urlParts = parseUrl(url);
  const cookieHeader = headers["cookie"] ?? headers["Cookie"];
  const cookies = parseCookieHeader(cookieHeader);
  const bodyKind = inferRequestBodyKind(
    contentType,
    bodySource as BodyInit | null | undefined,
    body
  );

  return {
    method,
    url,
    urlParts,
    headers,
    cookies,
    body,
    bodyKind,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Response serialization (non-destructive: clone then read)
// ---------------------------------------------------------------------------

/**
 * Serializes a Response into CapturedResponse by cloning first, then reading
 * the clone. The original response is never consumed.
 * Captures status message, cookies, Content-Type, Content-Length, encoding,
 * cache, CORS, redirect location, and body kind.
 */
export async function serializeResponse(
  response: Response,
  requestStartTime?: number
): Promise<CapturedResponse> {
  const cloned = response.clone();
  const headers = headersToRecord(response.headers);
  const timestamp = Date.now();
  const durationMs =
    requestStartTime != null ? timestamp - requestStartTime : undefined;
  const contentType = headers["content-type"] ?? headers["Content-Type"];
  const contentLength = headers["content-length"] ?? headers["Content-Length"];
  const contentEncoding = headers["content-encoding"] ?? headers["Content-Encoding"];
  const cacheControl = headers["cache-control"] ?? headers["Cache-Control"];
  const location = headers["location"] ?? headers["Location"];
  const corsHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase().startsWith("access-control-")) corsHeaders[k] = v;
  }
  const cookies = getResponseCookiesFromHeaders(response.headers);

  let body: unknown;
  const media = getContentTypeMedia(contentType);
  const isBinaryResponse =
    media.startsWith("image/") ||
    media.startsWith("audio/") ||
    media.startsWith("video/") ||
    media === "application/pdf" ||
    media === "application/octet-stream";

  if (isBinaryResponse) {
    try {
      const buf = await cloned.arrayBuffer();
      body = { "[Binary]": true, contentType: media, size: buf.byteLength };
    } catch {
      body = null;
    }
  } else if (isJsonContentType(contentType)) {
    try {
      body = await cloned.json();
    } catch {
      try {
        body = await cloned.text();
      } catch {
        body = null;
      }
    }
  } else {
    try {
      body = await cloned.text();
    } catch {
      body = null;
    }
  }

  const bodyKind = inferResponseBodyKind(contentType, body);

  return {
    status: response.status,
    statusText: response.statusText || "",
    headers,
    cookies,
    body,
    bodyKind,
    timestamp,
    durationMs,
    contentType,
    contentLength,
    contentEncoding: contentEncoding || undefined,
    cacheControl: cacheControl || undefined,
    corsHeaders: Object.keys(corsHeaders).length ? corsHeaders : undefined,
    redirectLocation: location || undefined,
  };
}
