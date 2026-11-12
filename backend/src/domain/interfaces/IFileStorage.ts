export interface IFileStorage {
  save(relativeKey: string, data: Buffer): Promise<string>;
  read(relativeKey: string): Promise<Buffer>;
  getAbsolutePath(relativeKey: string): string;
}
