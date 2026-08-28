/**
 * Workspace service layer — barrel export.
 *
 * Re-exports all public functions from workspace CRUD and
 * membership/invitation modules so consumers can import from
 * `@/features/workspaces/services` as before.
 */

export {
  getUserWorkspaces,
  getOwnedWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from "./workspace";

export {
  inviteCollaborator,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  getPendingInvitations,
  removeCollaborator,
} from "./members";
