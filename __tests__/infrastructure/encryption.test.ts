import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { encrypt, decrypt } from '@/infrastructure/encryption';

describe('Encryption Service', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.ENCRYPTION_KEY;
    // Set a test encryption key (32 bytes = 64 hex characters)
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('encrypt', () => {
    it('should encrypt plaintext successfully', () => {
      const plaintext = 'my-secret-token';
      const ciphertext = encrypt(plaintext);

      expect(ciphertext).toBeTruthy();
      expect(ciphertext).toContain(':'); // Should contain separators
      const parts = ciphertext.split(':');
      expect(parts).toHaveLength(3); // iv:data:authTag
    });

    it('should generate unique IV for each encryption', () => {
      const plaintext = 'same-text';
      const ciphertext1 = encrypt(plaintext);
      const ciphertext2 = encrypt(plaintext);

      expect(ciphertext1).not.toBe(ciphertext2);
      // IVs should be different
      const iv1 = ciphertext1.split(':')[0];
      const iv2 = ciphertext2.split(':')[0];
      expect(iv1).not.toBe(iv2);
    });

    it('should throw error if encryption key is missing', () => {
      delete process.env.ENCRYPTION_KEY;

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('should throw error if encryption key has wrong length', () => {
      process.env.ENCRYPTION_KEY = 'short';

      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be 64 hex characters');
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext successfully', () => {
      const plaintext = 'my-secret-token';
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = 'ghp_1234567890ABCDEFabcdef!@#$%^&*()';
      const ciphertext = encrypt(plaintext);
      const decrypted = decrypt(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error with invalid ciphertext format', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid ciphertext format');
      expect(() => decrypt('only:two')).toThrow('Invalid ciphertext format');
      expect(() => decrypt('')).toThrow('Invalid ciphertext format');
    });

    it('should throw error with corrupted ciphertext', () => {
      const plaintext = 'test';
      const ciphertext = encrypt(plaintext);
      const parts = ciphertext.split(':');
      // Corrupt the auth tag (last part)
      const corruptedTag = parts[2]!.slice(0, -4) + 'XXXX';
      const corrupted = `${parts[0]}:${parts[1]}:${corruptedTag}`;

      expect(() => decrypt(corrupted)).toThrow('Decryption failed');
    });

    it('should throw error with wrong encryption key', () => {
      const plaintext = 'test';
      const ciphertext = encrypt(plaintext);

      // Change the key
      process.env.ENCRYPTION_KEY = 'b'.repeat(64);

      expect(() => decrypt(ciphertext)).toThrow('Decryption failed');
    });

    it('should throw error if encryption key is missing during decryption', () => {
      const plaintext = 'test';
      const ciphertext = encrypt(plaintext);

      delete process.env.ENCRYPTION_KEY;

      expect(() => decrypt(ciphertext)).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('encrypt/decrypt round-trip', () => {
    it('should successfully round-trip various strings', () => {
      const testCases = [
        'simple',
        'with spaces',
        'with-special-chars!@#$%',
        '🏔️ emoji',
        'a'.repeat(1000), // Long string
        '', // Empty string
      ];

      for (const plaintext of testCases) {
        const ciphertext = encrypt(plaintext);
        const decrypted = decrypt(ciphertext);
        expect(decrypted).toBe(plaintext);
      }
    });
  });
});

