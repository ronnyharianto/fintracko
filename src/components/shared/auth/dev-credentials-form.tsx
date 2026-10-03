"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * DevCredentialsForm — email/password sign-in and sign-up for local
 * development only.
 *
 * Rendered by the `/account` Server Component exclusively when
 * `process.env.NODE_ENV === "development"` (see
 * `src/app/(auth)/account/page.tsx`), and only accepted by the server because
 * `emailAndPassword.enabled` in `src/lib/auth.ts` follows the same flag. In
 * production neither the form nor the credential endpoints exist.
 *
 * Calls Better Auth's `signIn.email` / `signUp.email` through the browser
 * client (`src/lib/auth-client.ts`) and hard-navigates to `/onboarding` on
 * success — the same landing the OAuth flow uses, which then redirects
 * completed users on to `/dashboard`.
 */
export function DevCredentialsForm({ className }: { className?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function switchMode(next: "signin" | "signup") {
    if (isSubmitting || next === mode) return;
    setMode(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } =
        mode === "signup"
          ? await authClient.signUp.email({
              name: name.trim(),
              email,
              password,
            })
          : await authClient.signIn.email({ email, password });

      if (error) {
        toast.error(error.message ?? "Authentication failed.");
        return;
      }

      // Refresh so the new session cookie is read by the server-rendered
      // onboarding layout, then navigate there.
      router.refresh();
      router.push("/onboarding");
    } catch {
      toast.error("An unexpected error occurred during authentication.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 font-medium uppercase tracking-wide text-muted-foreground">
            Development only
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Email sign-in mode">
        <Button
          type="button"
          variant={mode === "signin" ? "secondary" : "outline"}
          size="sm"
          role="tab"
          aria-selected={mode === "signin"}
          disabled={isSubmitting}
          onClick={() => switchMode("signin")}
          data-testid="dev-mode-signin"
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant={mode === "signup" ? "secondary" : "outline"}
          size="sm"
          role="tab"
          aria-selected={mode === "signup"}
          disabled={isSubmitting}
          onClick={() => switchMode("signup")}
          data-testid="dev-mode-signup"
        >
          Create account
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" ? (
          <div className="space-y-2">
            <Label htmlFor="dev-name">Name</Label>
            <Input
              id="dev-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Jane Doe"
              required
              disabled={isSubmitting}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="dev-email">Email</Label>
          <Input
            id="dev-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-password">Password</Label>
          <Input
            id="dev-password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            disabled={isSubmitting}
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
          data-testid="dev-credentials-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              {mode === "signup" ? "Creating account..." : "Signing in..."}
            </>
          ) : mode === "signup" ? (
            "Create account"
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Local development credentials only. Disabled in every other environment.
      </p>
    </div>
  );
}
