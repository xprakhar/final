import { inject, injectable } from 'inversify';
import { IRepository } from '../interfaces/repository';
import { MongoDBConnection } from '../utils/mongo';
import { TYPES } from '../inversify-types';
import { WithId } from 'mongodb';

export interface TokenBlacklistDocument extends Document {
  _id: string; // jti
  expiresAt: Date;
}

export interface ITokenBlacklistRepository
  extends IRepository<TokenBlacklistDocument> {
  save(doc: TokenBlacklistDocument): Promise<WithId<TokenBlacklistDocument>>;
}

@injectable()
export class TokenBlacklistRepository implements ITokenBlacklistRepository {
  private db: MongoDBConnection;

  constructor(@inject(TYPES.MongoDBConn) conn: MongoDBConnection) {
    this.db = conn;
  }

  private getCollection() {
    return this.db.collection<TokenBlacklistDocument>('token_blacklist');
  }

  async save(doc: TokenBlacklistDocument) {
    await this.getCollection().insertOne(doc);
    return doc;
  }

  findById(tokenId: string) {
    return this.getCollection().findOne({ _id: tokenId });
  }
  updateById(tokenId: string, diff: Partial<TokenBlacklistDocument>) {
    return this.getCollection().updateOne({ _id: tokenId }, { $set: diff });
  }

  deleteById(tokenId: string) {
    return this.getCollection().deleteOne({ _id: tokenId });
  }
}
