import * as crypto from 'node:crypto';
import * as jose from 'jose';
import { TYPES } from '../inversify-types';
import { inject, injectable } from 'inversify';
import { nanoid } from 'nanoid';
import { AppError, ErrorCodes } from '../utils/errors/errors';

import { logger } from '../utils/logger';
import * as helpers from '../utils/helpers';
import { type IKeysRepository } from '../repos/auth-keys';
import { type IUsersRepository, UserDocument } from '../repos/users';
import { type IRefreshTokenRepository } from '../repos/refresh-token';
import { type ITokenBlacklistRepository } from '../repos/token-blacklist';

type KeyPairData = {
  publicKey: crypto.KeyObject;
  privateKey: crypto.KeyObject;
  pairId: string;
};

export interface IAuthService {
  authenticate(token: string): Promise<UserDocument>;
  authorize(email: string, password: string): Promise<Array<string>>;
  refreshAccessToken(refreshToken: string): Promise<string>;

  revokeTokens(refreshToken: string, accessToken?: string): Promise<void>;
}

@injectable()
export class AuthService implements IAuthService {
  private static readonly ISSUER = 'YourExpressServer';
  private static readonly AUDIENCE = 'YourReactSPA';
  public static readonly JWT_LIFE = '15m';

  private keysRepo: IKeysRepository;
  private usersRepo: IUsersRepository;
  private refreshTokenRepo: IRefreshTokenRepository;
  private tokenBlacklistRepo: ITokenBlacklistRepository;

  constructor(
    @inject<IKeysRepository>(TYPES.KeysRepo) keysRepo: IKeysRepository,
    @inject<IUsersRepository>(TYPES.UserRepo) usersRepo: IUsersRepository,
    @inject<IRefreshTokenRepository>(TYPES.RefreshTokenRepo)
    refreshTokenRepo: IRefreshTokenRepository,
    @inject<ITokenBlacklistRepository>(TYPES.TokenBlacklistRepo)
    tokenBlacklistRepo: ITokenBlacklistRepository,
  ) {
    this.keysRepo = keysRepo;
    this.usersRepo = usersRepo;
    this.refreshTokenRepo = refreshTokenRepo;
    this.tokenBlacklistRepo = tokenBlacklistRepo;
  }

  private async performBasicAuth(email: string, password: string) {
    const user = await this.usersRepo.findByEmail(email);
    if (!user)
      throw new AppError(
        ErrorCodes.BasicAuthFailed,
        'Invalid username or password',
      );

    const { hashed: hashedPassword } = await helpers.hashPassword(
      password,
      user.salt,
    );

    if (hashedPassword !== user.password)
      throw new AppError(
        ErrorCodes.BasicAuthFailed,
        'Invalid username or password',
      );

    return user;
  }

  private async retrieveOrCreateKeyPair() {
    let keyDocument = await this.keysRepo.findActivePair();

    if (!keyDocument || !keyDocument.privateKey) {
      const newKeyPair = helpers.generateKeyPair();
      keyDocument = await this.keysRepo.save(newKeyPair);
    }

    return {
      publicKey: crypto.createPublicKey({
        key: keyDocument.publicKey,
        format: 'pem',
        type: 'spki',
      }),
      privateKey: crypto.createPrivateKey({
        key: keyDocument.privateKey,
        format: 'pem',
        type: 'pkcs8',
        passphrase: process.env.PASSPHRASE,
      }),
      pairId: keyDocument._id,
    };
  }

  private async issueAccessToken(
    tokenLife: string | number | Date,
    claims: jose.JWTPayload,
    { publicKey, privateKey, pairId }: KeyPairData,
  ) {
    const tokenId = crypto.randomUUID();

    try {
      // Attempt to sign the JWT
      const jwt = await new jose.SignJWT({
        ...claims,
      })
        .setProtectedHeader({
          alg: 'RS256',
          typ: 'JWT',
          kid: pairId,
        })
        .setIssuer(AuthService.ISSUER)
        .setAudience(AuthService.AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(tokenLife)
        .setJti(tokenId)
        .sign(privateKey);

      // Encode the signed JWT
      const encode = TextEncoder.prototype.encode.bind(new TextEncoder());

      // Attempt to encrypt the signed JWT
      const jwe = await new jose.CompactEncrypt(encode(jwt))
        .setProtectedHeader({
          alg: 'RSA-OAEP-256',
          enc: 'A256GCM',
          cty: 'JWT',
          typ: 'JWE',
          kid: pairId,
        })
        .encrypt(publicKey);

      return jwe;
    } catch (error) {
      logger.error('Error while issuing access token', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        tokenId,
      });

      // General fallback for other errors
      throw new AppError(
        ErrorCodes.Unknown,
        'An error occurred issuing refresh token',
      );
    }
  }

