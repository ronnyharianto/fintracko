import { StatusScreen } from "@/components/shared/status-screen";

/**
 * Global loading UI.
 *
 * Rendered instantly by the App Router while any segment in the tree is
 * streaming its server payload (`loading.tsx` is an immediate Suspense
 * fallback). Uses the landing-style [`StatusScreen`](src/components/shared/status-screen.tsx)
 * shell with a Tailwind `animate-spin` ring so the transient state matches
 * the product's teal gradient identity rather than a generic spinner.
 *
 * @remarks Pure Server Component — the spinner is pure CSS, so no client
 * boundary is required.
 */
export default function Loading() {
  return (
    <StatusScreen
      badge="Loading"
      title="One moment…"
      description="Fintracko is gathering your financial workspace. This should only take a second."
    >
      <div
        role="status"
        aria-label="Loading"
        className="mt-10 inline-flex h-10 w-10 animate-spin items-center justify-center rounded-full border-2 border-primary/20 border-t-primary align-middle"
      />
    </StatusScreen>
  );
}
