import { Db, MongoClient } from "mongodb";

export async function connectMongo(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to backend/.env (an Atlas connection string).");
  }
  const client = new MongoClient(uri);
  await client.connect();
  return client.db(process.env.MONGODB_DB_NAME ?? "vedbhandar");
}
