import { inject, injectable } from 'inversify';
import { Collection } from 'mongodb';
import { IRepository } from '../../interfaces/repository';
import { MongoDBConnection } from '../mongo';
import { TYPES } from '../../inversify-types';
import { hashPassword } from '../helpers';

export interface UserDocument extends Document {
  _id: string;
  password: string;
  salt: string;
  birthdate: Date;
  email: string;
}

export interface IUsersRepository extends IRepository<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
}

@injectable()
export class UsersRepository implements IUsersRepository {
  private static CollName = 'users';
  private db: MongoDBConnection;

  constructor(@inject(TYPES.MongoDBConn) conn: MongoDBConnection) {
    this.db = conn;
  }

  private getCollection(): Collection<UserDocument> {
    return this.db.collection<UserDocument>(UsersRepository.CollName);
  }

  async save({
    username,
    password,
    email,
    birthdate,
  }: {
    username: string;
    password: string;
    email: string;
    birthdate: Date;
  }) {
    const { hashed, salt } = await hashPassword(password);

    const savedDocument = {
      _id: username,
      password: hashed,
      salt,
      birthdate,
      email,
    };

    // Store user
    const result = await this.getCollection().insertOne(savedDocument);

    return { ...savedDocument, _id: result.insertedId };
  }

  async findById(id: string) {
    return this.getCollection().findOne({ _id: id });
  }

  async findByEmail(email: string) {
    return this.getCollection().findOne({ email });
  }

  async updateById(id: string, changes: Partial<UserDocument>) {
    const coll = this.getCollection();

    return coll.updateOne(
      { _id: id },
      {
        $set: {
          ...changes,
        },
      },
      { upsert: true },
    );
  }

  async deleteById(id: string) {
    return this.getCollection().deleteOne({ _id: id });
  }
}
