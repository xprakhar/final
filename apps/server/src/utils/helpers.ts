// duration-helper.ts
import * as crypto from 'node:crypto';
import * as util from 'node:util';

export function parseDuration(duration: string): number {
  const regex = /(\d+)([smhd])/g;
  let totalMilliseconds = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(duration)) !== null) {
    const value = Number(match[1]) || 0;
    const unit = match[2];

    switch (unit) {
      case 's': // seconds
        totalMilliseconds += value * 1000;
        break;
      case 'm': // minutes
        totalMilliseconds += value * 60 * 1000;
        break;
      case 'h': // hours
        totalMilliseconds += value * 60 * 60 * 1000;
        break;
      case 'd': // days
        totalMilliseconds += value * 24 * 60 * 60 * 1000;
        break;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }
  }

  if (totalMilliseconds === 0) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  return totalMilliseconds;
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
