import { injectable, inject } from "tsyringe";
import { DataSource, Repository } from "typeorm";
import { IQuestionRepository, QuestionPatch } from "../../../domain/interfaces/repositories/IQuestionRepository";
import { Question, QuestionType } from "../../../domain/entities/Question";
import { QuestionOrmEntity } from "../entities/QuestionOrmEntity";

@injectable()
export class TypeOrmQuestionRepository implements IQuestionRepository {
  private readonly repo: Repository<QuestionOrmEntity>;

  constructor(@inject("DataSource") dataSource: DataSource) {
    this.repo = dataSource.getRepository(QuestionOrmEntity);
  }

  async create(question: Question): Promise<Question> {
    const saved = await this.repo.save(this.repo.create(this.toRow(question)));
    return this.toDomain(saved);
  }

  async createMany(questions: Question[]): Promise<Question[]> {
    const rows = questions.map((question) => this.repo.create(this.toRow(question)));
    const saved = await this.repo.save(rows);
    return saved.map((row) => this.toDomain(row));
  }

  async findByQuestionSetId(questionSetId: string): Promise<Question[]> {
    const rows = await this.repo.find({ where: { questionSetId }, order: { orderIndex: "ASC" } });
    return rows.map((row) => this.toDomain(row));
  }

  async update(id: string, patch: QuestionPatch): Promise<void> {
    await this.repo.update({ id }, patch);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  private toRow(question: Question) {
    return {
      id: question.id,
      questionSetId: question.questionSetId,
      orderIndex: question.orderIndex,
      type: question.type,
      prompt: question.prompt,
      options: question.options,
      correctAnswer: question.correctAnswer,
      marks: question.marks,
    };
  }

  private toDomain(row: QuestionOrmEntity): Question {
    return new Question(row.id, row.questionSetId, row.orderIndex, row.type as QuestionType, row.prompt, row.options, row.correctAnswer, row.marks);
  }
}
