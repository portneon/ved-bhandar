import { inject, injectable } from "tsyringe";
import { Db, GridFSBucket } from "mongodb";

/**
 * Vercel's serverless functions reject request bodies over ~4.5MB, so large
 * book PDFs can't be uploaded in a single request. The frontend splits them
 * into chunks and POSTs each one separately; this reassembles them once all
 * chunks have arrived, using a scratch GridFS bucket as transient storage
 * (each chunk is its own request/invocation, so nothing can be held in memory
 * across requests).
 */
@injectable()
export class ChunkedUploadService {
  private readonly bucket: GridFSBucket;

  constructor(@inject("Db") db: Db) {
    this.bucket = new GridFSBucket(db, { bucketName: "upload_chunks" });
  }

  async saveChunk(uploadId: string, index: number, data: Buffer): Promise<void> {
    const filename = this.chunkFilename(uploadId, index);
    await new Promise<void>((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(filename);
      uploadStream.once("error", reject);
      uploadStream.once("finish", resolve);
      uploadStream.end(data);
    });
  }

  async assembleAndCleanup(uploadId: string, chunkCount: number): Promise<Buffer> {
    const buffers: Buffer[] = [];
    for (let index = 0; index < chunkCount; index++) {
      buffers.push(await this.readChunk(uploadId, index));
    }
    await this.cleanup(uploadId);
    return Buffer.concat(buffers);
  }

  private async readChunk(uploadId: string, index: number): Promise<Buffer> {
    const filename = this.chunkFilename(uploadId, index);
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      const downloadStream = this.bucket.openDownloadStreamByName(filename);
      downloadStream.on("data", (chunk) => chunks.push(chunk));
      downloadStream.once("error", reject);
      downloadStream.once("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  private async cleanup(uploadId: string): Promise<void> {
    const prefix = `${uploadId}/`;
    const files = await this.bucket.find({ filename: { $regex: `^${escapeRegExp(prefix)}` } }).toArray();
    await Promise.all(files.map((file) => this.bucket.delete(file._id)));
  }

  private chunkFilename(uploadId: string, index: number): string {
    return `${uploadId}/${String(index).padStart(6, "0")}`;
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
