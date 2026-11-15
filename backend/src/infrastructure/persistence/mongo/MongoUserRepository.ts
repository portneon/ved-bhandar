import { inject, injectable } from "tsyringe";
import { Collection, Db } from "mongodb";
import { User } from "../../../domain/entities/User";
import { IUserRepository } from "../../../domain/interfaces/repositories/IUserRepository";

interface UserDoc {
  _id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

@injectable()
export class MongoUserRepository implements IUserRepository {
  private readonly collection: Collection<UserDoc>;

  constructor(@inject("Db") db: Db) {
    this.collection = db.collection<UserDoc>("users");
  }

  async create(user: User): Promise<User> {
    await this.collection.insertOne(this.toDoc(user));
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.collection.findOne({ email });
    return doc ? this.toDomain(doc) : null;
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.collection.findOne({ _id: id });
    return doc ? this.toDomain(doc) : null;
  }

  private toDoc(user: User): UserDoc {
    return {
      _id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
    };
  }

  private toDomain(doc: UserDoc): User {
    return new User(doc._id, doc.email, doc.name, doc.passwordHash, doc.createdAt);
  }
}
