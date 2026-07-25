/**
 * Unit tests for workspace creation Zod schemas.
 */

import { describe, it, expect } from 'vitest';
import { CreateWorkspaceSchema, WorkspaceTemplateEnum } from './schemas';

describe('Workspace Schemas', () => {
  describe('WorkspaceTemplateEnum', () => {
    it('should accept valid template names', () => {
      expect(WorkspaceTemplateEnum.parse('PERSONAL')).toBe('PERSONAL');
      expect(WorkspaceTemplateEnum.parse('FAMILY')).toBe('FAMILY');
      expect(WorkspaceTemplateEnum.parse('SMALL_BUSINESS')).toBe(
        'SMALL_BUSINESS'
      );
    });

    it('should reject invalid template names', () => {
      expect(() => WorkspaceTemplateEnum.parse('CORPORATE')).toThrow();
      expect(() => WorkspaceTemplateEnum.parse('')).toThrow();
    });
  });

  describe('CreateWorkspaceSchema', () => {
    it('should accept valid payload', () => {
      const validData = {
        name: 'My Business',
        templateName: 'SMALL_BUSINESS',
      };
      const result = CreateWorkspaceSchema.parse(validData);
      expect(result).toEqual(validData);
    });

    it('should reject empty workspace name', () => {
      const invalidData = {
        name: '',
        templateName: 'PERSONAL',
      };
      expect(() => CreateWorkspaceSchema.parse(invalidData)).toThrow();
    });

    it('should reject workspace name exceeding 100 characters', () => {
      const invalidData = {
        name: 'a'.repeat(101),
        templateName: 'FAMILY',
      };
      expect(() => CreateWorkspaceSchema.parse(invalidData)).toThrow();
    });

    it('should reject missing template name', () => {
      const invalidData = {
        name: 'My Workspace',
      };
      expect(() => CreateWorkspaceSchema.parse(invalidData)).toThrow();
    });
  });
});
