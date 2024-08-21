import * as crypto from 'node:crypto';
import * as jose from 'jose';
import { inject, injectable } from 'inversify';
import { ObjectId, Collection } from 'mongodb';
import { MongoDBConnection } from '../mongo';
import { TYPES } from '../../inversify-types';
import { IRepository } from '../../interfaces/repository';
import { parseDuration } from '../helpers';

export interface KeysDocument extends Document {
  kid: string; // Added kid field
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

  private getCollection(): Collection<KeysDocument> {
    return this.db.collection<KeysDocument>('auth_keys');
  }

  calcTTL() {
    return Date.now() + parseDuration(KeysRepository.LIFETIME);
  }

  calcCutOff() {
    return Date.now() - parseDuration(KeysRepository.LIFETIME);
  }

  async findJWKS(): Promise<jose.JSONWebKeySet | null> {
    const cursor = this.getCollection().find({}).project<{
      kid: string;
      publicKey: string;
    }>({ kid: true, publicKey: true, _id: false });

    const jwks: jose.JSONWebKeySet = { keys: [] };
    for await (const { kid, publicKey: publicKeyPem } of cursor) {
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
      kid: crypto.randomUUID(),
      createdAt: new Date(),
      expiresAt: new Date(this.calcTTL()),
    };

    const result = await this.getCollection().insertOne(savedDocument);
    return { _id: result.insertedId, ...savedDocument };
  }

  async findById(id: ObjectId) {
    return this.getCollection().findOne({ _id: id });
  }

  async findActivePair(): Promise<KeysDocument | null> {
    const life = parseDuration(KeysRepository.LIFETIME);
    return this.getCollection().findOne({
      expiresAt: { $gt: new Date(Date.now() - life) },
    });
  }

  async updateById(id: ObjectId, changes: Partial<KeysDocument>) {
    const coll = this.getCollection();

    return coll.updateOne(
      { _id: id },
      {
        $set: {
          ...changes,
        },
      },
    );
  }

  async deleteById(id: ObjectId) {
    return this.getCollection().deleteOne({ _id: id });
  }
}
