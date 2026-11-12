import { Book } from "../entities/Book";
import { Generation } from "../entities/Generation";

export interface IGenerationExporter {
  readonly contentType: string;
  readonly fileExtension: string;
  export(generation: Generation, book: Book): Promise<Buffer>;
}
