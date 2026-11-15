import { Db } from "mongodb";

const VECTOR_INDEX_NAME = "chunks_vector_index";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120_000;

export async function ensureIndexes(db: Db): Promise<void> {
  const chunks = db.collection("chunks");
  await chunks.createIndex({ bookId: 1, chapter: 1, order: 1 });
  await chunks.createIndex({ bookId: 1, type: 1, maxBloom: 1 });
  await db.collection("books").createIndex({ userId: 1, status: 1 });
  await db.collection("generations").createIndex({ userId: 1, bookId: 1, createdAt: -1 });
  await db.collection("question_bank").createIndex({ userId: 1, bookId: 1, chapters: 1, createdAt: -1 });
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("question_paper_templates").createIndex({ userId: 1, createdAt: -1 });

  await ensureVectorIndex(db);
}

/**
 * Atlas Search index creation is asynchronous: a query run right after
 * createSearchIndex() can silently return zero hits. We poll until the
 * index reports queryable, logging (not throwing) on timeout so the rest
 * of the app can still start — only topic-based retrieval needs it ready.
 */
async function ensureVectorIndex(db: Db): Promise<void> {
  const chunks = db.collection("chunks");
  const existing = await chunks
    .listSearchIndexes(VECTOR_INDEX_NAME)
    .toArray()
    .catch(() => []);

  if (existing.length === 0) {
    await chunks.createSearchIndex({
      name: VECTOR_INDEX_NAME,
      type: "vectorSearch",
      definition: {
        fields: [
          { type: "vector", path: "embedding", numDimensions: 384, similarity: "cosine" },
          { type: "filter", path: "bookId" },
          { type: "filter", path: "chapter" },
          { type: "filter", path: "page" },
          { type: "filter", path: "type" },
          { type: "filter", path: "maxBloom" },
        ],
      },
    });
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const indexes = await chunks.listSearchIndexes(VECTOR_INDEX_NAME).toArray();
    const index = indexes[0] as { queryable?: boolean } | undefined;
    if (index?.queryable) return;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  console.warn(
    `Vector search index "${VECTOR_INDEX_NAME}" is not queryable yet after ${POLL_TIMEOUT_MS}ms. ` +
      "Topic-based retrieval will fail until it finishes building in Atlas.",
  );
}
