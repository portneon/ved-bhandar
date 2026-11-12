export type DocumentStatus = "processing" | "ready" | "failed";

export class Document {
  constructor(
    public readonly id: string,
    public title: string,
    public readonly originalFilename: string,
    public readonly storagePath: string,
    public pageCount: number,
    public status: DocumentStatus,
    public readonly createdAt: Date,
  ) {}
}
