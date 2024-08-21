import { DeleteResult, InferIdType, UpdateResult, WithId } from 'mongodb';

export interface IRepository<T extends Document> {
  save(doc: unknown): Promise<WithId<T>>;

  findById(id: InferIdType<T>): Promise<WithId<T> | null>;

  updateById(id: InferIdType<T>, changes: Partial<T>): Promise<UpdateResult<T>>;

  deleteById(id: InferIdType<T>): Promise<DeleteResult>;
}
