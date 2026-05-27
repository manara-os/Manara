import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Field-level AES-256-GCM encryption for sensitive PII (Emirates ID, passport, IBAN, salary).
 *
 * Required env:
 *   PII_ENCRYPTION_KEY   — 32+ char secret (in production: rotate via KMS)
 *   PII_ENCRYPTION_SALT  — 16+ char salt
 *
 * Output format: base64(iv | authTag | ciphertext)
 *
 * Usage:
 *   const enc = piiCrypto.encrypt('784-1990-1234567-1');
 *   const dec = piiCrypto.decrypt(enc);
 */
@Injectable()
export class PiiCryptoService {
  private readonly log = new Logger(PiiCryptoService.name);
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(config: ConfigService) {
    const secret = config.get<string>('PII_ENCRYPTION_KEY');
    const salt = config.get<string>('PII_ENCRYPTION_SALT');
    if (!secret || !salt) {
      this.log.warn('PII_ENCRYPTION_KEY / PII_ENCRYPTION_SALT not configured — using dev-only key (NOT FOR PRODUCTION)');
      this.key = scryptSync('manara-dev-only-key', 'manara-dev-salt', 32);
    } else {
      this.key = scryptSync(secret, salt, 32);
    }
  }

  encrypt(plain: string): string {
    if (!plain) return plain;
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    if (!payload) return payload;
    try {
      const buf = Buffer.from(payload, 'base64');
      const iv = buf.subarray(0, 12);
      const authTag = buf.subarray(12, 28);
      const ciphertext = buf.subarray(28);
      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch (e: any) {
      this.log.error(`PII decrypt failed — returning masked value: ${e.message}`);
      return '***DECRYPT_FAILED***';
    }
  }

  /** Mask the last N-4 chars for display: 784-1990-1234567-1 → 784-1990-***-1 */
  mask(plain: string): string {
    if (!plain) return plain;
    if (plain.length <= 4) return '****';
    return plain.slice(0, 4) + '*'.repeat(plain.length - 8) + plain.slice(-4);
  }
}
