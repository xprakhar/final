import { inject, injectable } from 'inversify';
import { MongoDBConnection } from '../utils/mongo';
import { TYPES } from '../inversify-types';
import { IRepository } from '../interfaces/repository';
import { parseDuration } from '../utils/helpers';
import { UserDocument } from './users';
import { WithId } from 'mongodb';

export interface RefreshTokenDocument extends Document {
  _id: string;
  createdAt: Date;
  expiresAt: Date;
  user: UserDocument;
  status: 'active' | 'revoked';
}

export interface IRefreshTokenRepository
  extends IRepository<RefreshTokenDocument> {
  save(doc: {
    tokenId: string;
    user: UserDocument;
  }): Promise<WithId<RefreshTokenDocument>>;
  getExpiry(): Date;
}

@injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  public static readonly LIFETIME = '7d';

  private db: MongoDBConnection;

  constructor(@inject(TYPES.MongoDBConn) conn: MongoDBConnection) {
    this.db = conn;
  }

  private getCollection() {
    return this.db.collection<RefreshTokenDocument>('refresh_tokens');
  }

  getExpiry() {
    return new Date(
      Date.now() + parseDuration(RefreshTokenRepository.LIFETIME),
    );
  }

  async save(doc: { tokenId: string; user: UserDocument }) {
    const savedDocument: RefreshTokenDocument = {
      _id: doc.tokenId,
      createdAt: new Date(),
      expiresAt: this.getExpiry(),
      user: doc.user,
      status: 'active',
    };

    const result = await this.getCollection().insertOne(savedDocument);

    return { ...savedDocument, _id: result.insertedId };
  }

  findById(tokenId: string) {
    return this.getCollection().findOne({ _id: tokenId });
  }

  updateById(tokenId: string, diff: Partial<RefreshTokenDocument>) {
    return this.getCollection().updateOne({ _id: tokenId }, { $set: diff });
  }

  deleteById(tokenId: string) {
    return this.getCollection().deleteOne({ _id: tokenId });
  }
}
