# api-contract-tester

API contract monitoring for the browser: intercepts `fetch`, captures request and response (URL, headers, cookies, body, etc.), and validates them against JSON Schema contracts. Violations are logged to the console and can be handled via an optional callback.

---

## What this package does

- **Intercepts `fetch`** – Replaces `globalThis.fetch` with a wrapper so every request and response is observed.
- **Captures payload and response** – For each request: method, URL (with parsed protocol, host, port, pathname, query, fragment), headers, cookies, body (JSON, form, text, or a descriptor for binary/streams), and a body kind. For each response: status, status text, headers, cookies, body, body kind, and derived fields (Content-Type, Content-Length, encoding, cache, CORS, redirect location).
- **Validates against contracts** – You define contracts (method + path pattern + optional request/response schemas). The validator matches each response to a contract and runs:
  - **Request:** body, query params, headers, cookies (each against its JSON Schema when defined).
  - **Response:** body, status code (allowed list), headers, cookies (each against its schema when defined).
- **Reports violations** – When validation fails, the package logs a clear message and can call an optional `onViolation` callback.

All of this runs in the **browser**. The package does not run on the server unless you explicitly use it in a server context.

---

## Step 1: Install the package

```bash
npm install api-contract-tester
```

---

## Step 2: Create the config file

Create a file named **`contract-validator.config.ts`** (or `.js` / `.mjs` / `.cjs`) in your project root. This is the only config file the package looks for.

### Minimal example

```ts
import { defineContractConfig, register } from "api-contract-tester";

const UserSchema = {
  type: "object",
  properties: { id: { type: "integer" }, name: { type: "string" } },
  required: ["id", "name"],
};

const config = defineContractConfig((builder) => {
  builder.get("/api/users").response(UserSchema);
  builder
    .post("/api/users")
    .request({ type: "object", required: ["name"], properties: { name: { type: "string" } } })
    .response(UserSchema);
});

register(config);
export default config;
```

### How it works

- **`defineContractConfig(fn)`** – You pass a callback that receives a `builder`. Call `builder.get(path)`, `builder.post(path)`, etc., then chain `.request(schema)`, `.response(schema)`, and other methods to define one contract per endpoint.
- **`register(config)`** – Installs the fetch interceptor and attaches the contract validator. **Must run in the browser** (e.g. in a client component or after your app mounts in the browser). The package works as soon as `register(config)` runs; you do not need a React provider unless you want one.
- **`export default config`** – Optional; useful if another file imports the config.

#

---

## Contract config API (builder)

| Method | Description |
|--------|-------------|
| `get(path)`, `post(path)`, `put(path)`, `patch(path)`, `delete(path)` | Start a contract for that HTTP method and path (path can include params, e.g. `/api/users/:id`). |
| **Request** | |
| `.request(schema)` | Request body JSON Schema. |
| `.query(schema)` | Query string params schema (object-shaped). |
| `.requestHeaders(schema)` | Request headers schema (object-shaped). |
| `.requestCookies(schema)` | Request cookies schema (object-shaped). |
| **Response** | |
| `.response(schema)` | Response body JSON Schema. |
| `.responseStatusCodes(codes)` | Allowed status codes, e.g. `[200, 201]`. |
| `.responseHeaders(schema)` | Response headers schema (object-shaped). |
| `.responseCookies(schema)` | Response cookies schema (object-shaped). |
| **Other** | |
| `.port(number)` | Frontend dev server port (e.g. 3000, 4200). |
| `.label(string)` | Human-readable label for this contract. |

Schemas use the **JSON Schema** types and properties described below.

---

## Schema types and properties (reference)

When you define `.request(schema)`, `.response(schema)`, `.query(schema)`, `.requestHeaders(schema)`, etc., you use the package’s schema types. They follow a **JSON Schema (draft-07)** style subset.

### Top-level: `JsonSchema`

A schema can be any of:

- **Primitive** – string, number, integer, boolean, null (with optional constraints).
- **Object** – `type: "object"` with `properties`, `required`, etc.
- **Array** – `type: "array"` with `items`, `minItems`, etc.
- **Reference** – `$ref` to a definition in `$defs` or `definitions`.
- **Escape hatch** – Plain object for `allOf`, `anyOf`, `oneOf`, or other keywords not in the typed subset.

Use **object** schemas for query, headers, and cookies (key–value data). Use any schema type for **body** (object, array, or primitive).

---

### Primitive schema (`JsonSchemaPrimitive`)

