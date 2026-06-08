import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/server/auth/password';

describe('password hashing', () => {
  it('verifies the same password and rejects a different one', async () => {
    const hashed = await hashPassword('CorrectHorseBatteryStaple');
    await expect(verifyPassword('CorrectHorseBatteryStaple', hashed)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hashed)).resolves.toBe(false);
  });
});
