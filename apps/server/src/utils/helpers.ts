// duration-helper.ts
import * as crypto from 'node:crypto';
import * as util from 'node:util';

/**
 * Parses a duration string (e.g., "2h", "3d") into seconds.
 * @param duration - The duration string.
 * @returns The duration in seconds.
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  switch (unit) {
    case 's': // seconds
      return value * 1000;
    case 'm': // minutes
      return value * 60 * 1000;
    case 'h': // hours
      return value * 60 * 60 * 1000;
    case 'd': // days
      return value * 60 * 60 * 24 * 1000;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}

export async function hashPassword(
  value: string,
  salt?: string,
): Promise<{ hashed: string; salt: string }> {
  // Hash password
  const scryptAsync = util.promisify<
    crypto.BinaryLike,
    crypto.BinaryLike,
    number,
    Buffer
  >(crypto.scrypt);
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hashed = (await scryptAsync(value, salt, 64)).toString('hex');

  return { hashed, salt };
}

export function generateKeyPair() {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: process.env.PASSPHRASE,
    },
  });
}