For `type: "string"`, `"number"`, `"integer"`, `"boolean"`, or `"null"`.

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"string"` \| `"number"` \| `"integer"` \| `"boolean"` \| `"null"` | JSON type. |
| `enum` | `unknown[]` | Value must be one of these. |
| `const` | `unknown` | Value must equal this. |
| `format` | `string` | Hint (e.g. `"date-time"`, `"email"`). |
| **String** | | |
| `minLength` | `number` | Minimum string length. |
| `maxLength` | `number` | Maximum string length. |
| `pattern` | `string` | Regex the string must match. |
| **Number / integer** | | |
| `minimum` | `number` | Minimum (inclusive). |
| `maximum` | `number` | Maximum (inclusive). |
| `exclusiveMinimum` | `number` \| `boolean` | Exclusive minimum. |
| `exclusiveMaximum` | `number` \| `boolean` | Exclusive maximum. |
| `multipleOf` | `number` | Value must be a multiple of this. |
| **Meta** | | |
| `title` | `string` | Short title. |
| `description` | `string` | Description. |
| `default` | `unknown` | Default value. |
| `readOnly` | `boolean` | Read-only hint. |
| `writeOnly` | `boolean` | Write-only hint. |

---

### Object schema (`JsonSchemaObject`)

For `type: "object"` (and for query/headers/cookies, which are object-shaped).

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"object"` | Declares an object. |
| `properties` | `Record<string, JsonSchema>` | Map of property name → schema. Each key is a property; value is the schema for that property (can be nested object, array, or primitive). |
| `additionalProperties` | `boolean` \| `JsonSchema` | If `true`, any extra keys not in `properties` are allowed. If `false`, no extra keys. If a schema, extra keys must validate against that schema. |
| `patternProperties` | `Record<string, JsonSchema>` | Map of **regex pattern** → schema. Any property whose **name** matches a pattern must validate against the corresponding schema (e.g. `"^x-"` for custom headers). |
| `required` | `string[]` | List of property names that must be present. Missing any of these makes the object invalid. |
| `propertyNames` | `JsonSchema` | Schema that **all property names (keys)** must satisfy (e.g. `{ pattern: "^[a-z_]+$" }` for lowercase + underscore). |
| `minProperties` | `number` | Minimum number of properties the object must have. |
| `maxProperties` | `number` | Maximum number of properties the object may have. |
| `dependencies` | `Record<string, string[] \| JsonSchema>` | If a key is present, then either the listed property names must exist (`string[]`), or the object must validate against the given schema (`JsonSchema`). Draft-07 prefers `dependentRequired` / `dependentSchemas`. |
| `dependentRequired` | `Record<string, string[]>` | For each key: if **that** property is present, the **listed** properties must also be present (e.g. if `credit_card` exists, then `billing_address` is required). |
| `dependentSchemas` | `Record<string, JsonSchema>` | For each key: if that property is present, the **whole object** must also validate against the given schema. |
| `title` | `string` | Short title. |
| `description` | `string` | Description. |
| `default` | `unknown` | Default object value. |

**Example (request body):**

```ts
{
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
    age: { type: "integer", minimum: 0, maximum: 150 },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["name"],
  additionalProperties: false,
}
```

**Example (query params):**

```ts
{
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1 },
    limit: { type: "integer", minimum: 1, maximum: 100 },
  },
  required: ["page"],
}
```

---

### Array schema (`JsonSchemaArray`)

For `type: "array"`.

| Property | Type | Description |
|----------|------|-------------|
| `type` | `"array"` | Declares an array. |
| `items` | `JsonSchema` \| `JsonSchema[]` | Schema for each item (single schema for all items, or tuple of schemas by index). |
| `additionalItems` | `boolean` \| `JsonSchema` | When `items` is a tuple, whether extra items are allowed or must match this schema. |
| `contains` | `JsonSchema` | At least one item must match this schema. |
| `minItems` | `number` | Minimum number of items. |
| `maxItems` | `number` | Maximum number of items. |
| `uniqueItems` | `boolean` | All items must be unique. |
| `title`, `description`, `default` | | Same as above. |

---

### Reference schema (`JsonSchemaRef`)

For reusing definitions.

| Property | Type | Description |
|----------|------|-------------|
| `$ref` | `string` | Pointer to a definition, e.g. `"#/$defs/User"` or `"#/definitions/User"`. |
| `$id` | `string` | Optional identifier for this schema. |
| `$defs` | `Record<string, JsonSchema>` | Definitions (draft-07 style). |
| `definitions` | `Record<string, JsonSchema>` | Definitions (older style). |

**Example:**

```ts
const config = defineContractConfig((builder) => {
  builder.get("/api/users").response({
    $ref: "#/$defs/User",
    $defs: {
      User: {
        type: "object",
        properties: { id: { type: "integer" }, name: { type: "string" } },
        required: ["id", "name"],
      },
    },
  });
});
```

---

### Request and response schema aspects

- **Request:** `request` (body), `query`, `requestHeaders`, `requestCookies`. Body can be any `JsonSchema`; query, headers, and cookies are typically **object** schemas (key–value).
- **Response:** `response` (body), `responseStatusCodes`, `responseHeaders`, `responseCookies`. Same: body can be any schema; headers and cookies are typically object schemas.

---



## Running in the browser

The package can run **without** any provider. You only need to ensure `register(config)` is called in the browser before or when your app makes `fetch` calls. For example:

- **Option A:** Import the config from a **client-only** entry (e.g. a React client component that runs in the browser). The import runs the file, which calls `register(config)`.
- **Option B (optional):** Use the **client provider** below so the config is loaded in one place and unregistered on unmount. This is optional; use it only if you want that pattern.

---

## Optional: Client provider (React)

If you use React and want the config to load in a single client component and unregister on unmount, create a client-only component that imports your config:

```tsx
"use client";

import { useLayoutEffect } from "react";
import { unregister } from "api-contract-tester";
import "../contract-validator.config"; // or @/contract-validator.config

export function ContractMonitorProvider({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    return () => unregister();
  }, []);

  return <>{children}</>;
}
```

Then wrap your app (e.g. in `app/layout.tsx` or `pages/_app.tsx`):

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

**Note:** Do not import the contract config from a Server Component. Import it only from client code so `register(config)` runs in the browser.

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
