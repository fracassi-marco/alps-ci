import crypto from 'crypto';

/**
 * Encryption service for sensitive data using AES-256-GCM
 * Encryption key must be set in ENCRYPTION_KEY environment variable
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Generate with: openssl rand -hex 32');
  }

  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypts plaintext using AES-256-GCM
 * Returns format: {iv}:{encryptedData}:{authTag} (base64 encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Return format: iv:encryptedData:authTag (all base64)
  return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
}

/**
 * Decrypts ciphertext encrypted with encrypt()
 * Expects format: {iv}:{encryptedData}:{authTag} (base64 encoded)
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format. Expected: iv:data:tag');
  }

  const [ivB64, encryptedB64, authTagB64] = parts;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivB64!, 'base64');
    const encrypted = Buffer.from(encryptedB64!, 'base64');
    const authTag = Buffer.from(authTagB64!, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    // Re-throw key validation errors as-is
    if (error instanceof Error && error.message.includes('ENCRYPTION_KEY')) {
      throw error;
    }
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

