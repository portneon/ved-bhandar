import { injectable } from "tsyringe";
import { promises as fs } from "fs";
import path from "path";
import { IFileStorage } from "../../domain/interfaces/IFileStorage";

@injectable()
export class LocalFileStorage implements IFileStorage {
  private readonly rootDir: string;

  constructor() {
    this.rootDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "uploads");
  }

  async save(relativeKey: string, data: Buffer): Promise<string> {
    const fullPath = this.getAbsolutePath(relativeKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return relativeKey;
  }

  async read(relativeKey: string): Promise<Buffer> {
    return fs.readFile(this.getAbsolutePath(relativeKey));
  }

  getAbsolutePath(relativeKey: string): string {
    return path.join(this.rootDir, relativeKey);
  }

  async deleteContainingDir(relativeKey: string): Promise<void> {
    const dir = path.dirname(this.getAbsolutePath(relativeKey));
    if (dir === this.rootDir) return;
    await fs.rm(dir, { recursive: true, force: true });
  }
}
