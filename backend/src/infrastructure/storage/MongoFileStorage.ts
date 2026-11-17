import { inject, injectable } from "tsyringe";
import { Db, GridFSBucket } from "mongodb";
import { IFileStorage } from "../../domain/interfaces/IFileStorage.js";

@injectable()
export class MongoFileStorage implements IFileStorage {
  private readonly bucket: GridFSBucket;

  constructor(@inject("Db") db: Db) {
    this.bucket = new GridFSBucket(db, { bucketName: "files" });
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

  async deleteContainingDir(relativeKey: string): Promise<void> {
    const prefix = relativeKey.split("/")[0] + "/";
    const files = await this.bucket.find({ filename: { $regex: `^${escapeRegExp(prefix)}` } }).toArray();
    await Promise.all(files.map((file) => this.bucket.delete(file._id)));
  }

  private async deleteByFilename(filename: string): Promise<void> {
    const files = await this.bucket.find({ filename }).toArray();
    await Promise.all(files.map((file) => this.bucket.delete(file._id)));
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
