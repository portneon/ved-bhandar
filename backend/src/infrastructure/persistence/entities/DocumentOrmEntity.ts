import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

@Entity({ name: "documents" })
export class DocumentOrmEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "varchar" })
  title!: string;

  @Column({ type: "varchar", name: "original_filename" })
  originalFilename!: string;

  @Column({ type: "varchar", name: "storage_path" })
  storagePath!: string;

  @Column({ type: "int", name: "page_count", default: 0 })
  pageCount!: number;

  @Column({ type: "varchar", default: "processing" })
  status!: "processing" | "ready" | "failed";

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
