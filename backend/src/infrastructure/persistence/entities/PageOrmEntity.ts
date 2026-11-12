import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity({ name: "pages" })
@Index(["documentId", "pageNumber"], { unique: true })
export class PageOrmEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid", name: "document_id" })
  documentId!: string;

  @Column({ type: "int", name: "page_number" })
  pageNumber!: number;

  @Column({ type: "varchar", name: "thumbnail_path", nullable: true })
  thumbnailPath!: string | null;

  @Column({ type: "text", name: "extracted_text", nullable: true })
  extractedText!: string | null;
}
