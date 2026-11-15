import { inject, injectable } from "tsyringe";
import { Collection, Db } from "mongodb";
import { BuilderConfig, Template, TemplateKind } from "../../../domain/entities/Template";
import { IQuestionPaperTemplateRepository } from "../../../domain/interfaces/repositories/IQuestionPaperTemplateRepository";

interface TemplateDoc {
  _id: string;
  userId: string;
  name: string;
  kind: TemplateKind;
  builderConfig: BuilderConfig | null;
  docxStoragePath: string | null;
  createdAt: Date;
}

@injectable()
export class MongoQuestionPaperTemplateRepository implements IQuestionPaperTemplateRepository {
  private readonly collection: Collection<TemplateDoc>;

  constructor(@inject("Db") db: Db) {
    this.collection = db.collection<TemplateDoc>("question_paper_templates");
  }

  async create(template: Template): Promise<Template> {
    await this.collection.insertOne(this.toDoc(template));
    return template;
  }

  async findById(id: string, userId: string): Promise<Template | null> {
    const doc = await this.collection.findOne({ _id: id, userId });
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(userId: string): Promise<Template[]> {
    const docs = await this.collection.find({ userId }).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  }

  private toDoc(template: Template): TemplateDoc {
    return {
      _id: template.id,
      userId: template.userId,
      name: template.name,
      kind: template.kind,
      builderConfig: template.builderConfig,
      docxStoragePath: template.docxStoragePath,
      createdAt: template.createdAt,
    };
  }

  private toDomain(doc: TemplateDoc): Template {
    return new Template(doc._id, doc.userId, doc.name, doc.kind, doc.builderConfig, doc.docxStoragePath, doc.createdAt);
  }
}