  private async issueRefreshToken(
    user: UserDocument,
    { publicKey, privateKey, pairId }: KeyPairData,
  ) {
    const tokenId = nanoid();
    console.log(tokenId);
    try {
      await this.refreshTokenRepo.save({
        tokenId,
        user,
      });

      const encode = TextEncoder.prototype.encode.bind(new TextEncoder());

      const jws = await new jose.CompactSign(encode(tokenId))
        .setProtectedHeader({
          alg: 'RS256',
          typ: 'JWS',
          kid: pairId,
        })
        .sign(privateKey);

      const jwe = await new jose.CompactEncrypt(encode(jws))
        .setProtectedHeader({
          alg: 'RSA-OAEP-256',
          enc: 'A256GCM',
          cty: 'JWS',
          typ: 'JWE',
          kid: pairId,
        })
        .encrypt(publicKey);

      return jwe;
    } catch (error) {
      logger.error('Error while issuing refresh token', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        tokenId,
      });

      throw new AppError(
        ErrorCodes.Unknown,
        'An error occurred issuing refresh token',
      );
    }
  }

  async authorize(email: string, password: string) {
    const [user, keyPair] = await Promise.all([
      this.performBasicAuth(email, password),
      this.retrieveOrCreateKeyPair(),
    ]);

    const [accessToken, refreshToken] = await Promise.all([
      this.issueAccessToken(AuthService.JWT_LIFE, { sub: user.email }, keyPair),
      this.issueRefreshToken(user, keyPair),
    ]);

    return [accessToken, refreshToken];
  }

  private async decryptJWE(jwe: string, privateKey: crypto.KeyObject) {
    try {
      const { plaintext: decryptedJwt } = await jose.compactDecrypt(
        jwe,
        privateKey,
      );
      return new TextDecoder().decode(decryptedJwt);
    } catch (err) {
      logger.error('Error while verifying access token', {
        error: (err as Error).message,
        stack: (err as Error).stack,
      });

      if (
        err instanceof jose.errors.JWEDecryptionFailed ||
        err instanceof jose.errors.JWEInvalid
      ) {
        throw new AppError(ErrorCodes.DecryptionFailed, err.message);
      }

      throw new AppError(ErrorCodes.TokenInvalid, 'Invalid token');
    }
  }

  private async verifySignature(jwt: string, publicKey: crypto.KeyObject) {
    try {
      return jose.jwtVerify(jwt, publicKey, {
        algorithms: ['RS256'],
        audience: AuthService.AUDIENCE,
        issuer: AuthService.ISSUER,
        clockTolerance: 60,
        maxTokenAge: AuthService.JWT_LIFE,
        requiredClaims: ['sub', 'jti'],
      });
    } catch (err) {
      logger.error('Error while verifying access token', {
        error: (err as Error).message,
        stack: (err as Error).stack,
      });

      if (err instanceof jose.errors.JWSSignatureVerificationFailed) {
        throw new AppError(ErrorCodes.SignatureVerificationFailed, err.message);
      }

      if (err instanceof jose.errors.JWTClaimValidationFailed) {
        throw new AppError(
          ErrorCodes.TokenClaimInvalid,
          `Token ${err.claim} validation failed: ${err.reason}`,
        );
      }

      if (err instanceof jose.errors.JWTExpired) {
        throw new AppError(ErrorCodes.TokenExpired, err.reason);
      }

      throw new AppError(ErrorCodes.TokenInvalid, 'Invalid token');
    }
  }
  private async checkTokenBlacklist(jti: string): Promise<void> {
    const blacklist = await this.tokenBlacklistRepo.findById(jti);
    if (blacklist) {
      throw new AppError(ErrorCodes.TokenRevoked, 'This token was revoked');
    }
  }

  private async verifyJWT(jwe: string, { publicKey, privateKey }: KeyPairData) {
    const decodedJwt = await this.decryptJWE(jwe, privateKey);

    const { payload, protectedHeader } = await this.verifySignature(
      decodedJwt,
      publicKey,
    );

    if (!payload.jti) {
      throw new AppError(
        ErrorCodes.TokenInvalid,
        'The token is missing one or more required claims [sub, jti]',
      );
    }
    await this.checkTokenBlacklist(payload.jti);

    const user = await this.usersRepo.findByEmail(payload.sub!);
    if (!user) {
      throw new AppError(
        ErrorCodes.TokenClaimInvalid,
        `subject (sub claim) is  invalid, ${payload.sub} does not exist`,
      );
    }

    return { payload, protectedHeader, user };
  }

  async authenticate(token: string) {
    const keyPair = await this.retrieveKeyPairFromKid(token);
    return (await this.verifyJWT(token, keyPair)).user;
  }

  private async verifyRefreshToken(
    refreshToken: string,
    { publicKey, privateKey }: KeyPairData,
  ) {
    const decodedJws = await this.decryptJWE(refreshToken, privateKey);

    const { payload } = await jose.compactVerify(decodedJws, publicKey, {
      algorithms: ['RS256'],
    });

    const now = new Date();
    const tokenId = new TextDecoder().decode(payload);
    const tokenRecord = await this.refreshTokenRepo.findById(tokenId);
    if (
      !tokenRecord ||
      tokenRecord.expiresAt <= now ||
      tokenRecord.status === 'revoked'
    ) {
      throw new AppError(
        ErrorCodes.TokenExpired,
        'This token is expired or revoked, request a new one',
      );
    }

    const updatedUser = await this.usersRepo.findByEmail(
      tokenRecord.user.email,
    );
    if (!updatedUser) {
      await this.refreshTokenRepo.updateById(tokenId, { status: 'revoked' });
      throw new AppError(ErrorCodes.TokenRevoked, 'Invalid token state');
    }
    await this.refreshTokenRepo.updateById(tokenId, { user: updatedUser });

    return {
      payload: tokenRecord,
      user: tokenRecord.user,
    };
  }

  private async retrieveKeyPairFromKid(jwe: string) {
    const jweHeader = jose.decodeProtectedHeader(jwe);
    const keyDocument = await this.keysRepo.findById(jweHeader.kid as string);

    if (!keyDocument || !keyDocument.privateKey) {
      throw new AppError(
        ErrorCodes.KeyNotFound,
        `Encryption key ${jweHeader.kid} not found`,
      );
    }

    return {
      publicKey: crypto.createPublicKey({
        key: keyDocument.publicKey,
        type: 'spki',
        format: 'pem',
      }),
      privateKey: crypto.createPrivateKey({
        key: keyDocument.privateKey,
        type: 'pkcs8',
        format: 'pem',
        passphrase: process.env.PASSPHRASE,
      }),
      pairId: keyDocument._id,
    } as KeyPairData;
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const keyPair = await this.retrieveKeyPairFromKid(refreshToken);
    const { user } = await this.verifyRefreshToken(refreshToken, keyPair);

    const keyPairData = await this.retrieveOrCreateKeyPair();

    return this.issueAccessToken(
      AuthService.JWT_LIFE,
      { sub: user.email },
      keyPairData,
    );
  }

  async revokeTokens(
    refreshToken: string,
    accessToken?: string,
  ): Promise<void> {
    const keyPairData = await this.retrieveKeyPairFromKid(refreshToken);
    const { payload } = await this.verifyRefreshToken(
      refreshToken,
      keyPairData,
    );

    await this.refreshTokenRepo.updateById(payload._id, {
      status: 'revoked',
    });

    if (accessToken) {
      const { payload } = await this.verifyJWT(accessToken, keyPairData);
      if (payload.jti) {
        const expiry = new Date(payload.exp || helpers.parseDuration('365d'));
        this.tokenBlacklistRepo.save({
          _id: payload.jti,
          expiresAt: expiry,
        });
      }
    }
  }
}
