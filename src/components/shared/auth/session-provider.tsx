"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface SessionContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

async function fetchSessionUser(): Promise<AuthUser | null> {
  const response = await authClient.getSession();
  const sessionUser = response?.data?.user;

  return sessionUser
    ? {
        id: sessionUser.id,
        name: sessionUser.name || "",
        email: sessionUser.email || "",
        image: sessionUser.image || null,
      }
    : null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      setUser(await fetchSessionUser());
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchSessionUser()
      .then((nextUser) => {
        if (!cancelled) setUser(nextUser);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // `apiFetch` signals session expiry (401 from any private endpoint) via a
  // browser event because it has no router access. Leaving through the router
  // keeps the navigation sanctioned and lets the session-aware root route
  // decide between the marketing page and the app.
  useEffect(() => {
    const handleSessionExpired = () => {
      // replace, not push: the dead-session screen must not stay in history
      void router.replace("/");
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [router]);

  return (
    <SessionContext.Provider value={{ user, isLoading, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return context;
}
