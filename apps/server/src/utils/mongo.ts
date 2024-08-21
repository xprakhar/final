import { injectable } from 'inversify';
import { MongoClient, ServerApiVersion } from 'mongodb';

@injectable()
export class MongoDBConnection {
  private client: MongoClient;

  private static dbName = process.env.DB_NAME || 'final_destination';

  constructor() {
    this.client = new MongoClient(process.env.DB_URI!, {
      compressors: ['zlib'],
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }

  async getClient() {
    return this.client.connect();
  }

  collection<T extends Document = Document>(name: string) {
    return this.client.db(MongoDBConnection.dbName).collection<T>(name);
  }
}
