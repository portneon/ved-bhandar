import { inject, injectable } from "tsyringe";
import { ClientSession, Collection, Db, Document as MongoDocument, GridFSBucket, ObjectId } from "mongodb";
import { IFileStorage } from "../../domain/interfaces/IFileStorage.js";
import { TransactionContext } from "../../domain/interfaces/ITransactionManager.js";

@injectable()
export class MongoFileStorage implements IFileStorage {
  private readonly bucket: GridFSBucket;
  // GridFSBucket.delete() can't take a session, so the transactional path below
  // deletes from these underlying collections directly instead of via the bucket API.
  private readonly filesCollection: Collection<MongoDocument>;
  private readonly chunksCollection: Collection<MongoDocument>;

  constructor(@inject("Db") db: Db) {
    this.bucket = new GridFSBucket(db, { bucketName: "files" });
    this.filesCollection = db.collection("files.files");
    this.chunksCollection = db.collection("files.chunks");
  }

  async save(relativeKey: string, data: Buffer): Promise<string> {
    await this.deleteByFilename(relativeKey);
    await new Promise<void>((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(relativeKey);
      uploadStream.once("error", reject);
      uploadStream.once("finish", resolve);
      uploadStream.end(data);
    });
    return relativeKey;
  }

  async read(relativeKey: string): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      const downloadStream = this.bucket.openDownloadStreamByName(relativeKey);
      downloadStream.on("data", (chunk) => chunks.push(chunk));
      downloadStream.once("error", reject);
      downloadStream.once("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  getAbsolutePath(_relativeKey: string): string {
    throw new Error("MongoFileStorage does not support absolute paths");
  }

  async deleteContainingDir(relativeKey: string, ctx?: TransactionContext): Promise<void> {
    const session = ctx as ClientSession | undefined;
    const prefix = relativeKey.split("/")[0] + "/";
    const filter = { filename: { $regex: `^${escapeRegExp(prefix)}` } };
    const files = await this.filesCollection.find(filter, { session, projection: { _id: 1 } }).toArray();
    if (files.length === 0) return;
    const ids = files.map((file) => file._id as ObjectId);
    await this.chunksCollection.deleteMany({ files_id: { $in: ids } }, { session });
    await this.filesCollection.deleteMany({ _id: { $in: ids } }, { session });
  }

  private async deleteByFilename(filename: string): Promise<void> {
    const files = await this.bucket.find({ filename }).toArray();
    await Promise.all(files.map((file) => this.bucket.delete(file._id)));
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
