import "reflect-metadata";
import "../src/loadEnv.js";

import type { Express } from "express";
import type { IncomingMessage, ServerResponse } from "http";
import { registerContainer } from "../src/container.js";
import { createApp } from "../src/app.js";
import { connectMongo } from "../src/infrastructure/persistence/mongo/connection.js";
import { ensureIndexes } from "../src/infrastructure/persistence/mongo/ensureIndexes.js";

// Memoized across warm invocations of the same function instance, so Mongo
// connects and the DI container registers only once per cold start.
let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  appPromise ??= (async () => {
    const { client, db } = await connectMongo();
    await ensureIndexes(db);
    registerContainer(client, db);
    return createApp();
  })();
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp();
  app(req, res);
}
