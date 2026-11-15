import { inject, injectable } from "tsyringe";
import { Collection, Db, Document as MongoDocument } from "mongodb";
import { Chunk, ChunkCatalogEntry, ChunkType, Modality } from "../../../domain/entities/Chunk";
import {
  ChunkFilter,
  ChunkTagPatch,
  IChunkRepository,
  PartnerSearchParams,
  ScoredChunk,
  VectorSearchParams,
} from "../../../domain/interfaces/repositories/IChunkRepository";

const VECTOR_INDEX_NAME = "chunks_vector_index";

interface ChunkDoc {
  _id: string;
  bookId: string;
  chapter: number;
  sectionPath: string;
  sectionTitle: string;
  page: number;
  pageEnd: number;
  order: number;
  text: string;
  type: ChunkType;
  maxBloom: number;
  keyTerms: string[];
  summary: string;
  confidence: number;
  cause: string | null;
  effect: string | null;
  modality: Modality | null;
  embedding: number[] | null;
}

function buildMongoFilter(filter: ChunkFilter): MongoDocument {
  const conditions: MongoDocument[] = [{ bookId: filter.bookId }];
  if (filter.chapters && filter.chapters.length > 0) {
    conditions.push({ chapter: { $in: filter.chapters } });
  }
  if (filter.pageRange) {
    conditions.push({ page: { $gte: filter.pageRange.from, $lte: filter.pageRange.to } });
  }
  conditions.push({ type: { $in: filter.types } });
  conditions.push({ maxBloom: { $gte: filter.minMaxBloom } });
  return { $and: conditions };
}

@injectable()
export class MongoChunkRepository implements IChunkRepository {
  private readonly collection: Collection<ChunkDoc>;

  constructor(@inject("Db") db: Db) {
    this.collection = db.collection<ChunkDoc>("chunks");
  }

  async insertMany(chunks: Chunk[]): Promise<void> {
    if (chunks.length === 0) return;
    await this.collection.insertMany(chunks.map((chunk) => this.toDoc(chunk)));
  }

  async findByBookId(bookId: string): Promise<Chunk[]> {
    const docs = await this.collection.find({ bookId }).sort({ order: 1 }).toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByIds(ids: string[]): Promise<Chunk[]> {
    if (ids.length === 0) return [];
    const docs = await this.collection.find({ _id: { $in: ids } }).toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async deleteByBookId(bookId: string): Promise<void> {
    await this.collection.deleteMany({ bookId });
  }

  async findCatalog(bookId: string, chapters: number[]): Promise<ChunkCatalogEntry[]> {
    const filter = chapters.length > 0 ? { bookId, chapter: { $in: chapters } } : { bookId };
    const docs = await this.collection
      .find(filter, {
        projection: { _id: 1, chapter: 1, sectionTitle: 1, page: 1, type: 1, maxBloom: 1, keyTerms: 1, summary: 1 },
      })
      .sort({ chapter: 1, order: 1 })
      .toArray();
    return docs
      .filter((doc) => doc.type !== "other" && doc.summary)
      .map((doc) => ({
        id: doc._id,
        chapter: doc.chapter,
        sectionTitle: doc.sectionTitle,
        page: doc.page,
        type: doc.type,
        maxBloom: doc.maxBloom,
        keyTerms: doc.keyTerms,
        summary: doc.summary,
      }));
  }

  async applyTag(id: string, tag: ChunkTagPatch): Promise<void> {
    await this.collection.updateOne({ _id: id }, { $set: { ...tag } });
  }

  async applyEmbedding(id: string, embedding: number[]): Promise<void> {
    await this.collection.updateOne({ _id: id }, { $set: { embedding } });
  }

  async sample(filter: ChunkFilter, limit: number): Promise<Chunk[]> {
    const docs = await this.collection
      .aggregate<ChunkDoc>([{ $match: buildMongoFilter(filter) }, { $sample: { size: limit } }])
      .toArray();
    return docs.map((doc) => this.toDomain(doc));
  }

  async vectorSearch(params: VectorSearchParams): Promise<ScoredChunk[]> {
    const docs = await this.collection
      .aggregate<ChunkDoc & { score: number }>([
        {
          $vectorSearch: {
            index: VECTOR_INDEX_NAME,
            path: "embedding",
            queryVector: params.queryVector,
            filter: buildMongoFilter(params.filter),
            numCandidates: params.numCandidates,
            limit: params.limit,
          },
        },
        { $addFields: { score: { $meta: "vectorSearchScore" } } },
      ])
      .toArray();
    return docs.map((doc) => ({ chunk: this.toDomain(doc), score: doc.score }));
  }

  async findPartner(params: PartnerSearchParams): Promise<Chunk | null> {
    const mongoFilter: MongoDocument = {
      $and: [{ bookId: params.bookId }, { chapter: { $in: params.chapters } }, { type: { $in: params.types } }],
    };
    const docs = await this.collection
      .aggregate<ChunkDoc>([
        {
          $vectorSearch: {
            index: VECTOR_INDEX_NAME,
            path: "embedding",
            queryVector: params.queryVector,
            filter: mongoFilter,
            numCandidates: 20,
            limit: 2,
          },
        },
      ])
      .toArray();
    const match = docs.find((doc) => doc._id !== params.excludeId);
    return match ? this.toDomain(match) : null;
  }

  private toDoc(chunk: Chunk): ChunkDoc {
    return {
      _id: chunk.id,
      bookId: chunk.bookId,
      chapter: chunk.chapter,
      sectionPath: chunk.sectionPath,
      sectionTitle: chunk.sectionTitle,
      page: chunk.page,
      pageEnd: chunk.pageEnd,
      order: chunk.order,
      text: chunk.text,
      type: chunk.type,
      maxBloom: chunk.maxBloom,
      keyTerms: chunk.keyTerms,
      summary: chunk.summary,
      confidence: chunk.confidence,
      cause: chunk.cause,
      effect: chunk.effect,
      modality: chunk.modality,
      embedding: chunk.embedding,
    };
  }

  private toDomain(doc: ChunkDoc): Chunk {
    return new Chunk(
      doc._id,
      doc.bookId,
      doc.chapter,
      doc.sectionPath,
      doc.sectionTitle,
      doc.page,
      doc.pageEnd,
      doc.order,
      doc.text,
      doc.type,
      doc.maxBloom,
      doc.keyTerms,
      doc.summary,
      doc.confidence,
      doc.cause,
      doc.effect,
      doc.modality,
      doc.embedding,
    );
  }
}
