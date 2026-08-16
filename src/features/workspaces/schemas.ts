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
 * Create workspace request schema.
 *
 * Validates the payload sent to POST /api/v1/workspaces.
 */
export const CreateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be at most 100 characters'),
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
  email: z.string().email('Invalid email address'),
});

export type InviteCollaboratorInput = z.infer<typeof InviteCollaboratorSchema>;
