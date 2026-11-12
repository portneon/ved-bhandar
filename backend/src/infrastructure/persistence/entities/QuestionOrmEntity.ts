import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity({ name: "questions" })
@Index(["questionSetId", "orderIndex"])
export class QuestionOrmEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "uuid", name: "question_set_id" })
  questionSetId!: string;

  @Column({ type: "int", name: "order_index" })
  orderIndex!: number;

  @Column({ type: "varchar" })
  type!: "mcq" | "short_answer" | "long_answer";

  @Column({ type: "text" })
  prompt!: string;

  @Column({ type: "jsonb", nullable: true })
  options!: string[] | null;

  @Column({ type: "text", name: "correct_answer", nullable: true })
  correctAnswer!: string | null;

  @Column({ type: "float", nullable: true })
  marks!: number | null;
}
