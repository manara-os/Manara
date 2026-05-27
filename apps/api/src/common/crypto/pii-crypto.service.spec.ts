import { PiiCryptoService } from './pii-crypto.service';
import { ConfigService } from '@nestjs/config';

describe('PiiCryptoService', () => {
  const cfg = new ConfigService({ PII_ENCRYPTION_KEY: 'test-key-32-chars-for-unit-testing!', PII_ENCRYPTION_SALT: 'test-salt-16-chr' });
  const crypto = new PiiCryptoService(cfg);

  it('roundtrips an Emirates ID', () => {
    const plain = '784-1990-1234567-1';
    const enc = crypto.encrypt(plain);
    expect(enc).not.toBe(plain);
    expect(crypto.decrypt(enc)).toBe(plain);
  });

  it('produces different ciphertexts for the same input (IV randomisation)', () => {
    const a = crypto.encrypt('secret');
    const b = crypto.encrypt('secret');
    expect(a).not.toBe(b);
  });

  it('mask preserves first/last 4', () => {
    expect(crypto.mask('AE070331003432423423423')).toMatch(/^AE07.*3423$/);
  });
});
