import * as crypto from 'node:crypto';
import * as jose from 'jose';
import { inject, injectable } from 'inversify';
import { MongoDBConnection } from '../utils/mongo';
import { TYPES } from '../inversify-types';
import { IRepository } from '../interfaces/repository';
import { parseDuration } from '../utils/helpers';

export interface KeysDocument extends Document {
  _id: string;
  publicKey: string;
  privateKey: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface IKeysRepository extends IRepository<KeysDocument> {
  findJWKS(): Promise<jose.JSONWebKeySet | null>;
  findActivePair(): Promise<KeysDocument | null>;
}

@injectable()
export class KeysRepository implements IKeysRepository {
  private static readonly LIFETIME = '2h';

  private db: MongoDBConnection;

  constructor(@inject(TYPES.MongoDBConn) conn: MongoDBConnection) {
    this.db = conn;
  }

  private getCollection() {
    return this.db.collection<KeysDocument>('auth_keys');
  }

  private calcTTL() {
    return new Date(Date.now() + parseDuration(KeysRepository.LIFETIME));
  }

  async findJWKS(): Promise<jose.JSONWebKeySet | null> {
    const cursor = this.getCollection()
      .find({})
      .project<{ _id: string; publicKey: string }>({ publicKey: true });

    const jwks: jose.JSONWebKeySet = { keys: [] };
    for await (const { _id: kid, publicKey: publicKeyPem } of cursor) {
      const publicKey = crypto.createPublicKey({
        key: publicKeyPem,
        format: 'pem',
        type: 'spki',
      });

      const jwk = publicKey.export({ format: 'jwk' }) as jose.JWK;
      jwk.kid = kid; // Add the key ID to the JWK

      jwks.keys.push(jwk);
    }
    cursor.close();

    return jwks.keys.length <= 0 ? null : jwks;
  }

  async save({
    publicKey,
    privateKey,
  }: {
    publicKey: string;
    privateKey: string;
  }) {
    const savedDocument: KeysDocument = {
      publicKey,
      privateKey,
      _id: crypto.randomUUID(),
      createdAt: new Date(),
      expiresAt: this.calcTTL(),
    };

    await this.getCollection().insertOne(savedDocument);
    return savedDocument;
  }

  async findById(pairId: string) {
    return this.getCollection().findOne({ _id: pairId });
  }

  async findActivePair(): Promise<KeysDocument | null> {
    const life = parseDuration(KeysRepository.LIFETIME);
    return this.getCollection().findOne({
      expiresAt: { $gt: new Date(Date.now() - life) },
    });
  }

  async updateById(pairId: string, diff: Partial<KeysDocument>) {
    const coll = this.getCollection();

    return coll.updateOne(
      { _id: pairId },
      {
        $set: diff,
      },
    );
  }

  async deleteById(pairId: string) {
    return this.getCollection().deleteOne({ _id: pairId });
  }
}
