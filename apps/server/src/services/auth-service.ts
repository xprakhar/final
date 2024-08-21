import * as crypto from 'node:crypto';
import * as jose from 'jose';
import { inject, injectable } from 'inversify';
import { TYPES } from '../inversify-types';
import { logger } from '../utils/logger';
import * as helpers from '../utils/helpers';
import { type IKeysRepository } from '../utils/repos/keys-repo';
import type { IUsersRepository, UserDocument } from '../utils/repos/user-repo';
import type { IRefreshTokenRepository } from '../utils/repos/tokens-repo';
import { MongoServerError } from 'mongodb';

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export interface IAuthService {
  authenticate(token: string): Promise<UserDocument>;
  authorize(email: string, password: string): Promise<Tokens>;
  refreshAccessToken(refreshToken: string): Promise<Tokens>;
  revokeToken(refreshToken: string): Promise<void>;
}

@injectable()
export class AuthService implements IAuthService {
  private static readonly ISSUER = 'YourExpressServer';
  private static readonly AUDIENCE = 'YourReactSPA';
  private static readonly JWT_LIFE = '15m';

  private keysRepo: IKeysRepository;
  private usersRepo: IUsersRepository;
  private refreshTokenRepo: IRefreshTokenRepository;

  constructor(
    @inject<IKeysRepository>(TYPES.KeysRepo) keysRepo: IKeysRepository,
    @inject<IUsersRepository>(TYPES.UserRepo) usersRepo: IUsersRepository,
    @inject<IRefreshTokenRepository>(TYPES.RefreshTokenRepo)
    refreshTokenRepo: IRefreshTokenRepository,
  ) {
    this.keysRepo = keysRepo;
    this.usersRepo = usersRepo;
    this.refreshTokenRepo = refreshTokenRepo;
  }

  async generateAccessToken(claims: jose.JWTPayload) {
    try {
      let keyDocument = await this.keysRepo.findActivePair();

      if (!keyDocument || !keyDocument.privateKey) {
        const newKeyPair = helpers.generateKeyPair();
        keyDocument = await this.keysRepo.save(newKeyPair);
      }

      const privateKey = crypto.createPrivateKey({
        key: keyDocument.privateKey,
        format: 'pem',
        type: 'pkcs8',
        passphrase: process.env.PASSPHRASE,
      });

      const jti = crypto.randomUUID();
      const accessToken = await new jose.SignJWT({
        ...claims,
        aud: AuthService.AUDIENCE,
        iss: AuthService.ISSUER,
      })
        .setProtectedHeader({
          alg: 'RS256',
          typ: 'jwt',
          kid: keyDocument.kid,
          jti,
        })
        .setIssuedAt()
        .setExpirationTime(AuthService.JWT_LIFE)
        .sign(privateKey);

      return { accessToken, jti };
    } catch (e) {
      const error = e as Error;
      logger.log('error', `Failed to generate access token: ${error.message}`);
      throw new Error('Failed to generate access token', { cause: error });
    }
  }

