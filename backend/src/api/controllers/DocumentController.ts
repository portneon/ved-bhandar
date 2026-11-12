import { injectable, inject } from "tsyringe";
import { Request, Response } from "express";
import { Document } from "../../domain/entities/Document";
import { DocumentUploadService } from "../../application/services/DocumentUploadService";
import { DocumentQueryService } from "../../application/services/DocumentQueryService";

@injectable()
export class DocumentController {
  constructor(
    @inject(DocumentUploadService) private readonly uploadService: DocumentUploadService,
    @inject(DocumentQueryService) private readonly queryService: DocumentQueryService,
  ) {}

  upload = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const title = (req.body.title as string | undefined)?.trim() || file.originalname.replace(/\.pdf$/i, "");
    const document = await this.uploadService.upload({
      originalFilename: file.originalname,
      title,
      buffer: file.buffer,
    });
    res.status(201).json(this.toDto(document));
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    const documents = await this.queryService.listDocuments();
    res.json(documents.map((document) => this.toDto(document)));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const document = await this.queryService.getDocument(req.params.id);
    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    res.json(this.toDto(document));
  };

  getPages = async (req: Request, res: Response): Promise<void> => {
    const document = await this.queryService.getDocument(req.params.id);
    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const pages = await this.queryService.getPages(req.params.id);
    res.json(
      pages.map((page) => ({
        id: page.id,
        pageNumber: page.pageNumber,
        thumbnailUrl: page.thumbnailPath ? `/files/${page.thumbnailPath}` : null,
      })),
    );
  };

  private toDto(document: Document) {
    return {
      id: document.id,
      title: document.title,
      originalFilename: document.originalFilename,
      pageCount: document.pageCount,
      status: document.status,
      createdAt: document.createdAt,
    };
  }
}
