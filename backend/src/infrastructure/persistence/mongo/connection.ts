import { Db, MongoClient } from "mongodb";

export interface MongoConnection {
  client: MongoClient;
  db: Db;
}

export async function connectMongo(): Promise<MongoConnection> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to backend/.env (an Atlas connection string).");
  }
  const client = new MongoClient(uri);
  await client.connect();
  return { client, db: client.db(process.env.MONGODB_DB_NAME ?? "vedbhandar") };
}
