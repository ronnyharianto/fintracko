/**
 * XSS-neutralizing sanitization helpers for REST API input payloads.
 *
 * Per docs/architecture/API_SPECS.md §2 "Global Security & Gateway Pipeline"
 * and docs/core/AGENT_RULES.md §3 "Anti-XSS in Rendering":
 *
 *   "Input fields susceptible to rich text or custom entries must be
 *    rigorously sanitized using trusted libraries (e.g. `isomorphic-dompurify`)
 *    to completely neutralize Cross-Site Scripting (XSS) vectors before
 *    passing into Prisma queries."
 *
 * `isomorphic-dompurify` runs DOMPurify either against the jsdom window (on
 * the server, our Route Handler runtime) or the real `window` (in the
 * browser); we only ever invoke these helpers server-side from Route Handlers,
 * so the jsdom fallback is what actually backs the sanitization here.
 *
 * Design notes:
 *   - All helpers are pure functions of their input — no I/O, no Promises —
 *     so they compose trivially inside the request pipeline.
 *   - We use a *stripped* DOMPurify config: no tags, no attributes. The
 *     sanitizable fields in this codebase (bio, description, payeePayer, etc.)
 *     are plain free-form text fields, NOT rich-text areas, so the safest
 *     contract is to strip ALL markup. A future task adding a rich-text
 *     field may introduce a dedicated allowlisted config and a separate
 *     entry point — do NOT relax this helpers' config in place.
 *   - The helpers deliberately never throw on malformed input: DOMPurify
 *     returns an empty string when it can't safely sanitize, and we treat
 *     `null`/`undefined` as a no-op passthrough so the Zod layer above
 *     remains the single source of "is this field required?" truth.
 */
import DOMPurify from "isomorphic-dompurify";

/**
 * DOMPurify config for plain text (no markup) sanitization.
 *
 * `ALLOWED_TAGS: []` requests DOMPurify to strip every tag, but DOMPurify
 * treats an empty array historically with version-specific quirks. To stay
 * forward-proof we rely on `ALLOWED_ATTR: []` plus `KEEP_CONTENT: true` so
 * the textual content survives while every element wrapper is removed, and
 * additionally force `FORBID_TAGS: ['style','script','iframe','object','embed','link']`
 * to guarantee the most dangerous vectors are dropped even if a future
 * DOMPurify default changes behavior around the empty-allowlist contract.
 */
const PLAIN_TEXT_CONFIG: {
  ALLOWED_TAGS: string[];
  ALLOWED_ATTR: string[];
  KEEP_CONTENT: true;
  FORBID_TAGS: string[];
  FORBID_ATTR: string[];
} = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "link"],
  FORBID_ATTR: ["style", "onerror", "onload", "onclick", "href"],
};

/**
 * Sanitize a single string value, stripping all HTML tags and event-handler
 * attributes.
 *
 * Behavior:
 *   - non-string input (`null`, `undefined`, numbers, booleans) is returned
 *     untouched — only fields declared as strings should ever be passed here.
 *   - empty string is returned as empty string (no spurious whitespace).
 *   - any `<script>` / `<iframe>` / on* attribute is stripped and only the
 *     surviving plain text is returned.
 */
export function sanitizeString(value: string): string;
export function sanitizeString(value: null | undefined): null | undefined;
export function sanitizeString(
  value: string | null | undefined,
): string | null | undefined;
export function sanitizeString(
  value: string | null | undefined,
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "string") {
    // Defensive guard: never silently coerce non-strings. The Zod schema
    // upstream should already have rejected such a payload, but we refuse to
    // mutate the value into a string here — pass it through so the ORM /
    // downstream code sees the type mismatch loudly.
    return value as unknown as string;
  }
  return DOMPurify.sanitize(value, PLAIN_TEXT_CONFIG) as string;
}

/**
 * Sanitize an array of strings (e.g. `FinancialTransaction.tags`).
 *
 * Non-array input is returned untouched. `null`/`undefined` array elements
 * are preserved as-is so the Zod-level optional handling remains canonical.
 */
export function sanitizeStringArray(
  value: ReadonlyArray<string | null | undefined> | null | undefined,
): Array<string | null | undefined> {
  if (!Array.isArray(value)) {
    return value as unknown as Array<string | null | undefined>;
  }
  return value.map((element) => sanitizeString(element as string));
}

/**
 * Walk a plain object and sanitize every string-topped leaf value.
 *
 * Used as a final safety net on a fully-parsed, Zod-validated payload:
 * every `string` leaf — including those nested inside arrays and objects —
 * is run through {@link sanitizeString}. Non-string leaves are passed
 * through untouched.
 *
 * Traversal guards:
 *   - Detects and refuses circular references (throws synchronously so the
 *     route handler's outer try/catch can convert it to a 500 envelope — a
 *     circular payload is an attacker signal, not a legitimate request).
 *   - Refuses to descend into `Date`, `RegExp`, `Map`, `Set`, `Buffer` or
 *     class instances: only "plain data" objects are walked.
 */
export function sanitizeObject<T>(payload: T): T {
  if (payload === null || payload === undefined) {
    return payload;
  }
  const visited = new WeakSet<object>();
  return walkAndSanitize(payload, visited) as T;
}

/**
 * Recursive worker for {@link sanitizeObject}. Public callers should use the
 * typed wrapper; this entry point is exported only for unit-level invocation
 * against internal edge cases.
 */
function walkAndSanitize<T>(node: T, visited: WeakSet<object>): T {
  if (node === null || node === undefined) {
    return node;
  }
  const type = typeof node;

  if (type === "string") {
    return sanitizeString(node as unknown as string) as unknown as T;
  }
  if (type !== "object") {
    // Numbers, booleans, bigints, symbols, functions are not XSS vectors.
    return node;
  }

  // Refuse to mutate Date / RegExp / class instances — sanitizing their
  // internal slots would silently corrupt their semantics.
  if (
    node instanceof Date ||
    node instanceof RegExp ||
    node instanceof Map ||
    node instanceof Set
  ) {
    return node;
  }

  if (visited.has(node as unknown as object)) {
    throw new Error(
      "Sanitization aborted: circular reference detected in payload.",
    );
  }
  visited.add(node as unknown as object);

  if (Array.isArray(node)) {
    return node.map((child) => walkAndSanitize(child, visited)) as unknown as T;
  }

  const clone: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    clone[key] =
      typeof value === "object" && value !== null
        ? walkAndSanitize(value, visited)
        : sanitizeString(value as unknown as string);
  }
  return clone as unknown as T;
}
