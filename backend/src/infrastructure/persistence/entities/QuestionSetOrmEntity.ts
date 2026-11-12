import { Entity, PrimaryColumn, Column, CreateDateColumn } from "typeorm";

@Entity({ name: "question_sets" })
export class QuestionSetOrmEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid", name: "document_id" })
  documentId!: string;

  @Column({ type: "varchar" })
  title!: string;

  @Column({ type: "varchar", default: "draft" })
  status!: "draft" | "generated" | "finalized";

  @Column({ type: "jsonb" })
  config!: Record<string, unknown>;

  @Column({ type: "varchar", name: "page_size", default: "A4" })
  pageSize!: "A4" | "LETTER" | "LEGAL";

  @Column({ type: "uuid", array: true, name: "page_ids" })
  pageIds!: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
