/**
 * Zod schemas for workspace creation validation.
 *
 * Validate all incoming payloads using strict
 * Zod schema validation.
 */

import { z } from 'zod';
import { CurrencyEnum } from '@/features/onboarding/schemas';

/**
 * Workspace template name enum.
 */
export const WorkspaceTemplateEnum = z.enum([
  'PERSONAL',
  'FAMILY',
  'SMALL_BUSINESS',
]);

/**
 * Workspace name field validation.
 *
 * Shared by the create and update schemas (M2) so the name contract lives
 * in exactly one place — in the feature schemas module per AGENT_RULES §2.
 */
export const WorkspaceNameSchema = z
  .string()
  .min(1, 'Workspace name is required')
  .max(100, 'Workspace name must be at most 100 characters');

/**
 * Create workspace request schema.
 *
 * Validates the payload sent to POST /api/v1/workspaces.
 */
export const CreateWorkspaceSchema = z.object({
  name: WorkspaceNameSchema,
  templateName: WorkspaceTemplateEnum,
  /**
   * Optional currency override. When omitted, the server defaults the
   * workspace currency to the creator's profile currencyPreference
   * (PRD §3.2). Once created, the currency can never be changed.
   */
  currency: CurrencyEnum.optional(),
});

/**
 * Type inference from the schema.
 */
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceSchema>;

/**
 * Invite collaborator request schema.
 */
export const InviteCollaboratorSchema = z.object({
  email: z.email('Invalid email address'),
});

export type InviteCollaboratorInput = z.infer<typeof InviteCollaboratorSchema>;

/**
 * Accept/reject invitation request schema.
 * The invitation ID comes from the URL params, no body needed.
 */
export const InvitationIdParamSchema = z.object({
  id: z.uuid('Invalid invitation ID'),
});

export type InvitationIdParam = z.infer<typeof InvitationIdParamSchema>;
