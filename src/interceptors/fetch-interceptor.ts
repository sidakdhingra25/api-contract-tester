/**
 * Fetch interceptor: wraps global fetch to capture request/response and emit events.
 * Uses serializer for CapturedRequest/CapturedResponse; non-destructive (returns original response).
 * @see Step 3 plan; interceptor backend plan Section 4.2
 */

import {
  INTERCEPTOR_REQUEST,
  INTERCEPTOR_RESPONSE,
  INTERCEPTOR_ERROR,
  type InterceptorEventName,
  type InterceptorRequestPayload,
  type InterceptorResponsePayload,
  type InterceptorErrorPayload,
} from "../types";
import { serializeRequest, serializeResponse } from "./serializer";

type ListenerRequest = (payload: InterceptorRequestPayload) => void;
type ListenerResponse = (payload: InterceptorResponsePayload) => void;
type ListenerError = (payload: InterceptorErrorPayload) => void;

export interface FetchInterceptorOptions {
  /** If provided, all events are sent here instead of internal listeners. */
  emit?: (event: InterceptorEventName, payload: unknown) => void;
}

export class FetchInterceptor {
  private _originalFetch: typeof fetch | null = null;
  private _installed = false;
  private _listeners = new Map<
    InterceptorEventName,
    Set<ListenerRequest | ListenerResponse | ListenerError>
  >();
  private _customEmit: ((event: InterceptorEventName, payload: unknown) => void) | null = null;

  constructor(options?: FetchInterceptorOptions) {
    if (options?.emit) {
      this._customEmit = options.emit;
    }
  }

  /**
   * Replaces globalThis.fetch with the interceptor wrapper. Idempotent.
   */
  install(): void {
    if (this._installed) return;
    this._originalFetch = globalThis.fetch;
    globalThis.fetch = this._wrapFetch.bind(this);
    this._installed = true;
  }

  /**
   * Restores globalThis.fetch to the original. Idempotent.
   */
  uninstall(): void {
    if (!this._installed || this._originalFetch == null) return;
    globalThis.fetch = this._originalFetch;
    this._originalFetch = null;
    this._installed = false;
  }

  on(event: typeof INTERCEPTOR_REQUEST, callback: ListenerRequest): void;
  on(event: typeof INTERCEPTOR_RESPONSE, callback: ListenerResponse): void;
  on(event: typeof INTERCEPTOR_ERROR, callback: ListenerError): void;
  on(
    event: InterceptorEventName,
    callback: ListenerRequest | ListenerResponse | ListenerError
  ): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
  }

  off(event: InterceptorEventName, callback: ListenerRequest | ListenerResponse | ListenerError): void {
    this._listeners.get(event)?.delete(callback);
  }

  private _emit(event: InterceptorEventName, payload: unknown): void {
    if (this._customEmit) {
      this._customEmit(event, payload);
      return;
    }
    const callbacks = this._listeners.get(event);
    if (!callbacks?.size) return;
    callbacks.forEach((cb) => {
      queueMicrotask(() => {
        (cb as (p: unknown) => void)(payload);
      });
    });
  }

  private _wrapFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const requestStartTime = Date.now();
    const capturedRequest = serializeRequest(input, init);
    const requestPayload: InterceptorRequestPayload = {
      request: capturedRequest,
      timestamp: requestStartTime,
    };
    this._emit(INTERCEPTOR_REQUEST, requestPayload);

    const originalFetch = this._originalFetch!;
    return originalFetch(input, init).then(
      (response) => {
        serializeResponse(response, requestStartTime).then((capturedResponse) => {
          const responsePayload: InterceptorResponsePayload = {
            response: capturedResponse,
            request: capturedRequest,
            timestamp: Date.now(),
          };
          this._emit(INTERCEPTOR_RESPONSE, responsePayload);
        });
        return response;
      },
      (error) => {
        const errorPayload: InterceptorErrorPayload = {
          error,
          request: capturedRequest,
          timestamp: Date.now(),
        };
        this._emit(INTERCEPTOR_ERROR, errorPayload);
        throw error;
      }
    );
  }
}
