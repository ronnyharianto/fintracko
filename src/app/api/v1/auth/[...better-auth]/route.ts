/**
 * OAuth route handler — delegates all auth requests to Better Auth.
 *
 * Path: /api/v1/auth/[...better-auth]
 * Better Auth handles: sign-in, sign-out, session, OAuth callbacks.
 *
 * Per docs/architecture/API_SPECS.md §3.1, this route acts as the auth
 * gateway. It receives all requests to /api/v1/auth/* and forwards them
 * to the Better Auth handler which manages OAuth flows and sessions.
 */

import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

/**
 * GET handler — session retrieval and OAuth flow redirects.
 */
export async function GET(request: NextRequest) {
  return auth.handler(request);
}

/**
 * POST handler — sign-in, sign-out, token refresh, OAuth callbacks.
 */
export async function POST(request: NextRequest) {
  return auth.handler(request);
}