# api-contract-tester

API contract monitoring for the browser: intercepts `fetch`, captures request and response (URL, headers, cookies, body, etc.), and validates them against JSON Schema contracts. Violations are logged to the console and can be handled via an optional callback.

---

## What this package does

- **Intercepts `fetch`** – Replaces `globalThis.fetch` with a wrapper so every request and response is observed.
- **Captures payload and response** – For each request: method, URL (with parsed protocol, host, port, pathname, query, fragment), headers, cookies, body (JSON, form, text, or a descriptor for binary/streams), and a body kind (json, text, form, multipart, binary, stream, etc.). For each response: status, status text, headers, cookies, body, body kind, and derived fields (Content-Type, Content-Length, encoding, cache, CORS, redirect location).
- **Validates against contracts** – You define contracts (method + path pattern + optional request/response schemas). The validator matches each response to a contract and runs:
  - **Request (payload):** body, query params, headers, cookies (each against its JSON Schema when defined).
  - **Response:** body, status code (allowed list), headers, cookies (each against its schema when defined).
- **Reports violations** – When validation fails, the package logs a clear message (e.g. `GET /api/users response body: id: expected integer, received string`) and can call an optional `onViolation` callback.

All of this runs in the **browser**. The package does not run on the server unless you explicitly use it in a server context.

---

## Install

```bash
npm install api-contract-tester
```

---

## Setup: step-by-step

Follow these steps to run the package in your app:

1. **Create a contract config file** – Define your API contracts and call `register(config)` (see Step 1 below).
2. **Create the client provider** – Add a client component that imports the config so it runs in the browser (copy-paste file in Step 2).
3. **Wrap your app in the root layout** – Use the provider in `app/layout.tsx` (or `pages/_app.tsx`) so the config loads before any client-side `fetch` (see Step 3).

---

## Step 1: Contract config file

Create **`contract-validator.config.ts`** (or `.js`) in your project root (or next to your app entry):

```ts
import { defineContractConfig, register } from "api-contract-tester";

const UserSchema = {
  type: "object",
  properties: { id: { type: "integer" }, name: { type: "string" } },
  required: ["id", "name"],
};

const config = defineContractConfig((builder) => {
  builder.get("/api/users").response(UserSchema);
  builder.post("/api/users").body({ type: "object", required: ["name"], properties: { name: { type: "string" } } }).response(UserSchema);
  // optional: .query(), .requestHeaders(), .responseStatusCodes([200, 201]), etc.
});

register(config);
export default config;
```

- **`defineContractConfig(fn)`** – Builds the config object (array of contracts).
- **`register(config)`** – Installs the fetch interceptor and attaches the contract validator. Must run in the **browser** so that client-side `fetch` is patched.
- **`export default config`** – Optional; useful if other code imports the config.

---

## Step 2: Client provider (copy-paste)

Create a **client-only** component that imports your config so `register(config)` runs in the browser. Put this file in your components folder (e.g. `components/contract-monitor-provider.tsx`).

**Copy-paste the full file below.** If your contract config is not at the project root, change the config import path (e.g. use `@/contract-validator.config` if you use the `@` alias, or `../contract-validator.config` if this file lives in `components/` and the config is at the root).

```tsx
"use client";

import { useLayoutEffect } from "react";
import { unregister } from "api-contract-tester";
// Side effect: load config so register(config) runs in the browser (patches fetch)
import "../contract-validator.config"; // change path if needed (e.g. @/contract-validator.config)

export function ContractMonitorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    return () => unregister();
  }, []);

  return <>{children}</>;
}
```

---

## Step 3: Wrap your app in the root layout

In your **root layout** (`app/layout.tsx` or `pages/_app.tsx`), wrap `children` with `ContractMonitorProvider`. Adjust the provider import path to match your project (e.g. `@/components/contract-monitor-provider`).

```tsx
import { ContractMonitorProvider } from "@/components/contract-monitor-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ContractMonitorProvider>{children}</ContractMonitorProvider>
      </body>
    </html>
  );
}
```

**Important:** Do **not** import the contract config from the layout file if the layout is a Server Component. Import the config only from the client provider (Step 2) so that `register(config)` runs in the browser.

---

## Contract config API

- **Methods:** `get(path)`, `post(path)`, `put(path)`, `patch(path)`, `delete(path)`.
- **Request (payload):** `.body(schema)`, `.query(schema)`, `.requestHeaders(schema)`, `.requestCookies(schema)`.
- **Response:** `.response(schema)`, `.responseStatusCodes([200, 201])`, `.responseHeaders(schema)`, `.responseCookies(schema)`.
- **Other:** `.port(number)`, `.label(string)`.

Schemas are [JSON Schema](https://json-schema.org/) objects (e.g. `{ type: "object", properties: { ... }, required: [...] }`).

---

## Optional: handle violations in code

```ts
import { register } from "api-contract-tester";

register(config, {
  onViolation(result) {
    // result.kind: "request-body" | "request-query" | "response-body" | "response-status" | ...
    // result.errors, result.request, result.response
  },
});
```

---

## Optional: cleanup

To stop monitoring (e.g. in tests or when unmounting):

```ts
import { unregister } from "api-contract-tester";

unregister();
```

Or keep the return value of `register(config)` and call `.unregister()` on it.

---

## License

MIT
