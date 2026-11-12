export class Page {
  constructor(
    public readonly id: string,
    public readonly documentId: string,
    public readonly pageNumber: number,
    public thumbnailPath: string | null,
    public extractedText: string | null,
  ) {}
}