  generateRefreshToken(sub: string) {
    try {
      const encryptionKey = Buffer.from(
        process.env.ENCRYPTION_KEY || '',
        'hex',
      );
      const iv = crypto.randomBytes(12);

      const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
      const encryptedToken = Buffer.concat([
        cipher.update(sub),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      return { refreshToken: encryptedToken, authTag, iv };
    } catch (e) {
      const error = e as Error;
      logger.log('error', `Failed to generate refresh token: ${error.message}`);
      throw new Error('Failed to generate refresh token', { cause: error });
    }
  }

  async authorize(email: string, password: string): Promise<Tokens> {
    try {
      const user = await this.usersRepo.findByEmail(email);
      if (!user) throw new Error('Invalid Username or Password');

      const { hashed: hashedPassword } = await helpers.hashPassword(
        password,
        user.salt,
      );

      if (hashedPassword !== user.password) {
        throw new Error('Invalid Username or Password');
      }

      const { accessToken, jti } = await this.generateAccessToken({
        sub: email,
      });
      const { refreshToken, authTag, iv } = this.generateRefreshToken(email);

      await this.refreshTokenRepo.save({
        jti,
        refreshToken: refreshToken.toString('hex'),
        authTag: authTag.toString('hex'),
        iv: iv.toString('hex'),
      });

      return { accessToken, refreshToken: refreshToken.toString('hex') };
    } catch (err) {
      const error = err as Error;
      helpers.logError(`Authorization Failed: ${error.message}`, error);

      if (err instanceof MongoServerError) {
        throw new Error('Authorization Failed due to database error');
      }

      throw err;
    }
  }

  async authenticate(token: string): Promise<UserDocument> {
    try {
      const jwks = await this.keysRepo.findJWKS();
      if (!jwks) {
        await this.revokeToken(token);
        throw new Error('Token was revoked, request a new one');
      }

      const resolver = jose.createLocalJWKSet(jwks);
      const options: jose.JWTVerifyOptions = {
        algorithms: ['RS256'],
        audience: AuthService.AUDIENCE,
        issuer: AuthService.ISSUER,
        clockTolerance: 60,
        maxTokenAge: AuthService.JWT_LIFE,
        requiredClaims: ['sub'],
      };

      const { payload, protectedHeader } = await jose
        .jwtVerify(token, resolver, options)
        .catch(async error => {
          if (error?.code === 'ERR_JWKS_MULTIPLE_MATCHING_KEYS') {
            for await (const publicKey of error) {
              try {
                return await jose.jwtVerify(token, publicKey, options);
              } catch (innerError) {
                if (
                  (innerError as jose.errors.JOSEError)?.code ===
                  'ERR_JWS_SIGNATURE_VERIFICATION_FAILED'
                ) {
                  continue;
                }
                throw innerError;
              }
            }
            throw new jose.errors.JWSSignatureVerificationFailed();
          }

          throw error;
        });

      if (protectedHeader.jti) {
        const doc = await this.refreshTokenRepo.findByJti(
          protectedHeader.jti as string,
        );
        if (doc && doc.status === 'revoked') {
          throw new jose.errors.JWTInvalid('The token was revoked');
        }
      }

      if (!payload.sub) {
        throw new jose.errors.JWTClaimValidationFailed(
          'sub (subject) claim must be present',
          payload,
        );
      }

      const user = await this.usersRepo.findByEmail(payload.sub);
      if (!user) {
        throw new jose.errors.JWTClaimValidationFailed(
          'sub (subject) claim is invalid',
          payload,
        );
      }

      return user;
    } catch (err) {
      const error = err as Error;
      helpers.logError(`Authentication Failed: ${error.message}`, error);

      if (err instanceof jose.errors.JOSEError) {
        throw new Error('Token verification failed');
      }

      if (err instanceof MongoServerError) {
        throw new Error('Authentication failed due to database error');
      }

      throw err;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<Tokens> {
    try {
      const tokenDoc = await this.refreshTokenRepo.findByToken(refreshToken);
      if (!tokenDoc || tokenDoc.status === 'revoked') {
        throw new Error('Invalid or Revoked refresh token');
      }

      const expiresAt = tokenDoc.expiresAt?.getTime() || 0;
      if (expiresAt < Date.now()) {
        throw new Error('Refresh token has expired');
      }

      const { refreshToken: encryptedToken, authTag, iv } = tokenDoc;
      const encryptionKey = Buffer.from(
        process.env.ENCRYPTION_KEY || '',
        'hex',
      );
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        encryptionKey,
        Buffer.from(iv, 'hex'),
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      const decryptedToken = Buffer.concat([
        decipher.update(Buffer.from(encryptedToken, 'hex')),
        decipher.final(),
      ]);

      const userEmail = decryptedToken.toString('utf-8');
      const user = await this.usersRepo.findByEmail(userEmail);

      if (!user) {
        throw new Error('Invalid refresh token');
      }

      const { accessToken } = await this.generateAccessToken({
        sub: userEmail,
      });

      return { accessToken, refreshToken };
    } catch (err) {
      const error = err as Error;
      helpers.logError(`Refresh Token Failed: ${error.message}`, error);

      if (err instanceof MongoServerError) {
        throw new Error('Refresh token failed due to database error');
      }

      if ('code' in error && error.code === 'ERR_CRYPTO_DECIPHER_FINAL') {
        throw new Error('Decryption of refresh token failed');
      }

      throw err;
    }
  }

  async revokeToken(jwt: string): Promise<void> {
    try {
      const protectedHeader = jose.decodeProtectedHeader(jwt);
      const result = await this.refreshTokenRepo.revokeByJti(
        protectedHeader.jti as string,
      );
      if (result.matchedCount === 0) {
        logger.log('warn', 'Refresh token not found or already revoked');
      } else {
        logger.log('info', 'Refresh token successfully revoked');
      }
    } catch (err) {
      const error = err as Error;
      helpers.logError(`Revoke Token Failed: ${error.message}`, error);

      if (err instanceof MongoServerError) {
        throw new Error('Revoke failed due to database error');
      }

      throw err;
    }
  }
}
