/**
 * Global test setup executed before every test file.
 *
 * Registers the custom DOM matchers shipped by @testing-library/jest-dom
 * (e.g. `toBeInTheDocument`, `toHaveTextContent`) so that React Testing
 * Library assertions work out of the box across all co-located *.test.ts(x)
 * suites per docs/core/AGENT_RULES.md §4.
 *
 * The matchers are attached to the global `expect` via the side-effect import.
 * With Vitest globals enabled in vitest.config.ts, `expect` is available here.
 */
import "@testing-library/jest-dom/vitest";
