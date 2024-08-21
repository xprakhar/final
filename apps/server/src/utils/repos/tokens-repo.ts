import { inject, injectable } from 'inversify';
import {
  Collection,
  DeleteResult,
  ObjectId,
  UpdateResult,
  WithId,
} from 'mongodb';
import { MongoDBConnection } from '../mongo';
import { TYPES } from '../../inversify-types';
import { IRepository } from '../../interfaces/repository';
import { parseDuration } from '../helpers';

export interface RefreshTokenDocument extends Document {
  jti: string;
  refreshToken: string;
  authTag: string;
  iv: string;
  status: 'alive' | 'revoked';
  createdAt: Date;
  expiresAt: Date;
}

type RefreshTokenSaveDoc = {
  jti: string;
  refreshToken: string;
  authTag: string;
  iv: string;
};

export interface IRefreshTokenRepository
  extends IRepository<RefreshTokenDocument> {
  findByToken(refreshToken: string): Promise<RefreshTokenDocument | null>;
  findByJti(jti: string): Promise<RefreshTokenDocument | null>;
  deleteByToken(refreshToken: string): Promise<DeleteResult>;
  revokeByJti(jti: string): Promise<UpdateResult<RefreshTokenDocument>>;
}

@injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  private static readonly LIFETIME = '7d';

  private db: MongoDBConnection;

  constructor(@inject(TYPES.MongoDBConn) conn: MongoDBConnection) {
    this.db = conn;
  }

  private getCollection(): Collection<RefreshTokenDocument> {
    return this.db.collection<RefreshTokenDocument>('refresh_tokens');
  }

  calcTTL() {
    return Date.now() + parseDuration(RefreshTokenRepository.LIFETIME);
  }

  async save(doc: RefreshTokenSaveDoc) {
    const savedDocument: RefreshTokenDocument = {
      ...doc,
      status: 'alive',
      createdAt: new Date(),
      expiresAt: new Date(this.calcTTL()),
    };

    const result = await this.getCollection().insertOne(savedDocument);

    return { ...savedDocument, _id: result.insertedId };
  }

  findByJti(jti: string): Promise<RefreshTokenDocument | null> {
    return this.getCollection().findOne({ jti });
  }

  findById(id: ObjectId): Promise<WithId<RefreshTokenDocument> | null> {
    return this.getCollection().findOne({ _id: id });
  }

  async findByToken(
    refreshToken: string,
  ): Promise<RefreshTokenDocument | null> {
    return this.getCollection().findOne({ refreshToken });
  }

  async deleteByToken(refreshToken: string): Promise<DeleteResult> {
    return this.getCollection().deleteOne({ refreshToken });
  }

  async revokeByJti(jti: string): Promise<UpdateResult<RefreshTokenDocument>> {
    return this.getCollection().updateOne(
      { jti, status: 'alive' },
      { $set: { status: 'revoked' } },
    );
  }

  updateById(
    id: ObjectId,
    changes: Partial<RefreshTokenDocument>,
  ): Promise<UpdateResult<RefreshTokenDocument>> {
    return this.getCollection().updateOne({ _id: id }, { $set: changes });
  }

  deleteById(id: ObjectId): Promise<DeleteResult> {
    return this.getCollection().deleteOne({ _id: id });
  }
}
