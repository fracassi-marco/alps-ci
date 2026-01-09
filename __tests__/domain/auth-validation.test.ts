import { describe, it, expect } from 'bun:test';
import {
  validateEmail,
  validatePassword,
  validateTenantName,
  validateRole,
  generateSlug,
  ValidationError,
} from '@/domain/validation';

describe('Authentication Validation', () => {
  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(() => validateEmail('user@example.com')).not.toThrow();
      expect(() => validateEmail('test.user@domain.co.uk')).not.toThrow();
      expect(() => validateEmail('user+tag@example.com')).not.toThrow();
    });

    it('should reject invalid email addresses', () => {
      expect(() => validateEmail('')).toThrow(ValidationError);
      expect(() => validateEmail('   ')).toThrow(ValidationError);
      expect(() => validateEmail('notanemail')).toThrow(ValidationError);
      expect(() => validateEmail('@example.com')).toThrow(ValidationError);
      expect(() => validateEmail('user@')).toThrow(ValidationError);
      expect(() => validateEmail('user@domain')).toThrow(ValidationError);
    });

    it('should reject non-string values', () => {
      expect(() => validateEmail(null as any)).toThrow(ValidationError);
      expect(() => validateEmail(undefined as any)).toThrow(ValidationError);
      expect(() => validateEmail(123 as any)).toThrow(ValidationError);
    });
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      expect(() => validatePassword('password123')).not.toThrow();
      expect(() => validatePassword('MySecurePass!')).not.toThrow();
      expect(() => validatePassword('a'.repeat(128))).not.toThrow();
    });

    it('should reject passwords that are too short', () => {
      expect(() => validatePassword('')).toThrow(ValidationError);
      expect(() => validatePassword('short')).toThrow(ValidationError);
      expect(() => validatePassword('1234567')).toThrow(ValidationError);
    });

    it('should reject passwords that are too long', () => {
      expect(() => validatePassword('a'.repeat(129))).toThrow(ValidationError);
    });

    it('should reject non-string values', () => {
      expect(() => validatePassword(null as any)).toThrow(ValidationError);
      expect(() => validatePassword(undefined as any)).toThrow(ValidationError);
      expect(() => validatePassword(123 as any)).toThrow(ValidationError);
    });
  });

  describe('validateTenantName', () => {
    it('should accept valid tenant names', () => {
      expect(() => validateTenantName('Acme Corp')).not.toThrow();
      expect(() => validateTenantName('My Company')).not.toThrow();
      expect(() => validateTenantName('A')).not.toThrow();
    });

    it('should reject empty tenant names', () => {
      expect(() => validateTenantName('')).toThrow(ValidationError);
      expect(() => validateTenantName('   ')).toThrow(ValidationError);
    });

    it('should reject tenant names that are too long', () => {
      expect(() => validateTenantName('a'.repeat(101))).toThrow(ValidationError);
    });

    it('should reject non-string values', () => {
      expect(() => validateTenantName(null as any)).toThrow(ValidationError);
      expect(() => validateTenantName(undefined as any)).toThrow(ValidationError);
      expect(() => validateTenantName(123 as any)).toThrow(ValidationError);
    });
  });

  describe('validateRole', () => {
    it('should accept valid roles', () => {
      expect(() => validateRole('owner')).not.toThrow();
      expect(() => validateRole('admin')).not.toThrow();
      expect(() => validateRole('member')).not.toThrow();
    });

    it('should reject invalid roles', () => {
      expect(() => validateRole('')).toThrow(ValidationError);
      expect(() => validateRole('superuser')).toThrow(ValidationError);
      expect(() => validateRole('guest')).toThrow(ValidationError);
      expect(() => validateRole('OWNER')).toThrow(ValidationError);
    });
  });

  describe('generateSlug', () => {
    it('should generate valid slugs', () => {
      expect(generateSlug('Acme Corp')).toBe('acme-corp');
      expect(generateSlug('My Company Inc.')).toBe('my-company-inc');
      expect(generateSlug('Test  Multiple   Spaces')).toBe('test-multiple-spaces');
      expect(generateSlug('  Leading and Trailing  ')).toBe('leading-and-trailing');
    });

    it('should handle special characters', () => {
      expect(generateSlug('Company@2024')).toBe('company2024');
      expect(generateSlug('Test & Co.')).toBe('test-co');
      expect(generateSlug('name-with-hyphens')).toBe('name-with-hyphens');
    });

    it('should handle multiple consecutive hyphens', () => {
      expect(generateSlug('test---multiple---hyphens')).toBe('test-multiple-hyphens');
      expect(generateSlug('---leading---')).toBe('leading');
    });

    it('should handle unicode characters', () => {
      expect(generateSlug('Café Restaurant')).toBe('caf-restaurant');
      expect(generateSlug('Ñoño & Co')).toBe('oo-co');
    });
  });
});

