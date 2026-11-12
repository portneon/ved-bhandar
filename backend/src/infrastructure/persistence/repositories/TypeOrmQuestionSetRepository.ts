import { injectable, inject } from "tsyringe";
import { DataSource, Repository } from "typeorm";
import { IQuestionSetRepository, QuestionSetPatch } from "../../../domain/interfaces/repositories/IQuestionSetRepository";
import { QuestionSet, QuestionSetStatus, GenerationConfig } from "../../../domain/entities/QuestionSet";
import { QuestionSetOrmEntity } from "../entities/QuestionSetOrmEntity";

@injectable()
export class TypeOrmQuestionSetRepository implements IQuestionSetRepository {
  private readonly repo: Repository<QuestionSetOrmEntity>;

  constructor(@inject("DataSource") dataSource: DataSource) {
    this.repo = dataSource.getRepository(QuestionSetOrmEntity);
  }

  async create(questionSet: QuestionSet, pageIds: string[]): Promise<QuestionSet> {
    const row = this.repo.create({
      id: questionSet.id,
      documentId: questionSet.documentId,
      title: questionSet.title,
      status: questionSet.status,
      config: questionSet.config,
      pageSize: questionSet.pageSize,
      pageIds,
    });
    const saved = await this.repo.save(row);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<QuestionSet | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? this.toDomain(row) : null;
  }

  async updateStatus(id: string, status: QuestionSetStatus): Promise<void> {
    await this.repo.update({ id }, { status });
  }

  async update(id: string, patch: QuestionSetPatch): Promise<void> {
    await this.repo.update({ id }, patch);
  }

  private toDomain(row: QuestionSetOrmEntity): QuestionSet {
    return new QuestionSet(row.id, row.documentId, row.title, row.status, row.config as GenerationConfig, row.pageSize, row.createdAt);
  }
}
