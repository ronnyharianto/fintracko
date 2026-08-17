/**
 * Shared workspace domain types (H4).
 *
 * These describe the shapes returned by the `/api/v1/workspaces` endpoints
 * (and their nested `members`). Previously each consuming client file
 * declared its own copy of `Member` / `Workspace`, which drifted — extract
 * them here so every consumer shares one contract.
 *
 * This module is client-safe: it contains type definitions only, with no
 * server-only imports, so it can be imported from Client Components.
 */

/** A workspace member with its nested user record. */
export interface WorkspaceMemberView {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

/**
 * Full owned-workspace shape returned by GET /api/v1/workspaces?owned=true
 * (service: `getOwnedWorkspaces`), including members and aggregate counts.
 */
export interface OwnedWorkspace {
  id: string;
  name: string;
  createdAt: string;
  members: WorkspaceMemberView[];
  _count: {
    accounts: number;
    transactions: number;
    budgets: number;
  };
}

/**
 * Slim workspace shape returned by GET /api/v1/workspaces (service:
 * `getUserWorkspaces`) — the user's membership list used by the workspace
 * switcher and context.
 */
export interface WorkspaceSummary {
  id: string;
  name: string;
  role: string;
}
