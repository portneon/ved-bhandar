import { Book } from "../entities/Book.js";
import { Generation } from "../entities/Generation.js";

export interface IGenerationExporter {
  readonly contentType: string;
  readonly fileExtension: string;
  export(generation: Generation, book: Book): Promise<Buffer>;
}
